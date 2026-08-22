-- Migration: Pay-per-inquiry Paywall and Gating Security Fix
-- Date: 2026-07-27
-- Description: Adds payment_model on properties, credit_transactions table with RLS,
-- is_unlocked on inquiries, and defines the atomic unlock_lead RPC function (UUID parameters).

-- 1. PROPERTIES TABLE: Add payment_model column with CHECK constraint and backfill
ALTER TABLE properties 
  ADD COLUMN IF NOT EXISTS payment_model TEXT NOT NULL DEFAULT 'pay_once';

ALTER TABLE properties 
  DROP CONSTRAINT IF EXISTS check_properties_payment_model;

ALTER TABLE properties 
  ADD CONSTRAINT check_properties_payment_model 
  CHECK (payment_model IN ('pay_once', 'pay_per_inquiry'));

-- Backfill payment_model from listing_model ('pay_per_lead' -> 'pay_per_inquiry', else 'pay_once')
UPDATE properties 
SET payment_model = CASE 
  WHEN listing_model = 'pay_per_lead' THEN 'pay_per_inquiry' 
  ELSE 'pay_once' 
END;

-- 2. CREDIT TRANSACTIONS TABLE: Audit ledger for credit top-ups and spend
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  unlock_id UUID REFERENCES lead_unlocks(id) ON DELETE SET NULL,
  amount_paid NUMERIC DEFAULT 0,
  credits_added INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('bundle_purchase', 'single_purchase', 'reconciliation', 'admin_adjustment', 'lead_spent', 'admin_grant')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on credit_transactions with owner-scoped policies
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "credit_transactions_read" ON credit_transactions;
DROP POLICY IF EXISTS "credit_transactions_insert" ON credit_transactions;
DROP POLICY IF EXISTS "Allow landlords to view their own credit transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Allow landlords to insert their own credit transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Allow admins full access to credit transactions" ON credit_transactions;

CREATE POLICY "Allow landlords to view their own credit transactions" ON credit_transactions
  FOR SELECT USING ((select auth.uid()) = landlord_id);

CREATE POLICY "Allow landlords to insert their own credit transactions" ON credit_transactions
  FOR INSERT WITH CHECK ((select auth.uid()) = landlord_id);

CREATE POLICY "Allow admins full access to credit transactions" ON credit_transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid()) AND role IN ('admin', 'superadmin')
    )
  );

-- 3. INQUIRIES TABLE: Add is_unlocked, unlocked_at, unlocked_by_credit_tx_id
ALTER TABLE inquiries 
  ADD COLUMN IF NOT EXISTS is_unlocked BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE inquiries 
  ADD COLUMN IF NOT EXISTS unlocked_at TIMESTAMPTZ NULL;

ALTER TABLE inquiries 
  ADD COLUMN IF NOT EXISTS unlocked_by_credit_tx_id UUID NULL REFERENCES credit_transactions(id) ON DELETE SET NULL;

-- 4. ATOMIC RPC FUNCTION: unlock_lead
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
  v_landlord RECORD;
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

  -- 2. Verify landlord ownership
  SELECT * INTO v_property 
  FROM properties 
  WHERE id = v_inquiry.property_id;

  IF v_property IS NULL OR (v_property.landlord_id != p_landlord_id AND v_inquiry.landlord_id != p_landlord_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: enquiry does not belong to this landlord',
      'code', 'UNAUTHORIZED'
    );
  END IF;

  -- 3. Check if already unlocked (idempotent - no double charge)
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

  -- 4. Lock landlord's profile row FOR UPDATE to check credit balance
  SELECT * INTO v_landlord 
  FROM profiles 
  WHERE id = p_landlord_id 
  FOR UPDATE;

  IF v_landlord IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Landlord profile not found',
      'code', 'PROFILE_NOT_FOUND'
    );
  END IF;

  v_credits := COALESCE(v_landlord.lead_credits, 0);

  -- Check landlord credits, then property credits
  IF v_credits >= 1 THEN
    -- Deduct from landlord profile
    UPDATE profiles 
    SET lead_credits = lead_credits - 1 
    WHERE id = p_landlord_id;
    v_remaining_credits := v_credits - 1;
  ELSIF COALESCE(v_property.lead_credits, 0) >= 1 THEN
    -- Deduct from property credits
    UPDATE properties 
    SET lead_credits = lead_credits - 1 
    WHERE id = v_property.id;
    v_remaining_credits := 0;
  ELSE
    -- Insufficient credits
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient lead credits. Please top up your Unlock Leads bundle.',
      'code', 'INSUFFICIENT_CREDITS',
      'available_credits', 0
    );
  END IF;

  -- 5. Insert audit ledger row in credit_transactions
  INSERT INTO credit_transactions (
    landlord_id,
    property_id,
    credits_added,
    amount_paid,
    type,
    notes
  ) VALUES (
    p_landlord_id,
    v_inquiry.property_id,
    -1,
    0,
    'lead_spent',
    'Unlocked lead enquiry ' || p_enquiry_id::text
  ) RETURNING id INTO v_tx_id;

  -- 6. Atomically update enquiry: set is_unlocked = true and is_locked = false directly
  UPDATE inquiries
  SET 
    is_unlocked = true,
    is_locked = false,
    unlocked_at = NOW(),
    unlocked_by_credit_tx_id = v_tx_id
  WHERE id = p_enquiry_id;

  -- 7. Fetch tenant details for response
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

-- 5. Restrict EXECUTE on unlock_lead to authenticated role
REVOKE ALL ON FUNCTION unlock_lead(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION unlock_lead(UUID, UUID) TO authenticated;

-- 6. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
