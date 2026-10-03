import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { HeroSearch } from "../components/landing/HeroSearch";
import { FeaturedListings } from "../components/landing/FeaturedListings";
import { PropertyCategory } from "../components/landing/PropertyCategory";
import { RecentListings } from "../components/landing/RecentListings";
import { LocationDiscovery } from "../components/landing/LocationDiscovery";
import { TrustSection } from "../components/landing/TrustSection";
import { LandlordCTA } from "../components/landing/LandlordCTA";
import { PropertyItem } from "../components/landing/PropertyCard";

export interface LandingPageProps {
  initialProperties?: PropertyItem[];
}

export const LandingPage: React.FC<LandingPageProps> = ({ initialProperties }) => {
  const { profile } = useAuth();
  const [properties, setProperties] = useState<PropertyItem[]>(initialProperties || []);
  const [loading, setLoading] = useState(!initialProperties);
  const [error, setError] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  // Fetch real active properties from Supabase
  const fetchProperties = async () => {
    setLoading(true);
    setError(null);

    try {
      let queryResult;

      try {
        // Try boosted sorting first
        queryResult = await supabase
          .from("properties")
          .select("*")
          .eq("is_active", true)
          .order("is_boosted", { ascending: false })
          .order("created_at", { ascending: false });

        if (queryResult.error) {
          const errMsg = queryResult.error.message || "";
          if (
            errMsg.includes("column") ||
            errMsg.includes("is_boosted") ||
            queryResult.error.code === "42703"
          ) {
            // Fallback to sorting by created_at alone
            queryResult = await supabase
              .from("properties")
              .select("*")
              .eq("is_active", true)
              .order("created_at", { ascending: false });
          }
        }
      } catch (err) {
        console.warn("Falling back to standard created_at query:", err);
        queryResult = await supabase
          .from("properties")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false });
      }

      if (queryResult.error) {
        throw queryResult.error;
      }

      const data = queryResult.data || [];
      setProperties(data);
    } catch (err: any) {
      console.error("Error fetching properties for landing page:", err);
      setError(err.message || "Failed to load live property listings from database.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch saved property IDs for logged-in tenant
  const fetchSavedPropertyIds = async () => {
    if (!profile || profile.role !== "tenant") return;

    try {
      const { data, error: fetchErr } = await supabase
        .from("saved_properties")
        .select("property_id")
        .eq("tenant_id", profile.id);

      if (fetchErr) throw fetchErr;
      if (data) {
        setSavedIds(new Set(data.map((row: any) => row.property_id)));
      }
    } catch (err) {
      console.warn("Could not fetch saved property IDs:", err);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    fetchSavedPropertyIds();
  }, [profile]);

  const handleToggleSave = (propertyId: string) => {
    setSavedIds((prev) => {
      const updated = new Set(prev);
      if (updated.has(propertyId)) {
        updated.delete(propertyId);
      } else {
        updated.add(propertyId);
      }
      return updated;
    });
  };

  return (
    <div className="w-full bg-stone-50 min-h-screen">
      {/* 1. Hero Section + Real Search Interface */}
      <HeroSearch totalListingsCount={properties.length} />

      {/* 2. Available Homes / Featured Listings (Populated dynamically from DB) */}
      <FeaturedListings
        properties={properties}
        loading={loading}
        error={error}
        onRetry={fetchProperties}
        savedIds={savedIds}
        onToggleSave={handleToggleSave}
      />

      {/* 3. Explore by Property Type (Derived from DB and application schema) */}
      <PropertyCategory properties={properties} />

      {/* 4. Recently Added Homes (Responsive 4-col desktop, 2 tablet, 1 mobile) */}
      <RecentListings
        properties={properties}
        loading={loading}
        error={error}
        onRetry={fetchProperties}
        savedIds={savedIds}
        onToggleSave={handleToggleSave}
      />

      {/* 5. Regional Discovery & Location Explorer (Based on actual DB locations) */}
      <LocationDiscovery
        properties={properties}
        savedIds={savedIds}
        onToggleSave={handleToggleSave}
      />

      {/* 6. Why NestList (Trust Section) */}
      <TrustSection />

      {/* 7. Landlord & Renter Call to Action */}
      <LandlordCTA />
    </div>
  );
};

export default LandingPage;
