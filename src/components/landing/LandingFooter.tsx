import React from "react";
import { Link } from "react-router-dom";
import { Home, Mail, Phone, MapPin, Shield, Heart } from "lucide-react";

export const LandingFooter: React.FC = () => {
  return (
    <footer className="bg-stone-900 text-stone-300 border-t border-stone-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-18">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center space-x-2.5">
              <div className="h-9 w-9 rounded-xl bg-[#1E6B4A] flex items-center justify-center text-white shadow-xs">
                <Home className="h-5 w-5 text-[#D97706]" />
              </div>
              <span className="text-2xl font-black tracking-tight text-white">
                Nest<span className="text-[#D97706]">List</span>
              </span>
            </Link>

            <p className="text-xs sm:text-sm text-stone-400 max-w-sm leading-relaxed">
              Kenya’s trusted property rental marketplace. Connecting prospective tenants, landlords, caretakers, and verified real estate agencies with complete transparency.
            </p>

            <div className="space-y-1.5 text-xs text-stone-400 pt-2">
              <div className="flex items-center space-x-2">
                <Mail className="h-3.5 w-3.5 text-[#D97706]" />
                <a href="mailto:info@nestlist.com" className="hover:text-white transition-colors">
                  info@nestlist.com
                </a>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="h-3.5 w-3.5 text-[#1E6B4A]" />
                <span>Nairobi & Across all 47 Counties, Kenya</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Rentals
            </h4>
            <ul className="space-y-2 text-xs text-stone-400">
              <li>
                <Link to="/browse?type=bedsitter" className="hover:text-white transition-colors">
                  Bedsitters
                </Link>
              </li>
              <li>
                <Link to="/browse?type=1br" className="hover:text-white transition-colors">
                  1 Bedroom Apartments
                </Link>
              </li>
              <li>
                <Link to="/browse?type=2br" className="hover:text-white transition-colors">
                  2 Bedroom Apartments
                </Link>
              </li>
              <li>
                <Link to="/browse?county=Nairobi" className="hover:text-white transition-colors">
                  Nairobi Rentals
                </Link>
              </li>
              <li>
                <Link to="/browse?county=Nakuru" className="hover:text-white transition-colors">
                  Nakuru Properties
                </Link>
              </li>
            </ul>
          </div>

          {/* For Landlords & Agents */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Property Hosts
            </h4>
            <ul className="space-y-2 text-xs text-stone-400">
              <li>
                <Link to="/list-property" className="hover:text-white transition-colors">
                  List Your Property
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="hover:text-white transition-colors">
                  Pricing & Lead Credits
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-white transition-colors">
                  Host Dashboard
                </Link>
              </li>
              <li>
                <Link to="/signup" className="hover:text-white transition-colors">
                  Partner Agent Program
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-white transition-colors">
                  Caretaker Management
                </Link>
              </li>
            </ul>
          </div>

          {/* Safety & Legal */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Trust & Legal
            </h4>
            <ul className="space-y-2 text-xs text-stone-400">
              <li>
                <Link to="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-white transition-colors">
                  Tenant Security Guidelines
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-white transition-colors">
                  Contact Support
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-4">
          <p>
            © {new Date().getFullYear()} Nestlist Rental Platforms Limited · nestlist.co.ke. All rights reserved.
          </p>
          <div className="flex items-center space-x-4">
            <span>Built with ❤️ in Kenya</span>
            <span>·</span>
            <Link to="/privacy" className="hover:text-stone-400 transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-stone-400 transition-colors">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
