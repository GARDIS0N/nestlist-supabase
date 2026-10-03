import { supabase } from './supabase';

/**
 * Authorization header for calls to the NestList Express API.
 * The server verifies this Supabase access token on every non-public /api route.
 * Returns an empty object when nobody is signed in.
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
