import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSignIn, useSignUp } from "@clerk/clerk-react";
import { supabase } from "../lib/supabase";

const ROLES = [
  { id:"landlord",  label:"Landlord",  emoji:"🏠", desc:"I own property to rent out" },
  { id:"caretaker", label:"Caretaker", emoji:"🔑", desc:"I manage property for an owner" },
  { id:"agent",     label:"Agent",     emoji:"👔", desc:"I'm a licensed property agent" },
  { id:"tenant",    label:"Tenant",    emoji:"🔍", desc:"I'm looking for a place to rent" },
];

export default function Auth() {
  const navigate = useNavigate();
  const { signIn, setActive: setActiveSignIn } = useSignIn();
  const { signUp, setActive: setActiveSignUp } = useSignUp();

  const [mode, setMode]         = useState("login"); // login | register | role
  const [role, setRole]         = useState("");
  const [name, setName]         = useState("");
  const [phone, setPhone]       = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [showPwd, setShowPwd]   = useState(false);
  const [newUserId, setNewUserId] = useState(null);

  function fmtPhone(v) {
    const d = v.replace(/\D/g, "").slice(0, 10);
    if (d.startsWith("0")) return d;
    return d;
  }

  async function handleLogin(e) {
    e.preventDefault();
    if (!email || !password) { setError("Please enter your email and password"); return; }
    setLoading(true); setError("");
    try {
      const res = await signIn.create({ identifier: email, password });
      await setActiveSignIn({ session: res.createdSessionId });
      navigate("/");
    } catch (err) {
      setError(err.errors?.[0]?.message || "Login failed. Please check your credentials.");
    }
    setLoading(false);
  }

  async function handleRegister(e) {
    e.preventDefault();
    if (!name || !email || !password || !phone) {
      setError("Please fill in all required fields"); return;
    }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true); setError("");
    try {
      const res = await signUp.create({
        emailAddress: email,
        password,
        firstName:    name.split(" ")[0],
        lastName:     name.split(" ").slice(1).join(" ") || "",
      });
      setNewUserId(res.createdUserId);
      setMode("role");
    } catch (err) {
      setError(err.errors?.[0]?.message || "Registration failed. Please try again.");
    }
    setLoading(false);
  }

  async function handleRoleSelect(e) {
    e.preventDefault();
    if (!role) { setError("Please select your role"); return; }
    setLoading(true); setError("");
    try {
      // Complete Clerk sign-up
      if (signUp.status === "missing_requirements") {
        const completed = await signUp.attemptEmailAddressVerification({ code: "auto" })
          .catch(() => signUp); // skip if not required
        await setActiveSignUp({ session: completed.createdSessionId });
      } else {
        await setActiveSignUp({ session: signUp.createdSessionId });
      }

      // Save profile to Supabase
      await supabase.from("profiles").upsert({
        id:        newUserId || signUp.createdUserId,
        full_name: name,
        phone:     "254" + fmtPhone(phone).replace(/^0/, ""),
        email,
        role,
        created_at: new Date().toISOString(),
      });

      navigate(role === "admin" ? "/admin" : role === "tenant" ? "/" : "/dashboard");
    } catch (err) {
      setError(err.message || "Failed to save your profile. Please try again.");
    }
    setLoading(false);
  }

  async function handleForgotPassword() {
    if (!email) { setError("Please enter your email address first"); return; }
    setLoading(true); setError("");
    try {
      await signIn.create({ strategy: "reset_password_email_code", identifier: email });
      setError(""); alert("Password reset email sent! Check your inbox.");
    } catch (err) {
      setError(err.errors?.[0]?.message || "Failed to send reset email");
    }
    setLoading(false);
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="auth-page">
        <div className="auth-blob1" /><div className="auth-blob2" />

        {/* Brand */}
        <div className="auth-brand">
          <div className="auth-logo">N</div>
          <div>
            <div className="auth-brand-name">NestList</div>
            <div className="auth-brand-sub">Kenya's Premium Rentals</div>
          </div>
        </div>

        <div className="auth-card">
          {/* Header */}
          <div className="auth-card-header">
            <h2 className="auth-title">
              {mode === "login" ? "Welcome back" :
               mode === "register" ? "Create your account" :
               "Choose your role"}
            </h2>
            <p className="auth-sub">
              {mode === "login" ? "Sign in to manage your listings" :
               mode === "register" ? "Join 1,200+ landlords on NestList" :
               "Tell us how you'll be using NestList"}
            </p>
          </div>

          {error && (
            <div className="auth-err">⚠ {error}</div>
          )}

          {/* ── LOGIN ── */}
          {mode === "login" && (
            <form onSubmit={handleLogin}>
              <div className="fld">
                <label className="flbl">Email Address</label>
                <input className="finp" type="email" placeholder="you@example.com"
                  value={email} onChange={e => { setEmail(e.target.value); setError(""); }} />
              </div>
              <div className="fld">
                <label className="flbl">Password</label>
                <div style={{ position:"relative" }}>
                  <input className="finp" type={showPwd ? "text" : "password"} placeholder="Your password"
                    value={password} onChange={e => { setPassword(e.target.value); setError(""); }} />
                  <button type="button" className="pwd-toggle" onClick={() => setShowPwd(s => !s)}>
                    {showPwd ? "🙈" : "👁"}
                  </button>
                </div>
              </div>
              <button type="button" className="forgot-btn" onClick={handleForgotPassword}>
                Forgot password?
              </button>
              <button className="btn-main" type="submit" disabled={loading}>
                {loading ? <><span className="spin" /> Signing in…</> : "Sign In →"}
              </button>
              <div className="auth-switch">
                Don't have an account?
                <button type="button" className="auth-switch-btn" onClick={() => { setMode("register"); setError(""); }}>
                  Create one
                </button>
              </div>
            </form>
          )}

          {/* ── REGISTER ── */}
          {mode === "register" && (
            <form onSubmit={handleRegister}>
              <div className="fld">
                <label className="flbl">Full Name *</label>
                <input className="finp" placeholder="Your full name"
                  value={name} onChange={e => { setName(e.target.value); setError(""); }} />
              </div>
              <div className="frow">
                <div className="fld">
                  <label className="flbl">Phone Number *</label>
                  <div style={{ position:"relative" }}>
                    <span className="ph-prefix">🇰🇪 +254</span>
                    <input className="finp" style={{ paddingLeft:80 }} placeholder="712 345 678"
                      inputMode="numeric" value={phone}
                      onChange={e => { setPhone(fmtPhone(e.target.value)); setError(""); }} />
                  </div>
                </div>
                <div className="fld">
                  <label className="flbl">Email Address *</label>
                  <input className="finp" type="email" placeholder="you@example.com"
                    value={email} onChange={e => { setEmail(e.target.value); setError(""); }} />
                </div>
              </div>
              <div className="fld">
                <label className="flbl">Password *</label>
                <div style={{ position:"relative" }}>
                  <input className="finp" type={showPwd ? "text" : "password"} placeholder="Min 8 characters"
                    value={password} onChange={e => { setPassword(e.target.value); setError(""); }} />
                  <button type="button" className="pwd-toggle" onClick={() => setShowPwd(s => !s)}>
                    {showPwd ? "🙈" : "👁"}
                  </button>
                </div>
                {/* Password strength */}
                {password.length > 0 && (
                  <div className="pwd-strength">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className={`pwd-bar ${i < Math.min(4, Math.floor(password.length / 3)) ? "pwd-bar-on" : ""}`} />
                    ))}
                    <span className="pwd-hint">
                      {password.length < 6 ? "Weak" : password.length < 10 ? "Fair" : password.length < 14 ? "Good" : "Strong"}
                    </span>
                  </div>
                )}
              </div>
              <button className="btn-main" type="submit" disabled={loading}>
                {loading ? <><span className="spin" /> Creating account…</> : "Continue →"}
              </button>
              <div className="auth-switch">
                Already have an account?
                <button type="button" className="auth-switch-btn" onClick={() => { setMode("login"); setError(""); }}>
                  Sign in
                </button>
              </div>
            </form>
          )}

          {/* ── ROLE SELECTION ── */}
          {mode === "role" && (
            <form onSubmit={handleRoleSelect}>
              <div className="role-grid">
                {ROLES.map(r => (
                  <button type="button" key={r.id}
                    className={`role-card ${role === r.id ? "role-on" : ""}`}
                    onClick={() => { setRole(r.id); setError(""); }}>
                    <div className="role-emoji">{r.emoji}</div>
                    <div className="role-label">{r.label}</div>
                    <div className="role-desc">{r.desc}</div>
                    {role === r.id && <div className="role-check">✓</div>}
                  </button>
                ))}
              </div>
              <button className="btn-main" type="submit" disabled={loading || !role}>
                {loading ? <><span className="spin" /> Setting up your account…</> : `Continue as ${role ? ROLES.find(r=>r.id===role)?.label : "…"} →`}
              </button>
            </form>
          )}

          {/* Trust badges */}
          <div className="auth-trust">
            <span>🔒 Secure</span>
            <span>✅ Verified</span>
            <span>🇰🇪 Kenya</span>
          </div>
        </div>

        {/* Footer */}
        <div className="auth-footer">
          By continuing you agree to our
          <a href="/terms"> Terms of Service</a> and
          <a href="/privacy"> Privacy Policy</a>
        </div>
      </div>
    </>
  );
}

