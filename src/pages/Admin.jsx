import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "@clerk/clerk-react";
import { useProfile } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { TYPE_LABELS } from "../lib/constants";
import Navbar from "../components/Navbar";
import ToastContainer from "../components/ToastContainer";

// ── Mock data ─────────────────────────────────────────────────────────────────
const MOCK_STATS = {
  total_listings: 284, active_listings: 201, pending_listings: 14,
  total_users: 847, total_revenue: 248500, monthly_revenue: 38200,
  suspended_listings: 7, inquiries_today: 23,
};
const MOCK_LISTINGS = [
  { id:"l1", title:"Modern 2BR Westlands", type:"2br", location:"Westlands, Nairobi", price:45000, is_active:true, created_at: new Date(Date.now()-2*86400000).toISOString(), profiles:{ full_name:"James Mwangi" } },
  { id:"l2", title:"Cozy Studio Karen",    type:"studio", location:"Karen, Nairobi",    price:22000, is_active:true,  created_at: new Date(Date.now()-86400000).toISOString(),    profiles:{ full_name:"Grace Wanjiku" } },
  { id:"l3", title:"3BR Home Lavington",   type:"3br",    location:"Lavington, Nairobi",price:85000, is_active:false, created_at: new Date(Date.now()-5*86400000).toISOString(),  profiles:{ full_name:"Sarah Njeri" } },
  { id:"l4", title:"Single Room Kasarani", type:"single_room", location:"Kasarani, Nairobi", price:7500, is_active:false, created_at: new Date(Date.now()-10*86400000).toISOString(), profiles:{ full_name:"Peter Kamau" } },
];
const MOCK_USERS = [
  { id:"u1", full_name:"James Mwangi",  email:"james@gmail.com",  role:"landlord",  listings_count:3, created_at: new Date(Date.now()-30*86400000).toISOString(), is_active:true  },
  { id:"u2", full_name:"Grace Wanjiku", email:"grace@gmail.com",  role:"caretaker", listings_count:2, created_at: new Date(Date.now()-20*86400000).toISOString(), is_active:true  },
  { id:"u3", full_name:"Sarah Njeri",   email:"sarah@gmail.com",  role:"agent",     listings_count:8, created_at: new Date(Date.now()-60*86400000).toISOString(), is_active:true  },
  { id:"u4", full_name:"John Otieno",   email:"john@gmail.com",   role:"landlord",  listings_count:1, created_at: new Date(Date.now()-15*86400000).toISOString(), is_active:false },
  { id:"u5", full_name:"Mary Achieng",  email:"mary@gmail.com",   role:"tenant",    listings_count:0, created_at: new Date(Date.now()-5*86400000).toISOString(),  is_active:true  },
];
const MOCK_PAYMENTS = [
  { id:"p1", amount:700,  property_type:"2br",    status:"confirmed", mpesa_code:"QKL7823HJ", created_at: new Date(Date.now()-86400000).toISOString(),   profiles:{ full_name:"James Mwangi" } },
  { id:"p2", amount:1500, property_type:"5br_plus",status:"confirmed", mpesa_code:"QMN4521XZ", created_at: new Date(Date.now()-3*86400000).toISOString(),  profiles:{ full_name:"Sarah Njeri" } },
  { id:"p3", amount:250,  property_type:"studio",  status:"confirmed", mpesa_code:"QAB1234CD", created_at: new Date(Date.now()-5*86400000).toISOString(),  profiles:{ full_name:"Grace Wanjiku" } },
  { id:"p4", amount:1000, property_type:"3br",     status:"confirmed", mpesa_code:"QPQ9876YZ", created_at: new Date(Date.now()-7*86400000).toISOString(),  profiles:{ full_name:"Peter Kamau" } },
  { id:"p5", amount:500,  property_type:"1br",     status:"failed",    mpesa_code:null,         created_at: new Date(Date.now()-2*86400000).toISOString(),  profiles:{ full_name:"Alice Kamau" } },
];
const REVENUE_MONTHS = [
  { month:"Jan", val:18400 },{ month:"Feb", val:22100 },
  { month:"Mar", val:19800 },{ month:"Apr", val:28600 },
  { month:"May", val:33500 },{ month:"Jun", val:38200 },
];

