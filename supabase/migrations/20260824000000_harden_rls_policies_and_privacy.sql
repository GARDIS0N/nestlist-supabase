-- Migration: 20260824000000_harden_rls_policies_and_privacy.sql
-- Description: Hardens Row Level Security (RLS) policies across public schema:
-- 1. Removes overly permissive 'OR auth.uid() IS NOT NULL' clauses on properties and listing_payments inserts.
-- 2. Restricts listing_boosts and lead_unlocks inserts to property owners/admins.
-- 3. Restricts profile select permissions to owners, professional landlord/agent roles, and admins.

-- 1. HARDEN PROPERTIES INSERT POLICY
DROP POLICY IF EXISTS properties_insert_policy ON public.properties;
DROP POLICY IF EXISTS insert_properties_policy ON public.properties;

CREATE POLICY properties_insert_policy ON public.properties
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid()::text = landlord_id::text
    OR auth.uid()::text = agent_id::text
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id::text = auth.uid()::text AND p.role IN ('admin', 'superadmin')
    )
  );

-- 2. HARDEN LISTING PAYMENTS INSERT POLICY
DROP POLICY IF EXISTS payments_insert_policy ON public.listing_payments;
DROP POLICY IF EXISTS insert_payments_policy ON public.listing_payments;

CREATE POLICY payments_insert_policy ON public.listing_payments
  FOR INSERT TO authenticated
  WITH CHECK (
    landlord_id::text = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id::text = auth.uid()::text AND p.role IN ('admin', 'superadmin')
    )
  );

-- 3. HARDEN LISTING BOOSTS INSERT POLICY
DROP POLICY IF EXISTS listing_boosts_insert_policy ON public.listing_boosts;
DROP POLICY IF EXISTS insert_boosts_policy ON public.listing_boosts;

CREATE POLICY listing_boosts_insert_policy ON public.listing_boosts
  FOR INSERT TO authenticated
  WITH CHECK (
    landlord_id::text = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id::text = auth.uid()::text AND p.role IN ('admin', 'superadmin')
    )
  );

-- 4. HARDEN LEAD UNLOCKS INSERT POLICY
DROP POLICY IF EXISTS lead_unlocks_insert_policy ON public.lead_unlocks;
DROP POLICY IF EXISTS insert_lead_unlocks_policy ON public.lead_unlocks;

CREATE POLICY lead_unlocks_insert_policy ON public.lead_unlocks
  FOR INSERT TO authenticated
  WITH CHECK (
    landlord_id::text = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id::text = auth.uid()::text AND p.role IN ('admin', 'superadmin')
    )
  );

-- 5. HARDEN PROFILES SELECT POLICY
DROP POLICY IF EXISTS select_profiles_policy ON public.profiles;
DROP POLICY IF EXISTS profiles_select_policy ON public.profiles;

CREATE POLICY profiles_select_policy ON public.profiles
  FOR SELECT USING (
    id::text = auth.uid()::text
    OR role IN ('landlord', 'agent', 'caretaker')
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id::text = auth.uid()::text AND p.role IN ('admin', 'superadmin')
    )
  );

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
