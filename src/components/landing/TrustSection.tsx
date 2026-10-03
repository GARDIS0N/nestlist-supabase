import React from "react";
import { ShieldCheck, MessageSquare, Search, Home } from "lucide-react";

export const TrustSection: React.FC = () => {
  const pillars = [
    {
      icon: ShieldCheck,
      title: "Verified Listings & Real Photos",
      description:
        "Every listing features authentic on-site photos and transparent pricing confirmed directly with landlords and property managers.",
    },
    {
      icon: MessageSquare,
      title: "Direct Landlord Communication",
      description:
        "Connect straight to property owners and registered caretakers. No brokers, no hidden middleman fees, and no gatekeeping.",
    },
    {
      icon: Search,
      title: "Simple Property Discovery",
      description:
        "Search by estate, county, or budget. Filter by exact property type so you only spend time on rentals that fit your needs.",
    },
    {
      icon: Home,
      title: "Built for Kenyan Lifestyles",
      description:
        "Transparent amenity details on water reliability (borehole/24-7), KPLC prepaid tokens, WiFi availability, and security guards.",
    },
  ];

  return (
    <section className="py-16 sm:py-20 bg-stone-50 border-b border-stone-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#1E6B4A]/10 text-[#1E6B4A] text-xs font-bold mb-3">
            <span>WHY CHOOSE NESTLIST</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-stone-900 tracking-tight">
            A Better Way to Rent in Kenya
          </h2>
          <p className="text-stone-600 text-sm sm:text-base mt-2.5 leading-relaxed">
            Finding a home shouldn't involve fake listings, unannounced broker fees, or exhausting walking tours. We built NestList to make house hunting straightforward and honest.
          </p>
        </div>

        {/* 4 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pillars.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl p-6 border border-stone-200/80 shadow-xs hover:border-[#1E6B4A]/40 hover:shadow-md transition-all flex flex-col"
              >
                <div className="w-12 h-12 rounded-xl bg-[#1E6B4A]/10 border border-[#1E6B4A]/20 flex items-center justify-center text-[#1E6B4A] mb-5">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-stone-900 text-base mb-2">
                  {pillar.title}
                </h3>
                <p className="text-stone-600 text-xs sm:text-sm leading-relaxed mt-auto">
                  {pillar.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
