// ── src/lib/supabase.js ──────────────────────────────────────────────────────
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.warn("⚠️ Supabase env vars missing. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env");
}

export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  key || "placeholder-key",
  {
    auth: { persistSession: false }, // Clerk handles auth, not Supabase auth
  }
);

// ── Helper: get Supabase client with Clerk JWT (for RLS) ─────────────────────
export function getSupabaseWithAuth(clerkToken) {
  return createClient(url, key, {
    global: {
      headers: { Authorization: `Bearer ${clerkToken}` },
    },
  });
}
