import React from "react";
import { ShieldCheck, Smartphone, Users, Zap, CheckCircle } from "lucide-react";

export const TrustStrip: React.FC = () => {
  const values = [
    {
      icon: ShieldCheck,
      title: "100% Verified Listings",
      desc: "Every rental is verified through photo audits, geolocation checks, and owner validation."
    },
    {
      icon: Smartphone,
      title: "Instant M-Pesa Automated",
      desc: "Instant Daraja STK push confirmations with zero manual receipt uploads or delays."
    },
    {
      icon: Users,
      title: "Landlords & Caretakers Direct",
      desc: "Connect directly with legitimate property managers, authorized caretakers, and verified owners."
    },
    {
      icon: Zap,
      title: "No Hidden Middleman Fees",
      desc: "Tenants browse and enquire completely free with transparent, upfront pricing."
    }
  ];

  return (
    <section className="py-14 sm:py-18 bg-stone-50 border-b border-stone-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
          <span className="text-xs uppercase font-extrabold tracking-widest text-[#1E6B4A] bg-emerald-100/70 px-3 py-1 rounded-full">
            The NestList Standard
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 mt-3 tracking-tight">
            Built for Kenyan House Hunters & Property Managers
          </h2>
          <p className="text-sm sm:text-base text-stone-600 mt-2">
            Eliminating broker scams, ghost listings, and viewing fees with transparent technology.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {values.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="h-12 w-12 rounded-xl bg-[#1E6B4A]/10 text-[#1E6B4A] flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-bold text-stone-900 mb-2 leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center text-[11px] font-semibold text-[#1E6B4A]">
                  <CheckCircle className="h-3.5 w-3.5 mr-1.5 text-[#D97706]" />
                  <span>NestList Guarantee</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
