import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Home, ArrowLeft, Search, Compass, ShieldAlert } from "lucide-react";

export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div id="not-found-page" className="min-h-[75vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Visual Badge */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-amber-50 border border-amber-200 text-amber-600 shadow-xs">
          <ShieldAlert className="w-10 h-10" />
        </div>

        {/* Status Code & Headings */}
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Error 404
          </span>
          <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight sm:text-4xl pt-2">
            Page Not Found
          </h1>
          <p className="text-sm text-stone-600 max-w-sm mx-auto leading-relaxed">
            The page or listing you are looking for might have been moved, deleted, or doesn't exist.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            id="not-found-back-button"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-700 font-semibold text-sm hover:bg-stone-50 hover:border-stone-400 transition shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>

          <Link
            to="/browse"
            id="not-found-browse-button"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-800 text-white font-semibold text-sm hover:bg-emerald-900 transition shadow-xs"
          >
            <Search className="w-4 h-4" />
            Browse Properties
          </Link>
        </div>

        {/* Useful Navigation Links */}
        <div className="pt-6 border-t border-stone-200 text-xs text-stone-500">
          <p className="font-medium text-stone-700 mb-2">Looking for something specific?</p>
          <div className="flex flex-wrap items-center justify-center gap-3 font-medium text-emerald-800">
            <Link to="/landing" className="hover:underline flex items-center gap-1">
              <Home className="w-3.5 h-3.5" /> Home
            </Link>
            <span>·</span>
            <Link to="/privacy" className="hover:underline">
              Privacy Policy
            </Link>
            <span>·</span>
            <Link to="/terms" className="hover:underline">
              Terms of Service
            </Link>
            <span>·</span>
            <a href="mailto:support@nestlist.co.ke" className="hover:underline">
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
