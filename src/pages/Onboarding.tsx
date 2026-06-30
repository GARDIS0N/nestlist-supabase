import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { User, Phone, CheckCircle2, AlertCircle } from "lucide-react";

export const Onboarding: React.FC = () => {
  const { session, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"landlord" | "tenant">("tenant");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If user already has a complete profile, redirect to correct starting page
    if (profile && profile.role) {
      if (profile.role === "landlord") {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    }
    // Pre-populate name if user exists in session
    if (session?.user) {
      setFullName(profile?.full_name || session.user.user_metadata?.full_name || "");
    }
  }, [profile, session, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) {
      setError("No active session found. Please log in first.");
      return;
    }
    if (!fullName || !phone || !role) {
      setError("Please complete all fields.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Insert or Update profile row using upsert
      const { error: upsertError } = await supabase
        .from("profiles")
        .upsert({
          id: session.user.id,
          full_name: fullName,
          phone: phone,
          role: role,
          avatar_url: profile?.avatar_url || null,
          created_at: profile?.created_at || new Date().toISOString()
        });

      if (upsertError) throw upsertError;

      // Ensure local state context updates
      await refreshProfile();

      // Send simulated welcome SMS
      const welcomeText = role === "landlord"
        ? `Karibu Nestlist, ${fullName}! List your rooms, bedsitters, and apartments, pay the listing fee easily via M-Pesa, and start receiving inquiries instantly via SMS.`
        : `Karibu Nestlist, ${fullName}! Search and filter rentals across Kenya, save favorites, and subscribe to search alerts. We notify you via SMS when matching rentals are listed!`;

      await supabase.functions.invoke("send-sms", {
        body: {
          type: `welcome_${role}`,
          phone: phone,
          data: { name: fullName }
        }
      });

      // Redirect
      if (role === "landlord") {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } catch (err: any) {
      console.error("Onboarding failed:", err);
      setError(err.message || "Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-stone-50 px-4 py-12">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl border border-stone-200 shadow-xl shadow-stone-100">
        
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-md shadow-amber-600/10">
            <span className="font-sans text-2xl font-black">N</span>
          </div>
          <h2 className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight text-stone-950">
            One last step!
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-stone-500 font-medium">
            Complete your profile to unlock Nestlist's features.
          </p>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 p-4 border border-red-100 flex items-start space-x-3 text-red-700 text-xs sm:text-sm">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
            <p className="font-medium leading-relaxed">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Role selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
              Which describes you best?
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setRole("tenant")}
                className={`py-3 px-4 rounded-xl border-2 text-center transition font-bold text-sm flex flex-col items-center space-y-1 ${
                  role === "tenant"
                    ? "border-amber-600 bg-amber-50/40 text-amber-900"
                    : "border-stone-200 text-stone-500 hover:border-stone-300"
                }`}
              >
                <span className="text-lg">🏡</span>
                <span>Tenant / Rental Finder</span>
              </button>
              <button
                type="button"
                onClick={() => setRole("landlord")}
                className={`py-3 px-4 rounded-xl border-2 text-center transition font-bold text-sm flex flex-col items-center space-y-1 ${
                  role === "landlord"
                    ? "border-amber-600 bg-amber-50/40 text-amber-900"
                    : "border-stone-200 text-stone-500 hover:border-stone-300"
                }`}
              >
                <span className="text-lg">🔑</span>
                <span>Landlord / Land Owner</span>
              </button>
            </div>
          </div>

          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
              Preferred Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 h-5 w-5 text-stone-400" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Peter Kamau"
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                required
              />
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
              M-Pesa Connected Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-3 h-5 w-5 text-stone-400" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 0712345678"
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                required
              />
            </div>
            <p className="text-[11px] text-stone-400 font-medium">
              Important: This phone receives inquiries, listing receipts, and alerts!
            </p>
          </div>

          {/* Complete Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 text-sm font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-lg shadow-amber-600/10 transition duration-150 disabled:opacity-50 pt-1"
          >
            {loading ? (
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5" />
                <span>Complete Onboarding</span>
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
};
