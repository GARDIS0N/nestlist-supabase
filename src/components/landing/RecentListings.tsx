import React from "react";
import { Link } from "react-router-dom";
import { Clock, ArrowRight, Building } from "lucide-react";
import { PropertyGrid } from "./PropertyGrid";
import { PropertyItem } from "./PropertyCard";

interface RecentListingsProps {
  properties: PropertyItem[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  savedIds?: Set<string>;
  onToggleSave?: (id: string) => void;
}

export const RecentListings: React.FC<RecentListingsProps> = ({
  properties,
  loading = false,
  error = null,
  onRetry,
  savedIds,
  onToggleSave,
}) => {
  // Sort properties by created_at descending
  const sortedProperties = [...properties].sort((a, b) => {
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateB - dateA;
  });

  return (
    <section id="recently-added-section" className="py-12 sm:py-16 bg-white border-b border-stone-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 sm:mb-10 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#D97706]/10 text-[#D97706] text-xs font-bold mb-2">
              <Clock className="w-3.5 h-3.5" />
              <span>JUST LISTED</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
              Recently Added Homes
            </h2>
            <p className="text-stone-600 text-sm sm:text-base mt-1.5 max-w-2xl">
              The newest verified rental listings uploaded by landlords and caretakers across Kenya.
            </p>
          </div>

          <Link
            to="/listings"
            id="view-all-recent-link"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-[#1E6B4A] hover:text-[#165339] group shrink-0"
          >
            <span>Explore All Properties</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Responsive Grid: 4 cards on desktop, 2 on tablets, 1 on mobile */}
        <PropertyGrid
          properties={sortedProperties}
          loading={loading}
          error={error}
          onRetry={onRetry}
          savedIds={savedIds}
          onToggleSave={onToggleSave}
          columns={4}
          emptyTitle="No Recent Listings Yet"
          emptySubtitle="Check back soon as new rental units are added daily, or list your own vacancy today."
        />

        {/* View All Properties Bottom Callout */}
        {!loading && sortedProperties.length > 0 && (
          <div className="mt-12 text-center">
            <Link
              to="/listings"
              id="view-all-properties-button"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-stone-900 hover:bg-[#1E6B4A] text-white font-bold text-sm rounded-xl shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
            >
              <span>View All Properties on NestList</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};
