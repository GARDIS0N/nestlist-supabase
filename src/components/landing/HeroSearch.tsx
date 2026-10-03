import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MapPin, Home, Banknote, ShieldCheck, Sparkles } from "lucide-react";

interface HeroSearchProps {
  totalListingsCount?: number;
}

const PROPERTY_TYPES = [
  { value: "all", label: "All Property Types" },
  { value: "single_room", label: "Single Room" },
  { value: "bedsitter", label: "Bedsitter" },
  { value: "studio", label: "Studio" },
  { value: "1br", label: "1 Bedroom" },
  { value: "2br", label: "2 Bedroom" },
  { value: "3br", label: "3 Bedroom" },
  { value: "4br", label: "4 Bedroom" },
  { value: "5br_plus", label: "5+ Bedroom" },
];

const BUDGET_OPTIONS = [
  { label: "Any Budget", min: "", max: "" },
  { label: "Under KES 10,000", min: "", max: "10000" },
  { label: "KES 10,000 - 20,000", min: "10000", max: "20000" },
  { label: "KES 20,000 - 40,000", min: "20000", max: "40000" },
  { label: "KES 40,000 - 70,000", min: "40000", max: "70000" },
  { label: "Above KES 70,000", min: "70000", max: "" },
];

const POPULAR_LOCATIONS = [
  "Murang'a",
  "Kericho",
  "Nairobi",
  "Kiambu",
  "Nakuru",
  "Kilimani",
  "Westlands",
  "Juja",
];

export const HeroSearch: React.FC<HeroSearchProps> = ({ totalListingsCount }) => {
  const navigate = useNavigate();
  const [location, setLocation] = useState("");
  const [propertyType, setPropertyType] = useState("all");
  const [budgetIndex, setBudgetIndex] = useState(0);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (location.trim()) {
      params.set("search", location.trim());
    }
    if (propertyType && propertyType !== "all") {
      params.set("type", propertyType);
    }
    const selectedBudget = BUDGET_OPTIONS[budgetIndex];
    if (selectedBudget.min) {
      params.set("minPrice", selectedBudget.min);
    }
    if (selectedBudget.max) {
      params.set("maxPrice", selectedBudget.max);
    }

    const queryString = params.toString();
    navigate(queryString ? `/listings?${queryString}` : "/listings");
  };

  const handleQuickLocation = (loc: string) => {
    navigate(`/listings?search=${encodeURIComponent(loc)}`);
  };

  return (
    <section className="relative w-full bg-stone-900 overflow-hidden min-h-[560px] sm:min-h-[620px] flex items-center justify-center">
      {/* High-quality Kenyan residential apartment background */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2000&q=80"
          alt="Modern residential living in Kenya"
          className="w-full h-full object-cover object-center brightness-[0.58] contrast-[1.05]"
          loading="eager"
          referrerPolicy="no-referrer"
        />
        {/* Soft atmospheric gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-900/60 to-black/40" />
      </div>

      {/* Main Hero Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
        {/* Direct Trust Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-emerald-300 text-xs font-semibold mb-6 shadow-sm">
          <ShieldCheck className="w-4 h-4 text-[#D97706]" />
          <span>Direct Access to Landlords & Verified Rentals Across Kenya</span>
          {typeof totalListingsCount === "number" && totalListingsCount > 0 && (
            <span className="hidden sm:inline-block px-2 py-0.2 rounded-full bg-white/20 text-white text-[11px] font-bold ml-1">
              {totalListingsCount} Live
            </span>
          )}
        </div>

        {/* Primary Headline */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.12] drop-shadow-sm max-w-4xl mx-auto">
          Find Your Next Home in Kenya
        </h1>

        {/* Supporting Subheadline */}
        <p className="mt-4 sm:mt-5 text-base sm:text-lg text-stone-200 font-normal max-w-2xl mx-auto drop-shadow-xs leading-relaxed">
          Discover properties, connect directly with landlords, and find a place you'll love.
        </p>

        {/* Prominent Property Search Interface */}
        <div className="mt-8 sm:mt-10 max-w-4xl mx-auto bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-2xl border border-white/90">
          <form
            onSubmit={handleSearch}
            className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center text-left"
          >
            {/* 1. Location Input */}
            <div className="md:col-span-4 bg-stone-50 rounded-xl px-3.5 py-2.5 border border-stone-200/80 focus-within:border-[#1E6B4A] focus-within:bg-white transition-all">
              <label
                htmlFor="search-location"
                className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-0.5"
              >
                Location or Estate
              </label>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#1E6B4A] shrink-0" />
                <input
                  id="search-location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Murang'a, Kericho, Nairobi..."
                  className="w-full bg-transparent text-stone-900 text-sm font-semibold placeholder:text-stone-400 focus:outline-none"
                />
              </div>
            </div>

            {/* 2. Property Type Select */}
            <div className="md:col-span-3 bg-stone-50 rounded-xl px-3.5 py-2.5 border border-stone-200/80 focus-within:border-[#1E6B4A] focus-within:bg-white transition-all">
              <label
                htmlFor="search-property-type"
                className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-0.5"
              >
                Property Type
              </label>
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4 text-[#1E6B4A] shrink-0" />
                <select
                  id="search-property-type"
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  className="w-full bg-transparent text-stone-900 text-sm font-semibold focus:outline-none cursor-pointer"
                >
                  {PROPERTY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 3. Budget Range Select */}
            <div className="md:col-span-3 bg-stone-50 rounded-xl px-3.5 py-2.5 border border-stone-200/80 focus-within:border-[#1E6B4A] focus-within:bg-white transition-all">
              <label
                htmlFor="search-budget"
                className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-0.5"
              >
                Monthly Budget
              </label>
              <div className="flex items-center gap-2">
                <Banknote className="w-4 h-4 text-[#D97706] shrink-0" />
                <select
                  id="search-budget"
                  value={budgetIndex}
                  onChange={(e) => setBudgetIndex(Number(e.target.value))}
                  className="w-full bg-transparent text-stone-900 text-sm font-semibold focus:outline-none cursor-pointer"
                >
                  {BUDGET_OPTIONS.map((opt, idx) => (
                    <option key={idx} value={idx}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 4. Search Submit Button */}
            <div className="md:col-span-2">
              <button
                type="submit"
                id="hero-search-submit"
                className="w-full py-3 sm:py-3.5 px-5 bg-[#1E6B4A] hover:bg-[#165339] text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer"
              >
                <Search className="w-4 h-4" />
                <span>Search</span>
              </button>
            </div>
          </form>
        </div>

        {/* Quick Popular Location Chips */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-stone-300">
          <span className="font-semibold text-stone-200">Popular Searches:</span>
          {POPULAR_LOCATIONS.map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => handleQuickLocation(loc)}
              className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-xs border border-white/15 text-stone-200 hover:text-white transition-all text-xs font-medium cursor-pointer"
            >
              {loc}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
