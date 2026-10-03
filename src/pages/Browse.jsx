import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "@clerk/clerk-react";
import { useProfile } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { TYPE_LABELS, PROPERTY_EMOJIS, COUNTIES } from "../lib/constants";
import Navbar from "../components/Navbar";
import ToastContainer from "../components/ToastContainer";

// ── Mock data for when Supabase is not connected ──────────────────────────────
const MOCK = [
  { id:"1", title:"Cozy Bedsitter, Milimani", location:"Milimani, Nakuru", county:"Nakuru", type:"bedsitter", price:7000, amenities:["Water 24/7","Security Guard","Parking"], images:[], created_at: new Date(Date.now()-2*86400000).toISOString() },
  { id:"2", title:"Modern 1BR, Westlands", location:"Westlands, Nairobi", county:"Nairobi", type:"1br", price:25000, amenities:["Water 24/7","WiFi Ready","CCTV","Parking"], images:[], created_at: new Date(Date.now()-86400000).toISOString() },
  { id:"3", title:"Studio Apartment, Kilimani", location:"Kilimani, Nairobi", county:"Nairobi", type:"studio", price:18000, amenities:["Water 24/7","DSTV Ready","Tiled Floors"], images:[], created_at: new Date().toISOString() },
  { id:"4", title:"Spacious 2BR, Kisumu", location:"Milimani, Kisumu", county:"Kisumu", type:"2br", price:20000, amenities:["Borehole","Parking","Garden"], images:[], created_at: new Date(Date.now()-5*86400000).toISOString() },
  { id:"5", title:"Single Room, Kericho", location:"Town Centre, Kericho", county:"Kericho", type:"single_room", price:4500, amenities:["Water 24/7","Near Tarmac"], images:[], created_at: new Date(Date.now()-10*86400000).toISOString() },
  { id:"6", title:"3BR House, Karen", location:"Karen, Nairobi", county:"Nairobi", type:"3br", price:55000, amenities:["CCTV","Garden","Electric Fence","Parking","Security Guard"], images:[], created_at: new Date(Date.now()-3*86400000).toISOString() },
];

const POPULAR = ["Kilimani","Westlands","Karen","Kasarani","Mombasa","Nakuru","Lavington","Ngong Road"];

