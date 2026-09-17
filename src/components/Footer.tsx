import React from "react";
import { Link } from "react-router-dom";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-stone-900 text-stone-400 border-t border-stone-800 text-xs py-8 text-center mt-12">
      <div className="max-w-7xl mx-auto px-4 space-y-2">
        <p className="font-bold text-white">Nestlist Rental Platforms Limited</p>
        <p className="text-white/60">
          Connecting Landlords and Tenants across Nairobi, Kiambu, Nakuru, Kisumu, and Mombasa.
        </p>
        <div className="flex justify-center space-x-4 text-white/60 text-[11px] font-medium pt-1">
          <Link to="/privacy" className="text-[#34D399] hover:text-white hover:underline transition">Privacy Policy</Link>
          <span>·</span>
          <Link to="/terms" className="text-[#34D399] hover:text-white hover:underline transition">Terms of Service</Link>
          <span>·</span>
          <a href="mailto:support@nestlist.co.ke" className="text-[#34D399] hover:text-white transition">Support: support@nestlist.co.ke</a>
        </div>
        <p className="text-[10.5px] text-white/40 pt-1">
          © 2026 Nestlist Rental Platforms Limited · Nairobi, Kenya · Secure payments via M-Pesa
        </p>
      </div>
    </footer>
  );
};
