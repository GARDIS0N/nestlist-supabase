import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute, PublicRoute } from "./components/ProtectedRoute";
import { Header } from "./components/Header";

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
import { Admin } from "./pages/Admin";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col font-sans selection:bg-amber-100 selection:text-amber-900">
          {/* Main Application Navigation Header */}
          <Header />

          {/* Page Routing Views */}
          <main className="flex-grow">
            <Routes>
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
                path="/property/:id"
                element={
                  <ProtectedRoute>
                    <PropertyDetail />
                  </ProtectedRoute>
                }
              />

              {/* Public Guest Only Pages (Redirects authenticated users to homepage) */}
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                }
              />
              <Route
                path="/signup"
                element={
                  <PublicRoute>
                    <Signup />
                  </PublicRoute>
                }
              />

              {/* Onboarding View (requires session but handles profile completions) */}
              <Route
                path="/onboarding"
                element={
                  <ProtectedRoute>
                    <Onboarding />
                  </ProtectedRoute>
                }
              />

              {/* Tenant Reserved Pages */}
              <Route
                path="/saved"
                element={
                  <ProtectedRoute allowedRoles={["tenant"]}>
                    <SavedProperties />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/alerts"
                element={
                  <ProtectedRoute allowedRoles={["tenant"]}>
                    <SearchAlerts />
                  </ProtectedRoute>
                }
              />

              {/* Landlord Reserved Pages */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute allowedRoles={["landlord"]}>
                    <LandlordDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/list-property"
                element={
                  <ProtectedRoute allowedRoles={["landlord"]}>
                    <ListProperty />
                  </ProtectedRoute>
                }
              />

              {/* Administrative Oversight Console */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <Admin />
                  </ProtectedRoute>
                }
              />

              {/* Wildcard Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          {/* Humble Branding Footer */}
          <footer className="bg-stone-900 text-stone-400 border-t border-stone-800 text-xs py-8 text-center mt-12">
            <div className="max-w-7xl mx-auto px-4 space-y-2">
              <p className="font-bold text-stone-300">Nestlist Rental Platforms Limited</p>
              <p className="text-stone-500">
                Connecting Landlords and Tenants across Nairobi, Kiambu, Nakuru, Kisumu, and Mombasa.
              </p>
              <p className="text-[10px] text-stone-600">
                All Rights Reserved © 2026. Powered by Safaricom Daraja & Africa's Talking API integrations.
              </p>
            </div>
          </footer>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
