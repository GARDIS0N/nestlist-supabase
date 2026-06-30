import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { UserPlus, KeyRound, Mail, Phone, User, ShieldAlert, AlertCircle } from "lucide-react";
import { SupabaseConfigPanel } from "../components/SupabaseConfigPanel";

export const Signup: React.FC = () => {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"landlord" | "tenant">("tenant");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName || !phone) {
      setError("Please fill in all fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: err } = await signUp(email, password, fullName, phone, role);

    if (err) {
      setError(err.message || "An error occurred during registration.");
      setLoading(false);
    } else {
      // Upon successful signup, user is auto-logged in, profile is created and they redirect to browse / dashboard
      if (role === "landlord") {
        navigate("/dashboard");
      } else {
        navigate("/");
      }
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-stone-50 px-4 py-12 sm:px-6 lg:px-8 space-y-6">
      
      {/* Supabase Connection Setup Panel */}
      <div className="w-full max-w-lg">
        <SupabaseConfigPanel />
      </div>

      <div className="w-full max-w-lg space-y-8 bg-white p-8 rounded-2xl border border-stone-200/80 shadow-xl shadow-stone-100">
        
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-md shadow-amber-600/10">
            <span className="font-sans text-2xl font-black">N</span>
          </div>
          <h2 className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight text-stone-950">
            Create your account
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-stone-500 font-medium">
            Join Kenyan landlords and tenants transacting on Nestlist
          </p>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 p-4 border border-red-100 flex items-start space-x-3 text-red-700 text-xs sm:text-sm">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
            <p className="font-medium leading-relaxed">{error}</p>
          </div>
        )}

        <form onSubmit={handleSignUp} className="space-y-4">
          
          {/* Role selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
              I want to use Nestlist as a:
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
                <span>Tenant / House Hunter</span>
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
                <span>Landlord / Property Owner</span>
              </button>
            </div>
          </div>

          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 h-5 w-5 text-stone-400" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Peter Kamau"
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                required
              />
            </div>
          </div>

          {/* Phone Number */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
              Phone Number <span className="text-stone-400 font-normal">(For M-Pesa & SMS Alerts)</span>
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
              Format: 07XXXXXXXX or 254XXXXXXXXX. Critical for Daraja STK payments and SMS alerts!
            </p>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-5 w-5 text-stone-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. kamau@domain.com"
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
              Create Password
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-3 h-5 w-5 text-stone-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                required
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 text-sm font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-lg shadow-amber-600/10 transition duration-150 disabled:opacity-50 pt-2"
          >
            {loading ? (
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <UserPlus className="h-5 w-5" />
                <span>Register Account</span>
              </>
            )}
          </button>

          {/* Login Link */}
          <p className="text-center text-xs sm:text-sm text-stone-600 font-medium pt-2">
            Already have an account?{" "}
            <Link to="/login" className="font-bold text-amber-700 hover:text-amber-800 hover:underline">
              Sign In here
            </Link>
          </p>
        </form>

      </div>
    </div>
  );
};
