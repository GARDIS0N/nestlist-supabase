import React from "react";
import { Navigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ProfileRole } from "../types/database";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ProfileRole[];
}

/**
 * Gatekeeper for protected pages.
 * Ensures we NEVER render any protected content while authentication state is resolving (loading is true).
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  // STAGE 1: LOADING STATE GATE
  // While loading is true, render ONLY a centered loading spinner.
  // This prevents the app from briefly flashing/rendering protected content before the auth check completes.
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-50/30">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-stone-600 font-medium text-sm">Verifying session...</p>
        </div>
      </div>
    );
  }

  // STAGE 2: UNAUTHENTICATED REDIRECT GATE
  // Only after loading is false, if there is no session, redirect to /login.
  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // STAGE 3: ONBOARDING GATE
  // If user is logged in but profile or role doesn't exist, redirect them to onboarding.
  if (!profile || !profile.role) {
    if (location.pathname === "/onboarding") {
      return <>{children}</>;
    }
    return <Navigate to="/onboarding" replace />;
  }

  // Prevent accessing onboarding page if profile and role are already fully set up.
  if (location.pathname === "/onboarding" && profile?.role) {
    return <Navigate to="/" replace />;
  }

  // STAGE 4: ROLE AUTHORIZATION GATE
  // If a specific role is required and user role does not match, show an Access Denied message.
  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl border border-stone-200 shadow-sm text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-50">
            <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Access Denied</h2>
            <p className="text-sm text-stone-500">
              You do not have permission to access this page. This area is restricted to{" "}
              <span className="font-semibold text-stone-800 capitalize">
                {allowedRoles.join(" or ")}
              </span>{" "}
              accounts.
            </p>
            <p className="text-xs text-stone-400">
              Your current role is <span className="font-mono text-red-600 font-semibold">{profile.role}</span>.
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              to="/"
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors"
            >
              Return to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

/**
 * Gatekeeper for public-only auth routes (e.g. /login, /signup).
 * If a user is already authenticated, they are automatically redirected to the root homepage "/".
 */
export const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, loading } = useAuth();

  // LOADING STATE GATE
  // Always wait for auth state to resolve first before rendering or redirecting.
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-stone-600 font-medium text-sm font-sans">Connecting...</p>
        </div>
      </div>
    );
  }

  if (session) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

