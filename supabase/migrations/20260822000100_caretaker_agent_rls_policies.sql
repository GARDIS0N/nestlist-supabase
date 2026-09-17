-- Migration: Add RLS Policies & RPCs for Caretaker and Agent Landlord-Equivalent Roles
-- Date: 2026-08-22

-- 1. PROPERTIES POLICIES
DROP POLICY IF EXISTS select_properties_policy ON public.properties;
DROP POLICY IF EXISTS insert_properties_policy ON public.properties;
DROP POLICY IF EXISTS update_properties_policy ON public.properties;
DROP POLICY IF EXISTS delete_properties_policy ON public.properties;
DROP POLICY IF EXISTS properties_public_read ON public.properties;
DROP POLICY IF EXISTS properties_full_access ON public.properties;
DROP POLICY IF EXISTS properties_select_policy ON public.properties;
DROP POLICY IF EXISTS properties_insert_policy ON public.properties;
DROP POLICY IF EXISTS properties_update_policy ON public.properties;
DROP POLICY IF EXISTS properties_delete_policy ON public.properties;

CREATE POLICY properties_select_policy ON public.properties
  FOR SELECT USING (
    is_active = true 
    OR auth.uid()::text = landlord_id::text
    OR auth.uid()::text = agent_id::text
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id::text = auth.uid()::text AND p.role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY properties_insert_policy ON public.properties
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid()::text = landlord_id::text
    OR auth.uid()::text = agent_id::text
    OR auth.uid() IS NOT NULL
  );

CREATE POLICY properties_update_policy ON public.properties
  FOR UPDATE TO authenticated
  USING (
    auth.uid()::text = landlord_id::text
    OR auth.uid()::text = agent_id::text
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id::text = auth.uid()::text AND p.role IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    auth.uid()::text = landlord_id::text
    OR auth.uid()::text = agent_id::text
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id::text = auth.uid()::text AND p.role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY properties_delete_policy ON public.properties
  FOR DELETE TO authenticated
  USING (
    auth.uid()::text = landlord_id::text
    OR auth.uid()::text = agent_id::text
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id::text = auth.uid()::text AND p.role IN ('admin', 'superadmin')
    )
  );

-- 2. INQUIRIES POLICIES
DROP POLICY IF EXISTS inquiries_full_access ON public.inquiries;
DROP POLICY IF EXISTS select_inquiries_policy ON public.inquiries;
DROP POLICY IF EXISTS insert_inquiries_policy ON public.inquiries;
DROP POLICY IF EXISTS update_inquiries_policy ON public.inquiries;
DROP POLICY IF EXISTS inquiries_select_policy ON public.inquiries;
DROP POLICY IF EXISTS inquiries_insert_policy ON public.inquiries;
DROP POLICY IF EXISTS inquiries_update_policy ON public.inquiries;

CREATE POLICY inquiries_select_policy ON public.inquiries
  FOR SELECT TO authenticated
  USING (
    landlord_id::text = auth.uid()::text
    OR tenant_id::text = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.properties p 
      WHERE p.id = inquiries.property_id 
        AND (p.landlord_id::text = auth.uid()::text OR p.agent_id::text = auth.uid()::text)
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id::text = auth.uid()::text 
        AND profiles.role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY inquiries_insert_policy ON public.inquiries
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id::text = auth.uid()::text
    OR auth.uid() IS NOT NULL
  );

CREATE POLICY inquiries_update_policy ON public.inquiries
  FOR UPDATE TO authenticated
  USING (
    landlord_id::text = auth.uid()::text
    OR tenant_id::text = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.properties p 
      WHERE p.id = inquiries.property_id 
        AND (p.landlord_id::text = auth.uid()::text OR p.agent_id::text = auth.uid()::text)
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id::text = auth.uid()::text 
        AND profiles.role IN ('admin', 'superadmin')
    )
  );

-- 3. LISTING PAYMENTS POLICIES
DROP POLICY IF EXISTS payments_full_access ON public.listing_payments;
DROP POLICY IF EXISTS select_payments_policy ON public.listing_payments;
DROP POLICY IF EXISTS insert_payments_policy ON public.listing_payments;
DROP POLICY IF EXISTS payments_select_policy ON public.listing_payments;
DROP POLICY IF EXISTS payments_insert_policy ON public.listing_payments;

