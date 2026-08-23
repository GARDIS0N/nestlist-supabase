import React from "react";
import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute, PublicOnlyRoute } from "./components/ProtectedRoute";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";

// Pages
import { Browse } from "./pages/Browse";
import { PropertyDetail } from "./pages/PropertyDetail";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { Onboarding } from "./pages/Onboarding";
import { SavedProperties } from "./pages/SavedProperties";
import { SearchAlerts } from "./pages/SearchAlerts";
import { LandlordDashboard } from "./pages/LandlordDashboard";
import { ListProperty } from "./pages/ListProperty";
import { AdminPanel } from "./pages/Admin";
import { Privacy } from "./pages/Privacy";
import { Terms } from "./pages/Terms";
import { Pricing } from "./pages/Pricing";
import { Profile } from "./pages/Profile";
import { DrivePage } from "./pages/DrivePage";
import { LandingPage } from "./pages/LandingPage";
import AuthCallback from "./pages/AuthCallback";
import { DevConnectionBanner } from "./components/DevConnectionBanner";
import { CookieBanner } from "./components/CookieBanner";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col font-sans selection:bg-primary-100 selection:text-primary-900">
          {/* Main Application Navigation Header */}
          <Header />

          {/* Page Routing Views */}
          <main className="flex-grow">
            <Routes>
              {/* Public Guest Only Pages (Redirects authenticated users based on their role) */}
              <Route
                path="/login"
                element={
                  <PublicOnlyRoute>
                    <Login />
                  </PublicOnlyRoute>
                }
              />
              <Route
                path="/signup"
                element={
                  <PublicOnlyRoute>
                    <Signup />
                  </PublicOnlyRoute>
                }
              />

              {/* Onboarding View (requires session, no role required yet) */}
              <Route
                path="/onboarding"
                element={
                  <ProtectedRoute>
                    <Onboarding />
                  </ProtectedRoute>
                }
              />

              {/* OAuth Callback Redirect handling */}
              <Route path="/auth/callback" element={<AuthCallback />} />

              {/* Public Landing Page */}
              <Route path="/landing" element={<LandingPage />} />

              {/* Protected Access Hubs */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Browse />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/browse"
                element={
                  <ProtectedRoute>
                    <Browse />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/property/:id"
                element={
                  <ProtectedRoute>
                    <PropertyDetail />
                  </ProtectedRoute>
                }
              />

              {/* Tenant Reserved Pages */}
              <Route
                path="/saved"
                element={
                  <ProtectedRoute role="tenant">
                    <SavedProperties />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/alerts"
                element={
                  <ProtectedRoute role="tenant">
                    <SearchAlerts />
                  </ProtectedRoute>
                }
              />

              {/* Landlord Reserved Pages */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute role="landlord">
                    <LandlordDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/list-property"
                element={
                  <ProtectedRoute role="landlord">
                    <ListProperty />
                  </ProtectedRoute>
                }
              />

              {/* Administrative Oversight Console */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminPanel />
                  </ProtectedRoute>
                }
              />

              {/* User Profile (Tenants, Landlords, Admins) */}
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />

              {/* Google Drive Document Hub */}
              <Route
                path="/drive"
                element={
                  <ProtectedRoute>
                    <DrivePage />
                  </ProtectedRoute>
                }
              />

              {/* Publicly Accessible Privacy Policy */}
              <Route
                path="/privacy"
                element={
                  <Privacy />
                }
              />

              {/* Publicly Accessible Terms of Service */}
              <Route
                path="/terms"
                element={
                  <Terms />
                }
              />

              {/* Publicly Accessible Landlord Pricing Guide */}
              <Route
                path="/pricing"
                element={
                  <Pricing />
                }
              />

              {/* Wildcard Fallback redirects unauthenticated/invalid routes to login */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </main>

          {/* Humble Branding Footer */}
          <Footer />
          <CookieBanner />
          <DevConnectionBanner />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
