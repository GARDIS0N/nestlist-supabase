import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "@clerk/clerk-react";
import { useProfile } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { TYPE_LABELS, PROPERTY_EMOJIS } from "../lib/constants";
import Navbar from "../components/Navbar";
import ListPropertyModal from "./ListPropertyModal";
import ToastContainer from "../components/ToastContainer";

const MOCK_LISTINGS = [
  { id:"l1", title:"Modern 1BR, Westlands", type:"1br", location:"Westlands, Nairobi", price:25000, is_active:true, expires_at:new Date(Date.now()+18*86400000).toISOString(), amenities:["Water 24/7","Parking","WiFi Ready"], images:[] },
  { id:"l2", title:"Cozy Bedsitter, Milimani", type:"bedsitter", location:"Milimani, Nakuru", price:7000, is_active:false, expires_at:null, amenities:["Water 24/7"], images:[] },
  { id:"l3", title:"Studio, Kilimani", type:"studio", location:"Kilimani, Nairobi", price:18000, is_active:true, expires_at:new Date(Date.now()+5*86400000).toISOString(), amenities:["CCTV","WiFi Ready"], images:[] },
];
const MOCK_INQ = [
  { id:"i1", profiles:{ full_name:"John Mwangi", phone:"0712 345 678" }, properties:{ title:"Modern 1BR, Westlands" }, message:"Hi, I'm interested in viewing this apartment. Is Saturday possible?", status:"pending", created_at:new Date(Date.now()-3600000).toISOString() },
  { id:"i2", profiles:{ full_name:"Aisha Wanjiku", phone:"0723 456 789" }, properties:{ title:"Cozy Bedsitter" }, message:"What is the minimum lease? Do you allow pets?", status:"responded", created_at:new Date(Date.now()-86400000).toISOString() },
];
const MOCK_PAYMENTS = [
  { id:"p1", amount:500, property_type:"1br", status:"confirmed", mpesa_code:"QKL7823HJ", created_at:new Date(Date.now()-5*86400000).toISOString() },
  { id:"p2", amount:200, property_type:"bedsitter", status:"confirmed", mpesa_code:"QMN4521XZ", created_at:new Date(Date.now()-20*86400000).toISOString() },
];

