import React from "react";
import { Link } from "react-router-dom";
import {
  Home,
  Building2,
  Bed,
  DoorOpen,
  LayoutGrid,
  Layers,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { PropertyItem } from "./PropertyCard";

interface PropertyCategoryProps {
  properties: PropertyItem[];
}

interface CategoryDefinition {
  key: string;
  label: string;
  description: string;
  icon: React.ElementType;
}

const CATEGORIES: CategoryDefinition[] = [
  {
    key: "bedsitter",
    label: "Bedsitters",
    description: "Self-contained units popular with students and early career pros",
    icon: Bed,
  },
  {
    key: "1br",
    label: "1 Bedroom",
    description: "Modern private living with separate bedroom and living room",
    icon: Home,
  },
  {
    key: "2br",
    label: "2 Bedrooms",
    description: "Spacious apartments ideal for roommates and small families",
    icon: Building2,
  },
  {
    key: "studio",
    label: "Studios",
    description: "Open-plan, light-filled spaces in secure urban courts",
    icon: LayoutGrid,
  },
  {
    key: "single_room",
    label: "Single Rooms",
    description: "Budget-friendly shared living options near campuses & stages",
    icon: DoorOpen,
  },
  {
    key: "3br",
    label: "3 Bedrooms",
    description: "Family homes with ensuite master bedrooms and balconies",
    icon: Layers,
  },
  {
    key: "4br",
    label: "4 Bedrooms",
    description: "Generous standalone villas and executive maisonettes",
    icon: Home,
  },
  {
    key: "5br_plus",
    label: "5+ Bedrooms",
    description: "Expansive multi-room properties and private compounds",
    icon: Sparkles,
  },
];

export const PropertyCategory: React.FC<PropertyCategoryProps> = ({ properties }) => {
  // Compute real counts dynamically from the live database properties
  const countMap: Record<string, number> = {};
  properties.forEach((p) => {
    if (p.type) {
      countMap[p.type] = (countMap[p.type] || 0) + 1;
    }
  });

  return (
    <section className="py-12 sm:py-16 bg-white border-y border-stone-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-10 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#1E6B4A]/10 text-[#1E6B4A] text-xs font-bold mb-2">
              <span>EXPLORE BY PROPERTY TYPE</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
              Homes Tailored to Your Lifestyle
            </h2>
            <p className="text-stone-600 text-sm sm:text-base mt-1.5 max-w-2xl">
              From budget-friendly bedsitters near universities to spacious multi-bedroom apartments across Kenya.
            </p>
          </div>
          <Link
            to="/listings"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-[#1E6B4A] hover:text-[#165339] group shrink-0"
          >
            <span>Browse All Categories</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Categories Grid / Horizontal Scroll on Mobile */}
        <div className="flex sm:grid overflow-x-auto sm:overflow-visible pb-4 sm:pb-0 gap-4 sm:gap-5 grid-cols-2 md:grid-cols-4 scrollbar-none snap-x snap-mandatory">
          {CATEGORIES.map((category) => {
            const Icon = category.icon;
            const count = countMap[category.key] || 0;

            return (
              <Link
                key={category.key}
                to={`/listings?type=${category.key}`}
                id={`category-${category.key}`}
                className="group snap-start min-w-[240px] sm:min-w-0 bg-stone-50 hover:bg-white p-5 rounded-2xl border border-stone-200/80 hover:border-[#1E6B4A]/40 hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-11 h-11 rounded-xl bg-white group-hover:bg-[#1E6B4A] border border-stone-200/70 group-hover:border-[#1E6B4A] flex items-center justify-center text-[#1E6B4A] group-hover:text-white transition-colors shadow-xs">
                      <Icon className="w-5 h-5" />
                    </div>
                    {count > 0 ? (
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#1E6B4A]/10 text-[#1E6B4A] border border-[#1E6B4A]/20">
                        {count} {count === 1 ? "listing" : "listings"}
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-stone-500">
                        Explore
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-stone-900 text-base group-hover:text-[#1E6B4A] transition-colors mb-1">
                    {category.label}
                  </h3>

                  <p className="text-stone-500 text-xs leading-relaxed line-clamp-2">
                    {category.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-200/50 flex items-center justify-between text-xs font-bold text-stone-700 group-hover:text-[#1E6B4A]">
                  <span>View rentals</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};
