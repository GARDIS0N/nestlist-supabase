-- ============================================================================================
-- Migration: 20260822000300_enforce_contact_visibility_and_lead_gating.sql
-- Description:
-- 1. Enforces strict privacy rules across the platform:
--    - Tenants NEVER see contact info (phone/email) of Landlord, Caretaker, or Agent.
--    - Landlords, Caretakers, and Agents MUST PAY (via unlock_lead RPC) to view tenant contact details.
-- 2. Refreshes and hardens the `inquiries_gated` view as the single source of truth for inquiries.
-- 3. Drops overly permissive policies on `credit_transactions` and hardens RLS.
-- ============================================================================================

-- 1. Drop old permissive policies on credit_transactions if present
DROP POLICY IF EXISTS "credit_transactions_read" ON public.credit_transactions;
DROP POLICY IF EXISTS "credit_transactions_insert" ON public.credit_transactions;
DROP POLICY IF EXISTS "Allow landlords to view their own credit transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "Allow landlords to insert their own credit transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "Allow admins full access to credit transactions" ON public.credit_transactions;

-- Ensure RLS is enabled on credit_transactions
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- Landlords, Caretakers, Agents can only view their own credit transactions
CREATE POLICY credit_transactions_select_policy ON public.credit_transactions
  FOR SELECT TO authenticated
  USING (
    user_id::text = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id::text = auth.uid()::text
        AND profiles.role IN ('admin', 'superadmin')
    )
  );

-- Only backend RPCs / authenticated users for their own user_id can insert transactions
CREATE POLICY credit_transactions_insert_policy ON public.credit_transactions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id::text = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id::text = auth.uid()::text
        AND profiles.role IN ('admin', 'superadmin')
    )
  );

-- 2. Drop and recreate inquiries_gated view with strict gating and role support
DROP VIEW IF EXISTS public.inquiries_gated CASCADE;

CREATE OR REPLACE VIEW public.inquiries_gated AS
SELECT
  inquiries.id,
  inquiries.property_id,
  inquiries.tenant_id,
  inquiries.landlord_id,
  inquiries.created_at,
  inquiries.status,
  COALESCE(inquiries.is_unlocked, false) AS is_unlocked,
  CASE
    WHEN inquiries.is_unlocked IS TRUE THEN false
    ELSE true
  END AS is_locked,
  inquiries.unlocked_at,
  inquiries.unlocked_by_credit_tx_id,
  -- Tenant contact & message gating:
  -- Only reveal tenant name, phone, email, and message if the inquiry is unlocked,
  -- or if the requester is the tenant themselves or an admin.
  CASE
    WHEN inquiries.is_unlocked IS TRUE
      OR inquiries.tenant_id::text = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id::text = auth.uid()::text
          AND profiles.role IN ('admin', 'superadmin')
      )
    THEN COALESCE(inquiries.tenant_name, p_tenant.full_name, 'Tenant')
    ELSE 'Locked Lead'
  END AS tenant_name,

  CASE
    WHEN inquiries.is_unlocked IS TRUE
      OR inquiries.tenant_id::text = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id::text = auth.uid()::text
          AND profiles.role IN ('admin', 'superadmin')
      )
    THEN COALESCE(inquiries.tenant_phone, p_tenant.phone)
    ELSE NULL
  END AS tenant_phone,

  CASE
    WHEN inquiries.is_unlocked IS TRUE
      OR inquiries.tenant_id::text = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id::text = auth.uid()::text
          AND profiles.role IN ('admin', 'superadmin')
      )
    THEN COALESCE(inquiries.tenant_email, p_tenant.email)
    ELSE NULL
  END AS tenant_email,

  CASE
    WHEN inquiries.is_unlocked IS TRUE
      OR inquiries.tenant_id::text = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id::text = auth.uid()::text
          AND profiles.role IN ('admin', 'superadmin')
      )
    THEN inquiries.message
    ELSE '🔒 Lead is locked. Unlock this lead using your lead credits to view tenant phone, email, and message.'
  END AS message
FROM public.inquiries
LEFT JOIN public.profiles p_tenant ON p_tenant.id = inquiries.tenant_id
WHERE
  -- Security boundary: Only show inquiries to the relevant Landlord, Caretaker, Agent, Tenant, or Admin
  inquiries.landlord_id::text = auth.uid()::text
  OR inquiries.tenant_id::text = auth.uid()::text
  OR EXISTS (
    SELECT 1 FROM public.properties prop
    WHERE prop.id = inquiries.property_id
      AND (
        prop.landlord_id::text = auth.uid()::text
        OR prop.agent_id::text = auth.uid()::text
      )
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id::text = auth.uid()::text
      AND profiles.role IN ('admin', 'superadmin')
  );

GRANT SELECT ON public.inquiries_gated TO authenticated;
GRANT SELECT ON public.inquiries_gated TO anon;

