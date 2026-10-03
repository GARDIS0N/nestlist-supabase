import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapPin, Heart, ShieldCheck, Check, Sparkles } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";

export interface PropertyItem {
  id: string;
  title: string;
  description?: string;
  location: string;
  county?: string;
  estate?: string;
  price: number | string;
  type: string;
  images?: string[];
  amenities?: string[];
  status?: string;
  is_boosted?: boolean;
  boost_badge?: string;
  boost_tier?: string;
  created_at?: string;
  bedrooms?: number | string;
  bathrooms?: number | string;
}

interface PropertyCardProps {
  property: PropertyItem;
  isSaved?: boolean;
  onToggleSave?: (id: string) => void;
}

const TYPE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  single_room: { label: "Single Room", bg: "#ECFDF5", text: "#065F46" },
  bedsitter:   { label: "Bedsitter", bg: "#D1FAE5", text: "#065F46" },
  studio:      { label: "Studio", bg: "#A7F3D0", text: "#065F46" },
  "1br":       { label: "1 Bedroom", bg: "#F0FDF4", text: "#1E6B4A" },
  "2br":       { label: "2 Bedroom", bg: "#DCFCE7", text: "#166534" },
  "3br":       { label: "3 Bedroom", bg: "#FEF3C7", text: "#92400E" },
  "4br":       { label: "4 Bedroom", bg: "#FDE68A", text: "#78350F" },
  "5br_plus":  { label: "5+ Bedroom", bg: "#FEF9C3", text: "#713F12" },
};

