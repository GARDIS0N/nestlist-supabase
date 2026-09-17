import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  MapPin,
  GraduationCap,
  Home,
  CheckCircle2,
  Building,
  Key,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  Filter,
  Users,
  Smartphone,
  EyeOff
} from "lucide-react";

// ==========================================
// TYPES & PROP INTERFACES
// ==========================================

export interface ListingItem {
  id: string;
  title: string;
  price: number;
  bedrooms: string; // e.g., "Bedsitter", "1 Bedroom", "2 Bedrooms", "Single Room"
  estate: string; // e.g., "Kahawa Wendani", "Juja Gate C", "Madaraka"
  county?: string;
  distanceBadge?: string; // e.g., "6 min walk to KU Gate A", "800m to JKUAT Gate C"
  imageUrl?: string;
  universityName?: string;
  amenities?: string[];
  isVerified?: boolean;
}

export interface LandingStats {
  listingsCount?: string;
  universitiesCount?: string;
  landlordsCount?: string;
  tenantsServed?: string;
}

export interface LandingPageProps {
  universities?: string[];
  listings?: ListingItem[];
  stats?: LandingStats;
  heroHeadline?: string;
  heroSubheadline?: string;
}

// ==========================================
// DEFAULT MOCK & PLACEHOLDER DATA
// ==========================================

// TODO: Replace with live Supabase query (e.g., supabase.from('universities').select('name'))
const DEFAULT_UNIVERSITIES: string[] = [
  "Kenyatta University (KU) - Main Campus",
  "Jomo Kenyatta University (JKUAT) - Juja",
  "University of Nairobi (UoN) - Main & Chiromo",
  "Strathmore University - Madaraka",
  "USIU-Africa - Roysambu",
  "Mount Kenya University (MKU) - Thika",
  "Egerton University - Njoro Campus",
  "Moi University - Kesses Main Campus",
  "Maseno University - Main Campus",
  "Technical University of Kenya (TUK) - CBD",
  "Catholic University (CUEA) - Karen",
  "Daystar University - Valley Road / Athi River"
];

// TODO: Replace with live Supabase query (e.g., supabase.from('properties').select('*').limit(6))
const DEFAULT_LISTINGS: ListingItem[] = [
  {
    id: "prop-ku-wendani-1",
    title: "Modern Executive Bedsitter with Balcony",
    price: 9500,
    bedrooms: "Bedsitter",
    estate: "Kahawa Wendani, Nairobi",
    distanceBadge: "6 min walk to KU Gate A",
    universityName: "Kenyatta University",
    amenities: ["Borehole Water", "Prepaid Token", "CCTV", "High-speed Wi-Fi"],
    isVerified: true
  },
  {
    id: "prop-jkuat-juja-1",
    title: "Spacious 1 Bedroom Flat near Gate C",
    price: 14000,
    bedrooms: "1 Bedroom",
    estate: "Juja High Point, Kiambu",
    distanceBadge: "800m to JKUAT Gate C",
    universityName: "JKUAT Juja",
    amenities: ["Instant Shower", "Balcony", "24/7 Guard", "Borehole"],
    isVerified: true
  },
  {
    id: "prop-strathmore-madaraka-1",
    title: "Quiet Studio Apartment in Gated Court",
    price: 18500,
    bedrooms: "Studio",
    estate: "Madaraka Estate, Nairobi",
    distanceBadge: "400m to Strathmore University",
    universityName: "Strathmore University",
    amenities: ["Security Patrol", "Tiled Floors", "Water Storage", "Parking"],
    isVerified: true
  },
  {
    id: "prop-usiu-roysambu-1",
    title: "Comfortable 1 Bedroom with Ample Daylight",
    price: 15000,
    bedrooms: "1 Bedroom",
    estate: "Roysambu (TRM Area), Nairobi",
    distanceBadge: "5 min matatu to USIU",
    universityName: "USIU-Africa",
    amenities: ["Rooftop Access", "Wi-Fi Ready", "CCTV", "Near Stage"],
    isVerified: true
  },
  {
    id: "prop-uon-ngara-1",
    title: "Standard Bedsitter in Clean Quiet Block",
    price: 11000,
    bedrooms: "Bedsitter",
    estate: "Ngara / Parklands, Nairobi",
    distanceBadge: "10 min walk to UoN Chiromo",
    universityName: "University of Nairobi",
    amenities: ["Free Garbage Collection", "Constant Water", "Secure Gate"],
    isVerified: true
  },
  {
    id: "prop-jkuat-single-1",
    title: "Budget Tiled Single Room with Shared Amenities",
    price: 5500,
    bedrooms: "Single Room",
    estate: "Gachororo, Juja",
    distanceBadge: "10 min walk to JKUAT Gate A",
    universityName: "JKUAT Juja",
    amenities: ["Perimeter Wall", "Caretaker on Site", "Tokens Included"],
    isVerified: true
  }
];

