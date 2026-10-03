-- Migration: Fix Lead-Gating Security Bug for Inquiries
-- Date: 2026-08-06
-- Description: Replaces open "inquiries_full_access" RLS policy with strict ownership policies
-- and creates an `inquiries_gated` view that redacts tenant contact details and message
-- when a lead is locked (is_unlocked = false) for landlords.

-- 1. Ensure RLS is enabled on inquiries table
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

-- 2. Drop insecure/permissive policies on inquiries
DROP POLICY IF EXISTS "inquiries_full_access" ON inquiries;
DROP POLICY IF EXISTS "Inquiries full access" ON inquiries;
DROP POLICY IF EXISTS "Landlords and tenants can view their own inquiries" ON inquiries;
DROP POLICY IF EXISTS "Tenants can create inquiries" ON inquiries;
DROP POLICY IF EXISTS "Landlords can update their inquiries" ON inquiries;

-- 3. Create strict RLS policies on `inquiries` table
-- SELECT Policy: Landlords can view inquiries for their listings, tenants can view their own inquiries
CREATE POLICY "inquiries_select_policy" ON inquiries
  FOR SELECT
  TO authenticated
  USING (
    landlord_id = auth.uid()::text
    OR tenant_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid()::text 
      AND profiles.role IN ('admin', 'superadmin')
    )
  );

-- INSERT Policy: Authenticated users can create inquiries for themselves
CREATE POLICY "inquiries_insert_policy" ON inquiries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = auth.uid()::text
  );

-- UPDATE Policy: Landlords can update status/reply on their inquiries, tenants on their own
CREATE POLICY "inquiries_update_policy" ON inquiries
  FOR UPDATE
  TO authenticated
  USING (
    landlord_id = auth.uid()::text
    OR tenant_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid()::text 
      AND profiles.role IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    landlord_id = auth.uid()::text
    OR tenant_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid()::text 
      AND profiles.role IN ('admin', 'superadmin')
    )
  );

-- 4. Create Postgres VIEW: inquiries_gated
-- Automatically redacts tenant_phone, tenant_email, tenant_name, and message
-- with NULL or placeholder text whenever is_unlocked = false and requester is the landlord.
-- Tenants, admins, and unlocked row requests receive the full data.

CREATE OR REPLACE VIEW inquiries_gated AS
SELECT
  id,
  property_id,
  tenant_id,
  landlord_id,
  CASE
    WHEN is_unlocked IS TRUE THEN tenant_name
    WHEN (auth.uid()::text = tenant_id) THEN tenant_name
    WHEN EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()::text AND profiles.role IN ('admin', 'superadmin')) THEN tenant_name
    ELSE 'Locked Lead'
  END AS tenant_name,
  CASE
    WHEN is_unlocked IS TRUE THEN tenant_phone
    WHEN (auth.uid()::text = tenant_id) THEN tenant_phone
    WHEN EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()::text AND profiles.role IN ('admin', 'superadmin')) THEN tenant_phone
    ELSE NULL
  END AS tenant_phone,
  CASE
    WHEN is_unlocked IS TRUE THEN tenant_email
    WHEN (auth.uid()::text = tenant_id) THEN tenant_email
    WHEN EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()::text AND profiles.role IN ('admin', 'superadmin')) THEN tenant_email
    ELSE NULL
  END AS tenant_email,
  CASE
    WHEN is_unlocked IS TRUE THEN message
    WHEN (auth.uid()::text = tenant_id) THEN message
    WHEN EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()::text AND profiles.role IN ('admin', 'superadmin')) THEN message
    ELSE '🔒 Lead is locked. Unlock this lead using your lead credits to view tenant phone, email, and message.'
  END AS message,
  status,
  is_unlocked,
  is_locked,
  unlocked_at,
  unlocked_by_credit_tx_id,
  reply,
  replied_at,
  created_at
FROM inquiries;

-- Enable security_invoker so RLS policies on inquiries apply when querying the view
ALTER VIEW inquiries_gated SET (security_invoker = true);

-- 5. Grant access permissions on the view
GRANT SELECT ON inquiries_gated TO authenticated;
GRANT SELECT ON inquiries_gated TO anon;
