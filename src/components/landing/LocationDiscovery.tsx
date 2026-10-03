import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { MapPin, Compass, ArrowRight, Building2, CheckCircle2, Search } from "lucide-react";
import { PropertyCard, PropertyItem } from "./PropertyCard";

interface LocationDiscoveryProps {
  properties: PropertyItem[];
  savedIds?: Set<string>;
  onToggleSave?: (id: string) => void;
}

export const LocationDiscovery: React.FC<LocationDiscoveryProps> = ({
  properties,
  savedIds,
  onToggleSave,
}) => {
  const [selectedLocation, setSelectedLocation] = useState<string>("all");

  // Group properties by actual database location / county
  const locationStats = useMemo(() => {
    const map = new Map<string, { count: number; minPrice: number; maxPrice: number }>();

    properties.forEach((p) => {
      // Determine primary location label from actual data
      let locKey = p.county || "Kenya";
      if (p.location && p.location.toLowerCase().includes("murang")) {
        locKey = "Murang'a";
      } else if (p.location && p.location.toLowerCase().includes("kericho")) {
        locKey = "Kericho";
      } else if (p.location && p.location.toLowerCase().includes("nairobi")) {
        locKey = "Nairobi";
      } else if (p.location && p.location.toLowerCase().includes("kiambu")) {
        locKey = "Kiambu";
      } else if (p.location) {
        locKey = p.location.split(",")[0].trim();
      }

      const numPrice = typeof p.price === "number" ? p.price : parseFloat(p.price || "0");
      const existing = map.get(locKey);
      if (existing) {
        existing.count += 1;
        if (numPrice > 0 && numPrice < existing.minPrice) existing.minPrice = numPrice;
        if (numPrice > existing.maxPrice) existing.maxPrice = numPrice;
      } else {
        map.set(locKey, {
          count: 1,
          minPrice: numPrice || 0,
          maxPrice: numPrice || 0,
        });
      }
    });

    return Array.from(map.entries()).map(([name, data]) => ({
      name,
      count: data.count,
      minPrice: data.minPrice,
      maxPrice: data.maxPrice,
    }));
  }, [properties]);

  // Filter properties based on selected location
  const filteredProperties = useMemo(() => {
    if (selectedLocation === "all") return properties;
    return properties.filter((p) => {
      const locText = `${p.location || ""} ${p.county || ""}`.toLowerCase();
      return locText.includes(selectedLocation.toLowerCase());
    });
  }, [properties, selectedLocation]);

  if (properties.length === 0) return null;

  return (
    <section id="location-discovery-section" className="py-12 sm:py-16 bg-stone-50 border-b border-stone-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#1E6B4A]/10 text-[#1E6B4A] text-xs font-bold mb-2">
              <Compass className="w-3.5 h-3.5" />
              <span>DISCOVERY BY REGION</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
              Explore Homes by Location
            </h2>
            <p className="text-stone-600 text-sm sm:text-base mt-1.5 max-w-2xl">
              Filter available rental listings across Kenyan counties and neighborhoods currently represented in our live database.
            </p>
          </div>

          <Link
            to="/listings"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-[#1E6B4A] hover:text-[#165339] group shrink-0"
          >
            <span>Open Full Listings Explorer</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Split Discovery Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: Interactive Location Navigator */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-stone-200/80 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Active Locations
              </span>
              <span className="text-xs font-bold text-[#1E6B4A] bg-[#1E6B4A]/10 px-2 py-0.5 rounded-full">
                {properties.length} Total Rentals
              </span>
            </div>

            {/* "All Locations" Button */}
            <button
              type="button"
              onClick={() => setSelectedLocation("all")}
              className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                selectedLocation === "all"
                  ? "bg-[#1E6B4A] text-white border-[#1E6B4A] shadow-sm font-bold"
                  : "bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200/80 font-medium"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <MapPin className={`w-4 h-4 ${selectedLocation === "all" ? "text-amber-300" : "text-[#1E6B4A]"}`} />
                <span className="text-sm">All Represented Areas</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                selectedLocation === "all" ? "bg-white/20 text-white" : "bg-stone-200/80 text-stone-600"
              }`}>
                {properties.length}
              </span>
            </button>

            {/* Individual Location Buttons */}
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {locationStats.map((loc) => {
                const isSelected = selectedLocation.toLowerCase() === loc.name.toLowerCase();
                return (
                  <button
                    key={loc.name}
                    type="button"
                    onClick={() => setSelectedLocation(loc.name)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? "bg-[#1E6B4A] text-white border-[#1E6B4A] shadow-sm font-bold"
                        : "bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200/80 font-medium"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <MapPin className={`w-3.5 h-3.5 ${isSelected ? "text-amber-300" : "text-[#1E6B4A]"}`} />
                        <span className="text-sm">{loc.name}</span>
                      </div>
                      {loc.minPrice > 0 && (
                        <span className={`text-[11px] block mt-0.5 pl-5.5 ${isSelected ? "text-emerald-100" : "text-stone-500"}`}>
                          From KES {loc.minPrice.toLocaleString()} / mo
                        </span>
                      )}
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      isSelected ? "bg-white/20 text-white" : "bg-stone-200/80 text-stone-600"
                    }`}>
                      {loc.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quick Filter Info */}
            <div className="pt-3 border-t border-stone-100 text-xs text-stone-500 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#1E6B4A] shrink-0" />
              <span>Locations derived directly from active listings in our database.</span>
            </div>
          </div>

          {/* RIGHT: Scrollable synchronized list of the same actual listings */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-stone-600">
                Showing <span className="text-stone-900 font-bold">{filteredProperties.length}</span>{" "}
                {filteredProperties.length === 1 ? "home" : "homes"}{" "}
                {selectedLocation !== "all" ? `in ${selectedLocation}` : "across Kenya"}
              </p>
              {selectedLocation !== "all" && (
                <button
                  type="button"
                  onClick={() => setSelectedLocation("all")}
                  className="text-xs font-bold text-[#1E6B4A] hover:underline cursor-pointer"
                >
                  Clear filter
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-h-[580px] overflow-y-auto p-1">
              {filteredProperties.map((property) => (
                <PropertyCard
                  key={`discovery-${property.id}`}
                  property={property}
                  isSaved={savedIds?.has(property.id)}
                  onToggleSave={onToggleSave}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
