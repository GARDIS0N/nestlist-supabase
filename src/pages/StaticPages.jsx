// ── NotFound.jsx ─────────────────────────────────────────────────────────────
import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, textAlign:"center", background:"#F9FAFB" }}>
      <div style={{ fontSize:72, marginBottom:16 }}>🏚️</div>
      <h1 style={{ fontFamily:"'DM Serif Display',serif", fontSize:32, marginBottom:8 }}>Page Not Found</h1>
      <p style={{ color:"#6B7280", fontSize:15, marginBottom:24 }}>The page you're looking for doesn't exist or has been moved.</p>
      <Link to="/" style={{ padding:"12px 24px", background:"#1E6B4A", color:"#fff", borderRadius:10, fontWeight:700, fontSize:14, textDecoration:"none" }}>
        ← Back to Home
      </Link>
    </div>
  );
}

export default NotFound;

// ── Terms.jsx ─────────────────────────────────────────────────────────────────
export function Terms() {
  return (
    <div style={{ maxWidth:720, margin:"0 auto", padding:"48px 24px", fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
      <Link to="/" style={{ color:"#1E6B4A", fontSize:14, fontWeight:600 }}>← Back to NestList</Link>
      <h1 style={{ fontFamily:"'DM Serif Display',serif", fontSize:34, margin:"24px 0 8px" }}>Terms of Service</h1>
      <p style={{ color:"#6B7280", marginBottom:32 }}>Last updated: June 1, 2026</p>

      {[
        { title:"1. Acceptance of Terms", body:"By using NestList, you agree to these Terms of Service. If you do not agree, please do not use our platform. NestList reserves the right to update these terms at any time." },
        { title:"2. Platform Description", body:"NestList is a property listing marketplace that connects landlords, caretakers, and agents with tenants across Kenya. We charge a listing fee to property owners and provide free browsing to tenants." },
        { title:"3. Listing Fees", body:"Listing fees range from KSh 100 to KSh 1,500 depending on property type. Fees are paid via M-Pesa, Airtel Money, or card. Fees are non-refundable once a listing goes live. Each listing is active for 30 days." },
        { title:"4. User Responsibilities", body:"You are responsible for ensuring all listing information is accurate. Fraudulent listings will be immediately removed and the account suspended. NestList is not responsible for disputes between landlords and tenants." },
        { title:"5. Payments", body:"All payments are processed securely via Safaricom M-Pesa, Airtel Money, Flutterwave, or Paystack. NestList does not store your payment credentials. Listing fees are collected directly by NestList." },
        { title:"6. Privacy", body:"We collect your name, phone number, email, and property details to operate the platform. We do not sell your personal information to third parties. See our Privacy Policy for full details." },
        { title:"7. Prohibited Content", body:"You may not list: properties you do not own or have no authority to list, properties that are already rented, fraudulent listings, or listings with misleading information." },
        { title:"8. Contact", body:"For any questions about these terms, contact us at: gardisonkirui11@gmail.com" },
      ].map(s => (
        <div key={s.title} style={{ marginBottom:28 }}>
          <h2 style={{ fontFamily:"'DM Serif Display',serif", fontSize:20, marginBottom:8, color:"#111827" }}>{s.title}</h2>
          <p style={{ color:"#374151", lineHeight:1.8 }}>{s.body}</p>
        </div>
      ))}
    </div>
  );
}

// ── Privacy.jsx ───────────────────────────────────────────────────────────────
export function Privacy() {
  return (
    <div style={{ maxWidth:720, margin:"0 auto", padding:"48px 24px", fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
      <Link to="/" style={{ color:"#1E6B4A", fontSize:14, fontWeight:600 }}>← Back to NestList</Link>
      <h1 style={{ fontFamily:"'DM Serif Display',serif", fontSize:34, margin:"24px 0 8px" }}>Privacy Policy</h1>
      <p style={{ color:"#6B7280", marginBottom:32 }}>Last updated: June 1, 2026</p>

      {[
        { title:"What We Collect", body:"We collect: your full name, Kenyan phone number (+254), email address, property details for listings, payment transaction references (not card numbers), and device/browser information for security." },
        { title:"How We Use Your Data", body:"We use your data to: create and manage your account, process listing payments via M-Pesa or card, send SMS and email notifications about your listings, allow tenants to contact you, and improve our platform." },
        { title:"Data Sharing", body:"We do not sell your personal data. We share data only with: Safaricom (M-Pesa payments), Africa's Talking (SMS delivery), EmailJS (email notifications), Clerk (authentication), and Supabase (database hosting)." },
        { title:"Data Security", body:"Your data is stored securely on Supabase (hosted in Frankfurt, EU). All connections are encrypted via HTTPS. We use row-level security to ensure users can only access their own data." },
        { title:"Your Rights", body:"You can: access your data by logging in to your account, delete your account and all data by emailing us, opt out of SMS notifications by contacting us, and request a copy of your data." },
        { title:"Contact", body:"For any privacy concerns: gardisonkirui11@gmail.com. We will respond within 48 hours." },
      ].map(s => (
        <div key={s.title} style={{ marginBottom:28 }}>
          <h2 style={{ fontFamily:"'DM Serif Display',serif", fontSize:20, marginBottom:8, color:"#111827" }}>{s.title}</h2>
          <p style={{ color:"#374151", lineHeight:1.8 }}>{s.body}</p>
        </div>
      ))}
    </div>
  );
}

// ── Onboarding.jsx ────────────────────────────────────────────────────────────
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { supabase } from "../lib/supabase";

const ROLES = [
  { id:"landlord",  emoji:"🏠", title:"Landlord",  desc:"I own property and want to list it for rent" },
  { id:"caretaker", emoji:"🔑", title:"Caretaker",  desc:"I manage property on behalf of the owner" },
  { id:"agent",     emoji:"👔", title:"Agent",      desc:"I'm a licensed real estate agent" },
  { id:"tenant",    emoji:"🔍", title:"Tenant",     desc:"I'm looking for a rental property" },
];

export function Onboarding() {
  const { user }   = useUser();
  const navigate   = useNavigate();
  const [role, setRole] = useState("");
  const [name, setName] = useState(user?.fullName || "");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!role) { setError("Please select your role"); return; }
    if (!name.trim()) { setError("Please enter your name"); return; }
    setLoading(true); setError("");
    try {
      await supabase.from("profiles").upsert({
        id: user.id, full_name: name.trim(),
        phone: phone ? "254" + phone.replace(/^0/, "") : null,
        role, email: user.primaryEmailAddress?.emailAddress,
        created_at: new Date().toISOString(),
      });
      navigate(["landlord","caretaker","agent"].includes(role) ? "/dashboard" : "/");
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight:"100vh", background:"#F9FAFB", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ background:"#fff", border:"1px solid #E5E7EB", borderRadius:20, padding:36, width:"100%", maxWidth:480, boxShadow:"0 8px 40px rgba(0,0,0,.07)" }}>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ fontSize:44, marginBottom:12 }}>👋</div>
          <h2 style={{ fontFamily:"'DM Serif Display',serif", fontSize:26, marginBottom:6 }}>Welcome to NestList!</h2>
          <p style={{ color:"#6B7280", fontSize:14 }}>Tell us a bit about yourself to get started.</p>
        </div>

        {error && <div style={{ background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:10, padding:"11px 14px", fontSize:13, color:"#DC2626", marginBottom:16 }}>⚠ {error}</div>}

        <div style={{ marginBottom:14 }}>
          <label style={{ display:"block", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:".08em", color:"#6B7280", marginBottom:6 }}>Full Name *</label>
          <input style={{ width:"100%", padding:"11px 14px", border:"1.5px solid #E5E7EB", borderRadius:10, fontSize:14, fontFamily:"inherit", outline:"none" }}
            placeholder="Your full name" value={name} onChange={e => setName(e.target.value)} />
        </div>

        <div style={{ marginBottom:20 }}>
          <label style={{ display:"block", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:".08em", color:"#6B7280", marginBottom:6 }}>Phone Number (optional)</label>
          <input style={{ width:"100%", padding:"11px 14px", border:"1.5px solid #E5E7EB", borderRadius:10, fontSize:14, fontFamily:"inherit", outline:"none" }}
            placeholder="0712 345 678" inputMode="numeric" value={phone}
            onChange={e => setPhone(e.target.value.replace(/\D/g,"").slice(0,10))} />
        </div>

        <label style={{ display:"block", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:".08em", color:"#6B7280", marginBottom:10 }}>I am a… *</label>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:24 }}>
          {ROLES.map(r => (
            <button key={r.id} onClick={() => setRole(r.id)} style={{
              padding:"16px 12px", borderRadius:14, border:`1.5px solid ${role===r.id?"#1E6B4A":"#E5E7EB"}`,
              background: role===r.id ? "#F0FDF4" : "#fff", cursor:"pointer", fontFamily:"inherit",
              textAlign:"center", transition:"all .15s", boxShadow: role===r.id ? "0 0 0 3px rgba(30,107,74,.1)" : "none",
            }}>
              <div style={{ fontSize:28, marginBottom:6 }}>{r.emoji}</div>
              <div style={{ fontSize:13, fontWeight:700, color: role===r.id ? "#1E6B4A" : "#111827", marginBottom:3 }}>{r.title}</div>
              <div style={{ fontSize:11, color:"#9CA3AF", lineHeight:1.4 }}>{r.desc}</div>
            </button>
          ))}
        </div>

        <button onClick={save} disabled={loading || !role} style={{
          width:"100%", padding:"13px", background:"linear-gradient(135deg,#1E6B4A,#34D399)",
          color:"#fff", border:"none", borderRadius:12, fontSize:15, fontWeight:700, cursor:"pointer",
          fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:8,
          boxShadow:"0 4px 16px rgba(30,107,74,.3)", opacity: loading || !role ? .6 : 1,
        }}>
          {loading ? "Setting up…" : `Continue as ${role ? ROLES.find(r=>r.id===role)?.title : "…"} →`}
        </button>
      </div>
    </div>
  );
}

export default { NotFound, Terms, Privacy, Onboarding };