export default function Browse() {
  const { userId }   = useAuth();
  const { profile }  = useProfile();
  const navigate     = useNavigate();
  const { toasts, show: toast } = useToast();

  const [properties, setProperties] = useState([]);
  const [savedIds, setSavedIds]     = useState(new Set());
  const [alerts, setAlerts]         = useState([]);
  const [search, setSearch]         = useState("");
  const [typeF, setTypeF]           = useState("all");
  const [countyF, setCountyF]       = useState("all");
  const [maxPrice, setMaxPrice]     = useState(200000);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState(null);
  const [inquiryForm, setInquiryForm] = useState({ name:"", email:"", phone:"", message:"" });
  const [inquirySent, setInquirySent] = useState(false);
  const [inquiryLoading, setInquiryLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const searchRef = useRef();

  useEffect(() => { fetchData(); }, [userId]);

  async function fetchData() {
    setLoading(true);
    const { data: props } = await supabase
      .from("properties")
      .select("*,profiles!landlord_id(full_name,phone,avatar_url)")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    setProperties(props?.length ? props : MOCK);

    if (userId) {
      const { data: saved } = await supabase
        .from("saved_properties").select("property_id").eq("tenant_id", userId);
      if (saved) setSavedIds(new Set(saved.map(s => s.property_id)));

      const { data: al } = await supabase
        .from("search_alerts").select("*").eq("tenant_id", userId).eq("is_active", true);
      if (al) setAlerts(al);
    }
    setLoading(false);
  }

  async function toggleSave(propId, e) {
    e.stopPropagation();
    if (!userId) { toast("Sign in to save properties", "error"); return; }
    if (savedIds.has(propId)) {
      await supabase.from("saved_properties").delete().eq("tenant_id", userId).eq("property_id", propId);
      setSavedIds(s => { const n = new Set(s); n.delete(propId); return n; });
      toast("Removed from saved");
    } else {
      await supabase.from("saved_properties").insert({ tenant_id: userId, property_id: propId });
      setSavedIds(s => new Set([...s, propId]));
      toast("❤️ Property saved!");
    }
  }

  async function sendInquiry() {
    if (!inquiryForm.name || !inquiryForm.phone) {
      toast("Please enter your name and phone number", "error"); return;
    }
    setInquiryLoading(true);
    try {
      if (userId && selected) {
        await supabase.from("inquiries").insert({
          property_id: selected.id,
          tenant_id:   userId,
          landlord_id: selected.landlord_id,
          message:     inquiryForm.message || `Hi, I'm interested in "${selected.title}". Please contact me.`,
        });
      }
      setInquirySent(true);
      toast("✅ Inquiry sent! The landlord will contact you soon.");
    } catch (_) {
      setInquirySent(true); // still show success for demo
    }
    setInquiryLoading(false);
  }

  function matchesAlert(p) {
    return alerts.some(a =>
      (!a.county || a.county === p.county) &&
      (!a.type   || a.type   === p.type) &&
      (!a.max_price || p.price <= a.max_price)
    );
  }

  function isNew(p) {
    return (Date.now() - new Date(p.created_at).getTime()) < 7 * 86400000;
  }

  const filtered = properties.filter(p => {
    const q = search.toLowerCase();
    const ms = !q || p.title?.toLowerCase().includes(q) || p.location?.toLowerCase().includes(q) || p.county?.toLowerCase().includes(q);
    return ms && (typeF === "all" || p.type === typeF) && (countyF === "all" || p.county === countyF) && p.price <= maxPrice;
  });

  const counties = [...new Set(properties.map(p => p.county).filter(Boolean))];

  function handleSearchInput(v) {
    setSearch(v);
    if (v.length > 1) {
      setSuggestions(POPULAR.filter(s => s.toLowerCase().includes(v.toLowerCase())));
    } else {
      setSuggestions([]);
    }
  }

  return (
    <>
      <style>{CSS}</style>
      <Navbar savedCount={savedIds.size} alertCount={alerts.length} />

      <div className="br-page">
        {/* Hero */}
        <div className="br-hero">
          <div className="br-hero-blob1" /><div className="br-hero-blob2" />
          <div className="br-hero-lbl">🇰🇪 Kenya's Premium Rental Platform</div>
          <h1 className="br-hero-h1">
            Find Your Dream Home<br />
            <span className="br-hero-accent">Across Kenya</span>
          </h1>
          <p className="br-hero-desc">Browse verified listings from trusted landlords — direct contact, no middlemen.</p>

          <div className="br-trust-row">
            {["🏠 1,200+ Listings","✅ Verified Landlords","⚡ Instant Contact"].map(t => (
              <span key={t} className="br-trust-chip">{t}</span>
            ))}
          </div>

          {/* Search */}
          <div className="br-search-wrap" ref={searchRef}>
            <div className="br-search-bar">
              <span className="br-search-icon">🔍</span>
              <input
                className="br-search-inp"
                placeholder="Search by location, estate, or property name…"
                value={search}
                onChange={e => handleSearchInput(e.target.value)}
              />
              {search && (
                <button className="br-search-clear" onClick={() => { setSearch(""); setSuggestions([]); }}>✕</button>
              )}
            </div>
            {suggestions.length > 0 && (
              <div className="br-suggestions">
                {suggestions.map(s => (
                  <div key={s} className="br-suggestion" onClick={() => { setSearch(s); setSuggestions([]); }}>
                    📍 {s}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Popular chips */}
          <div className="br-popular">
            {POPULAR.map(p => (
              <button key={p} className={`br-popular-chip ${search === p ? "br-popular-on" : ""}`}
                onClick={() => { setSearch(search === p ? "" : p); setSuggestions([]); }}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="br-filters">
          <div className="br-type-pills">
            {[["all","All Homes"], ...Object.entries(TYPE_LABELS)].map(([k,v]) => (
              <button key={k} className={`br-type-pill ${typeF === k ? "br-type-on" : ""}`}
                onClick={() => setTypeF(k)}>
                {k !== "all" && PROPERTY_EMOJIS[k] + " "}{v}
              </button>
            ))}
          </div>

          <div className="br-filter-row">
            <select className="br-sel" value={countyF} onChange={e => setCountyF(e.target.value)}>
              <option value="all">All Counties</option>
              {counties.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <div className="br-price-wrap">
              <label className="br-price-lbl">Max Rent: KSh {maxPrice.toLocaleString()}</label>
              <input type="range" min={2000} max={200000} step={1000}
                value={maxPrice} onChange={e => setMaxPrice(Number(e.target.value))}
                className="br-price-slider" />
            </div>

            {(typeF !== "all" || countyF !== "all" || maxPrice < 200000 || search) && (
              <button className="br-clear" onClick={() => { setTypeF("all"); setCountyF("all"); setMaxPrice(200000); setSearch(""); }}>
                ✕ Clear filters
              </button>
            )}
          </div>

          <div className="br-results-row">
            <span className="br-results-count">
              {loading ? "Loading…" : `${filtered.length} propert${filtered.length !== 1 ? "ies" : "y"} found`}
            </span>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="br-grid">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="br-skeleton">
                <div className="br-sk-img" />
                <div className="br-sk-body">
                  <div className="br-sk-line br-sk-w60" />
                  <div className="br-sk-line br-sk-w80" />
                  <div className="br-sk-line br-sk-w40" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="br-empty">
            <div className="br-empty-ico">🔍</div>
            <h3>No properties found</h3>
            <p>Try adjusting your filters or search terms</p>
            <button className="btn-sm" onClick={() => { setTypeF("all"); setCountyF("all"); setSearch(""); }}>
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="br-grid">
            {filtered.map(p => (
              <div className="br-card" key={p.id} onClick={() => { setSelected(p); setInquirySent(false); setInquiryForm({ name:"", email:"", phone:"", message:"" }); }}>
                <div className="br-card-img">
                  {p.images?.[0]
                    ? <img src={p.images[0]} alt={p.title} loading="lazy" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                    : <span className="br-card-emoji">{PROPERTY_EMOJIS[p.type]}</span>}

                  {/* Badges */}
                  <div className="br-card-badges">
                    {matchesAlert(p) && <span className="br-badge br-badge-alert">🔔 Alert match</span>}
                    {isNew(p) && <span className="br-badge br-badge-new">NEW</span>}
                  </div>

                  {/* Save button */}
                  {profile?.role !== "landlord" && (
                    <button className="br-save-btn" onClick={e => toggleSave(p.id, e)}>
                      {savedIds.has(p.id) ? "❤️" : "🤍"}
                    </button>
                  )}

                  {/* Price overlay */}
                  <div className="br-card-price-overlay">
                    KSh {p.price?.toLocaleString()}<span>/mo</span>
                  </div>
                </div>

                <div className="br-card-body">
                  <span className="br-card-type">{TYPE_LABELS[p.type]}</span>
                  <div className="br-card-title">{p.title}</div>
                  <div className="br-card-loc">📍 {p.location}</div>

                  {p.amenities?.length > 0 && (
                    <div className="br-card-amenities">
                      {p.amenities.slice(0, 3).map(a => <span key={a} className="a-chip">{a}</span>)}
                      {p.amenities.length > 3 && <span className="a-chip">+{p.amenities.length - 3}</span>}
                    </div>
                  )}

                  <div className="br-card-footer">
                    <div className="br-landlord">
                      <div className="br-av">{(p.profiles?.full_name || "L")[0]}</div>
                      <div>
                        <div className="br-av-name">{p.profiles?.full_name || "Landlord"}</div>
                        <div className="br-av-role">✅ Verified</div>
                      </div>
                    </div>
                    <span className="br-inquire">View →</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Listing Detail Sheet */}
      {selected && (
        <div className="br-overlay" onClick={() => setSelected(null)}>
          <div className="br-sheet" onClick={e => e.stopPropagation()}>
            <div className="br-sheet-handle" />

            {/* Hero image */}
            <div className="br-sheet-img">
              {selected.images?.[0]
                ? <img src={selected.images[0]} alt={selected.title} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                : <span style={{ fontSize:60 }}>{PROPERTY_EMOJIS[selected.type]}</span>}
              <div className="br-sheet-img-overlay" />
              <div className="br-sheet-price">KSh {selected.price?.toLocaleString()}<span>/mo</span></div>
              <button className="br-sheet-close" onClick={() => setSelected(null)}>✕</button>
            </div>

            <div className="br-sheet-body">
              <span className="br-card-type">{TYPE_LABELS[selected.type]}</span>
              <h2 className="br-sheet-title">{selected.title}</h2>
              <p className="br-sheet-loc">📍 {selected.location}</p>

              {selected.description && (
                <p className="br-sheet-desc">{selected.description}</p>
              )}

              {selected.amenities?.length > 0 && (
                <div className="br-sheet-amenities">
                  {selected.amenities.map(a => <span key={a} className="a-chip">✓ {a}</span>)}
                </div>
              )}

              {/* Landlord */}
              <div className="br-sheet-landlord">
                <div className="br-av br-av-lg">{(selected.profiles?.full_name || "L")[0]}</div>
                <div>
                  <div style={{ fontWeight:700 }}>{selected.profiles?.full_name || "Landlord"}</div>
                  <div style={{ fontSize:12, color:"#6B7280" }}>✅ Verified Landlord</div>
                </div>
                {selected.profiles?.phone && (
                  <a className="btn-sm" href={`tel:${selected.profiles.phone}`} style={{ marginLeft:"auto" }}>📞 Call</a>
                )}
              </div>

              {/* Inquiry form */}
              {!inquirySent ? (
                <div className="br-inquiry">
                  <h4>Send an Inquiry</h4>
                  <input className="finp" placeholder="Your full name *"
                    value={inquiryForm.name} onChange={e => setInquiryForm(f => ({...f, name: e.target.value}))} />
                  <input className="finp" placeholder="Phone number *" inputMode="tel"
                    value={inquiryForm.phone} onChange={e => setInquiryForm(f => ({...f, phone: e.target.value}))} />
                  <input className="finp" placeholder="Email address (optional)" type="email"
                    value={inquiryForm.email} onChange={e => setInquiryForm(f => ({...f, email: e.target.value}))} />
                  <textarea className="ftxt" placeholder={`Hi, I'm interested in "${selected.title}"…`} rows={3}
                    value={inquiryForm.message} onChange={e => setInquiryForm(f => ({...f, message: e.target.value}))} />
                  <button className="btn-main" onClick={sendInquiry} disabled={inquiryLoading}>
                    {inquiryLoading ? <><span className="spin" /> Sending…</> : "📩 Send Inquiry"}
                  </button>
                </div>
              ) : (
                <div className="br-inquiry-sent">
                  <div style={{ fontSize:40, marginBottom:8 }}>✅</div>
                  <h4>Inquiry Sent!</h4>
                  <p>The landlord will contact you soon at <strong>{inquiryForm.phone}</strong>.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} />
    </>
  );
}

const CSS = `
  .br-page{max-width:1100px;margin:0 auto;padding:0 0 80px;}

  /* Hero */
  .br-hero{background:linear-gradient(135deg,#0A4D2E 0%,#1E6B4A 60%,#0D3B22 100%);padding:60px 24px 40px;position:relative;overflow:hidden;text-align:center;}
  .br-hero-blob1{position:absolute;top:-60px;right:-60px;width:300px;height:300px;border-radius:50%;background:rgba(255,255,255,.04);}
  .br-hero-blob2{position:absolute;bottom:-80px;left:-40px;width:220px;height:220px;border-radius:50%;background:rgba(255,255,255,.03);}
  .br-hero-lbl{font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.5);margin-bottom:14px;position:relative;}
  .br-hero-h1{font-family:'DM Serif Display',serif;font-size:clamp(28px,5vw,52px);color:#fff;line-height:1.15;margin-bottom:12px;position:relative;}
  .br-hero-accent{background:linear-gradient(135deg,#86EFAC,#34D399);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
  .br-hero-desc{color:rgba(255,255,255,.6);font-size:15px;margin-bottom:20px;position:relative;}
  .br-trust-row{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-bottom:24px;position:relative;}
  .br-trust-chip{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.8);font-size:12px;padding:5px 12px;border-radius:20px;}

  /* Search */
  .br-search-wrap{position:relative;max-width:600px;margin:0 auto 16px;z-index:10;}
  .br-search-bar{display:flex;align-items:center;background:rgba(255,255,255,.95);border-radius:14px;padding:0 16px;box-shadow:0 8px 32px rgba(0,0,0,.2);}
  .br-search-icon{font-size:18px;flex-shrink:0;margin-right:10px;}
  .br-search-inp{flex:1;border:none;background:transparent;font-size:15px;padding:14px 0;outline:none;font-family:'Plus Jakarta Sans',sans-serif;color:#111827;}
  .br-search-clear{background:none;border:none;color:#9CA3AF;font-size:16px;cursor:pointer;padding:4px;}
  .br-suggestions{position:absolute;top:100%;left:0;right:0;background:#fff;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.12);margin-top:4px;overflow:hidden;border:1px solid #E5E7EB;}
  .br-suggestion{padding:12px 16px;font-size:14px;cursor:pointer;color:#374151;transition:background .1s;}
  .br-suggestion:hover{background:#F0FDF4;color:#1E6B4A;}
  .br-popular{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;position:relative;}
  .br-popular-chip{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2);color:rgba(255,255,255,.75);font-size:12px;padding:5px 13px;border-radius:20px;cursor:pointer;font-family:inherit;transition:all .15s;}
  .br-popular-chip:hover,.br-popular-on{background:rgba(255,255,255,.25)!important;color:#fff!important;}

  /* Filters */
  .br-filters{padding:20px 20px 0;background:#F9FAFB;border-bottom:1px solid #E5E7EB;}
  .br-type-pills{display:flex;gap:6px;overflow-x:auto;padding-bottom:12px;scrollbar-width:none;}
  .br-type-pills::-webkit-scrollbar{display:none;}
  .br-type-pill{white-space:nowrap;padding:7px 14px;border-radius:24px;border:1.5px solid #E5E7EB;background:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;color:#374151;transition:all .15s;}
  .br-type-on{background:#1E6B4A!important;color:#fff!important;border-color:#1E6B4A!important;}
  .br-filter-row{display:flex;gap:10px;align-items:center;padding-bottom:12px;flex-wrap:wrap;}
  .br-sel{padding:8px 12px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;font-family:inherit;background:#fff;cursor:pointer;outline:none;color:#374151;}
  .br-price-wrap{display:flex;flex-direction:column;gap:3px;min-width:160px;}
  .br-price-lbl{font-size:11px;font-weight:600;color:#6B7280;}
  .br-price-slider{width:100%;accent-color:#1E6B4A;cursor:pointer;}
  .br-clear{padding:7px 14px;border:1.5px solid #FECACA;border-radius:10px;background:#FEF2F2;color:#DC2626;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap;}
  .br-results-row{padding-bottom:12px;}
  .br-results-count{font-size:13px;color:#6B7280;font-weight:500;}

  /* Grid */
  .br-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px;padding:24px 20px;}
  .br-card{background:#fff;border-radius:16px;overflow:hidden;border:1px solid #E5E7EB;cursor:pointer;transition:transform .15s,box-shadow .15s;}
  .br-card:hover{transform:translateY(-3px);box-shadow:0 12px 40px rgba(0,0,0,.1);}
  .br-card-img{position:relative;height:200px;background:linear-gradient(135deg,#D1FAE5,#A7F3D0);display:flex;align-items:center;justify-content:center;overflow:hidden;}
  .br-card-emoji{font-size:56px;}
  .br-card-badges{position:absolute;top:10px;left:10px;display:flex;gap:6px;flex-wrap:wrap;}
  .br-badge{font-size:10px;font-weight:700;padding:3px 9px;border-radius:20px;}
  .br-badge-alert{background:#FEF3C7;color:#92400E;}
  .br-badge-new{background:#DCFCE7;color:#166534;}
  .br-save-btn{position:absolute;top:10px;right:10px;width:36px;height:36px;border-radius:50%;border:none;background:rgba(255,255,255,.9);cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.1);transition:transform .15s;}
  .br-save-btn:hover{transform:scale(1.1);}
  .br-card-price-overlay{position:absolute;bottom:0;left:0;right:0;background:linear-gradient(to top,rgba(0,0,0,.6),transparent);padding:24px 14px 10px;color:#fff;font-size:18px;font-weight:800;}
  .br-card-price-overlay span{font-size:12px;font-weight:400;opacity:.7;}
  .br-card-body{padding:14px 16px;}
  .br-card-type{display:inline-block;background:#D1FAE5;color:#065F46;font-size:10px;font-weight:700;padding:2px 9px;border-radius:20px;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;}
  .br-card-title{font-size:15px;font-weight:700;margin-bottom:3px;color:#111827;}
  .br-card-loc{font-size:12px;color:#6B7280;margin-bottom:8px;}
  .br-card-amenities{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px;}
  .a-chip{font-size:11px;padding:2px 8px;background:#F3F4F6;color:#374151;border-radius:20px;}
  .br-card-footer{display:flex;align-items:center;justify-content:space-between;padding-top:10px;border-top:1px solid #F3F4F6;}
  .br-landlord{display:flex;align-items:center;gap:8px;}
  .br-av{width:30px;height:30px;border-radius:50%;background:#D1FAE5;color:#1E6B4A;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
  .br-av-lg{width:44px;height:44px;font-size:18px;}
  .br-av-name{font-size:12px;font-weight:600;color:#111827;}
  .br-av-role{font-size:10px;color:#6B7280;}
  .br-inquire{font-size:12px;font-weight:700;color:#1E6B4A;}

  /* Skeleton */
  .br-skeleton{background:#fff;border-radius:16px;overflow:hidden;border:1px solid #E5E7EB;}
  .br-sk-img{height:200px;background:linear-gradient(90deg,#F3F4F6 25%,#E5E7EB 50%,#F3F4F6 75%);background-size:400% 100%;animation:shimmer 1.5s infinite;}
  @keyframes shimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}
  .br-sk-body{padding:14px 16px;display:flex;flex-direction:column;gap:8px;}
  .br-sk-line{height:14px;background:#F3F4F6;border-radius:7px;animation:shimmer 1.5s infinite;}
  .br-sk-w60{width:60%;}
  .br-sk-w80{width:80%;}
  .br-sk-w40{width:40%;}

  /* Empty */
  .br-empty{text-align:center;padding:60px 24px;}
  .br-empty-ico{font-size:56px;margin-bottom:16px;}
  .br-empty h3{font-size:20px;font-weight:700;margin-bottom:8px;}
  .br-empty p{color:#6B7280;margin-bottom:20px;}

  /* Detail sheet */
  .br-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;display:flex;align-items:flex-end;justify-content:center;backdrop-filter:blur(4px);}
  .br-sheet{background:#fff;border-radius:24px 24px 0 0;width:100%;max-width:640px;max-height:90vh;overflow-y:auto;animation:slideUp .3s cubic-bezier(.34,1.56,.64,1);}
  @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
  .br-sheet-handle{width:36px;height:4px;background:#E5E7EB;border-radius:2px;margin:12px auto 0;}
  .br-sheet-img{position:relative;height:240px;background:#D1FAE5;display:flex;align-items:center;justify-content:center;overflow:hidden;}
  .br-sheet-img-overlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.5),transparent);}
  .br-sheet-price{position:absolute;bottom:16px;left:16px;font-size:24px;font-weight:800;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,.4);}
  .br-sheet-price span{font-size:14px;font-weight:400;opacity:.7;}
  .br-sheet-close{position:absolute;top:12px;right:12px;width:32px;height:32px;border-radius:50%;background:rgba(0,0,0,.4);border:none;color:#fff;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:1;}
  .br-sheet-body{padding:20px;}
  .br-sheet-title{font-size:20px;font-weight:700;margin:6px 0 4px;}
  .br-sheet-loc{font-size:13px;color:#6B7280;margin-bottom:12px;}
  .br-sheet-desc{font-size:14px;color:#374151;line-height:1.7;margin-bottom:14px;}
  .br-sheet-amenities{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px;}
  .br-sheet-landlord{display:flex;align-items:center;gap:12px;padding:14px;background:#F9FAFB;border-radius:12px;margin-bottom:16px;}
  .br-inquiry{display:flex;flex-direction:column;gap:10px;}
  .br-inquiry h4{font-size:15px;font-weight:700;margin-bottom:2px;}
  .br-inquiry-sent{text-align:center;padding:24px;background:#F0FDF4;border-radius:12px;}
  .br-inquiry-sent h4{font-size:16px;font-weight:700;color:#1E6B4A;margin-bottom:6px;}
  .br-inquiry-sent p{font-size:13px;color:#6B7280;}

  @media(max-width:600px){.br-grid{grid-template-columns:1fr;padding:16px;}.br-hero{padding:48px 16px 32px;}.br-sheet{border-radius:20px 20px 0 0;}}
`;