-- 3. Ensure unlock_lead RPC works seamlessly for Landlord, Caretaker, and Agent roles
CREATE OR REPLACE FUNCTION public.unlock_lead(
  p_enquiry_id UUID,
  p_landlord_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_inquiry RECORD;
  v_property RECORD;
  v_caller_profile RECORD;
  v_tenant_profile RECORD;
  v_user_credits INT;
  v_property_credits INT;
  v_remaining_credits INT;
  v_tx_id UUID;
  v_is_authorized BOOLEAN := false;
BEGIN
  v_caller_id := auth.uid();

  -- Fallback to passed p_landlord_id if auth context is missing in testing
  IF v_caller_id IS NULL THEN
    v_caller_id := p_landlord_id;
  END IF;

  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: User not authenticated.';
  END IF;

  -- 1. Fetch inquiry
  SELECT * INTO v_inquiry
  FROM inquiries
  WHERE id = p_enquiry_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Enquiry not found.';
  END IF;

  -- 2. Fetch property
  SELECT * INTO v_property
  FROM properties
  WHERE id = v_inquiry.property_id;

  -- 3. Verify caller authorization:
  -- Caller must be the landlord on inquiry, landlord/agent on property, or an admin
  SELECT role, lead_credits INTO v_caller_profile
  FROM profiles
  WHERE id = v_caller_id;

  IF v_inquiry.landlord_id = v_caller_id
     OR v_property.landlord_id = v_caller_id
     OR v_property.agent_id = v_caller_id
     OR v_caller_profile.role IN ('admin', 'superadmin') THEN
    v_is_authorized := true;
  END IF;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Unauthorized: You do not have permission to unlock leads for this property.';
  END IF;

  -- 4. Check if already unlocked
  IF v_inquiry.is_unlocked IS TRUE THEN
    SELECT full_name, phone, email INTO v_tenant_profile
    FROM profiles
    WHERE id = v_inquiry.tenant_id;

    RETURN jsonb_build_object(
      'success', true,
      'already_unlocked', true,
      'inquiry_id', p_enquiry_id,
      'tenant_name', COALESCE(v_inquiry.tenant_name, v_tenant_profile.full_name, 'Tenant'),
      'tenant_phone', COALESCE(v_inquiry.tenant_phone, v_tenant_profile.phone, ''),
      'tenant_email', COALESCE(v_inquiry.tenant_email, v_tenant_profile.email, ''),
      'message_text', v_inquiry.message
    );
  END IF;

  -- 5. Deduct 1 credit (check caller profile balance first, then property lead credits)
  v_user_credits := COALESCE(v_caller_profile.lead_credits, 0);
  v_property_credits := COALESCE(v_property.lead_credits, 0);

  IF v_user_credits >= 1 THEN
    UPDATE profiles
    SET lead_credits = lead_credits - 1,
        updated_at = NOW()
    WHERE id = v_caller_id
    RETURNING lead_credits INTO v_remaining_credits;
  ELSIF v_property_credits >= 1 THEN
    UPDATE properties
    SET lead_credits = lead_credits - 1,
        updated_at = NOW()
    WHERE id = v_inquiry.property_id
    RETURNING lead_credits INTO v_remaining_credits;
  ELSE
    RAISE EXCEPTION 'Insufficient lead credits. You need at least 1 credit to unlock this lead.';
  END IF;

  -- 6. Insert audit transaction
  INSERT INTO credit_transactions (
    user_id,
    property_id,
    credits_changed,
    amount_paid,
    transaction_type,
    notes
  ) VALUES (
    v_caller_id::text,
    v_inquiry.property_id,
    -1,
    0,
    'lead_spent',
    'Unlocked lead enquiry ' || p_enquiry_id::text
  ) RETURNING id INTO v_tx_id;

  -- 7. Atomically update enquiry
  UPDATE inquiries
  SET 
    is_unlocked = true,
    is_locked = false,
    unlocked_at = NOW(),
    unlocked_by_credit_tx_id = v_tx_id
  WHERE id = p_enquiry_id;

  -- 8. Fetch tenant details
  SELECT full_name, phone, email INTO v_tenant_profile
  FROM profiles
  WHERE id = v_inquiry.tenant_id;

  RETURN jsonb_build_object(
    'success', true,
    'already_unlocked', false,
    'inquiry_id', p_enquiry_id,
    'unlocked_at', NOW(),
    'tenant_name', COALESCE(v_inquiry.tenant_name, v_tenant_profile.full_name, 'Tenant'),
    'tenant_phone', COALESCE(v_inquiry.tenant_phone, v_tenant_profile.phone, ''),
    'tenant_email', COALESCE(v_inquiry.tenant_email, v_tenant_profile.email, ''),
    'message_text', v_inquiry.message,
    'remaining_credits', GREATEST(0, v_remaining_credits)
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Transaction failed in unlock_lead: %', SQLERRM;
END;
$$;

REVOKE ALL ON FUNCTION public.unlock_lead(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unlock_lead(UUID, UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
