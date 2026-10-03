import React from "react";
import { Link } from "react-router-dom";
import { Building2, ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";

export const LandlordCTA: React.FC = () => {
  return (
    <section className="py-16 sm:py-20 bg-stone-900 text-white relative overflow-hidden">
      {/* Subtle background texture */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#1E6B4A_1px,transparent_1px)] [background-size:16px_16px]" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-stone-800/90 to-stone-900/90 border border-stone-700/80 rounded-3xl p-8 sm:p-12 lg:p-16 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1E6B4A]/30 border border-[#1E6B4A]/50 text-emerald-300 text-xs font-semibold">
                <Building2 className="w-3.5 h-3.5 text-[#D97706]" />
                <span>FOR LANDLORDS & PROPERTY MANAGERS</span>
              </div>

              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                Fill Your Vacancies Faster With Verified Kenyan Renters
              </h2>

              <p className="text-stone-300 text-sm sm:text-base leading-relaxed max-w-xl">
                List your bedsitters, apartments, or houses in minutes. Receive direct inquiries from serious tenants, track inquiries in real-time, and manage everything with zero fuss.
              </p>

              <div className="pt-2 flex flex-wrap gap-4 text-xs sm:text-sm text-stone-300 font-medium">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#D97706]" />
                  <span>Direct SMS & WhatsApp Inquiries</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#D97706]" />
                  <span>Automated M-Pesa Integration</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#D97706]" />
                  <span>Zero Commission on Rent</span>
                </div>
              </div>
            </div>

            {/* Right Action Buttons */}
            <div className="lg:col-span-5 flex flex-col sm:flex-row lg:flex-col gap-3.5 sm:justify-center">
              <Link
                to="/list-property"
                id="cta-list-property"
                className="w-full py-4 px-6 rounded-xl bg-[#1E6B4A] hover:bg-[#165339] text-white font-bold text-sm text-center flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
              >
                <span>List Your Property Today</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                to="/pricing"
                id="cta-view-pricing"
                className="w-full py-4 px-6 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold text-sm text-center transition-all"
              >
                <span>View Landlord Pricing Plans</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