const DEFAULT_STATS: LandingStats = {
  listingsCount: "1,450+",
  universitiesCount: "48+",
  landlordsCount: "920+",
  tenantsServed: "12,000+"
};

// ==========================================
// MAIN COMPONENT
// ==========================================

export const LandingPage: React.FC<LandingPageProps> = ({
  universities = DEFAULT_UNIVERSITIES,
  listings = DEFAULT_LISTINGS,
  stats = DEFAULT_STATS,
  heroHeadline = "Find your next home near campus",
  heroSubheadline = "Discover verified bedsitters, 1-bedrooms, and student rentals within walking distance of Kenyan universities. Zero viewing fees, direct landlord & caretaker contacts."
}) => {
  const navigate = useNavigate();

  // Search state
  const [searchLocation, setSearchLocation] = useState<string>("");
  const [selectedUniversity, setSelectedUniversity] = useState<string>("");
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>("all");
  const [selectedBedrooms, setSelectedBedrooms] = useState<string>("all");

  // Handle submit search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchLocation.trim()) params.append("search", searchLocation.trim());
    if (selectedUniversity) params.append("university", selectedUniversity);
    if (selectedPriceRange !== "all") params.append("price", selectedPriceRange);
    if (selectedBedrooms !== "all") params.append("bedrooms", selectedBedrooms);

    // Routes to /listings (or /browse) with query parameters
    navigate(`/listings?${params.toString()}`);
  };

  return (
    <div id="nestlist-landing-page" className="min-h-screen bg-stone-50 text-stone-900 font-sans">
      {/* =========================================================================
          SECTION 1: HERO SECTION
          Full-width hero with primary forest green, search inputs & filter chips
          ========================================================================= */}
      <section
        id="hero-section"
        className="relative bg-gradient-to-b from-[#1E6B4A] via-[#1E6B4A] to-[#165339] text-white pt-12 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden"
      >
        {/* Subtle decorative background pattern (CSS-only) */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white blur-3xl" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-[#D97706] blur-3xl" />
        </div>

        <div className="relative max-w-5xl mx-auto text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-semibold tracking-wide text-white backdrop-blur-xs">
            <span className="w-2 h-2 rounded-full bg-[#D97706] animate-pulse" />
            Kenya&apos;s Verified Student & Urban Rental Network
          </div>

          {/* Headline & Subheadline */}
          <div className="space-y-4 max-w-3xl mx-auto">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              {heroHeadline}
            </h1>
            <p className="text-base sm:text-lg text-stone-100/90 leading-relaxed font-normal">
              {heroSubheadline}
            </p>
          </div>

          {/* Prominent Search Bar */}
          <div className="max-w-4xl mx-auto bg-white rounded-2xl p-3 sm:p-4 shadow-xl border border-stone-200/40 text-stone-900 text-left">
            <form onSubmit={handleSearch} className="flex flex-col md:flex-row items-stretch gap-3">
              {/* Input 1: Location / Estate Text Search */}
              <div className="flex-1 relative">
                <label htmlFor="search-location" className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                  Location or Estate
                </label>
                <div className="relative">
                  <MapPin className="w-5 h-5 text-[#1E6B4A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="search-location"
                    type="text"
                    value={searchLocation}
                    onChange={(e) => setSearchLocation(e.target.value)}
                    placeholder="e.g. Wendani, Juja, Madaraka, Roysambu"
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-stone-200 bg-stone-50/70 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#1E6B4A] focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Input 2: Near University Dropdown */}
              <div className="flex-1 relative">
                <label htmlFor="select-university" className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                  Near University / College
                </label>
                <div className="relative">
                  <GraduationCap className="w-5 h-5 text-[#D97706] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    id="select-university"
                    value={selectedUniversity}
                    onChange={(e) => setSelectedUniversity(e.target.value)}
                    className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-stone-200 bg-stone-50/70 text-sm text-stone-900 focus:outline-none focus:border-[#1E6B4A] focus:bg-white transition appearance-none cursor-pointer"
                  >
                    <option value="">All Campuses Across Kenya</option>
                    {universities.map((uni) => (
                      <option key={uni} value={uni}>
                        {uni}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* CTA Search Button */}
              <div className="flex items-end pt-1 md:pt-0">
                <button
                  type="submit"
                  id="hero-search-button"
                  className="w-full md:w-auto px-7 py-3 rounded-xl bg-[#1E6B4A] hover:bg-[#165339] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                  <span>Search Listings</span>
                </button>
              </div>
            </form>

            {/* Filter Chips Bar */}
            <div className="mt-4 pt-3 border-t border-stone-100 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-stone-500 font-semibold flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-[#1E6B4A]" /> Quick Filters:
              </span>

              {/* Price Range Chips */}
              <button
                type="button"
                onClick={() => setSelectedPriceRange(selectedPriceRange === "under-10k" ? "all" : "under-10k")}
                className={`px-3 py-1 rounded-full border transition font-medium cursor-pointer ${
                  selectedPriceRange === "under-10k"
                    ? "bg-[#1E6B4A] text-white border-[#1E6B4A]"
                    : "bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200"
                }`}
              >
                Under KES 10,000
              </button>

              <button
                type="button"
                onClick={() => setSelectedPriceRange(selectedPriceRange === "10k-20k" ? "all" : "10k-20k")}
                className={`px-3 py-1 rounded-full border transition font-medium cursor-pointer ${
                  selectedPriceRange === "10k-20k"
                    ? "bg-[#1E6B4A] text-white border-[#1E6B4A]"
                    : "bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200"
                }`}
              >
                KES 10k - 20k
              </button>

              {/* Bedroom Type Chips */}
              <button
                type="button"
                onClick={() => setSelectedBedrooms(selectedBedrooms === "bedsitter" ? "all" : "bedsitter")}
                className={`px-3 py-1 rounded-full border transition font-medium cursor-pointer ${
                  selectedBedrooms === "bedsitter"
                    ? "bg-[#1E6B4A] text-white border-[#1E6B4A]"
                    : "bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200"
                }`}
              >
                Bedsitters
              </button>

              <button
                type="button"
                onClick={() => setSelectedBedrooms(selectedBedrooms === "1br" ? "all" : "1br")}
                className={`px-3 py-1 rounded-full border transition font-medium cursor-pointer ${
                  selectedBedrooms === "1br"
                    ? "bg-[#1E6B4A] text-white border-[#1E6B4A]"
                    : "bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200"
                }`}
              >
                1 Bedrooms
              </button>

              {/* Selected University Dynamic Chip */}
              {selectedUniversity && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-[#D97706]/40 text-[#D97706] font-semibold text-xs">
                  <span>🎓 Near {selectedUniversity.split("-")[0].trim()}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedUniversity("")}
                    className="hover:text-stone-900 font-bold ml-1"
                    title="Clear university filter"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 2: FEATURED LISTINGS GRID
          Responsive 3-col desktop / 1-col mobile, clickable with NO auth required
          ========================================================================= */}
      <section id="featured-listings" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1 text-xs font-bold text-[#D97706] uppercase tracking-wider mb-1">
              <span>Verified Rentals</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
              Featured Homes Near Campuses
            </h2>
            <p className="text-sm text-stone-600 mt-1">
              Browse available rentals directly. No login required to view pictures, rates, and amenities.
            </p>
          </div>

          <Link
            to="/listings"
            className="inline-flex items-center gap-1 text-sm font-bold text-[#1E6B4A] hover:text-[#165339] hover:underline transition self-start sm:self-auto"
          >
            <span>View all rentals</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Listings Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <Link
              key={listing.id}
              to={`/listings/${listing.id}`}
              id={`listing-card-${listing.id}`}
              className="group bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs hover:shadow-md hover:border-[#1E6B4A]/50 transition-all flex flex-col cursor-pointer"
            >
              {/* Property Image / Placeholder */}
              <div className="relative aspect-[4/3] bg-stone-100 overflow-hidden flex items-center justify-center">
                {/* TODO: Replace placeholder container with real Supabase Storage image url */}
                {listing.imageUrl ? (
                  <img
                    src={listing.imageUrl}
                    alt={listing.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-stone-100 text-stone-400 p-4 text-center">
                    <Building className="w-12 h-12 stroke-[1.2] text-[#1E6B4A]/40 mb-2" />
                    <span className="text-xs font-medium text-stone-500">NestList Verified Rental</span>
                  </div>
                )}

                {/* Badges Overlay */}
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                  <span className="px-2.5 py-1 rounded-md bg-stone-900/80 backdrop-blur-xs text-white text-xs font-semibold">
                    {listing.bedrooms}
                  </span>
                  {listing.isVerified && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#1E6B4A] text-white text-xs font-semibold">
                      <ShieldCheck className="w-3 h-3 text-amber-300" />
                      Verified
                    </span>
                  )}
                </div>

                {/* Distance Badge if available */}
                {listing.distanceBadge && (
                  <div className="absolute bottom-3 left-3 right-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/95 backdrop-blur-xs text-xs font-bold text-[#1E6B4A] shadow-xs border border-stone-200/80">
                      <GraduationCap className="w-3.5 h-3.5 text-[#D97706]" />
                      <span className="truncate">{listing.distanceBadge}</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Property Details */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xl font-extrabold text-[#1E6B4A]">
                      KES {listing.price.toLocaleString()}
                      <span className="text-xs font-medium text-stone-500"> / month</span>
                    </span>
                  </div>

                  <h3 className="font-bold text-stone-900 text-base line-clamp-1 group-hover:text-[#1E6B4A] transition-colors">
                    {listing.title}
                  </h3>

                  <div className="flex items-center gap-1 text-xs text-stone-500">
                    <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span className="truncate">{listing.estate}</span>
                  </div>
                </div>

                {/* Amenity tags */}
                {listing.amenities && listing.amenities.length > 0 && (
                  <div className="pt-2 border-t border-stone-100 flex flex-wrap gap-1.5 text-[11px] text-stone-600">
                    {listing.amenities.slice(0, 3).map((amenity, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-stone-100 border border-stone-200/60 font-medium">
                        {amenity}
                      </span>
                    ))}
                    {listing.amenities.length > 3 && (
                      <span className="px-1.5 py-0.5 text-stone-400 text-[10px] font-medium">
                        +{listing.amenities.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>

        {/* Mobile View All Button */}
        <div className="mt-8 text-center sm:hidden">
          <Link
            to="/listings"
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#1E6B4A] text-white font-bold text-sm shadow-xs"
          >
            <span>Browse All {stats.listingsCount || "Available"} Listings</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* =========================================================================
          SECTION 3: TWO-SIDED VALUE PROP SECTION
          Balanced split layout: Left = Tenants/Students, Right = Landlords/Caretakers
          ========================================================================= */}
      <section id="value-proposition" className="py-16 bg-white border-y border-stone-200/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
              A Transparent Rental Marketplace Built for Kenya
            </h2>
            <p className="text-sm text-stone-600">
              Connecting student & working tenants with direct property owners and verified caretakers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Side: Looking for a Home (Tenants) */}
            <div className="bg-stone-50 rounded-2xl p-6 sm:p-8 border border-stone-200 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#1E6B4A]/10 text-[#1E6B4A]">
                  <Home className="w-6 h-6" />
                </div>

                <div>
                  <h3 className="text-xl font-bold text-stone-900">Looking for a home</h3>
                  <p className="text-xs text-[#1E6B4A] font-semibold mt-0.5">For Students & Working Professionals</p>
                </div>

                <ul className="space-y-3 pt-2 text-sm text-stone-700">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#1E6B4A] shrink-0 mt-0.5" />
                    <span><strong>Zero Viewing Fees:</strong> Inspect listings and visit properties without paying unregulated agent viewing charges.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#1E6B4A] shrink-0 mt-0.5" />
                    <span><strong>Direct Contact:</strong> Reach genuine landlords and on-site caretakers directly once your inquiry is placed.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#1E6B4A] shrink-0 mt-0.5" />
                    <span><strong>Campus Walking Distance:</strong> Filter easily by campus gates, stages, and neighboring student estates.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#1E6B4A] shrink-0 mt-0.5" />
                    <span><strong>Transparent Amenities:</strong> See water schedules, token electricity status, security, and Wi-Fi readiness upfront.</span>
                  </li>
                </ul>
              </div>

              <div className="pt-2">
                <Link
                  to="/listings"
                  id="tenant-browse-cta"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#1E6B4A] hover:bg-[#165339] text-white font-bold text-sm shadow-xs transition cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                  <span>Browse Listings</span>
                </Link>
              </div>
            </div>

            {/* Right Side: I'm a Landlord or Caretaker */}
            <div className="bg-stone-50 rounded-2xl p-6 sm:p-8 border border-stone-200 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#D97706]/10 text-[#D97706]">
                  <Key className="w-6 h-6" />
                </div>

                <div>
                  <h3 className="text-xl font-bold text-stone-900">I&apos;m a landlord or caretaker</h3>
                  <p className="text-xs text-[#D97706] font-semibold mt-0.5">Fill Vacancies Faster with High-Intent Tenants</p>
                </div>

                <ul className="space-y-3 pt-2 text-sm text-stone-700">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                    <span><strong>Post in 2 Minutes:</strong> Upload your bedsitter, 1BR, or commercial units straight from your phone.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                    <span><strong>Instant SMS Notifications:</strong> Receive an alert to your phone the instant a tenant submits an inquiry.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                    <span><strong>Direct Tenant Leads:</strong> Unlock verified tenant names and phone numbers on-demand via M-Pesa.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                    <span><strong>Google Drive & Boost Ready:</strong> Keep property paperwork organized and boost listings to the top of search.</span>
                  </li>
                </ul>
              </div>

              <div className="pt-2">
                <Link
                  to="/list-property"
                  id="landlord-list-cta"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white border-2 border-[#1E6B4A] text-[#1E6B4A] hover:bg-[#1E6B4A] hover:text-white font-bold text-sm shadow-xs transition cursor-pointer"
                >
                  <Building className="w-4 h-4" />
                  <span>List Your Property</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 4: STATS BAR
          Horizontal strip with 3-4 stats accepting props with defaults
          ========================================================================= */}
      <section id="stats-bar" className="py-12 bg-stone-900 text-white px-4 sm:px-6 lg:px-8 border-t border-stone-800">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {/* Stat 1: Listings */}
            <div className="space-y-1">
              <p className="text-3xl sm:text-4xl font-extrabold text-white">
                {stats.listingsCount || "1,450+"}
              </p>
              <p className="text-xs sm:text-sm font-medium text-stone-400">
                Verified Listings
              </p>
            </div>

            {/* Stat 2: Universities */}
            <div className="space-y-1">
              <p className="text-3xl sm:text-4xl font-extrabold text-[#D97706]">
                {stats.universitiesCount || "48+"}
              </p>
              <p className="text-xs sm:text-sm font-medium text-stone-400">
                Universities Covered
              </p>
            </div>

            {/* Stat 3: Landlords */}
            <div className="space-y-1">
              <p className="text-3xl sm:text-4xl font-extrabold text-white">
                {stats.landlordsCount || "920+"}
              </p>
              <p className="text-xs sm:text-sm font-medium text-stone-400">
                Landlords & Caretakers
              </p>
            </div>

            {/* Stat 4: Zero Fees */}
            <div className="space-y-1">
              <p className="text-3xl sm:text-4xl font-extrabold text-[#34D399]">
                Zero
              </p>
              <p className="text-xs sm:text-sm font-medium text-stone-400">
                Viewing Fees Charged
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 5: FOOTER CTA
          Simple closing section with signup CTA - ONLY place account creation is pushed
          ========================================================================= */}
      <section id="footer-cta-section" className="py-16 px-4 sm:px-6 lg:px-8 bg-stone-100 border-t border-stone-200">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
              Ready to find or list your next rental?
            </h2>
            <p className="text-sm text-stone-600 max-w-xl mx-auto leading-relaxed">
              Join thousands of university students, working tenants, landlords, and caretakers across Nairobi, Kiambu, Nakuru, Eldoret, and Mombasa.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              to="/signup"
              id="footer-signup-cta-button"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-[#1E6B4A] hover:bg-[#165339] text-white font-bold text-sm shadow-md transition active:scale-[0.98] cursor-pointer"
            >
              <Users className="w-4 h-4" />
              <span>Create Free Account</span>
            </Link>

            <Link
              to="/listings"
              id="footer-explore-cta-button"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-white border border-stone-300 hover:bg-stone-50 text-stone-800 font-bold text-sm shadow-xs transition cursor-pointer"
            >
              <span>Explore All Listings</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <p className="text-xs text-stone-500 pt-2">
            Already have an account?{" "}
            <Link to="/login" className="text-[#1E6B4A] font-semibold hover:underline">
              Log in here
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
