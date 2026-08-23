import React from "react";
import { LandingNavbar } from "../components/landing/LandingNavbar";
import { LandingHero } from "../components/landing/LandingHero";
import { QuickLinks } from "../components/landing/QuickLinks";
import { TrustStrip } from "../components/landing/TrustStrip";
import { FeaturedListings } from "../components/landing/FeaturedListings";
import { LandlordCTA } from "../components/landing/LandlordCTA";
import { LandingFooter } from "../components/landing/LandingFooter";

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col font-sans selection:bg-[#1E6B4A]/20 selection:text-[#1E6B4A]">
      {/* Top Navigation */}
      <LandingNavbar />

      {/* Hero with Search */}
      <LandingHero />

      {/* Quick Access Icon Row */}
      <QuickLinks />

      {/* Trust & Value Proposition Strip */}
      <TrustStrip />

      {/* Featured Verified Rentals Grid */}
      <FeaturedListings />

      {/* Landlords & Partner Agents CTA Section */}
      <LandlordCTA />

      {/* Comprehensive Footer */}
      <LandingFooter />
    </div>
  );
};
export default LandingPage;