const CSS = `
  .auth-page{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;position:relative;overflow:hidden;background:#F9FAFB;}
  .auth-blob1{position:fixed;top:-100px;right:-100px;width:400px;height:400px;border-radius:50%;background:radial-gradient(circle,rgba(30,107,74,.12) 0%,transparent 70%);pointer-events:none;}
  .auth-blob2{position:fixed;bottom:-80px;left:-80px;width:300px;height:300px;border-radius:50%;background:radial-gradient(circle,rgba(16,185,129,.08) 0%,transparent 70%);pointer-events:none;}
  .auth-brand{display:flex;align-items:center;gap:12px;margin-bottom:28px;position:relative;}
  .auth-logo{width:44px;height:44px;border-radius:13px;background:linear-gradient(135deg,#1E6B4A,#34D399);color:#fff;font-size:22px;font-weight:900;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(30,107,74,.3);}
  .auth-brand-name{font-family:'DM Serif Display',serif;font-size:22px;font-weight:700;color:#111827;}
  .auth-brand-sub{font-size:11px;color:#9CA3AF;}
  .auth-card{background:#fff;border:1px solid #E5E7EB;border-radius:20px;padding:32px;width:100%;max-width:440px;box-shadow:0 8px 40px rgba(0,0,0,.07);position:relative;}
  .auth-card-header{margin-bottom:24px;}
  .auth-title{font-family:'DM Serif Display',serif;font-size:24px;color:#111827;margin:0 0 6px;}
  .auth-sub{font-size:14px;color:#6B7280;margin:0;}
  .auth-err{background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:11px 14px;font-size:13px;color:#DC2626;margin-bottom:16px;display:flex;align-items:flex-start;gap:8px;}
  .forgot-btn{background:none;border:none;color:#1E6B4A;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;padding:0;margin-bottom:16px;display:block;}
  .auth-switch{text-align:center;font-size:13px;color:#6B7280;margin-top:16px;}
  .auth-switch-btn{background:none;border:none;color:#1E6B4A;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;margin-left:4px;}
  .ph-prefix{position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:13px;color:#6B7280;pointer-events:none;}
  .pwd-toggle{position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:16px;padding:4px;}
  .pwd-strength{display:flex;align-items:center;gap:4px;margin-top:6px;}
  .pwd-bar{height:4px;flex:1;border-radius:2px;background:#E5E7EB;transition:background .2s;}
  .pwd-bar-on{background:#1E6B4A!important;}
  .pwd-hint{font-size:11px;color:#6B7280;margin-left:4px;}
  .role-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px;}
  .role-card{position:relative;border:1.5px solid #E5E7EB;border-radius:14px;padding:16px 12px;cursor:pointer;font-family:inherit;background:#fff;transition:all .2s;text-align:center;}
  .role-card:hover{border-color:#1E6B4A;background:#F0FDF4;}
  .role-on{border-color:#1E6B4A!important;background:#F0FDF4!important;box-shadow:0 0 0 3px rgba(30,107,74,.1)!important;}
  .role-emoji{font-size:28px;margin-bottom:8px;}
  .role-label{font-size:13px;font-weight:700;color:#111827;margin-bottom:3px;}
  .role-desc{font-size:11px;color:#6B7280;line-height:1.4;}
  .role-check{position:absolute;top:8px;right:8px;width:18px;height:18px;border-radius:50%;background:#1E6B4A;color:#fff;font-size:10px;display:flex;align-items:center;justify-content:center;font-weight:700;}
  .auth-trust{display:flex;gap:12px;justify-content:center;margin-top:20px;padding-top:16px;border-top:1px solid #F3F4F6;}
  .auth-trust span{font-size:12px;color:#9CA3AF;}
  .auth-footer{margin-top:20px;font-size:12px;color:#9CA3AF;text-align:center;position:relative;}
  .auth-footer a{color:#1E6B4A;text-decoration:none;margin-left:4px;}
  @media(max-width:480px){.auth-card{padding:24px 18px;}.role-grid{grid-template-columns:1fr 1fr;}}
`;
