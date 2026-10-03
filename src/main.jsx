// ── src/main.jsx ──────────────────────────────────────────────────────────────
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
import "./styles/global.css";

// Pages
import Browse         from "./pages/Browse";
import Auth           from "./pages/Auth";
import Dashboard      from "./pages/Dashboard";
import Admin          from "./pages/Admin";
import Onboarding     from "./pages/Onboarding";
import NotFound       from "./pages/NotFound";
import Terms          from "./pages/Terms";
import Privacy        from "./pages/Privacy";

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!CLERK_KEY) console.warn("⚠️ VITE_CLERK_PUBLISHABLE_KEY not set");

// ── Protected route ───────────────────────────────────────────────────────────
function Protected({ children }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut><RedirectToSignIn /></SignedOut>
    </>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
function App() {
  return (
    <ClerkProvider publishableKey={CLERK_KEY || "pk_test_placeholder"}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/"           element={<Browse />} />
          <Route path="/auth"       element={<Auth />} />
          <Route path="/terms"      element={<Terms />} />
          <Route path="/privacy"    element={<Privacy />} />

          {/* Protected */}
          <Route path="/dashboard"  element={<Protected><Dashboard /></Protected>} />
          <Route path="/admin"      element={<Protected><Admin /></Protected>} />
          <Route path="/onboarding" element={<Protected><Onboarding /></Protected>} />

          {/* Fallback */}
          <Route path="/404"        element={<NotFound />} />
          <Route path="*"           element={<Navigate to="/404" replace />} />
        </Routes>
      </BrowserRouter>
    </ClerkProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
