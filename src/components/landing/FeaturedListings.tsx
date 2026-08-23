import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { MapPin, ArrowRight, Sparkles, Building2, Bed, Bath, ShieldCheck } from "lucide-react";
import { supabase } from "../../lib/supabase";

interface ListingItem {
  id: string;
  title: string;
  location: string;
  county: string;
  price: number;
  type: string;
  images: string[];
  bedrooms?: number;
  bathrooms?: number;
  is_boosted?: boolean;
}

const FALLBACK_FEATURED: ListingItem[] = [
  {
    id: "feat-1",
    title: "Executive Modern 2-Bedroom Master Ensuite",
    location: "Kilimani, Wood Avenue",
    county: "Nairobi",
    price: 65000,
    type: "2br",
    bedrooms: 2,
    bathrooms: 2,
    images: [
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80"
    ],
    is_boosted: true
  },
  {
    id: "feat-2",
    title: "Spacious Sunlit Bedsitter with Balcony & WiFi",
    location: "Ruaka, Near Two Rivers",
    county: "Kiambu",
    price: 16000,
    type: "bedsitter",
    bedrooms: 1,
    bathrooms: 1,
    images: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80"
    ],
    is_boosted: true
  },
  {
    id: "feat-3",
    title: "Modern 1-Bedroom Apartment with Lift & Borehole",
    location: "Westlands, Rhapta Road",
    county: "Nairobi",
    price: 45000,
    type: "1br",
    bedrooms: 1,
    bathrooms: 1,
    images: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80"
    ],
    is_boosted: false
  },
  {
    id: "feat-4",
    title: "Charming 3-Bedroom Gated Villa with Garden",
    location: "Milimani, Section 58",
    county: "Nakuru",
    price: 55000,
    type: "3br",
    bedrooms: 3,
    bathrooms: 2,
    images: [
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80"
    ],
    is_boosted: true
  },
  {
    id: "feat-5",
    title: "Lake-View Modern 2BR with High-Speed Internet",
    location: "Tom Mboya Estate",
    county: "Kisumu",
    price: 32000,
    type: "2br",
    bedrooms: 2,
    bathrooms: 2,
    images: [
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80"
    ],
    is_boosted: false
  },
  {
    id: "feat-6",
    title: "Luxury 1-Bedroom Serviced Apartment",
    location: "Nyali Links Road",
    county: "Mombasa",
    price: 38000,
    type: "1br",
    bedrooms: 1,
    bathrooms: 1,
    images: [
      "https://images.unsplash.com/photo-1502005229762-ee1b2da97e06?auto=format&fit=crop&w=800&q=80"
    ],
    is_boosted: false
  }
];

export const FeaturedListings: React.FC = () => {
  const [listings, setListings] = useState<ListingItem[]>(FALLBACK_FEATURED);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFeatured = async () => {
      try {
        const { data, error } = await supabase
          .from("properties")
          .select("id, title, location, county, price, type, images, is_boosted")
          .eq("is_active", true)
          .order("is_boosted", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(6);

        if (!error && data && data.length > 0) {
          setListings(data as any);
        }
      } catch (e) {
        console.warn("Could not fetch live featured properties, using fallback dataset.");
      } finally {
        setLoading(false);
      }
    };
    loadFeatured();
  }, []);

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat("en-KE").format(val);
  };

  const getBedroomsCount = (type: string) => {
    switch (type) {
      case "single_room":
      case "bedsitter":
      case "studio":
        return "Studio/Room";
      case "1br":
        return "1 Bed";
      case "2br":
        return "2 Beds";
      case "3br":
        return "3 Beds";
      case "4br":
        return "4 Beds";
      default:
        return "Multiple";
    }
  };

  return (
    <section className="py-16 sm:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10">
          <div>
            <div className="flex items-center space-x-2 text-[#D97706] text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="h-4 w-4" />
              <span>Handpicked For You</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-stone-900 tracking-tight">
              Featured Verified Rentals in Kenya
            </h2>
            <p className="text-sm sm:text-base text-stone-600 mt-2">
              Explore recently listed and top-rated homes ready for immediate occupation.
            </p>
          </div>
          <Link
            to="/browse"
            className="mt-4 sm:mt-0 inline-flex items-center space-x-1.5 text-sm font-bold text-[#1E6B4A] hover:text-[#144932] group"
          >
            <span>View all 500+ listings</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Listings Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {listings.map((item) => {
            const thumbnail =
              item.images && item.images.length > 0
                ? item.images[0]
                : "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80";

            return (
              <div
                key={item.id}
                className="group bg-white rounded-2xl overflow-hidden border border-stone-200 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between hover:-translate-y-1"
              >
                <div>
                  {/* Image Container */}
                  <div className="relative aspect-4/3 w-full bg-stone-100 overflow-hidden">
                    <img
                      src={thumbnail}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                      <span className="px-2.5 py-1 rounded-md bg-[#1E6B4A] text-white text-[11px] font-bold shadow-xs">
                        KSh {formatPrice(item.price)}/mo
                      </span>
                      {item.is_boosted && (
                        <span className="px-2 py-0.5 rounded-md bg-[#D97706] text-white text-[10px] font-bold uppercase tracking-wider shadow-2xs">
                          Boosted
                        </span>
                      )}
                    </div>
                    <div className="absolute bottom-3 left-3 px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-white text-[11px] font-medium flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3 text-emerald-400" />
                      <span>Verified Host</span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5">
                    <div className="flex items-center text-xs text-stone-500 mb-1.5">
                      <MapPin className="h-3.5 w-3.5 mr-1 text-[#1E6B4A] shrink-0" />
                      <span className="truncate">{item.location}, {item.county}</span>
                    </div>

                    <h3 className="font-bold text-stone-900 text-base leading-snug line-clamp-1 group-hover:text-[#1E6B4A] transition-colors">
                      {item.title}
                    </h3>

                    {/* Meta Specs */}
                    <div className="flex items-center space-x-4 mt-3 pt-3 border-t border-stone-100 text-xs text-stone-600 font-medium">
                      <div className="flex items-center space-x-1">
                        <Bed className="h-3.5 w-3.5 text-stone-400" />
                        <span>{getBedroomsCount(item.type)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Building2 className="h-3.5 w-3.5 text-stone-400" />
                        <span className="capitalize">{item.type.replace("_", " ")}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Action */}
                <div className="px-5 pb-5 pt-1">
                  <Link
                    to={`/property/${item.id}`}
                    className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-stone-50 hover:bg-[#1E6B4A] text-stone-800 hover:text-white border border-stone-200 hover:border-[#1E6B4A] text-xs font-bold transition-all"
                  >
                    <span>View Listing & Enquire</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