export default function Dashboard() {
  const { userId }  = useAuth();
  const { profile } = useProfile();
  const { toasts, show: toast } = useToast();

  const [tab, setTab]         = useState("listings");
  const [showList, setShowList] = useState(false);
  const [listings, setListings] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [payments, setPayments]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [replyModal, setReplyModal] = useState(null);
  const [replyText, setReplyText]   = useState("");
  const [replySent, setReplySent]   = useState(false);

  useEffect(() => { if (userId) fetchData(); }, [userId]);

  async function fetchData() {
    setLoading(true);

    const { data: props } = await supabase
      .from("properties").select("*")
      .eq("landlord_id", userId).order("created_at", { ascending: false });
    setListings(props?.length ? props : MOCK_LISTINGS);

    const { data: inqs } = await supabase
      .from("inquiries")
      .select("*,profiles!tenant_id(full_name,phone),properties(title)")
      .eq("landlord_id", userId).order("created_at", { ascending: false });
    setInquiries(inqs?.length ? inqs : MOCK_INQ);

    const { data: pays } = await supabase
      .from("listing_payments").select("*")
      .eq("landlord_id", userId).order("created_at", { ascending: false });
    setPayments(pays?.length ? pays : MOCK_PAYMENTS);

    setLoading(false);
  }

  async function deactivateListing(id) {
    await supabase.from("properties").update({ is_active: false }).eq("id", id);
    setListings(ls => ls.map(l => l.id === id ? { ...l, is_active: false } : l));
    toast("Listing paused");
  }

  async function deleteListing(id) {
    if (!window.confirm("Delete this listing? This cannot be undone.")) return;
    await supabase.from("properties").delete().eq("id", id);
    setListings(ls => ls.filter(l => l.id !== id));
    toast("Listing deleted");
  }

  function daysLeft(exp) {
    if (!exp) return null;
    return Math.max(0, Math.ceil((new Date(exp) - new Date()) / 86400000));
  }

  const active   = listings.filter(l => l.is_active).length;
  const expiring = listings.filter(l => {
    const d = daysLeft(l.expires_at);
    return l.is_active && d !== null && d <= 7;
  });
  const totalPaid = payments
    .filter(p => p.status === "confirmed")
    .reduce((s, p) => s + (p.amount || 0), 0);
  const pending  = inquiries.filter(i => i.status === "pending").length;

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const m = Math.floor(diff / 60000);
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`;
    return `${d}d ago`;
  };

  return (
    <>
      <style>{CSS}</style>
      <Navbar />
      <div className="dash-page">

        {/* Welcome */}
        <div className="dash-welcome">
          <div>
            <h2>Welcome back, {profile?.full_name?.split(" ")[0] || "Landlord"} 👋</h2>
            <p>Manage your listings and track tenant inquiries.</p>
          </div>
          <button className="btn-sm dash-post-btn" onClick={() => setShowList(true)}>
            + List Property
          </button>
        </div>

        {/* Stats */}
        <div className="dash-stats">
          {[
            { label:"Active Listings",  val:active,               icon:"🏠", color:"#1E6B4A" },
            { label:"Total Inquiries",  val:inquiries.length,     icon:"💬", color:"#D97706" },
            { label:"Total Listings",   val:listings.length,      icon:"📋", color:"#4F46E5" },
            { label:"Fees Paid",        val:`KSh ${totalPaid.toLocaleString()}`, icon:"💰", color:"#DB2777" },
          ].map(s => (
            <div className="stat-card" key={s.label} style={{ borderTop:`3px solid ${s.color}` }}>
              <div style={{ fontSize:28, marginBottom:8 }}>{s.icon}</div>
              <div className="stat-val" style={{ color:s.color }}>{s.val}</div>
              <div className="stat-lbl">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Expiry warning */}
        {expiring.length > 0 && (
          <div className="dash-warn">
            ⚠️ <strong>{expiring.length} listing{expiring.length > 1 ? "s" : ""}</strong> expiring within 7 days.
            Renew now to keep them visible to tenants.
            <button className="dash-warn-btn" onClick={() => setShowList(true)}>Renew Now →</button>
          </div>
        )}

        {/* Tabs */}
        <div className="tab-group">
          {[
            { id:"listings",  label:"My Listings",  badge:null },
            { id:"inquiries", label:"Inquiries",     badge:pending > 0 ? pending : null },
            { id:"payments",  label:"Payments",      badge:null },
          ].map(t => (
            <button key={t.id} className={`tab ${tab === t.id ? "on" : ""}`} onClick={() => setTab(t.id)}>
              {t.label}
              {t.badge && <span className="badge b-gold" style={{ marginLeft:6 }}>{t.badge}</span>}
            </button>
          ))}
        </div>

        {/* ── LISTINGS TAB ── */}
        {tab === "listings" && (
          loading ? (
            <div className="empty"><div className="empty-ico">⏳</div><h3>Loading listings…</h3></div>
          ) : listings.length === 0 ? (
            <div className="empty">
              <div className="empty-ico">🏠</div>
              <h3>No listings yet</h3>
              <p>List your first property to start receiving tenant inquiries.</p>
              <button className="btn-sm" style={{ marginTop:16 }} onClick={() => setShowList(true)}>
                + List Your First Property
              </button>
            </div>
          ) : (
            <div className="dash-listing-list">
              {listings.map(l => {
                const days = daysLeft(l.expires_at);
                const urgent = days !== null && days <= 7;
                return (
                  <div className={`dash-listing-row ${urgent ? "dash-row-warn" : ""}`} key={l.id}>
                    {/* Image */}
                    <div className="dash-listing-img">
                      {l.images?.[0]
                        ? <img src={l.images[0]} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                        : <span style={{ fontSize:28 }}>{PROPERTY_EMOJIS[l.type]}</span>}
                    </div>

                    {/* Info */}
                    <div className="dash-listing-info">
                      <div className="dash-listing-title-row">
                        <span className="dash-listing-title">{l.title}</span>
                        <span className={`badge ${l.is_active ? "b-green" : "b-gray"}`}>
                          {l.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div className="dash-listing-sub">
                        📍 {l.location} · {TYPE_LABELS[l.type]}
                      </div>
                      <div className="dash-listing-meta">
                        <span style={{ color:"#1E6B4A", fontWeight:700 }}>
                          KSh {l.price?.toLocaleString()}/mo
                        </span>
                        {days !== null && (
                          <span style={{ color: urgent ? "#EF4444" : "#9CA3AF", fontSize:12 }}>
                            {urgent ? "⚠️" : "⏱"} {days}d remaining
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="dash-listing-actions">
                      {l.is_active && (
                        <button className="dash-action-btn" onClick={() => deactivateListing(l.id)}>
                          ⏸ Pause
                        </button>
                      )}
                      {(!l.is_active || urgent) && (
                        <button className="dash-action-btn dash-action-green" onClick={() => setShowList(true)}>
                          🔄 Renew
                        </button>
                      )}
                      <button className="dash-action-btn dash-action-red" onClick={() => deleteListing(l.id)}>
                        🗑 Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* ── INQUIRIES TAB ── */}
        {tab === "inquiries" && (
          inquiries.length === 0 ? (
            <div className="empty">
              <div className="empty-ico">💬</div>
              <h3>No inquiries yet</h3>
              <p>Tenant inquiries will appear here once your listings are live.</p>
            </div>
          ) : (
            <div className="inq-list">
              {inquiries.map(inq => (
                <div className={`inq-row ${inq.status === "pending" ? "inq-pending" : ""}`} key={inq.id}>
                  <div className="inq-av">
                    {(inq.profiles?.full_name || "?")[0].toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:2 }}>
                      <span style={{ fontWeight:700, fontSize:14 }}>{inq.profiles?.full_name}</span>
                      <span style={{ fontSize:11, color:"#9CA3AF" }}>{timeAgo(inq.created_at)}</span>
                    </div>
                    <div style={{ fontSize:12, color:"#6B7280", marginBottom:4 }}>
                      Re: {inq.properties?.title} · 📞 {inq.profiles?.phone}
                    </div>
                    <div style={{ fontSize:13, color:"#374151", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {inq.message}
                    </div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:6, flexShrink:0 }}>
                    <span className={`badge ${inq.status === "pending" ? "b-gold" : inq.status === "responded" ? "b-green" : "b-gray"}`}>
                      {inq.status}
                    </span>
                    <button className="dash-action-btn" onClick={() => { setReplyModal(inq); setReplySent(false); setReplyText(""); }}>
                      Reply
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* ── PAYMENTS TAB ── */}
        {tab === "payments" && (
          <div>
            {/* Summary */}
            <div className="pay-summary">
              <div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,.6)", textTransform:"uppercase", letterSpacing:"1px", marginBottom:4 }}>
                  Total Listing Fees Paid
                </div>
                <div style={{ fontSize:36, fontWeight:800, color:"#fff" }}>
                  KSh {totalPaid.toLocaleString()}
                </div>
              </div>
              <div style={{ fontSize:40 }}>💳</div>
            </div>

            {payments.length === 0 ? (
              <div className="empty">
                <div className="empty-ico">💳</div>
                <h3>No payments yet</h3>
                <p>Payment history will appear here after you list a property.</p>
              </div>
            ) : (
              <div className="pay-list">
                {payments.map(p => (
                  <div className="pay-row" key={p.id}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:14 }}>{TYPE_LABELS[p.property_type] || "Listing"}</div>
                      <div style={{ fontSize:12, color:"#6B7280" }}>
                        M-Pesa · {new Date(p.created_at).toLocaleDateString("en-KE", { day:"numeric", month:"short", year:"numeric" })}
                        {p.mpesa_code && ` · ${p.mpesa_code}`}
                      </div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontWeight:800, fontSize:16, color:"#1E6B4A" }}>
                        KSh {p.amount?.toLocaleString()}
                      </div>
                      <span className={`badge ${p.status === "confirmed" ? "b-green" : p.status === "pending" ? "b-gold" : "b-gray"}`}>
                        {p.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reply Modal */}
      {replyModal && (
        <div className="overlay" onClick={() => setReplyModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-hd">
              <h3>Reply to {replyModal.profiles?.full_name}</h3>
              <button className="modal-x" onClick={() => setReplyModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ background:"#F9FAFB", borderRadius:10, padding:"12px 14px", marginBottom:14, fontSize:13, color:"#374151" }}>
                {replyModal.message}
              </div>
              {!replySent ? (
                <>
                  <textarea className="ftxt" rows={4} placeholder="Type your reply…"
                    value={replyText} onChange={e => setReplyText(e.target.value)} />
                  <div style={{ fontSize:12, color:"#9CA3AF", marginBottom:12 }}>
                    Their number: <strong>{replyModal.profiles?.phone}</strong>
                  </div>
                  <button className="btn-main" onClick={async () => {
                    if (!replyText.trim()) return;
                    await supabase.from("inquiries").update({ status:"responded" }).eq("id", replyModal.id);
                    setInquiries(is => is.map(i => i.id === replyModal.id ? { ...i, status:"responded" } : i));
                    setReplySent(true);
                    toast("✅ Reply sent!");
                  }}>
                    Send Reply
                  </button>
                  <a className="btn-sec" style={{ display:"block", textAlign:"center", marginTop:8, textDecoration:"none" }}
                    href={`tel:${replyModal.profiles?.phone}`}>
                    📞 Call Instead
                  </a>
                </>
              ) : (
                <div style={{ textAlign:"center", padding:"20px 0" }}>
                  <div style={{ fontSize:40, marginBottom:8 }}>✅</div>
                  <h4 style={{ color:"#1E6B4A" }}>Reply sent!</h4>
                  <p style={{ fontSize:13, color:"#6B7280" }}>The tenant has been notified.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showList && (
        <ListPropertyModal
          onClose={() => { setShowList(false); fetchData(); }}
          toast={toast}
        />
      )}

      <ToastContainer toasts={toasts} />
    </>
  );
}

const CSS = `
  .dash-page{max-width:1100px;margin:0 auto;padding:32px 20px 80px;}
  .dash-welcome{display:flex;align-items:center;justify-content:space-between;background:linear-gradient(135deg,#0A4D2E,#1E6B4A);border-radius:16px;padding:28px 32px;margin-bottom:24px;color:#fff;gap:16px;flex-wrap:wrap;}
  .dash-welcome h2{font-family:'DM Serif Display',serif;font-size:22px;margin-bottom:4px;}
  .dash-welcome p{color:rgba(255,255,255,.65);font-size:13px;}
  .dash-post-btn{background:rgba(255,255,255,.15)!important;color:#fff!important;border:1.5px solid rgba(255,255,255,.3)!important;}
  .dash-post-btn:hover{background:rgba(255,255,255,.25)!important;}

  .dash-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px;margin-bottom:20px;}
  .stat-card{background:#fff;border:1px solid #E5E7EB;border-radius:14px;padding:18px;transition:transform .15s;}
  .stat-card:hover{transform:translateY(-2px);}
  .stat-val{font-size:26px;font-weight:800;margin-bottom:3px;}
  .stat-lbl{font-size:12px;color:#6B7280;}

  .dash-warn{background:#FEF3C7;border:1px solid #FDE68A;border-radius:12px;padding:13px 16px;font-size:13px;color:#92400E;display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:20px;}
  .dash-warn-btn{background:#D97706;color:#fff;border:none;border-radius:8px;padding:5px 14px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;margin-left:auto;}

  .tab-group{display:flex;gap:4px;background:#F3F4F6;border-radius:12px;padding:4px;margin-bottom:20px;}
  .tab{flex:1;padding:9px 8px;border-radius:9px;border:none;cursor:pointer;font-family:inherit;font-size:13px;font-weight:600;transition:all .2s;background:transparent;color:#6B7280;}
  .tab.on{background:#fff;color:#1E6B4A;box-shadow:0 1px 4px rgba(0,0,0,.08);}

  .dash-listing-list{display:flex;flex-direction:column;gap:10px;}
  .dash-listing-row{background:#fff;border:1px solid #E5E7EB;border-radius:14px;padding:14px 16px;display:flex;align-items:center;gap:14px;transition:all .15s;}
  .dash-listing-row:hover{box-shadow:0 4px 16px rgba(0,0,0,.06);}
  .dash-row-warn{border-color:#FDE68A!important;background:#FFFBEB!important;}
  .dash-listing-img{width:72px;height:56px;border-radius:10px;overflow:hidden;background:#D1FAE5;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
  .dash-listing-info{flex:1;min-width:0;}
  .dash-listing-title-row{display:flex;align-items:center;gap:8px;margin-bottom:3px;flex-wrap:wrap;}
  .dash-listing-title{font-size:14px;font-weight:700;color:#111827;}
  .dash-listing-sub{font-size:12px;color:#6B7280;margin-bottom:4px;}
  .dash-listing-meta{display:flex;gap:12px;align-items:center;font-size:13px;}
  .dash-listing-actions{display:flex;flex-direction:column;gap:6px;flex-shrink:0;}
  .dash-action-btn{padding:6px 12px;border-radius:8px;border:1px solid #E5E7EB;background:#F9FAFB;color:#374151;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap;transition:all .15s;}
  .dash-action-btn:hover{background:#F3F4F6;}
  .dash-action-green{border-color:#A7F3D0!important;background:#F0FDF4!important;color:#065F46!important;}
  .dash-action-red{border-color:#FECACA!important;background:#FEF2F2!important;color:#DC2626!important;}

  .inq-list{display:flex;flex-direction:column;gap:10px;}
  .inq-row{background:#fff;border:1px solid #E5E7EB;border-radius:14px;padding:14px 16px;display:flex;align-items:flex-start;gap:12px;}
  .inq-pending{border-color:#FDE68A!important;background:#FFFBEB!important;}
  .inq-av{width:40px;height:40px;border-radius:50%;background:#D1FAE5;color:#1E6B4A;font-weight:700;font-size:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}

  .pay-summary{background:linear-gradient(135deg,#1E6B4A,#0A4D2E);border-radius:16px;padding:24px;display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;}
  .pay-list{display:flex;flex-direction:column;gap:10px;}
  .pay-row{background:#fff;border:1px solid #E5E7EB;border-radius:14px;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;}

  .badge{font-size:10px;font-weight:700;padding:2px 9px;border-radius:20px;display:inline-block;}
  .b-green{background:#D1FAE5;color:#065F46;}
  .b-gold{background:#FEF3C7;color:#92400E;}
  .b-gray{background:#F3F4F6;color:#6B7280;}

  @media(max-width:600px){
    .dash-page{padding:16px 14px 80px;}
    .dash-welcome{padding:20px;}
    .dash-listing-row{flex-wrap:wrap;}
    .dash-listing-actions{flex-direction:row;width:100%;}
  }
`;
