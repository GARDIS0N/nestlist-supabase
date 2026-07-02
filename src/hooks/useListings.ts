import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export function useListings(filters: any = {}) {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchListings();
  }, [JSON.stringify(filters)]);

  async function fetchListings() {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from("properties")
        .select(`
          *,
          profiles!landlord_id (
            full_name,
            phone,
            avatar_url
          )
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (filters.county && filters.county !== "all") {
        query = query.eq("county", filters.county);
      }
      if (filters.type && filters.type !== "all") {
        query = query.eq("type", filters.type);
      }
      if (filters.maxPrice) {
        query = query.lte("price", filters.maxPrice);
      }
      if (filters.search) {
        query = query.or(
          `title.ilike.%${filters.search}%,` +
          `location.ilike.%${filters.search}%,` +
          `county.ilike.%${filters.search}%`
        );
      }

      const { data, error: fetchErr } = await query;
      if (fetchErr) throw fetchErr;
      setListings(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return { listings, loading, error, refetch: fetchListings };
}