CREATE POLICY payments_select_policy ON public.listing_payments
  FOR SELECT TO authenticated
  USING (
    landlord_id::text = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id::text = auth.uid()::text 
        AND profiles.role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY payments_insert_policy ON public.listing_payments
  FOR INSERT TO authenticated
  WITH CHECK (
    landlord_id::text = auth.uid()::text
    OR auth.uid() IS NOT NULL
  );

-- 4. UPDATE UNLOCK_LEAD RPC (Supports Landlords, Caretakers, and Agents seamlessly)
CREATE OR REPLACE FUNCTION unlock_lead(
  p_enquiry_id UUID,
  p_landlord_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inquiry RECORD;
  v_property RECORD;
  v_caller RECORD;
  v_credits INTEGER := 0;
  v_tx_id UUID;
  v_tenant_profile RECORD;
  v_remaining_credits INTEGER := 0;
BEGIN
  -- 1. Fetch enquiry record with lock
  SELECT * INTO v_inquiry 
  FROM inquiries 
  WHERE id = p_enquiry_id 
  FOR UPDATE;

  IF v_inquiry IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Enquiry not found',
      'code', 'NOT_FOUND'
    );
  END IF;

  -- 2. Verify landlord/caretaker/agent ownership
  SELECT * INTO v_property 
  FROM properties 
  WHERE id = v_inquiry.property_id;

  IF v_property IS NULL OR (
    v_property.landlord_id != p_landlord_id::text 
    AND v_inquiry.landlord_id != p_landlord_id::text
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: enquiry does not belong to this account',
      'code', 'UNAUTHORIZED'
    );
  END IF;

  -- 3. Check if already unlocked (idempotent)
  IF v_inquiry.is_unlocked IS TRUE THEN
    SELECT full_name, phone, email INTO v_tenant_profile
    FROM profiles
    WHERE id = v_inquiry.tenant_id;

    RETURN jsonb_build_object(
      'success', true,
      'already_unlocked', true,
      'message', 'Enquiry is already unlocked',
      'inquiry_id', p_enquiry_id,
      'tenant_name', COALESCE(v_inquiry.tenant_name, v_tenant_profile.full_name, 'Tenant'),
      'tenant_phone', COALESCE(v_inquiry.tenant_phone, v_tenant_profile.phone, ''),
      'tenant_email', COALESCE(v_inquiry.tenant_email, v_tenant_profile.email, ''),
      'message_text', v_inquiry.message
    );
  END IF;

  -- 4. Check caller's credit balance (from profile or property fallback)
  SELECT * INTO v_caller 
  FROM profiles 
  WHERE id = p_landlord_id::text 
  FOR UPDATE;

  IF v_caller IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Profile not found',
      'code', 'PROFILE_NOT_FOUND'
    );
  END IF;

  v_credits := COALESCE(v_caller.lead_credits, 0);

  IF v_credits >= 1 THEN
    UPDATE profiles 
    SET lead_credits = lead_credits - 1 
    WHERE id = p_landlord_id::text;
    v_remaining_credits := v_credits - 1;
  ELSIF COALESCE(v_property.lead_credits, 0) >= 1 THEN
    UPDATE properties 
    SET lead_credits = lead_credits - 1 
    WHERE id = v_property.id;
    v_remaining_credits := 0;
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient lead credits. Please top up your Unlock Leads bundle.',
      'code', 'INSUFFICIENT_CREDITS',
      'available_credits', 0
    );
  END IF;

  -- 5. Insert audit ledger row
  INSERT INTO credit_transactions (
    landlord_id,
    property_id,
    credits_added,
    amount_paid,
    type,
    notes
  ) VALUES (
    p_landlord_id::text,
    v_inquiry.property_id,
    -1,
    0,
    'lead_spent',
    'Unlocked lead enquiry ' || p_enquiry_id::text
  ) RETURNING id INTO v_tx_id;

  -- 6. Atomically update enquiry
  UPDATE inquiries
  SET 
    is_unlocked = true,
    is_locked = false,
    unlocked_at = NOW(),
    unlocked_by_credit_tx_id = v_tx_id
  WHERE id = p_enquiry_id;

  -- 7. Fetch tenant details
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

REVOKE ALL ON FUNCTION unlock_lead(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION unlock_lead(UUID, UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
