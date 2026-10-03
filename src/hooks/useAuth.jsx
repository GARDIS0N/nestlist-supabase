// ── useAuth.jsx ───────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { supabase } from "../lib/supabase";

export function useProfile() {
  const { user, isLoaded } = useUser();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) { setProfile(null); setLoading(false); return; }
    fetchProfile(user.id);
  }, [user, isLoaded]);

  async function fetchProfile(uid) {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .single();
    setProfile(data || null);
    setLoading(false);
  }

  async function updateProfile(updates) {
    if (!user) return;
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select()
      .single();
    if (!error) setProfile(data);
    return { data, error };
  }

  return { profile, loading, updateProfile, refetch: () => user && fetchProfile(user.id) };
}
