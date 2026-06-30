import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LogIn, KeyRound, Mail, AlertCircle, Sparkles } from "lucide-react";
import { SupabaseConfigPanel } from "../components/SupabaseConfigPanel";
import { supabase } from "../lib/supabase";

export const Login: React.FC = () => {
  const { signIn, signInWithGoogle, resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Email verification status state
  const [isEmailNotConfirmed, setIsEmailNotConfirmed] = useState(false);
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [resendCountdown, setResendCountdown] = useState(0);

  // Password reset state
  const [resetting, setResetting] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  const redirectPath = location.state?.from?.pathname || "/";

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
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError(null);
    setIsEmailNotConfirmed(false);
    setResendStatus("idle");

    const { data, error: err } = await signIn(email, password);

    if (err) {
      const errMsg = err.message || "";
      if (
        errMsg.toLowerCase().includes("email not confirmed") ||
        errMsg.toLowerCase().includes("email_not_confirmed") ||
        errMsg.toLowerCase().includes("confirm your email")
      ) {
        setIsEmailNotConfirmed(true);
      } else {
        setError(errMsg || "Invalid login credentials.");
      }
      setLoading(false);
    } else {
      navigate(redirectPath, { replace: true });
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
      // With our high-fidelity simulator, OAuth completes immediately.
      navigate(redirectPath, { replace: true });
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      setError("Please enter your email to receive a reset link.");
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

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-stone-50 px-4 py-12 sm:px-6 lg:px-8 space-y-6">
      
      {/* Supabase Connection Setup Panel */}
      <div className="w-full max-w-md">
        <SupabaseConfigPanel />
      </div>

      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl border border-stone-200/80 shadow-xl shadow-stone-100">
        
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-md shadow-amber-600/10">
            <span className="font-sans text-2xl font-black">N</span>
          </div>
          <h2 className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight text-stone-950 font-sans">
            Welcome back to Nestlist
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-stone-500 font-medium">
            Connecting Kenyan landlords & tenants securely
          </p>
        </div>

        {isEmailNotConfirmed ? (
          <div className="rounded-xl bg-amber-50 p-4 border border-amber-200 flex flex-col space-y-3 text-amber-900 text-xs sm:text-sm font-medium">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-amber-950">Email confirmation pending</p>
                <p className="text-amber-800 leading-relaxed">
                  Your email <span className="font-semibold text-stone-900 break-all">{email}</span> hasn't been confirmed yet. Check your inbox (and spam folder) for the confirmation link.
                </p>
              </div>
            </div>
            
            <div className="pl-8 flex flex-col sm:flex-row sm:items-center gap-2">
              <button
                type="button"
                onClick={handleResendConfirmation}
                disabled={resendStatus === "sending" || resendCountdown > 0}
                className="text-xs font-bold text-amber-700 hover:text-amber-800 underline disabled:text-stone-400 disabled:no-underline flex items-center gap-1.5 transition text-left"
              >
                {resendStatus === "sending" ? (
                  <>
                    <div className="h-3 w-3 border-2 border-amber-700 border-t-transparent rounded-full animate-spin"></div>
                    <span>Resending...</span>
                  </>
                ) : resendCountdown > 0 ? (
                  <span>Resend available in {resendCountdown}s</span>
                ) : (
                  <span>Resend confirmation email</span>
                )}
              </button>
              
              {resendStatus === "success" && (
                <span className="text-xs font-bold text-emerald-600 sm:border-l sm:pl-2 border-amber-200">
                  Confirmation email resent — check your inbox.
                </span>
              )}
              {resendStatus === "error" && (
                <span className="text-xs font-bold text-red-600 sm:border-l sm:pl-2 border-amber-200">
                  Could not resend email. Try again shortly.
                </span>
              )}
            </div>
          </div>
        ) : error ? (
          <div className="rounded-xl bg-red-50 p-4 border border-red-100 flex items-start space-x-3 text-red-700 text-xs sm:text-sm">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
            <p className="font-medium leading-relaxed">{error}</p>
          </div>
        ) : null}

        {/* RESET PASSWORD MODAL / FORM VIEW */}
        {resetting ? (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <h3 className="text-lg font-semibold text-stone-800">Reset Password</h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Enter your registration email address below. We'll send you an automated link to securely set a new password.
            </p>

            {resetSent ? (
              <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl border border-emerald-100 text-xs sm:text-sm font-medium">
                Password reset link sent to your email! Please check your spam folder if it doesn't arrive shortly.
              </div>
            ) : (
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-5 w-5 text-stone-400" />
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                  required
                />
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setResetting(false);
                  setResetSent(false);
                }}
                className="w-1/2 py-2.5 px-4 text-xs sm:text-sm font-semibold border border-stone-300 text-stone-700 hover:bg-stone-50 rounded-xl transition"
              >
                Back to Login
              </button>
              {!resetSent && (
                <button
                  type="submit"
                  disabled={loading}
                  className="w-1/2 py-2.5 px-4 text-xs sm:text-sm font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition disabled:opacity-50"
                >
                  Send Reset Link
                </button>
              )}
            </div>
          </form>
        ) : (
          /* STANDARD LOGIN FORM */
          <form onSubmit={handleSignIn} className="space-y-5">
            <div className="space-y-4">
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
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setResetting(true)}
                    className="text-xs font-semibold text-amber-700 hover:text-amber-800 transition"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-3 h-5 w-5 text-stone-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 text-sm font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-lg shadow-amber-600/10 transition duration-150 disabled:opacity-50"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  <span>Sign In with Email</span>
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-200"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-stone-400 font-bold tracking-wider">
                  Or continue with
                </span>
              </div>
            </div>

            {/* Google Login */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 border border-stone-300 rounded-xl text-stone-700 hover:bg-stone-50 font-semibold text-sm transition"
            >
              <svg className="h-5 w-5 mr-1" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l3.258-3.133C18.332 2.117 15.454 1 12.24 1 6.133 1 1.152 5.922 1.152 12s4.98 11 11.088 11c6.37 0 10.596-4.474 10.596-10.76 0-.726-.078-1.282-.175-1.955H12.24z"
                />
              </svg>
              <span>Sign In with Google</span>
            </button>

            {/* Signup Link */}
            <p className="text-center text-xs sm:text-sm text-stone-600 font-medium pt-2">
              Don't have an account yet?{" "}
              <Link to="/signup" className="font-bold text-amber-700 hover:text-amber-800 hover:underline">
                Register here
              </Link>
            </p>
          </form>
        )}

      </div>
    </div>
  );
};