export default function Admin() {
  const { userId }  = useAuth();
  const { profile } = useProfile();
  const { toasts, show: toast } = useToast();

  const [tab, setTab]         = useState("overview");
  const [stats, setStats]     = useState(MOCK_STATS);
  const [listings, setListings] = useState(MOCK_LISTINGS);
  const [users, setUsers]     = useState(MOCK_USERS);
  const [payments, setPayments] = useState(MOCK_PAYMENTS);
  const [loading, setLoading] = useState(false);
  const [search, setSearch]   = useState("");
  const [confirm, setConfirm] = useState(null); // { type, item }
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [{ data: props }, { data: us }, { data: pays }] = await Promise.all([
        supabase.from("properties").select("*,profiles!landlord_id(full_name)").order("created_at", { ascending:false }).limit(50),
        supabase.from("profiles").select("*").order("created_at", { ascending:false }).limit(50),
        supabase.from("listing_payments").select("*,profiles!landlord_id(full_name)").order("created_at", { ascending:false }).limit(50),
      ]);

      if (props?.length) setListings(props);
      if (us?.length)   setUsers(us);
      if (pays?.length) {
        setPayments(pays);
        // Calculate real stats
        const confirmed = pays.filter(p => p.status === "confirmed");
        const thisMonth = confirmed.filter(p => new Date(p.created_at).getMonth() === new Date().getMonth());
        setStats(s => ({
          ...s,
          total_revenue:   confirmed.reduce((a, p) => a + (p.amount || 0), 0),
          monthly_revenue: thisMonth.reduce((a, p) => a + (p.amount || 0), 0),
          total_listings:  props?.length || s.total_listings,
          active_listings: props?.filter(p => p.is_active).length || s.active_listings,
          total_users:     us?.length || s.total_users,
        }));
      }
    } catch (_) { /* use mock data */ }
    setLoading(false);
  }

  async function toggleListing(id, activate) {
    await supabase.from("properties").update({ is_active: activate }).eq("id", id);
    setListings(ls => ls.map(l => l.id === id ? { ...l, is_active: activate } : l));
    toast(activate ? "✅ Listing restored" : "🚫 Listing suspended");
    setConfirm(null);
  }

  async function toggleUser(id, activate) {
    await supabase.from("profiles").update({ is_active: activate }).eq("id", id);
    setUsers(us => us.map(u => u.id === id ? { ...u, is_active: activate } : u));
    toast(activate ? "✅ User reinstated" : "🚫 User suspended");
    setConfirm(null);
  }

  const maxRev = Math.max(...REVENUE_MONTHS.map(r => r.val));

  const filteredListings = listings.filter(l =>
    !search || l.title?.toLowerCase().includes(search.toLowerCase()) ||
    l.profiles?.full_name?.toLowerCase().includes(search.toLowerCase())
  );
  const filteredUsers = users.filter(u =>
    !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const TABS = [
    { id:"overview",  label:"Overview",  icon:"📊" },
    { id:"listings",  label:"Listings",  icon:"🏠" },
    { id:"users",     label:"Users",     icon:"👥" },
    { id:"revenue",   label:"Revenue",   icon:"💰" },
  ];

  const ROLE_COLORS = {
    landlord:"#1E6B4A", caretaker:"#D97706",
    agent:"#4F46E5", tenant:"#0891B2", admin:"#DB2777",
  };

  return (
    <>
      <style>{CSS}</style>

      <div className="adm-layout">
        {/* Sidebar */}
        <aside className={`adm-sidebar ${sidebarOpen ? "adm-sidebar-open" : ""}`}>
          <div className="adm-brand">
            <div className="adm-logo">N</div>
            <div>
              <div className="adm-brand-name">NestList</div>
              <div className="adm-brand-role">Admin Panel</div>
            </div>
          </div>

          <nav className="adm-nav">
            {TABS.map(t => (
              <button key={t.id}
                className={`adm-nav-item ${tab === t.id ? "adm-nav-on" : ""}`}
                onClick={() => { setTab(t.id); setSidebarOpen(false); }}>
                <span className="adm-nav-icon">{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </nav>

          <div className="adm-profile">
            <div className="adm-profile-av">
              {(profile?.full_name || "A")[0].toUpperCase()}
            </div>
            <div>
              <div className="adm-profile-name">{profile?.full_name || "Admin"}</div>
              <div className="adm-profile-role">Super Admin</div>
            </div>
          </div>
        </aside>

        {/* Mobile overlay */}
        {sidebarOpen && <div className="adm-overlay" onClick={() => setSidebarOpen(false)} />}

        {/* Main */}
        <main className="adm-main">
          {/* Mobile header */}
          <div className="adm-mobile-hd">
            <button className="adm-menu-btn" onClick={() => setSidebarOpen(true)}>☰</button>
            <span style={{ fontWeight:700 }}>NestList Admin</span>
            <div className="adm-profile-av" style={{ width:32, height:32, fontSize:14 }}>
              {(profile?.full_name || "A")[0]}
            </div>
          </div>

          {/* ── OVERVIEW ── */}
          {tab === "overview" && (
            <div className="adm-content">
              <div className="adm-page-hd">
                <h2>Platform Overview</h2>
                <div className="adm-date">{new Date().toLocaleDateString("en-KE", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}</div>
              </div>

              {/* Stats grid */}
              <div className="adm-stats">
                {[
                  { label:"Total Revenue",     val:`KSh ${stats.total_revenue?.toLocaleString()}`, icon:"💰", color:"#4F46E5", trend:"+18%" },
                  { label:"Active Listings",   val:stats.active_listings,   icon:"🏠", color:"#1E6B4A", trend:"+12%" },
                  { label:"Total Users",       val:stats.total_users,       icon:"👥", color:"#0891B2", trend:"+24%" },
                  { label:"This Month",        val:`KSh ${stats.monthly_revenue?.toLocaleString()}`, icon:"📈", color:"#D97706", trend:"+9%"  },
                  { label:"Pending Review",    val:stats.pending_listings,  icon:"⏳", color:"#EA580C", trend:null },
                  { label:"Suspended",         val:stats.suspended_listings,icon:"🚫", color:"#DC2626", trend:null },
                ].map(s => (
                  <div className="adm-stat-card" key={s.label} style={{ borderTop:`3px solid ${s.color}` }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
                      <div className="adm-stat-icon" style={{ background:`${s.color}18` }}>{s.icon}</div>
                      {s.trend && (
                        <span className="adm-trend">{s.trend}</span>
                      )}
                    </div>
                    <div className="adm-stat-val" style={{ color:s.color }}>{s.val}</div>
                    <div className="adm-stat-lbl">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Revenue chart */}
              <div className="adm-chart-card">
                <div className="adm-chart-hd">
                  <div>
                    <h3>Monthly Revenue</h3>
                    <p>KSh · Listing fees collected in 2026</p>
                  </div>
                  <div className="adm-chart-badge">2026</div>
                </div>
                <div className="adm-chart">
                  {REVENUE_MONTHS.map(r => (
                    <div key={r.month} className="adm-bar-wrap">
                      <div className="adm-bar-val">KSh {(r.val/1000).toFixed(0)}k</div>
                      <div className="adm-bar-outer">
                        <div className="adm-bar-fill" style={{ height:`${(r.val/maxRev)*100}%` }} />
                      </div>
                      <div className="adm-bar-lbl">{r.month}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent payments */}
              <div className="adm-chart-card" style={{ marginTop:16 }}>
                <h3 style={{ marginBottom:16 }}>Recent Payments</h3>
                {MOCK_PAYMENTS.slice(0,4).map(p => (
                  <div className="adm-recent-row" key={p.id}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:14 }}>{p.profiles?.full_name}</div>
                      <div style={{ fontSize:12, color:"#6B7280" }}>{TYPE_LABELS[p.property_type]} · {p.mpesa_code || "—"}</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontWeight:800, color: p.status==="confirmed" ? "#1E6B4A" : "#DC2626" }}>
                        KSh {p.amount?.toLocaleString()}
                      </div>
                      <span className={`badge ${p.status==="confirmed" ? "b-green" : "b-red"}`}>{p.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── LISTINGS ── */}
          {tab === "listings" && (
            <div className="adm-content">
              <div className="adm-page-hd">
                <h2>All Listings <span className="adm-count">{listings.length}</span></h2>
                <input className="adm-search" placeholder="🔍 Search listings or landlords…"
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>

              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      {["Property","Landlord","Type","Price","Status","Date","Actions"].map(h => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredListings.map(l => (
                      <tr key={l.id}>
                        <td style={{ fontWeight:600, maxWidth:180, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{l.title}</td>
                        <td style={{ color:"#6B7280" }}>{l.profiles?.full_name || "—"}</td>
                        <td><span className="badge b-blue">{TYPE_LABELS[l.type]}</span></td>
                        <td style={{ fontWeight:700, color:"#1E6B4A" }}>KSh {l.price?.toLocaleString()}</td>
                        <td>
                          <span className={`badge ${l.is_active ? "b-green" : "b-red"}`}>
                            {l.is_active ? "Active" : "Suspended"}
                          </span>
                        </td>
                        <td style={{ color:"#9CA3AF", fontSize:12 }}>
                          {new Date(l.created_at).toLocaleDateString("en-KE", { day:"numeric", month:"short" })}
                        </td>
                        <td>
                          <div style={{ display:"flex", gap:6 }}>
                            {l.is_active
                              ? <button className="adm-action-btn adm-action-red"
                                  onClick={() => setConfirm({ type:"suspend-listing", item:l })}>
                                  🚫 Suspend
                                </button>
                              : <button className="adm-action-btn adm-action-green"
                                  onClick={() => setConfirm({ type:"restore-listing", item:l })}>
                                  ✅ Restore
                                </button>
                            }
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredListings.length === 0 && (
                  <div className="adm-empty">No listings match your search</div>
                )}
              </div>
            </div>
          )}

          {/* ── USERS ── */}
          {tab === "users" && (
            <div className="adm-content">
              <div className="adm-page-hd">
                <h2>All Users <span className="adm-count">{users.length}</span></h2>
                <input className="adm-search" placeholder="🔍 Search users by name or email…"
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>

              <div className="adm-user-list">
                {filteredUsers.map(u => (
                  <div className={`adm-user-row ${!u.is_active ? "adm-user-suspended" : ""}`} key={u.id}>
                    <div className="adm-user-av" style={{ background:`${ROLE_COLORS[u.role]}22`, color:ROLE_COLORS[u.role] }}>
                      {(u.full_name || "?")[0].toUpperCase()}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:3 }}>
                        <span style={{ fontWeight:700, fontSize:14 }}>{u.full_name}</span>
                        <span className="badge" style={{ background:`${ROLE_COLORS[u.role]}18`, color:ROLE_COLORS[u.role] }}>
                          {u.role}
                        </span>
                        {!u.is_active && <span className="badge b-red">Suspended</span>}
                      </div>
                      <div style={{ fontSize:12, color:"#6B7280" }}>
                        {u.email} · {u.listings_count || 0} listing{u.listings_count !== 1 ? "s" : ""} · Joined {new Date(u.created_at).toLocaleDateString("en-KE", { month:"short", year:"numeric" })}
                      </div>
                    </div>
                    <div>
                      {u.is_active
                        ? <button className="adm-action-btn adm-action-red"
                            onClick={() => setConfirm({ type:"suspend-user", item:u })}>
                            🚫 Suspend
                          </button>
                        : <button className="adm-action-btn adm-action-green"
                            onClick={() => setConfirm({ type:"restore-user", item:u })}>
                            ✅ Reinstate
                          </button>
                      }
                    </div>
                  </div>
                ))}
                {filteredUsers.length === 0 && (
                  <div className="adm-empty">No users match your search</div>
                )}
              </div>
            </div>
          )}

          {/* ── REVENUE ── */}
          {tab === "revenue" && (
            <div className="adm-content">
              <div className="adm-page-hd">
                <h2>Revenue & Payments</h2>
              </div>

              {/* Revenue summary */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:14, marginBottom:24 }}>
                {[
                  { label:"Total Revenue",  val:`KSh ${payments.filter(p=>p.status==="confirmed").reduce((a,p)=>a+(p.amount||0),0).toLocaleString()}`, icon:"💰", color:"#4F46E5" },
                  { label:"This Month",     val:`KSh ${payments.filter(p=>p.status==="confirmed"&&new Date(p.created_at).getMonth()===new Date().getMonth()).reduce((a,p)=>a+(p.amount||0),0).toLocaleString()}`, icon:"📈", color:"#1E6B4A" },
                  { label:"Transactions",   val:payments.length, icon:"🔄", color:"#0891B2" },
                  { label:"Failed",         val:payments.filter(p=>p.status==="failed").length, icon:"❌", color:"#DC2626" },
                ].map(s => (
                  <div className="adm-stat-card" key={s.label} style={{ borderTop:`3px solid ${s.color}` }}>
                    <div className="adm-stat-icon" style={{ background:`${s.color}18`, marginBottom:12 }}>{s.icon}</div>
                    <div className="adm-stat-val" style={{ color:s.color }}>{s.val}</div>
                    <div className="adm-stat-lbl">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Payments table */}
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      {["Landlord","Property Type","Amount","M-Pesa Code","Date","Status"].map(h => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(p => (
                      <tr key={p.id}>
                        <td style={{ fontWeight:600 }}>{p.profiles?.full_name || "—"}</td>
                        <td style={{ color:"#6B7280" }}>{TYPE_LABELS[p.property_type] || "—"}</td>
                        <td style={{ fontWeight:800, color:"#1E6B4A" }}>KSh {p.amount?.toLocaleString()}</td>
                        <td style={{ fontFamily:"monospace", fontSize:12 }}>{p.mpesa_code || "—"}</td>
                        <td style={{ color:"#9CA3AF", fontSize:12 }}>
                          {new Date(p.created_at).toLocaleDateString("en-KE", { day:"numeric", month:"short", year:"numeric" })}
                        </td>
                        <td>
                          <span className={`badge ${p.status==="confirmed"?"b-green":p.status==="pending"?"b-gold":"b-red"}`}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Confirm modal */}
      {confirm && (
        <div className="overlay" onClick={() => setConfirm(null)}>
          <div className="modal" style={{ maxWidth:380 }} onClick={e => e.stopPropagation()}>
            <div className="modal-hd">
              <h3>Confirm Action</h3>
              <button className="modal-x" onClick={() => setConfirm(null)}>×</button>
            </div>
            <div className="modal-body" style={{ textAlign:"center" }}>
              <div style={{ fontSize:48, marginBottom:12 }}>
                {confirm.type.includes("suspend") ? "🚫" : "✅"}
              </div>
              <h4 style={{ marginBottom:8 }}>
                {confirm.type.includes("suspend") ? "Suspend" : "Restore"}{" "}
                {confirm.type.includes("user") ? "User" : "Listing"}?
              </h4>
              <p style={{ fontSize:13, color:"#6B7280", marginBottom:20 }}>
                <strong>{confirm.item.title || confirm.item.full_name}</strong>
                {confirm.type.includes("suspend")
                  ? " will be hidden from the platform."
                  : " will be visible on the platform again."}
              </p>
              <div style={{ display:"flex", gap:10 }}>
                <button className="btn-sec" style={{ flex:1 }} onClick={() => setConfirm(null)}>
                  Cancel
                </button>
                <button
                  className="btn-main"
                  style={{ flex:1, background: confirm.type.includes("suspend") ? "#DC2626" : "#1E6B4A" }}
                  onClick={() => {
                    if (confirm.type === "suspend-listing") toggleListing(confirm.item.id, false);
                    if (confirm.type === "restore-listing") toggleListing(confirm.item.id, true);
                    if (confirm.type === "suspend-user")    toggleUser(confirm.item.id, false);
                    if (confirm.type === "restore-user")    toggleUser(confirm.item.id, true);
                  }}>
                  {confirm.type.includes("suspend") ? "Yes, Suspend" : "Yes, Restore"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} />
    </>
  );
}

const CSS = `
  .adm-layout{display:flex;min-height:100vh;background:#F9FAFB;}

  /* Sidebar */
  .adm-sidebar{width:220px;background:#fff;border-right:1px solid #E5E7EB;display:flex;flex-direction:column;position:fixed;top:0;left:0;bottom:0;z-index:100;transition:transform .25s;padding:24px 16px;}
  .adm-brand{display:flex;align-items:center;gap:10px;margin-bottom:32px;}
  .adm-logo{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#1E6B4A,#34D399);color:#fff;font-size:18px;font-weight:900;display:flex;align-items:center;justify-content:center;}
  .adm-brand-name{font-size:16px;font-weight:800;color:#111827;}
  .adm-brand-role{font-size:10px;color:#9CA3AF;}
  .adm-nav{display:flex;flex-direction:column;gap:3px;flex:1;}
  .adm-nav-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;border:none;cursor:pointer;font-family:inherit;font-size:13px;font-weight:600;color:#6B7280;background:transparent;text-align:left;transition:all .15s;border-left:3px solid transparent;}
  .adm-nav-item:hover{background:#F0FDF4;color:#1E6B4A;}
  .adm-nav-on{background:#F0FDF4!important;color:#1E6B4A!important;border-left-color:#1E6B4A!important;}
  .adm-nav-icon{font-size:16px;}
  .adm-profile{display:flex;align-items:center;gap:8px;padding:12px;background:#F9FAFB;border-radius:12px;border:1px solid #E5E7EB;}
  .adm-profile-av{width:36px;height:36px;border-radius:50%;background:#D1FAE5;color:#1E6B4A;font-size:15px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
  .adm-profile-name{font-size:12px;font-weight:700;color:#111827;}
  .adm-profile-role{font-size:10px;color:#9CA3AF;}

  /* Main */
  .adm-main{flex:1;margin-left:220px;min-height:100vh;}
  .adm-mobile-hd{display:none;padding:14px 20px;background:#fff;border-bottom:1px solid #E5E7EB;align-items:center;justify-content:space-between;}
  .adm-menu-btn{background:none;border:none;font-size:20px;cursor:pointer;padding:4px;}
  .adm-content{padding:32px;}
  .adm-page-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px;}
  .adm-page-hd h2{font-family:'DM Serif Display',serif;font-size:24px;color:#111827;margin:0;display:flex;align-items:center;gap:10px;}
  .adm-count{background:#F3F4F6;color:#6B7280;font-size:14px;font-weight:600;padding:2px 10px;border-radius:20px;font-family:'Plus Jakarta Sans',sans-serif;}
  .adm-date{font-size:13px;color:#9CA3AF;}
  .adm-search{padding:9px 16px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;font-family:inherit;outline:none;min-width:240px;transition:border-color .15s;}
  .adm-search:focus{border-color:#1E6B4A;}

  /* Stats */
  .adm-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin-bottom:24px;}
  .adm-stat-card{background:#fff;border:1px solid #E5E7EB;border-radius:14px;padding:18px;transition:transform .15s;}
  .adm-stat-card:hover{transform:translateY(-2px);}
  .adm-stat-icon{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;}
  .adm-stat-val{font-size:26px;font-weight:800;margin-bottom:3px;letter-spacing:-1px;}
  .adm-stat-lbl{font-size:12px;color:#6B7280;}
  .adm-trend{background:#D1FAE5;color:#065F46;font-size:11px;font-weight:700;padding:3px 9px;border-radius:20px;}

  /* Chart */
  .adm-chart-card{background:#fff;border:1px solid #E5E7EB;border-radius:16px;padding:24px;}
  .adm-chart-hd{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;}
  .adm-chart-hd h3{font-size:16px;font-weight:700;margin:0 0 3px;}
  .adm-chart-hd p{font-size:12px;color:#6B7280;margin:0;}
  .adm-chart-badge{background:#F0FDF4;color:#1E6B4A;font-size:12px;font-weight:700;padding:5px 14px;border-radius:8px;border:1px solid #A7F3D0;}
  .adm-chart{display:flex;align-items:flex-end;gap:12px;height:160px;}
  .adm-bar-wrap{flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;height:100%;}
  .adm-bar-val{font-size:10px;color:#6B7280;font-weight:600;}
  .adm-bar-outer{flex:1;width:100%;display:flex;align-items:flex-end;background:#F3F4F6;border-radius:6px 6px 0 0;overflow:hidden;}
  .adm-bar-fill{width:100%;background:linear-gradient(to top,#1E6B4A,#34D399);border-radius:4px 4px 0 0;transition:height .5s cubic-bezier(.34,1.56,.64,1);}
  .adm-bar-lbl{font-size:11px;color:#9CA3AF;font-weight:600;}
  .adm-recent-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #F3F4F6;}
  .adm-recent-row:last-child{border-bottom:none;}

  /* Table */
  .adm-table-wrap{background:#fff;border:1px solid #E5E7EB;border-radius:16px;overflow:hidden;overflow-x:auto;}
  .adm-table{width:100%;border-collapse:collapse;font-size:13px;min-width:600px;}
  .adm-table th{padding:12px 16px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#9CA3AF;border-bottom:1px solid #E5E7EB;background:#F9FAFB;white-space:nowrap;}
  .adm-table td{padding:13px 16px;border-bottom:1px solid #F3F4F6;color:#111827;vertical-align:middle;}
  .adm-table tr:last-child td{border-bottom:none;}
  .adm-table tr:hover td{background:#F9FAFB;}
  .adm-empty{padding:40px;text-align:center;color:#9CA3AF;font-size:14px;}

  /* Users */
  .adm-user-list{display:flex;flex-direction:column;gap:10px;}
  .adm-user-row{background:#fff;border:1px solid #E5E7EB;border-radius:14px;padding:14px 18px;display:flex;align-items:center;gap:12px;}
  .adm-user-suspended{border-color:#FECACA!important;background:#FEF2F2!important;}
  .adm-user-av{width:44px;height:44px;border-radius:14px;font-size:18px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;}

  /* Action buttons */
  .adm-action-btn{padding:6px 12px;border-radius:8px;border:1.5px solid;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap;transition:all .15s;}
  .adm-action-red{border-color:#FECACA;color:#DC2626;background:#FEF2F2;}
  .adm-action-red:hover{background:#FEE2E2;}
  .adm-action-green{border-color:#A7F3D0;color:#065F46;background:#F0FDF4;}
  .adm-action-green:hover{background:#DCFCE7;}

  /* Badges */
  .badge{font-size:10px;font-weight:700;padding:2px 9px;border-radius:20px;display:inline-block;}
  .b-green{background:#D1FAE5;color:#065F46;}
  .b-red{background:#FEE2E2;color:#DC2626;}
  .b-gold{background:#FEF3C7;color:#92400E;}
  .b-blue{background:#DBEAFE;color:#1D4ED8;}

  /* Mobile sidebar */
  .adm-overlay{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:99;}
  @media(max-width:768px){
    .adm-sidebar{transform:translateX(-100%);}
    .adm-sidebar-open{transform:translateX(0)!important;}
    .adm-main{margin-left:0;}
    .adm-mobile-hd{display:flex;}
    .adm-content{padding:20px 16px;}
    .adm-stats{grid-template-columns:1fr 1fr;}
    .adm-page-hd{flex-direction:column;align-items:flex-start;}
    .adm-search{width:100%;}
  }
`;
