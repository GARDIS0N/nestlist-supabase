-- Migration: Fix Properties and Listing Payments Insert/Update RLS Policies
-- Date: 2026-08-22
-- Description: Removes legacy restrictive 'is_active = false' check and role bottlenecks
-- on public.properties so Landlords, Caretakers, Agents, and Admins can create listings smoothly.

-- 1. DROP all legacy and conflicting policies on properties
DROP POLICY IF EXISTS insert_properties_policy ON public.properties;
DROP POLICY IF EXISTS update_properties_policy ON public.properties;
DROP POLICY IF EXISTS delete_properties_policy ON public.properties;
DROP POLICY IF EXISTS select_properties_policy ON public.properties;
DROP POLICY IF EXISTS properties_public_read ON public.properties;
DROP POLICY IF EXISTS properties_full_access ON public.properties;
DROP POLICY IF EXISTS properties_select_policy ON public.properties;
DROP POLICY IF EXISTS properties_insert_policy ON public.properties;
DROP POLICY IF EXISTS properties_update_policy ON public.properties;
DROP POLICY IF EXISTS properties_delete_policy ON public.properties;

-- 2. CREATE robust RLS policies on properties
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

-- 3. DROP and recreate policies on listing_payments
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
      SELECT 1 FROM public.profiles p 
      WHERE p.id::text = auth.uid()::text 
        AND p.role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY payments_insert_policy ON public.listing_payments
  FOR INSERT TO authenticated
  WITH CHECK (
    landlord_id::text = auth.uid()::text
    OR auth.uid() IS NOT NULL
  );

-- 4. Reload schema cache
NOTIFY pgrst, 'reload schema';
