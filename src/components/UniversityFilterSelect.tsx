import React, { useState, useRef, useEffect, useMemo } from "react";
import { GraduationCap, Search, X, Check, ChevronDown, MapPin, Building2, BookOpen } from "lucide-react";
import { University, KENYAN_UNIVERSITIES } from "../data/universities";
import { supabase } from "../lib/supabase";

interface UniversityFilterSelectProps {
  selectedUniversityId: string | null;
  onSelectUniversity: (university: University | null) => void;
  selectedCounty?: string;
}

export const UniversityFilterSelect: React.FC<UniversityFilterSelectProps> = ({
  selectedUniversityId,
  onSelectUniversity,
  selectedCounty
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [universities, setUniversities] = useState<University[]>(KENYAN_UNIVERSITIES);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync with live Supabase universities table if available
  useEffect(() => {
    const fetchLiveUniversities = async () => {
      try {
        const { data, error } = await supabase
          .from("universities")
          .select("id, name, short_name, category, county, campus, nearby_estates, website")
          .eq("is_active", true)
          .order("name", { ascending: true });

        if (!error && data && data.length > 0) {
          setUniversities(data as University[]);
        }
      } catch (err) {
        // Fallback to KENYAN_UNIVERSITIES dataset
      }
    };
    fetchLiveUniversities();
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const selectedUniversity = useMemo(() => {
    if (!selectedUniversityId) return null;
    return universities.find((u) => u.id === selectedUniversityId) || null;
  }, [selectedUniversityId, universities]);

  // Filtered list based on search and category
  const filteredUniversities = useMemo(() => {
    let list = universities;

    // If a county is selected in parent filter and not "All Counties", prioritize or filter
    if (selectedCounty && selectedCounty !== "All Counties") {
      const countyMatches = list.filter(
        (u) => u.county.toLowerCase() === selectedCounty.toLowerCase()
      );
      // If county matches exist, use them, otherwise show all
      if (countyMatches.length > 0) {
        list = countyMatches;
      }
    }

    if (activeCategory !== "all") {
      list = list.filter((u) => u.category === activeCategory);
    }

    if (!searchQuery.trim()) return list;

    const query = searchQuery.toLowerCase().trim();
    return list.filter((u) => {
      const nameMatch = u.name.toLowerCase().includes(query);
      const shortMatch = u.short_name ? u.short_name.toLowerCase().includes(query) : false;
      const countyMatch = u.county.toLowerCase().includes(query);
      const campusMatch = u.campus ? u.campus.toLowerCase().includes(query) : false;
      const estateMatch = u.nearby_estates.some((estate) =>
        estate.toLowerCase().includes(query)
      );
      return nameMatch || shortMatch || countyMatch || campusMatch || estateMatch;
    });
  }, [universities, searchQuery, activeCategory, selectedCounty]);

  const handleSelect = (uni: University) => {
    onSelectUniversity(uni);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectUniversity(null);
    setSearchQuery("");
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case "public_university":
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-[#1E6B4A]">Public</span>;
      case "private_university":
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-[#D97706]">Private</span>;
      case "college_tvet":
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-800">College/TVET</span>;
      default:
        return null;
    }
  };

  return (
    <div className="relative w-full md:w-64" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between pl-3 pr-2.5 py-2.5 rounded-lg text-sm font-medium transition-all text-left border ${
          selectedUniversity
            ? "bg-emerald-50/90 border-[#1E6B4A] text-[#1E6B4A] shadow-xs"
            : "bg-white border-stone-200 hover:border-stone-300 text-stone-700 hover:bg-stone-50"
        }`}
        aria-expanded={isOpen}
      >
        <div className="flex items-center space-x-2 truncate pr-1">
          <GraduationCap className={`h-4 w-4 shrink-0 ${selectedUniversity ? "text-[#1E6B4A]" : "text-stone-400"}`} />
          <div className="truncate">
            {selectedUniversity ? (
              <span className="font-bold truncate text-xs sm:text-sm">
                {selectedUniversity.short_name || selectedUniversity.name}
              </span>
            ) : (
              <span className="text-stone-500 text-xs sm:text-sm">
                Near University / College...
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-1 shrink-0">
          {selectedUniversity ? (
            <span
              onClick={handleClear}
              className="p-1 hover:bg-emerald-200/60 rounded-full text-emerald-800 transition"
              title="Clear university filter"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          ) : (
            <ChevronDown className={`h-4 w-4 text-stone-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
          )}
        </div>
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-[310px] sm:w-[420px] max-w-[92vw] bg-white rounded-2xl border border-stone-200 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Popover Header & Search input */}
          <div className="p-3 border-b border-stone-100 bg-stone-50/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5 text-[#1E6B4A]" />
                <span>Filter by Kenyan Campus</span>
              </span>
              <span className="text-[11px] font-semibold text-stone-400">
                {filteredUniversities.length} institutions
              </span>
            </div>

            {/* Typeahead Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type university, campus, or estate (e.g. JKUAT, Juja, Chiromo, KU)..."
                className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4A]/20 focus:border-[#1E6B4A] text-stone-800 placeholder:text-stone-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Category Quick Filter Pills */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-0.5 text-[11px]">
              {[
                { id: "all", label: "All" },
                { id: "public_university", label: "Public Unis" },
                { id: "private_university", label: "Private Unis" },
                { id: "college_tvet", label: "Colleges/TVETs" }
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                    activeCategory === cat.id
                      ? "bg-[#1E6B4A] text-white"
                      : "bg-stone-200/70 text-stone-700 hover:bg-stone-300"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* List of Universities */}
          <div className="max-h-[320px] overflow-y-auto divide-y divide-stone-100 p-1">
            {selectedUniversity && (
              <div className="p-2 bg-emerald-50/70 rounded-xl mb-1 flex items-center justify-between border border-emerald-200/60">
                <div className="text-xs">
                  <span className="font-semibold text-stone-500">Active Filter:</span>{" "}
                  <span className="font-bold text-[#1E6B4A]">{selectedUniversity.name}</span>
                </div>
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-xs text-rose-600 font-bold hover:underline"
                >
                  Remove
                </button>
              </div>
            )}

            {filteredUniversities.length === 0 ? (
              <div className="py-8 text-center px-4 space-y-1">
                <p className="text-xs font-semibold text-stone-700">No institutions found matching "{searchQuery}"</p>
                <p className="text-[11px] text-stone-400">Try searching by town or estate (e.g. Juja, Njoro, Karen, Thika, CBD)</p>
              </div>
            ) : (
              filteredUniversities.map((uni) => {
                const isSelected = selectedUniversityId === uni.id;
                return (
                  <div
                    key={uni.id}
                    onClick={() => handleSelect(uni)}
                    className={`p-3 rounded-xl cursor-pointer transition-all flex flex-col space-y-1.5 ${
                      isSelected
                        ? "bg-emerald-50 border border-emerald-300"
                        : "hover:bg-stone-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start space-x-2">
                        <GraduationCap className={`h-4 w-4 mt-0.5 shrink-0 ${isSelected ? "text-[#1E6B4A]" : "text-stone-400"}`} />
                        <div>
                          <h4 className={`text-xs sm:text-sm font-bold leading-snug ${isSelected ? "text-[#1E6B4A]" : "text-stone-900"}`}>
                            {uni.name}
                          </h4>
                          {uni.campus && (
                            <span className="text-[11px] text-stone-500 font-medium">
                              Campus: {uni.campus}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-1.5 shrink-0">
                        {getCategoryBadge(uni.category)}
                        {isSelected && <Check className="h-4 w-4 text-[#1E6B4A]" />}
                      </div>
                    </div>

                    {/* Nearby Estates Tagline */}
                    <div className="pl-6 flex items-center flex-wrap gap-1 text-[11px] text-stone-500">
                      <MapPin className="h-3 w-3 text-amber-600 shrink-0 inline" />
                      <span className="font-semibold text-stone-600">{uni.county}:</span>
                      <span className="text-stone-500 line-clamp-1">
                        {uni.nearby_estates.slice(0, 4).join(", ")}
                        {uni.nearby_estates.length > 4 && ` +${uni.nearby_estates.length - 4} more`}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Tip */}
          <div className="p-2.5 bg-stone-50 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500 px-3">
            <span>Find student bedsitters, 1BRs & rooms</span>
            {selectedUniversity && (
              <button
                type="button"
                onClick={handleClear}
                className="text-stone-600 font-bold hover:text-red-600"
              >
                Clear filter
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
