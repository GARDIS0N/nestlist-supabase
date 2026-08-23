import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Menu, X, Home, PlusCircle, User, Shield, HelpCircle, Building, Users } from "lucide-react";

export const LandingNavbar: React.FC = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo / Wordmark */}
          <div className="flex items-center space-x-3">
            <Link to="/" className="flex items-center space-x-2.5 group">
              <div className="h-10 w-10 rounded-xl bg-[#1E6B4A] flex items-center justify-center text-white shadow-md shadow-[#1E6B4A]/20 transition-transform group-hover:scale-105">
                <Home className="h-5 w-5 text-[#D97706]" />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-black tracking-tight text-[#1E6B4A] leading-none">
                  Nest<span className="text-[#D97706]">List</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest text-stone-500 mt-0.5">
                  Kenyan Rental Hub
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              to="/browse"
              className="text-sm font-semibold text-stone-700 hover:text-[#1E6B4A] transition-colors"
            >
              Rent
            </Link>
            <Link
              to="/list-property"
              className="text-sm font-semibold text-stone-700 hover:text-[#1E6B4A] transition-colors"
            >
              List a Property
            </Link>
            <Link
              to="/pricing"
              className="text-sm font-semibold text-stone-700 hover:text-[#1E6B4A] transition-colors"
            >
              For Landlords
            </Link>
            <Link
              to="/terms"
              className="text-sm font-semibold text-stone-700 hover:text-[#1E6B4A] transition-colors"
            >
              For Caretakers
            </Link>
            <Link
              to="/privacy"
              className="text-sm font-semibold text-stone-700 hover:text-[#1E6B4A] transition-colors"
            >
              Help & Safety
            </Link>
          </nav>

          {/* Action CTAs */}
          <div className="hidden sm:flex items-center space-x-3.5">
            {profile ? (
              <div className="flex items-center space-x-3">
                <Link
                  to={profile.role === "tenant" ? "/saved" : "/dashboard"}
                  className="px-4 py-2 text-xs font-bold text-stone-700 hover:text-[#1E6B4A] bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
                >
                  Dashboard
                </Link>
                <button
                  onClick={() => signOut()}
                  className="px-3 py-2 text-xs font-semibold text-stone-500 hover:text-red-600 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-5 py-2.5 text-xs font-bold tracking-wide text-white bg-[#D97706] hover:bg-[#b45309] rounded-xl shadow-xs shadow-[#D97706]/30 transition-all hover:scale-[1.02]"
                >
                  Sign In
                </Link>
                <Link
                  to="/list-property"
                  className="px-5 py-2.5 text-xs font-bold tracking-wide text-[#1E6B4A] border-2 border-[#1E6B4A] hover:bg-[#1E6B4A] hover:text-white rounded-xl transition-all"
                >
                  List Your Property
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-stone-200 bg-white px-4 pt-3 pb-6 space-y-3">
          <Link
            to="/browse"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-50 rounded-lg"
          >
            Rent Properties
          </Link>
          <Link
            to="/list-property"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-50 rounded-lg"
          >
            List a Property
          </Link>
          <Link
            to="/pricing"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-50 rounded-lg"
          >
            For Landlords & Pricing
          </Link>
          <Link
            to="/terms"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-50 rounded-lg"
          >
            For Caretakers & Agents
          </Link>
          <Link
            to="/privacy"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-50 rounded-lg"
          >
            Help & Safety
          </Link>

          <div className="pt-4 border-t border-stone-100 flex flex-col space-y-2">
            {!profile ? (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 text-xs font-bold text-white bg-[#D97706] rounded-xl"
                >
                  Sign In
                </Link>
                <Link
                  to="/list-property"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 text-xs font-bold text-[#1E6B4A] border border-[#1E6B4A] rounded-xl"
                >
                  List Your Property
                </Link>
              </>
            ) : (
              <Link
                to={profile.role === "tenant" ? "/saved" : "/dashboard"}
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 text-xs font-bold text-white bg-[#1E6B4A] rounded-xl"
              >
                Go to Dashboard
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
