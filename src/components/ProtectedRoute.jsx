import { Navigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { useProfile } from "../hooks/useAuth";

/**
 * Wraps a route to require authentication and optionally a specific role.
 *
 * Usage:
 *   <ProtectedRoute><Dashboard /></ProtectedRoute>
 *   <ProtectedRoute roles={["admin","superadmin"]}><Admin /></ProtectedRoute>
 */
export default function ProtectedRoute({ children, roles = null }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { profile, loading: profileLoading } = useProfile();

  if (!isLoaded || profileLoading) {
    return (
      <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ width:32, height:32, border:"3px solid #E5E7EB", borderTopColor:"#1E6B4A", borderRadius:"50%", animation:"spin .8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/auth" replace />;
  }

  // No profile yet — needs onboarding
  if (!profile) {
    return <Navigate to="/onboarding" replace />;
  }

  // Role check
  if (roles && !roles.includes(profile.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
