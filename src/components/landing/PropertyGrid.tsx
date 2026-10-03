import React from "react";
import { Link } from "react-router-dom";
import { Home, AlertCircle, RefreshCw, Search } from "lucide-react";
import { PropertyCard, PropertyItem } from "./PropertyCard";

interface PropertyGridProps {
  properties: PropertyItem[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptySubtitle?: string;
  maxItems?: number;
  savedIds?: Set<string>;
  onToggleSave?: (id: string) => void;
  columns?: 3 | 4;
}

export const PropertyGrid: React.FC<PropertyGridProps> = ({
  properties,
  loading = false,
  error = null,
  onRetry,
  emptyTitle = "No properties currently found",
  emptySubtitle = "There are no listings matching these criteria right now. Check back soon or explore all available rentals.",
  maxItems,
  savedIds = new Set(),
  onToggleSave,
  columns = 4,
}) => {
  const displayProperties = maxItems ? properties.slice(0, maxItems) : properties;

  // Grid layout class
  const gridClass = columns === 3
    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
    : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6";

  if (loading) {
    const skeletonCount = maxItems ? Math.min(maxItems, 4) : 4;
    return (
      <div className={gridClass}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-stone-200/80 overflow-hidden animate-pulse flex flex-col h-full"
          >
            <div className="aspect-[16/10] bg-stone-200 w-full" />
            <div className="p-4 sm:p-5 space-y-3 flex-1 flex flex-col">
              <div className="h-6 bg-stone-200 rounded w-1/2" />
              <div className="h-4 bg-stone-200 rounded w-3/4" />
              <div className="h-3 bg-stone-200 rounded w-1/3" />
              <div className="flex gap-2 pt-2">
                <div className="h-5 bg-stone-200 rounded w-16" />
                <div className="h-5 bg-stone-200 rounded w-16" />
              </div>
              <div className="pt-3 border-t border-stone-100 mt-auto flex justify-between">
                <div className="h-4 bg-stone-200 rounded w-24" />
                <div className="h-4 bg-stone-200 rounded w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-8 text-center max-w-xl mx-auto my-6">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="font-bold text-stone-900 text-base mb-1">
          Unable to Load Property Listings
        </h3>
        <p className="text-stone-600 text-sm mb-4 leading-relaxed">
          {error}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#1E6B4A] hover:bg-[#165339] text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        )}
      </div>
    );
  }

  if (displayProperties.length === 0) {
    return (
      <div className="bg-stone-50/60 border border-stone-200/80 rounded-2xl p-10 text-center max-w-xl mx-auto my-6">
        <div className="w-12 h-12 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center mx-auto mb-3 text-stone-400">
          <Home className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-stone-900 text-base mb-1.5">
          {emptyTitle}
        </h3>
        <p className="text-stone-600 text-xs sm:text-sm leading-relaxed mb-5">
          {emptySubtitle}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/listings"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#1E6B4A] hover:bg-[#165339] text-white text-xs font-bold rounded-xl transition shadow-xs"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Browse All Listings</span>
          </Link>
          <Link
            to="/list-property"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-bold rounded-xl transition"
          >
            <span>List a Rental</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={gridClass}>
      {displayProperties.map((property) => (
        <PropertyCard
          key={property.id}
          property={property}
          isSaved={savedIds.has(property.id)}
          onToggleSave={onToggleSave}
        />
      ))}
    </div>
  );
};
