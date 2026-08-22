-- Migration: Add Caretaker and Agent Roles to Profiles
-- Date: 2026-08-22
-- Description: Expands profiles.role CHECK constraint to include 'caretaker' and 'agent',
-- and adds nullable linking columns for caretaker and agent onboarding.

-- 1. Expand role CHECK constraint to include 'caretaker' and 'agent'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('landlord', 'tenant', 'user', 'admin', 'caretaker', 'agent'));

-- 2. Add nullable linking columns on profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS caretaker_property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS caretaker_approved boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS agent_agency_name text;

-- 3. Add nullable agent_id on properties (for agent-managed listings)
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS agent_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
