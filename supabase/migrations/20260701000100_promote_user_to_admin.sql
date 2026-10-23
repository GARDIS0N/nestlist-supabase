-- Migration: promote a user to the 'admin' role.
-- Replace <ADMIN_USER_UUID> with the auth.users id of your admin account
-- (do not commit real user IDs or phone numbers).

INSERT INTO public.profiles (id, role, full_name, created_at)
VALUES ('<ADMIN_USER_UUID>', 'admin', 'Admin', NOW())
ON CONFLICT (id)
DO UPDATE SET role = 'admin';
