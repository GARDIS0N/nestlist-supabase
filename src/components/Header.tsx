import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Home, Heart, Bell, LayoutDashboard, Shield, LogOut, User, Menu, X } from "lucide-react";

export const Header: React.FC = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  // Check if current user has the admin privilege
  // Admin is specified by the silentwhisper email or hardcoded as Peter Kamau / grace for mock testing
  const isAdmin = profile?.id === "admin-1" || profile?.id === "landlord-1" || profile?.full_name === "Peter Kamau";

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const linkStyle = (path: string) => {
    return `flex items-center space-x-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
      isActive(path)
        ? "bg-amber-100/70 text-amber-900"
        : "text-stone-600 hover:text-amber-800 hover:bg-stone-100"
    }`;
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-stone-200/80 bg-white/95 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-600 to-amber-500 text-white shadow-md shadow-amber-600/10">
              <span className="font-sans text-xl font-black tracking-tighter">N</span>
            </div>
            <div>
              <span className="font-sans text-lg font-bold tracking-tight text-stone-900">
                Nest<span className="text-amber-600">list</span>
              </span>
              <span className="block text-[10px] font-medium text-stone-400 -mt-1 tracking-wider uppercase">
                Kenyan Rentals
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          {profile && (
            <nav className="hidden md:flex items-center space-x-1">
              <Link to="/" className={linkStyle("/")}>
                <Home className="h-4 w-4" />
                <span>Browse</span>
              </Link>

              {profile.role === "tenant" && (
                <>
                  <Link to="/saved" className={linkStyle("/saved")}>
                    <Heart className="h-4 w-4 text-rose-500 fill-current" />
                    <span>Saved</span>
                  </Link>
                  <Link to="/alerts" className={linkStyle("/alerts")}>
                    <Bell className="h-4 w-4 text-amber-600" />
                    <span>Alerts</span>
                  </Link>
                </>
              )}

              {profile.role === "landlord" && (
                <Link to="/dashboard" className={linkStyle("/dashboard")}>
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Landlord Hub</span>
                </Link>
              )}

              {isAdmin && (
                <Link to="/admin" className={linkStyle("/admin")}>
                  <Shield className="h-4 w-4 text-amber-700" />
                  <span>Admin</span>
                </Link>
              )}
            </nav>
          )}

          {/* User Widget */}
          <div className="hidden md:flex items-center space-x-4">
            {profile ? (
              <div className="flex items-center space-x-3 pl-3 border-l border-stone-200">
                <div className="text-right">
                  <p className="text-sm font-semibold text-stone-800 leading-tight">
                    {profile.full_name}
                  </p>
                  <Link
                    to="/onboarding?edit=true"
                    className="text-[10px] font-bold text-amber-600 hover:text-amber-700 hover:underline block text-right mt-0.5"
                  >
                    Edit Profile
                  </Link>
                </div>
                <Link to="/onboarding?edit=true" title="Edit Profile">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name}
                      className="h-9 w-9 rounded-full object-cover border border-stone-200 shadow-sm hover:ring-2 hover:ring-amber-500 transition-all"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-stone-600 border border-stone-200 hover:border-amber-500 transition-all">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </Link>
                <button
                  onClick={handleSignOut}
                  className="p-2 text-stone-400 hover:text-stone-900 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="text-sm font-medium text-stone-600 hover:text-stone-900 px-3 py-2 rounded-lg hover:bg-stone-50"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="text-sm font-medium bg-amber-600 text-white hover:bg-amber-700 px-4 py-2 rounded-lg shadow-sm"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 focus:outline-none"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && profile && (
        <div className="md:hidden border-b border-stone-200 bg-stone-50 px-4 pt-2 pb-4 space-y-1">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center space-x-2 p-3 rounded-lg text-base font-medium ${
              isActive("/") ? "bg-amber-100 text-amber-900" : "text-stone-700"
            }`}
          >
            <Home className="h-5 w-5" />
            <span>Browse Rentals</span>
          </Link>

          {profile.role === "tenant" && (
            <>
              <Link
                to="/saved"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-2 p-3 rounded-lg text-base font-medium ${
                  isActive("/saved") ? "bg-amber-100 text-amber-900" : "text-stone-700"
                }`}
              >
                <Heart className="h-5 w-5 text-rose-500" />
                <span>Saved Rentals</span>
              </Link>
              <Link
                to="/alerts"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-2 p-3 rounded-lg text-base font-medium ${
                  isActive("/alerts") ? "bg-amber-100 text-amber-900" : "text-stone-700"
                }`}
              >
                <Bell className="h-5 w-5 text-amber-600" />
                <span>Search Alerts</span>
              </Link>
            </>
          )}

          {profile.role === "landlord" && (
            <Link
              to="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center space-x-2 p-3 rounded-lg text-base font-medium ${
                isActive("/dashboard") ? "bg-amber-100 text-amber-900" : "text-stone-700"
              }`}
            >
              <LayoutDashboard className="h-5 w-5" />
              <span>Landlord Dashboard</span>
            </Link>
          )}

          {isAdmin && (
            <Link
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center space-x-2 p-3 rounded-lg text-base font-medium ${
                isActive("/admin") ? "bg-amber-100 text-amber-900" : "text-stone-700"
              }`}
            >
              <Shield className="h-5 w-5 text-amber-700" />
              <span>Admin Management</span>
            </Link>
          )}

          <div className="pt-4 border-t border-stone-200 mt-2 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  className="h-10 w-10 rounded-full object-cover border border-stone-200 shadow-sm"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-200 text-stone-700">
                  <User className="h-5 w-5" />
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-stone-800 leading-tight">
                  {profile.full_name}
                </p>
                <Link
                  to="/onboarding?edit=true"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-[11px] font-bold text-amber-600 hover:text-amber-700 hover:underline"
                >
                  Edit Profile
                </Link>
              </div>
            </div>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleSignOut();
              }}
              className="flex items-center space-x-1.5 p-2 rounded-lg text-red-600 hover:bg-red-50 text-sm font-medium"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