export const getPropertyTypeLabel = (typeKey: string): string => {
  if (!typeKey) return "Rental";
  if (TYPE_CONFIG[typeKey]) return TYPE_CONFIG[typeKey].label;
  return typeKey.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

export const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  isSaved: initialIsSaved = false,
  onToggleSave,
}) => {
  const { profile, session } = useAuth();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(initialIsSaved);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Fallback high-quality architectural property image
  const fallbackImg = "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80";
  const rawImage = property.images && property.images.length > 0 ? property.images[0] : null;
  const coverImage = imgError || !rawImage ? fallbackImg : rawImage;

  const typeConfig = TYPE_CONFIG[property.type] || {
    label: getPropertyTypeLabel(property.type),
    bg: "#F3F4F6",
    text: "#374151",
  };

  const formattedPrice = typeof property.price === "number"
    ? property.price.toLocaleString()
    : parseFloat(property.price || "0").toLocaleString();

  const targetUrl = `/property/${property.id}`;
  const cardDestination = (session || profile)
    ? targetUrl
    : `/login?redirect=${encodeURIComponent(targetUrl)}`;

  const handleSaveClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (onToggleSave) {
      onToggleSave(property.id);
      setSaved(!saved);
      return;
    }

    if (!profile) {
      navigate(`/login?redirect=${encodeURIComponent(targetUrl)}`);
      return;
    }

    if (profile.role !== "tenant") {
      return;
    }

    const nextSaved = !saved;
    setSaved(nextSaved);

    try {
      if (nextSaved) {
        await supabase.from("saved_properties").insert({
          tenant_id: profile.id,
          property_id: property.id,
        });
      } else {
        await supabase
          .from("saved_properties")
          .delete()
          .eq("tenant_id", profile.id)
          .eq("property_id", property.id);
      }
    } catch (err) {
      console.warn("Could not toggle saved property:", err);
      setSaved(!nextSaved);
    }
  };

  return (
    <Link
      to={cardDestination}
      id={`property-card-${property.id}`}
      className="group bg-white rounded-2xl overflow-hidden border border-stone-200/80 hover:border-[#1E6B4A]/50 hover:shadow-xl transition-all duration-300 flex flex-col h-full focus:outline-none focus:ring-2 focus:ring-[#1E6B4A]/40"
    >
      {/* Property Visual Container */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-stone-100">
        <img
          src={coverImage}
          alt={property.title}
          loading="lazy"
          referrerPolicy="no-referrer"
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgError(true)}
          className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
            imgLoaded ? "opacity-100" : "opacity-90"
          }`}
        />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 max-w-[75%] pointer-events-none">
          {/* Property Type Badge */}
          <span
            style={{ backgroundColor: typeConfig.bg, color: typeConfig.text }}
            className="text-[11px] font-bold tracking-wide px-2.5 py-1 rounded-md shadow-xs backdrop-blur-xs"
          >
            {typeConfig.label}
          </span>

          {/* Boosted / Featured badge */}
          {property.is_boosted && (
            <span className="bg-gradient-to-r from-[#D97706] to-amber-500 text-white text-[11px] font-bold tracking-wide px-2.5 py-1 rounded-md shadow-xs flex items-center gap-1">
              <Sparkles className="w-3 h-3 fill-current" />
              <span>{property.boost_badge || "Featured"}</span>
            </span>
          )}
        </div>

        {/* Status / Verified Badge */}
        <div className="absolute top-3 right-3 pointer-events-none">
          <span className="bg-[#1E6B4A]/95 text-white text-[11px] font-bold px-2.5 py-1 rounded-md shadow-xs flex items-center gap-1 backdrop-blur-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
            <span>{property.status === "available" ? "Available" : "Verified"}</span>
          </span>
        </div>

        {/* Favorite Button */}
        {(!profile || profile.role === "tenant") && (
          <button
            type="button"
            onClick={handleSaveClick}
            aria-label={saved ? "Remove from saved" : "Save property"}
            className={`absolute bottom-3 right-3 p-2 rounded-full backdrop-blur-md border shadow-sm transition-all duration-200 cursor-pointer ${
              saved
                ? "bg-rose-50 border-rose-200 text-rose-600 scale-105"
                : "bg-white/85 border-white/60 text-stone-600 hover:text-rose-500 hover:bg-white"
            }`}
          >
            <Heart className={`w-4 h-4 ${saved ? "fill-current text-rose-600" : ""}`} />
          </button>
        )}

        {/* Image count pill if multiple */}
        {property.images && property.images.length > 1 && (
          <div className="absolute bottom-3 left-3 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white text-[10px] font-medium pointer-events-none">
            {property.images.length} Photos
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-4 sm:p-5 flex flex-col flex-1">
        {/* Price Typography */}
        <div className="flex items-baseline justify-between mb-1.5">
          <div className="flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
              KES {formattedPrice}
            </span>
            <span className="text-xs text-stone-500 font-medium">/ month</span>
          </div>
        </div>

        {/* Property Title */}
        <h3 className="font-bold text-stone-900 text-base line-clamp-1 group-hover:text-[#1E6B4A] transition-colors mb-1">
          {property.title}
        </h3>

        {/* Location Row */}
        <div className="flex items-center gap-1.5 text-stone-500 text-xs font-medium mb-3">
          <MapPin className="w-3.5 h-3.5 text-[#1E6B4A] shrink-0" />
          <span className="truncate">
            {property.location}
            {property.county && property.county !== "All Counties" ? `, ${property.county}` : ""}
          </span>
        </div>

        {/* Amenities Highlights (Real from DB) */}
        {property.amenities && property.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {property.amenities.slice(0, 3).map((amenity, idx) => (
              <span
                key={idx}
                className="bg-stone-100 text-stone-700 text-[11px] font-medium px-2 py-0.5 rounded border border-stone-200/60"
              >
                {amenity}
              </span>
            ))}
            {property.amenities.length > 3 && (
              <span className="bg-stone-50 text-stone-500 text-[10px] font-medium px-1.5 py-0.5 rounded border border-stone-200/50">
                +{property.amenities.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Card Footer Divider */}
        <div className="pt-3 border-t border-stone-100 mt-auto flex items-center justify-between text-xs">
          <span className="text-stone-500 font-medium flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#1E6B4A]" />
            <span>Direct Landlord Contact</span>
          </span>
          <span className="font-bold text-[#1E6B4A] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
            <span>View Details</span>
            <span>→</span>
          </span>
        </div>
      </div>
    </Link>
  );
};
