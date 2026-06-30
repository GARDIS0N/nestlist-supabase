import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Array<"landlord" | "tenant">;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

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

  // 1. Not logged in
  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Logged in but has no profile row or lacks a set role
  if (!profile || !profile.role) {
    // If we are already on onboarding, let them view it
    if (location.pathname === "/onboarding") {
      return <>{children}</>;
    }
    return <Navigate to="/onboarding" replace />;
  }

  // Prevent accessing onboarding once role is set
  if (location.pathname === "/onboarding" && profile?.role) {
    return <Navigate to="/" replace />;
  }

  // 3. Check role restrictions (e.g. landlord-only dashboard)
  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    // Redirect unauthorized roles back to homepage
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
