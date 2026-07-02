import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AlertCircle, Settings, X, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { SupabaseConfigPanel } from "../components/SupabaseConfigPanel";
import { supabase, getSupabaseConfig } from "../lib/supabase";

export const Signup: React.FC = () => {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2>(1); // Step 1: Form details, Step 2: Role Selection
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"landlord" | "tenant" | "caretaker" | "agent">("tenant");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Dev configuration panel state
  const [showConfig, setShowConfig] = useState(false);

  // Check for mock mode on load and log developer notice to console only
  useEffect(() => {
    const config = getSupabaseConfig();
    if (config.isMock) {
      console.log("[NestList Developer Notice] Running in Simulator Mode (Mock). Connect a real Supabase DB via the gear icon in development to use live persistent authentication.");
    }
  }, []);

  // Format Kenyan Phone: 0712345678 -> +254 712 345 678
  const formatKenyanPhoneInput = (value: string): string => {
    let digits = value.replace(/\D/g, "");
    if (!digits) return "";

    if (digits.startsWith("0")) {
      digits = "254" + digits.slice(1);
    } else if (!digits.startsWith("254")) {
      digits = "254" + digits;
    }

    digits = digits.slice(0, 12);

    if (digits.length <= 3) {
      return `+${digits}`;
    }
    if (digits.length <= 6) {
      return `+${digits.slice(0, 3)} ${digits.slice(3)}`;
    }
    if (digits.length <= 9) {
      return `+${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    }
    return `+${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = e.target.value;
    if (error) setError(null);
    if (inputVal === "" || inputVal === "+") {
      setPhone("");
      return;
    }
    const formatted = formatKenyanPhoneInput(inputVal);
    setPhone(formatted);
  };

  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: "", color: "bg-gray-200", labelColor: "text-stone-400" };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 10) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score += 1;
    
    if (score <= 1) return { score: 1, label: "Weak", color: "bg-red-500", labelColor: "text-red-500" };
    if (score === 2) return { score: 2, label: "Fair", color: "bg-orange-500", labelColor: "text-orange-500" };
    if (score === 3) return { score: 3, label: "Good", color: "bg-yellow-500", labelColor: "text-yellow-500" };
    return { score: 4, label: "Strong", color: "bg-emerald-500", labelColor: "text-emerald-500" };
  };

  const handleContinueToRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError("⚠ Please enter your full name.");
      return;
    }
    if (!phone || phone.length < 16) {
      setError("⚠ Please enter a valid Kenyan phone number (e.g. 0712345678).");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("⚠ Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("⚠ Password must be at least 6 characters long.");
      return;
    }
    
    setError(null);
    setStep(2);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName || !phone) {
      setError("⚠ Please fill in all fields.");
      setStep(1);
      return;
    }

    setLoading(true);
    setError(null);

    // Cast the role to any to bypass strict AuthContext types while enabling database caretakers/agents
    const { error: err } = await signUp(email, password, fullName, phone, role as any);

    if (err) {
      setError(err.message || "An error occurred during registration.");
      setLoading(false);
      setStep(1); // Return to step 1 so they can check details
    } else {
      // Upon successful signup, user is auto-logged in. Redirect based on role:
      if (role === "landlord" || role === "caretaker" || role === "agent") {
        navigate("/dashboard");
      } else {
        navigate("/");
      }
    }
  };

  const passwordStrength = getPasswordStrength(password);

  const ROLES = [
    { id: "landlord", icon: "🏠", title: "Landlord", desc: "I own property to rent" },
    { id: "caretaker", icon: "🔑", title: "Caretaker", desc: "I manage property for owner" },
    { id: "agent", icon: "👔", title: "Agent", desc: "Licensed property agent" },
    { id: "tenant", icon: "🔍", title: "Tenant", desc: "Looking to rent" },
  ] as const;

  return (
    <div className="min-h-screen flex bg-white font-sans relative" id="signup-root">
      <style>{`
        @keyframes floatLogo {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes cardEntrance {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-float-logo {
          animation: floatLogo 4s ease-in-out infinite;
        }
        .animate-card-entrance {
          animation: cardEntrance 0.4s ease-out forwards;
        }
        .input-transition {
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .input-transition:focus {
          border-color: #1E6B4A !important;
          box-shadow: 0 0 0 3px rgba(30,107,74,0.1) !important;
        }
        .btn-transition {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .btn-transition:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(30,107,74,0.45) !important;
        }
      `}</style>

      {/* Dev Only Gear Icon in Top Right */}
      {!!(import.meta as any).env?.DEV && (
        <button
          type="button"
          onClick={() => setShowConfig(true)}
          className="absolute top-5 right-5 p-3 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 transition duration-150 z-50 shadow-md border border-stone-200"
          title="Configure Supabase Connection"
          id="dev-config-btn"
        >
          <Settings className="h-5 w-5 animate-spin-slow" />
        </button>
      )}

      {/* Supabase connection setup modal overlay */}
      {showConfig && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="dev-config-modal">
          <div className="relative bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-stone-200">
            <button
              onClick={() => setShowConfig(false)}
              className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="mt-2 max-h-[80vh] overflow-y-auto pr-1">
              <SupabaseConfigPanel />
            </div>
          </div>
        </div>
      )}

      {/* Background decorations for mobile only */}
      <div className="md:hidden fixed top-0 right-0 w-[200px] h-[200px] rounded-full bg-[#1E6B4A]/[0.08] blur-[60px] pointer-events-none z-0" />
      <div className="md:hidden fixed bottom-0 left-0 w-[160px] h-[160px] rounded-full bg-[#34D399]/[0.06] blur-[60px] pointer-events-none z-0" />

      {/* LEFT PANEL — DESKTOP ONLY (40% width) */}
      <div className="hidden md:flex md:w-[40%] flex-col justify-between p-12 text-white relative overflow-hidden" 
           style={{ background: "linear-gradient(135deg, #0A4D2E, #1E6B4A)" }}
           id="desktop-left-panel">
        
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1.5px,transparent_1.5px),linear-gradient(90deg,rgba(255,255,255,0.05)_1.5px,transparent_1.5px)] bg-[size:24px_24px] opacity-30 pointer-events-none"></div>

        {/* Brand Header Group */}
        <div className="space-y-6 relative z-10 my-auto">
          <div className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl bg-white text-[#1E6B4A] shadow-[0_0_20px_rgba(255,255,255,0.3)] animate-float-logo mx-auto md:mx-0">
            <span className="font-serif text-4xl font-bold">N</span>
          </div>
          <div>
            <h1 className="text-4xl font-serif font-bold tracking-tight text-white text-center md:text-left">
              NestList
            </h1>
            <p className="mt-2 text-[15px] text-white/70 font-normal text-center md:text-left">
              Kenya's Premium Rental Platform
            </p>
          </div>

          {/* Horizontal divider */}
          <div className="w-full border-t border-white/15 my-4"></div>

          {/* Trust Points */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3 text-[14px]">
              <span className="text-lg">🏠</span>
              <span className="font-medium text-white/90">1,200+ verified listings</span>
            </div>
            <div className="flex items-center space-x-3 text-[14px]">
              <span className="text-lg">✅</span>
              <span className="font-medium text-white/90">Trusted landlords across Kenya</span>
            </div>
            <div className="flex items-center space-x-3 text-[14px]">
              <span className="text-lg">🇰🇪</span>
              <span className="font-medium text-white/90">Serving Nairobi, Mombasa & beyond</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 text-[11px] text-white/40">
          © 2026 Nestlist Rental Platforms Limited
        </div>
      </div>

      {/* RIGHT PANEL — SIGNUP FORM PANEL (60% width) */}
      <div className="w-full md:w-[60%] flex flex-col justify-center items-center px-6 py-12 md:px-16 z-10" id="signup-form-panel">
        
        <div className="w-full max-w-[400px] space-y-6 animate-card-entrance">
          
          {/* Logo on mobile view only */}
          <div className="flex md:hidden flex-col items-center justify-center text-center space-y-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1E6B4A] to-[#34D399] text-white shadow-[0_8px_24px_rgba(30,107,74,0.4)] animate-float-logo">
              <span className="font-serif text-3xl font-bold">N</span>
            </div>
          </div>

          {/* Form Header Title */}
          <div className="text-center md:text-left flex items-center justify-between">
            <div>
              <h3 className="text-[26px] font-serif font-bold text-[#111827] tracking-tight">
                {step === 1 ? "Create account" : "Select your role"}
              </h3>
              <p className="mt-1 text-[14px] text-[#6B7280]">
                {step === 1 ? "Join Kenya's rental community" : "Tell us how you'll use NestList"}
              </p>
            </div>
            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center space-x-1 text-xs font-bold text-[#1E6B4A] hover:underline"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </button>
            )}
          </div>

          {/* ERROR DISPLAY BANNER */}
          {error && (
            <div className="rounded-[10px] bg-[#FEF2F2] p-[11px] px-[14px] border border-[#FECACA] text-[#DC2626] text-[13px] font-medium leading-relaxed flex items-start space-x-2 shadow-xs">
              <AlertCircle className="h-4 w-4 text-[#DC2626] shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: ACCOUNT DETAILS */}
          {step === 1 ? (
            <form onSubmit={handleContinueToRole} className="space-y-4">
              
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider block">
                  FULL NAME
                </label>
                <div className="relative">
                  <svg className="absolute left-3.5 top-3.5 h-[18px] w-[18px] text-[#9CA3AF] pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="e.g. Peter Kamau"
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl border-[1.5px] border-[#E5E7EB] bg-white text-base input-transition"
                    style={{ minHeight: "48px" }}
                    required
                  />
                </div>
              </div>

              {/* Phone Number with Kenyan Formatting */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider block">
                  PHONE NUMBER
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-stone-500 text-base select-none pointer-events-none">🇰🇪</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="+254 712 345 678"
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl border-[1.5px] border-[#E5E7EB] bg-white text-base input-transition"
                    style={{ minHeight: "48px" }}
                    required
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider block">
                  EMAIL ADDRESS
                </label>
                <div className="relative">
                  <svg className="absolute left-3.5 top-3.5 h-[18px] w-[18px] text-[#9CA3AF] pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="you@example.com"
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl border-[1.5px] border-[#E5E7EB] bg-white text-base input-transition"
                    style={{ minHeight: "48px" }}
                    required
                  />
                </div>
              </div>

              {/* Create Password */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider block">
                  CREATE PASSWORD
                </label>
                <div className="relative">
                  <svg className="absolute left-3.5 top-3.5 h-[18px] w-[18px] text-[#9CA3AF] pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="Minimum 6 characters"
                    className="w-full pl-11 pr-12 py-3.5 rounded-xl border-[1.5px] border-[#E5E7EB] bg-white text-base input-transition"
                    style={{ minHeight: "48px" }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-stone-400 hover:text-stone-600 transition"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>

                {/* Password strength bar */}
                {password && (
                  <div className="space-y-1.5 pt-1" id="password-strength-container">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#9CA3AF] font-bold text-[10px] uppercase">PASSWORD STRENGTH</span>
                      <span className={`font-bold text-xs ${passwordStrength.labelColor}`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      <div className={`h-1.5 rounded-full transition-colors duration-300 ${passwordStrength.score >= 1 ? passwordStrength.color : "bg-stone-100"}`}></div>
                      <div className={`h-1.5 rounded-full transition-colors duration-300 ${passwordStrength.score >= 2 ? passwordStrength.color : "bg-stone-100"}`}></div>
                      <div className={`h-1.5 rounded-full transition-colors duration-300 ${passwordStrength.score >= 3 ? passwordStrength.color : "bg-stone-100"}`}></div>
                      <div className={`h-1.5 rounded-full transition-colors duration-300 ${passwordStrength.score >= 4 ? passwordStrength.color : "bg-stone-100"}`}></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Continue button */}
              <button
                type="submit"
                className="w-full flex items-center justify-center py-3.5 px-5 text-[15px] font-bold text-white rounded-xl shadow-[0_4px_16px_rgba(30,107,74,0.3)] btn-transition active:translate-y-0 transition-all duration-200"
                style={{
                  background: "linear-gradient(135deg, #1E6B4A, #34D399)",
                  minHeight: "48px",
                  borderRadius: "12px"
                }}
              >
                Continue →
              </button>

              {/* KENYAN CONTEXT INFO BOX */}
              <div className="bg-[#F0FDF4] border border-[#A7F3D0] rounded-[10px] p-[10px] px-[14px] flex items-start space-x-2.5 shadow-2xs" id="kenyan-context-box">
                <span className="text-base shrink-0">🇰🇪</span>
                <p className="text-[12px] text-[#065F46] font-medium leading-relaxed">
                  M-Pesa accepted · Listings from KES 100 · Nairobi, Mombasa, Nakuru & more
                </p>
              </div>

              {/* Login Redirect */}
              <p className="text-center text-sm text-stone-600 font-medium pt-2">
                Already have an account?{" "}
                <Link to="/login" className="font-bold text-[#1E6B4A] hover:underline">
                  Sign In here
                </Link>
              </p>

            </form>
          ) : (
            /* STEP 2: ROLE SELECTION */
            <form onSubmit={handleSignUp} className="space-y-6 animate-fade-in">
              
              {/* 2x2 Grid of Roles */}
              <div className="grid grid-cols-2 gap-4" id="role-selection-grid">
                {ROLES.map((r) => {
                  const isSelected = role === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRole(r.id)}
                      className={`relative p-5 rounded-2xl border-2 text-left flex flex-col justify-between space-y-4 hover:border-[#1E6B4A]/60 transition-all duration-200 ${
                        isSelected
                          ? "border-[#1E6B4A] bg-[#F0FDF4] shadow-md shadow-emerald-900/5"
                          : "border-stone-100 bg-white"
                      }`}
                      style={{ minHeight: "128px" }}
                    >
                      {/* Top icon and custom circle badge */}
                      <div className="flex justify-between items-start w-full">
                        <span className="text-3xl">{r.icon}</span>
                        {isSelected && (
                          <div className="h-5 w-5 rounded-full bg-[#1E6B4A] text-white flex items-center justify-center text-[10px] font-bold animate-fade-in shadow-xs">
                            ✓
                          </div>
                        )}
                      </div>

                      {/* Title and short desc */}
                      <div>
                        <p className="font-bold text-stone-900 text-sm sm:text-base tracking-tight">
                          {r.title}
                        </p>
                        <p className="text-xs text-stone-500 font-medium leading-normal mt-0.5">
                          {r.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Create Account Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center py-3.5 px-5 text-[15px] font-bold text-white rounded-xl shadow-[0_4px_16px_rgba(30,107,74,0.3)] btn-transition active:translate-y-0 transition-all duration-200 disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #1E6B4A, #34D399)",
                  minHeight: "48px",
                  borderRadius: "12px"
                }}
              >
                {loading ? (
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <span>Create Account as {ROLES.find(r => r.id === role)?.title} →</span>
                )}
              </button>

              {/* Step Back button */}
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full py-3 px-4 border border-stone-200 text-stone-600 hover:bg-stone-50 font-semibold text-sm rounded-xl transition"
                style={{ minHeight: "48px" }}
              >
                Back to Details
              </button>

            </form>
          )}

          {/* Styled Footer */}
          <div className="pt-4 border-t border-[#F3F4F6] text-center space-y-2 mt-8 w-full" id="signup-footer">
            <p className="text-[12px] text-[#9CA3AF]">
              © 2026 Nestlist Rental Platforms Limited
            </p>
            <div className="flex justify-center space-x-3 text-[12px] text-[#9CA3AF]">
              <Link to="/terms" className="text-[#1E6B4A] hover:underline">Terms</Link>
              <span>·</span>
              <Link to="/privacy" className="text-[#1E6B4A] hover:underline">Privacy</Link>
              <span>·</span>
              <Link to="/support" className="text-[#1E6B4A] hover:underline">Support</Link>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
