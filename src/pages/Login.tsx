import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LogIn, KeyRound, Mail, AlertCircle, Settings, X, Eye, EyeOff, ShieldCheck, Check, Lock } from "lucide-react";
import { SupabaseConfigPanel } from "../components/SupabaseConfigPanel";
import { supabase, getSupabaseConfig } from "../lib/supabase";

export const Login: React.FC = () => {
  const { signIn, signInWithGoogle, resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Email verification status state
  const [isEmailNotConfirmed, setIsEmailNotConfirmed] = useState(false);
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [resendCountdown, setResendCountdown] = useState(0);

  // Password reset state
  const [resetting, setResetting] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  // Dev configuration panel state
  const [showConfig, setShowConfig] = useState(false);

  const redirectPath = location.state?.from?.pathname || "/";

  // Check for mock mode on load and log developer notice to console only
  useEffect(() => {
    const config = getSupabaseConfig();
    if (config.isMock) {
      console.log("[NestList Developer Notice] Running in Simulator Mode (Mock). Connect a real Supabase DB via the gear icon in development to use live persistent authentication.");
    }
  }, []);

  // Countdown timer for email resending
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(() => {
      setResendCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("⚠ Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError(null);
    setIsEmailNotConfirmed(false);
    setResendStatus("idle");

    try {
      const { data, error: err } = await signIn(email, password);

      if (err) {
        const errMsg = err.message || "";
        if (
          errMsg.toLowerCase().includes("email not confirmed") ||
          errMsg.toLowerCase().includes("email_not_confirmed") ||
          errMsg.toLowerCase().includes("confirm your email")
        ) {
          setIsEmailNotConfirmed(true);
        } else if (
          errMsg.toLowerCase().includes("invalid grant") ||
          errMsg.toLowerCase().includes("invalid credentials") ||
          errMsg.toLowerCase().includes("incorrect password") ||
          errMsg.toLowerCase().includes("invalid login")
        ) {
          setError("⚠ Incorrect email or password. Please try again.");
        } else if (
          errMsg.toLowerCase().includes("user not found") ||
          errMsg.toLowerCase().includes("email not found") ||
          errMsg.toLowerCase().includes("no user")
        ) {
          setError("⚠ No account found with this email.");
        } else if (
          errMsg.toLowerCase().includes("failed to fetch") ||
          errMsg.toLowerCase().includes("network") ||
          errMsg.toLowerCase().includes("timeout")
        ) {
          setError("⚠ Connection failed. Please check your internet.");
        } else {
          setError(`⚠ ${errMsg}`);
        }
        setLoading(false);
      } else {
        // Success! Determine user's role to redirect correctly
        const userId = data?.user?.id;
        if (userId) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", userId)
            .single();

          const role = profileData?.role || "tenant";
          
          if (role === "admin" || role === "superadmin") {
            navigate("/admin", { replace: true });
          } else if (role === "landlord" || role === "caretaker" || role === "agent") {
            navigate("/dashboard", { replace: true });
          } else {
            navigate("/", { replace: true });
          }
        } else {
          navigate(redirectPath, { replace: true });
        }
      }
    } catch (catchErr: any) {
      console.error("Login catch-block exception:", catchErr);
      setError("⚠ Connection failed. Please check your internet.");
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (resendCountdown > 0) return;
    setResendStatus("sending");
    try {
      const { error: resendErr } = await supabase.auth.resend({
        type: "signup",
        email: email,
      });

      if (resendErr) {
        console.error("Resend confirmation failed:", resendErr);
        setResendStatus("error");
      } else {
        setResendStatus("success");
        setResendCountdown(30);
      }
    } catch (e) {
      console.error("Resend confirmation failed with exception:", e);
      setResendStatus("error");
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    const { error: err } = await signInWithGoogle();
    if (err) {
      setError(err.message || "Google OAuth failed.");
    } else {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        if (userId) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", userId)
            .single();
          
          const role = profileData?.role || "tenant";
          if (role === "admin" || role === "superadmin") {
            navigate("/admin", { replace: true });
          } else if (role === "landlord" || role === "caretaker" || role === "agent") {
            navigate("/dashboard", { replace: true });
          } else {
            navigate("/", { replace: true });
          }
        } else {
          navigate(redirectPath, { replace: true });
        }
      } catch (err) {
        console.error("Google login redirect error:", err);
        navigate(redirectPath, { replace: true });
      }
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      setError("⚠ Please enter your email to receive a reset link.");
      return;
    }

    setLoading(true);
    setError(null);

    const { error: err } = await resetPassword(resetEmail);

    if (err) {
      setError(err.message || "Failed to send reset email.");
    } else {
      setResetSent(true);
    }
    setLoading(false);
  };

  const handleInputChange = (field: "email" | "password", val: string) => {
    if (field === "email") {
      setEmail(val);
    } else {
      setPassword(val);
    }
    // Clear error on typing
    if (error) setError(null);
  };

  return (
    <div className="min-h-screen flex bg-white font-sans relative" id="login-root">
      
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

      {/* LEFT PANEL — DESKTOP ONLY */}
      <div className="hidden md:flex md:w-[45%] flex-col justify-between p-12 text-white relative overflow-hidden" 
           style={{ background: "linear-gradient(135deg, #0A4D2E, #1E6B4A)" }}
           id="desktop-left-panel">
        
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1.5px,transparent_1.5px),linear-gradient(90deg,rgba(255,255,255,0.05)_1.5px,transparent_1.5px)] bg-[size:24px_24px] opacity-30 pointer-events-none"></div>

        {/* Brand Header Group */}
        <div className="space-y-6 relative z-10">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-[#1E6B4A] shadow-xl animate-float">
            <span className="font-serif text-4xl font-black">N</span>
          </div>
          <div>
            <h1 className="text-4xl lg:text-5xl font-serif font-bold tracking-tight text-white leading-tight">
              NestList
            </h1>
            <p className="mt-2.5 text-lg text-white/70 font-normal">
              Kenya's Premium Rental Platform
            </p>
          </div>
        </div>

        {/* Divider and Trust Points */}
        <div className="space-y-8 relative z-10 py-8 border-t border-white/20">
          <div className="space-y-5">
            <div className="flex items-center space-x-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white border border-white/10 text-lg">
                🏠
              </div>
              <span className="text-base font-semibold text-white/90">1,200+ verified listings</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white border border-white/10 text-lg">
                ✅
              </div>
              <span className="text-base font-semibold text-white/90">Trusted by landlords across Kenya</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white border border-white/10 text-lg">
                🔒
              </div>
              <span className="text-base font-semibold text-white/90">Secure M-Pesa payments</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 text-xs text-white/60">
          © 2026 Nestlist Rental Platforms Limited
        </div>
      </div>

      {/* RIGHT PANEL — FORM PANEL */}
      <div className="w-full md:w-[55%] flex flex-col justify-center items-center px-6 py-12 md:px-16" id="login-form-panel">
        
        <div className="w-full max-w-[400px] space-y-8 animate-fade-in">
          
          {/* Logo on mobile view only */}
          <div className="flex md:hidden flex-col items-center justify-center text-center space-y-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1E6B4A] to-[#34D399] text-white shadow-lg shadow-emerald-950/10">
              <span className="font-serif text-3xl font-black">N</span>
            </div>
            <h2 className="text-3xl font-serif font-bold text-stone-900 tracking-tight">
              NestList
            </h2>
          </div>

          {/* Form Header Title */}
          <div className="text-center md:text-left">
            <h3 className="hidden md:block text-3xl font-serif font-bold text-stone-900 tracking-tight">
              Welcome back
            </h3>
            <p className="mt-2 text-sm text-stone-500 font-medium">
              Sign in to manage your listings
            </p>
          </div>

          {/* ERROR DISPLAY BANNER */}
          {error && (
            <div className="rounded-xl bg-[#FEF2F2] p-4 border border-[#FECACA] text-[#DC2626] text-sm font-medium leading-relaxed flex items-start space-x-3 shadow-xs">
              <AlertCircle className="h-5 w-5 text-[#DC2626] shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Email verification pending notice */}
          {isEmailNotConfirmed && (
            <div className="rounded-xl bg-[#F0FDF4] p-4 border border-[#A7F3D0] text-[#065F46] text-sm font-medium leading-relaxed flex flex-col space-y-3 shadow-xs">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-[#34D399] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-[#065F46]">Email confirmation pending</p>
                  <p className="text-[#065F46]/95">
                    Your email hasn't been confirmed yet. Please check your inbox for the confirmation link.
                  </p>
                </div>
              </div>
              <div className="pl-8 flex flex-wrap gap-2 items-center">
                <button
                  type="button"
                  onClick={handleResendConfirmation}
                  disabled={resendStatus === "sending" || resendCountdown > 0}
                  className="text-xs font-bold text-[#1E6B4A] hover:underline disabled:text-stone-400 disabled:no-underline transition"
                >
                  {resendStatus === "sending" ? "Resending..." : resendCountdown > 0 ? `Resend in ${resendCountdown}s` : "Resend confirmation email"}
                </button>
                {resendStatus === "success" && (
                  <span className="text-xs font-bold text-emerald-600">Resent successfully!</span>
                )}
                {resendStatus === "error" && (
                  <span className="text-xs font-bold text-red-500">Resend failed. Try again.</span>
                )}
              </div>
            </div>
          )}

          {/* RESET PASSWORD VIEW */}
          {resetting ? (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="space-y-2">
                <h4 className="text-xl font-bold text-stone-900 font-serif">Reset Password</h4>
                <p className="text-sm text-stone-500 leading-relaxed">
                  Enter your email address and we'll send you an automated link to securely set a new password.
                </p>
              </div>

              {resetSent ? (
                <div className="bg-[#F0FDF4] text-[#065F46] p-4 rounded-xl border border-[#A7F3D0] text-sm font-medium">
                  ✓ Password reset link sent! Please check your email inbox and spam folder.
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 h-5 w-5 text-stone-400" />
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-stone-200 focus:outline-none focus:border-[#1E6B4A] focus:ring-4 focus:ring-[#1E6B4A]/10 text-base"
                      style={{ minHeight: "48px" }}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setResetting(false);
                    setResetSent(false);
                  }}
                  className="w-1/2 py-3 px-4 text-sm font-semibold border border-stone-200 text-stone-700 hover:bg-stone-50 rounded-xl transition"
                  style={{ minHeight: "48px" }}
                >
                  Back to Login
                </button>
                {!resetSent && (
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-1/2 py-3 px-4 text-sm font-bold bg-gradient-to-r from-[#1E6B4A] to-[#34D399] text-white rounded-xl transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50"
                    style={{ minHeight: "48px" }}
                  >
                    Send Reset Link
                  </button>
                )}
              </div>
            </form>
          ) : (
            /* STANDARD LOGIN FORM */
            <form onSubmit={handleSignIn} className="space-y-6">
              
              {/* Inputs Group */}
              <div className="space-y-5">
                
                {/* Email Address */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 h-5 w-5 text-stone-400 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-stone-200 bg-white transition duration-150 focus:outline-none focus:border-[#1E6B4A] focus:ring-4 focus:ring-[#1E6B4A]/10 text-base"
                      style={{ minHeight: "48px" }}
                      required
                      id="email-input"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setResetting(true)}
                      className="text-xs font-bold text-[#1E6B4A] hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 h-5 w-5 text-stone-400 pointer-events-none" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-11 pr-12 py-3.5 rounded-xl border border-stone-200 bg-white transition duration-150 focus:outline-none focus:border-[#1E6B4A] focus:ring-4 focus:ring-[#1E6B4A]/10 text-base"
                      style={{ minHeight: "48px" }}
                      required
                      id="password-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-stone-400 hover:text-stone-600 transition"
                      id="toggle-password-btn"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

              </div>

              {/* Submit Email Sign In Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 py-3.5 px-5 text-[15px] font-bold text-white rounded-xl shadow-lg shadow-emerald-950/5 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-950/10 active:translate-y-0 transition-all duration-200 disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #1E6B4A, #34D399)",
                  minHeight: "48px"
                }}
                id="submit-signin-btn"
              >
                {loading ? (
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Sign In →</span>
                  </>
                )}
              </button>

              {/* Divider line */}
              <div className="relative my-4 flex items-center">
                <div className="flex-grow border-t border-stone-200"></div>
                <span className="flex-shrink mx-4 text-[10px] font-bold text-stone-400 tracking-widest uppercase">
                  OR CONTINUE WITH
                </span>
                <div className="flex-grow border-t border-stone-200"></div>
              </div>

              {/* Google Login Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center space-x-3 py-3 px-4 border border-stone-200 bg-white hover:bg-stone-50 rounded-xl text-stone-700 font-semibold text-sm transition-all duration-150 shadow-xs"
                style={{ minHeight: "48px" }}
                id="google-signin-btn"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l3.258-3.133C18.332 2.117 15.454 1 12.24 1 6.133 1 1.152 5.922 1.152 12s4.98 11 11.088 11c6.37 0 10.596-4.474 10.596-10.76 0-.726-.078-1.282-.175-1.955H12.24z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              {/* Signup Redirect Link */}
              <p className="text-center text-sm text-stone-600 font-medium">
                Don't have an account?{" "}
                <Link to="/signup" className="font-bold text-[#1E6B4A] hover:underline" id="signup-link">
                  Register here
                </Link>
              </p>

            </form>
          )}

          {/* KENYAN CONTEXT INFO BOX */}
          <div className="bg-[#F0FDF4] border border-[#A7F3D0] rounded-xl p-3.5 flex items-start space-x-2.5 shadow-2xs" id="kenyan-context-box">
            <span className="text-base shrink-0">🇰🇪</span>
            <p className="text-[13px] text-[#065F46] font-medium leading-relaxed">
              M-Pesa payments accepted · Listings from KES 100 · Active across Nairobi, Mombasa & beyond
            </p>
          </div>

          {/* Styled Footer */}
          <div className="pt-6 border-t border-stone-100 text-center space-y-2" id="login-footer">
            <p className="text-xs text-stone-400 font-medium">
              © 2026 Nestlist Rental Platforms Limited
            </p>
            <div className="flex justify-center space-x-3 text-xs text-stone-400 font-medium">
              <span className="text-stone-400">Terms</span>
              <span>·</span>
              <Link to="/privacy" className="hover:text-stone-600 transition">Privacy</Link>
              <span>·</span>
              <span className="text-stone-400">Support</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
