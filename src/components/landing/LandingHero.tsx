import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MapPin, Sparkles, CheckCircle2 } from "lucide-react";

export const LandingHero: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/browse?search=${encodeURIComponent(searchTerm.trim())}`);
    } else {
      navigate("/browse");
    }
  };

  const popularLocations = [
    "Kilimani",
    "Westlands",
    "Nakuru",
    "Ruaka",
    "Kisumu",
    "Mombasa Road",
    "Kileleshwa",
    "Eldoret"
  ];

  return (
    <section className="relative w-full min-h-[580px] lg:min-h-[640px] flex items-center justify-center overflow-hidden bg-stone-900">
      {/* Hero Background Image with Kenyan Warmth & Gradient Mask */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2000&q=80"
          alt="Modern Kenyan residential home"
          className="w-full h-full object-cover object-center brightness-[0.62] contrast-[1.05]"
          referrerPolicy="no-referrer"
        />
        {/* Soft Vignette & Brand Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-900/40 to-black/30" />
      </div>

      {/* Content Container */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
        {/* Verification Tag */}
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-emerald-300 text-xs font-semibold mb-6 shadow-xs animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-[#D97706]" />
          <span>Direct Access to Verified Kenyan Rentals & Hosts</span>
        </div>

        {/* Punchy Zillow-Style Stacked Headline */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.15] drop-shadow-sm">
          Rentals. Landlords. Caretakers. <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-[#D97706] to-amber-200">
            Verified & Seamless.
          </span>
        </h1>

        <p className="mt-4 sm:mt-5 text-base sm:text-lg text-stone-200 font-medium max-w-2xl mx-auto drop-shadow-xs">
          Discover verified bedsitters, modern 1 & 2-bedroom apartments, and family houses across Kenya with instant M-Pesa automated workflows.
        </p>

        {/* Large Rounded Search Bar */}
        <form
          onSubmit={handleSearchSubmit}
          className="mt-8 sm:mt-10 max-w-2xl mx-auto relative flex items-center bg-white rounded-2xl sm:rounded-full p-2 sm:p-2.5 shadow-2xl border-2 border-white/80 focus-within:ring-4 focus-within:ring-[#1E6B4A]/30 transition-all"
        >
          <div className="pl-3 sm:pl-4 text-stone-400">
            <MapPin className="h-5 w-5 text-[#1E6B4A]" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Enter a neighborhood, estate, or town (e.g. Kilimani, Nakuru, Westlands)..."
            className="w-full bg-transparent px-3 sm:px-4 py-2.5 text-sm sm:text-base text-stone-900 placeholder:text-stone-400 focus:outline-none font-medium"
          />
          <button
            type="submit"
            className="flex items-center justify-center space-x-2 px-6 py-3.5 sm:py-3 rounded-xl sm:rounded-full bg-[#D97706] hover:bg-[#b45309] text-white font-bold text-sm shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Search Rentals</span>
          </button>
        </form>

        {/* Popular Locations & Campus Chips */}
        <div className="mt-6 space-y-2 text-xs text-stone-300">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="font-semibold text-white/90">Estates:</span>
            {popularLocations.map((loc) => (
              <button
                key={loc}
                onClick={() => navigate(`/browse?search=${encodeURIComponent(loc)}`)}
                className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-xs border border-white/15 text-stone-200 hover:text-white transition-all text-xs font-medium"
              >
                {loc}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <span className="font-semibold text-amber-300 flex items-center gap-1">
              <span>🎓 Campuses:</span>
            </span>
            {[
              { label: "JKUAT Juja", id: "jkuat-juja" },
              { label: "KU Main", id: "ku-main" },
              { label: "UoN Chiromo/Main", id: "uon-main" },
              { label: "Strathmore", id: "strathmore-univ" },
              { label: "USIU-Africa", id: "usiu-africa" },
              { label: "Egerton Njoro", id: "egerton-njoro" },
              { label: "Moi Kesses", id: "moi-kesses" },
              { label: "Maseno", id: "maseno-main" }
            ].map((campus) => (
              <button
                key={campus.id}
                onClick={() => navigate(`/browse?university=${encodeURIComponent(campus.id)}`)}
                className="px-2.5 py-0.5 rounded-full bg-emerald-950/60 hover:bg-emerald-900/80 backdrop-blur-xs border border-emerald-400/40 text-emerald-200 hover:text-white transition-all text-[11px] font-medium"
              >
                {campus.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
