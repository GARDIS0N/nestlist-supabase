import React from "react";
import { Link } from "react-router-dom";
import { Building, UserCheck, Key, Shield, ArrowRight, Sparkles, Check } from "lucide-react";

export const LandlordCTA: React.FC = () => {
  return (
    <section className="py-16 sm:py-24 bg-stone-50 border-t border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="text-xs uppercase font-extrabold tracking-widest text-[#D97706] bg-amber-100/70 px-3 py-1 rounded-full">
            Monetization & Lead Management
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-stone-900 mt-3 tracking-tight">
            Built for High ROI Property Owners & Managing Agents
          </h2>
          <p className="text-sm sm:text-base text-stone-600 mt-2">
            Choose between simple Pay-Once monthly listings or free Pay-Per-Lead posting where you only pay small credit fees to unlock verified tenant contact inquiries.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Landlord & Caretaker Panel */}
          <div className="bg-white rounded-3xl p-8 sm:p-10 border-2 border-[#1E6B4A]/20 shadow-md flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#1E6B4A]/5 rounded-bl-full pointer-events-none" />

            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-lg bg-[#1E6B4A]/10 text-[#1E6B4A] text-xs font-bold mb-4">
                <Building className="h-4 w-4" />
                <span>For Landlords & Caretakers</span>
              </div>

              <h3 className="text-2xl font-extrabold text-stone-900 tracking-tight mb-3">
                List For Free, Unlock High-Intent Tenant Leads
              </h3>

              <p className="text-sm text-stone-600 leading-relaxed mb-6">
                Post your bedsitters, single rooms, or family apartments at zero upfront cost. When active tenants submit inquiries, unlock their verified phone number and message with flexible Lead Credits.
              </p>

              <ul className="space-y-3 mb-8 text-xs sm:text-sm text-stone-700 font-medium">
                <li className="flex items-center space-x-2.5">
                  <div className="h-5 w-5 rounded-full bg-emerald-100 text-[#1E6B4A] flex items-center justify-center shrink-0">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <span>Instant automated M-Pesa STK push for single lead or bundle unlocks</span>
                </li>
                <li className="flex items-center space-x-2.5">
                  <div className="h-5 w-5 rounded-full bg-emerald-100 text-[#1E6B4A] flex items-center justify-center shrink-0">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <span>SMS alert delivered to your phone the instant a tenant submits an enquiry</span>
                </li>
                <li className="flex items-center space-x-2.5">
                  <div className="h-5 w-5 rounded-full bg-emerald-100 text-[#1E6B4A] flex items-center justify-center shrink-0">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <span>Sync all tenant leads directly to Google Drive spreadsheets with one click</span>
                </li>
              </ul>
            </div>

            <div className="pt-4 border-t border-stone-100 flex flex-col sm:flex-row items-center gap-3">
              <Link
                to="/list-property"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#1E6B4A] hover:bg-[#144932] text-white font-bold text-xs tracking-wide flex items-center justify-center space-x-2 shadow-sm transition-all"
              >
                <span>List a Property Free</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/pricing"
                className="w-full sm:w-auto px-5 py-3.5 rounded-xl text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 font-bold text-xs text-center transition-colors"
              >
                View Credit Pricing (KES 50/lead)
              </Link>
            </div>
          </div>

          {/* Real Estate Agents Panel */}
          <div className="bg-[#1E6B4A] rounded-3xl p-8 sm:p-10 text-white shadow-xl flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-white/5 rounded-full pointer-events-none" />

            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-lg bg-white/15 backdrop-blur-md text-amber-300 text-xs font-bold mb-4">
                <UserCheck className="h-4 w-4" />
                <span>For Real Estate Agents & Agencies</span>
              </div>

              <h3 className="text-2xl font-extrabold text-white tracking-tight mb-3">
                Scale Your Agency Portfolio with Partner Badges
              </h3>

              <p className="text-sm text-emerald-100 leading-relaxed mb-6">
                Manage multiple building portfolios under your verified Agency name. Unlock bulk leads, schedule viewings, and boost property reach across target Kenyan counties.
              </p>

              <ul className="space-y-3 mb-8 text-xs sm:text-sm text-emerald-50 font-medium">
                <li className="flex items-center space-x-2.5">
                  <div className="h-5 w-5 rounded-full bg-white/20 text-amber-300 flex items-center justify-center shrink-0">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <span>Verified Agency branding badge shown across all your listings</span>
                </li>
                <li className="flex items-center space-x-2.5">
                  <div className="h-5 w-5 rounded-full bg-white/20 text-amber-300 flex items-center justify-center shrink-0">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <span>Priority top ranking with 3-day, 7-day, 14-day, and 30-day listing boosts</span>
                </li>
                <li className="flex items-center space-x-2.5">
                  <div className="h-5 w-5 rounded-full bg-white/20 text-amber-300 flex items-center justify-center shrink-0">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <span>Role-based access control for multiple caretakers per estate</span>
                </li>
              </ul>
            </div>

            <div className="pt-4 border-t border-white/15 flex flex-col sm:flex-row items-center gap-3">
              <Link
                to="/signup"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#D97706] hover:bg-[#b45309] text-white font-bold text-xs tracking-wide flex items-center justify-center space-x-2 shadow-md transition-all"
              >
                <span>Become a Partner Agent</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/terms"
                className="w-full sm:w-auto px-5 py-3.5 rounded-xl text-emerald-100 hover:text-white bg-white/10 hover:bg-white/15 font-bold text-xs text-center transition-colors"
              >
                Agency Terms & Commission
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
