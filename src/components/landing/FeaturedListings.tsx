import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Home } from "lucide-react";
import { PropertyGrid } from "./PropertyGrid";
import { PropertyItem } from "./PropertyCard";

interface FeaturedListingsProps {
  properties: PropertyItem[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  savedIds?: Set<string>;
  onToggleSave?: (id: string) => void;
}

export const FeaturedListings: React.FC<FeaturedListingsProps> = ({
  properties,
  loading = false,
  error = null,
  onRetry,
  savedIds,
  onToggleSave,
}) => {
  return (
    <section id="available-homes-section" className="py-12 sm:py-16 bg-stone-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 sm:mb-10 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#1E6B4A]/10 text-[#1E6B4A] text-xs font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#D97706]" />
              <span>VERIFIED RENTALS</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
              Available Homes
            </h2>
            <p className="text-stone-600 text-sm sm:text-base mt-1.5 max-w-2xl">
              Real properties currently available for rent in Kenya. Connect directly with landlords with zero middleman fees.
            </p>
          </div>

          <Link
            to="/listings"
            id="view-all-available-link"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-[#1E6B4A] hover:text-[#165339] group shrink-0"
          >
            <span>View All Listings</span>
            {properties.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[#1E6B4A]/10 text-[#1E6B4A] text-xs font-semibold">
                {properties.length}
              </span>
            )}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Dynamic Property Grid */}
        <PropertyGrid
          properties={properties}
          loading={loading}
          error={error}
          onRetry={onRetry}
          savedIds={savedIds}
          onToggleSave={onToggleSave}
          columns={4}
          emptyTitle="No Active Listings Found in Database"
          emptySubtitle="There are currently no active properties published in the database. Landlords can list a new home in minutes."
        />
      </div>
    </section>
  );
};
