import React from "react";
import { Link } from "react-router-dom";
import { Search, Heart, MessageSquare, CreditCard, Send, Sparkles } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export const QuickLinks: React.FC = () => {
  const { profile } = useAuth();

  const links = [
    {
      label: "Search Listings",
      description: "Browse 100% verified homes",
      icon: Search,
      href: "/browse",
      color: "bg-emerald-50 text-[#1E6B4A] border-emerald-200",
    },
    {
      label: "Saved Homes",
      description: "Shortlisted rental units",
      icon: Heart,
      href: profile ? "/saved" : "/login",
      color: "bg-rose-50 text-rose-600 border-rose-200",
    },
    {
      label: "My Enquiries",
      description: "Track responses & viewings",
      icon: Send,
      href: profile ? (profile.role === "tenant" ? "/saved" : "/dashboard?tab=inquiries") : "/login",
      color: "bg-amber-50 text-[#D97706] border-amber-200",
    },
    {
      label: "M-Pesa Payments",
      description: "Fast STK Push & credit balances",
      icon: CreditCard,
      href: profile ? "/dashboard?tab=credits_boosts" : "/pricing",
      color: "bg-blue-50 text-blue-600 border-blue-200",
    },
    {
      label: "Host Messages",
      description: "Direct in-app secure chat",
      icon: MessageSquare,
      href: profile ? (profile.role === "tenant" ? "/saved" : "/dashboard?tab=inquiries") : "/login",
      color: "bg-purple-50 text-purple-600 border-purple-200",
    },
  ];

  return (
    <section className="relative -mt-10 sm:-mt-12 z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl shadow-stone-200/60 border border-stone-200/80 p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {links.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                to={item.href}
                className="group flex flex-col items-center text-center p-3.5 sm:p-4 rounded-xl sm:rounded-2xl hover:bg-stone-50 transition-all duration-200 hover:-translate-y-0.5 border border-transparent hover:border-stone-200"
              >
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center border ${item.color} mb-3 shadow-2xs group-hover:scale-110 transition-transform`}>
                  <Icon className="h-6 w-6" />
                </div>
                <span className="font-bold text-stone-900 text-xs sm:text-sm group-hover:text-[#1E6B4A] transition-colors leading-tight">
                  {item.label}
                </span>
                <span className="text-[11px] text-stone-500 font-medium mt-1 line-clamp-1 hidden sm:block">
                  {item.description}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};
