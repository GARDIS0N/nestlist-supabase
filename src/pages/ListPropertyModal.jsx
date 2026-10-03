import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "@clerk/clerk-react";
import { LISTING_FEES, TYPE_LABELS, AMENITIES, COUNTIES, PROPERTY_EMOJIS } from "../lib/constants";
import MpesaPayment from "../components/MpesaPayment";
import { useProfile } from "../hooks/useAuth";

const CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD   || "dmmb5jvbo";
const PRESET = import.meta.env.VITE_CLOUDINARY_PRESET || "nestlist_unsigned";

// ── Image compression ─────────────────────────────────────────────────────────
function compressImage(file) {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    const ctx    = canvas.getContext("2d");
    const img    = new Image();
    img.onload = () => {
      let [w, h] = [img.width, img.height];
      const [maxW, maxH] = [1200, 900];
      if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
      if (h > maxH) { w = Math.round(w * maxH / h); h = maxH; }
      canvas.width = w; canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(resolve, "image/jpeg", 0.78);
    };
    img.src = URL.createObjectURL(file);
  });
}

async function uploadToCloudinary(file, onProgress) {
  const compressed = await compressImage(file);
  const form = new FormData();
  form.append("file", compressed);
  form.append("upload_preset", PRESET);
  form.append("folder", "nestlist/listings");

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status === 200) {
        resolve(JSON.parse(xhr.responseText).secure_url);
      } else {
        reject(new Error("Upload failed: " + xhr.status));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`);
    xhr.send(form);
  });
}

// ── Step indicator ────────────────────────────────────────────────────────────
function Steps({ current }) {
  const labels = ["Details", "Amenities", "Photos", "Review", "Payment"];
  return (
    <div style={{ display:"flex", alignItems:"center", marginBottom:24 }}>
      {labels.map((lbl, i) => {
        const n = i + 1, done = n < current, active = n === current;
        return (
          <div key={lbl} style={{ display:"flex", alignItems:"center", gap:6, flex:1 }}>
            <div style={{
              width:26, height:26, borderRadius:"50%", display:"flex", alignItems:"center",
              justifyContent:"center", fontSize:11, fontWeight:700, flexShrink:0,
              border:`2px solid ${done||active ? "#1E6B4A" : "#E5E7EB"}`,
              background:active ? "#1E6B4A" : done ? "#D1FAE5" : "#fff",
              color:active ? "#fff" : done ? "#1E6B4A" : "#9CA3AF",
            }}>
              {done ? "✓" : n}
            </div>
            <span style={{ fontSize:11, fontWeight:active?700:500, color:active?"#1E6B4A":"#9CA3AF" }}>
              {lbl}
            </span>
            {i < labels.length - 1 && (
              <div style={{ flex:1, height:2, background:done?"#1E6B4A":"#E5E7EB", margin:"0 4px" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ListPropertyModal({ onClose, toast }) {
  const { userId }   = useAuth();
  const { profile }  = useProfile();
  const [step, setStep]       = useState(1);
  const [propertyId, setPropertyId] = useState(null);
  const [drag, setDrag]       = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});

  const [form, setForm] = useState({
    title:"", location:"", county:"", type:"1br",
    price:"", description:"", amenities:[], images:[],
  });

  const fee  = LISTING_FEES[form.type] || 500;
  const upd  = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleAm = (a) => setForm(f => ({
    ...f,
    amenities: f.amenities.includes(a) ? f.amenities.filter(x => x !== a) : [...f.amenities, a],
  }));

  // ── Add images ──────────────────────────────────────────────────────────────
  async function addImages(files) {
    const valid = Array.from(files)
      .filter(f => f.type.startsWith("image/") && f.size <= 5 * 1024 * 1024)
      .slice(0, 8 - form.images.length);

    if (!valid.length) { toast?.("Please select valid images (max 5MB each)", "error"); return; }

    // Add preview immediately
    const previews = valid.map(f => ({ url: URL.createObjectURL(f), file: f, uploading: true, progress: 0 }));
    setForm(f => ({ ...f, images: [...f.images, ...previews] }));
    setUploading(true);

    // Upload each to Cloudinary
    const uploaded = [...form.images];
    for (let i = 0; i < valid.length; i++) {
      try {
        const cloudUrl = await uploadToCloudinary(valid[i], (pct) => {
          setUploadProgress(p => ({ ...p, [form.images.length + i]: pct }));
        });
        uploaded.push({ url: cloudUrl, cloudinary: true, uploading: false });
        toast?.("📸 Photo uploaded!");
      } catch (err) {
        toast?.("Upload failed: " + err.message, "error");
        uploaded.push({ url: URL.createObjectURL(valid[i]), uploading: false, failed: true });
      }
    }
    setForm(f => ({ ...f, images: uploaded }));
    setUploading(false);
    setUploadProgress({});
  }

  function removeImage(idx) {
    setForm(f => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));
  }

  // ── Save to Supabase ────────────────────────────────────────────────────────
  async function saveProperty() {
    const imageUrls = form.images
      .filter(img => img.cloudinary || !img.uploading)
      .map(img => img.url);

    const { data, error } = await supabase.from("properties").insert({
      landlord_id:  userId,
      title:        form.title,
      location:     form.location,
      county:       form.county,
      type:         form.type,
      price:        Number(form.price),
      description:  form.description,
      amenities:    form.amenities,
      images:       imageUrls,
      is_active:    false,
    }).select().single();

    if (error) throw error;
    setPropertyId(data.id);
    return data.id;
  }

  async function goToPayment() {
    try { await saveProperty(); } catch (_) { /* allow demo */ }
    setStep(5);
  }

  function handleSuccess(receipt) {
    toast?.("🎉 Listing is now LIVE on NestList!");
    setStep(6);
    if (propertyId) {
      supabase.from("properties")
        .update({ is_active: true, expires_at: new Date(Date.now() + 30 * 86400000).toISOString() })
        .eq("id", propertyId).then(() => {});
    }
  }

  const step1ok = form.title && form.location && form.county && form.price;

  const stepTitles = ["Details", "Amenities", "Photos", "Review", "Pay Listing Fee", "You're Live! 🎉"];

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-hd">
          <h3>{stepTitles[step - 1]}</h3>
          <button className="modal-x" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {step < 6 && <Steps current={step} />}

          {/* ── STEP 1: DETAILS ── */}
          {step === 1 && (
            <>
              <div className="fld">
                <label className="flbl">Property Title *</label>
                <input className="finp" value={form.title} placeholder="e.g. Spacious 2BR in Westlands"
                  onChange={e => upd("title", e.target.value)} />
              </div>

              <div className="frow">
                <div className="fld">
                  <label className="flbl">Property Type *</label>
                  <select className="fsel" value={form.type} onChange={e => upd("type", e.target.value)}>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{PROPERTY_EMOJIS[k]} {v}</option>
                    ))}
                  </select>
                </div>
                <div className="fld">
                  <label className="flbl">Rent per Month (KSh) *</label>
                  <input className="finp" type="number" value={form.price} placeholder="e.g. 15000"
                    inputMode="numeric" onChange={e => upd("price", e.target.value)} />
                </div>
              </div>

              <div className="frow">
                <div className="fld">
                  <label className="flbl">Estate / Area *</label>
                  <input className="finp" value={form.location} placeholder="e.g. Westlands"
                    onChange={e => upd("location", e.target.value)} />
                </div>
                <div className="fld">
                  <label className="flbl">County *</label>
                  <select className="fsel" value={form.county} onChange={e => upd("county", e.target.value)}>
                    <option value="">Select county</option>
                    {COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="fld">
                <label className="flbl">Description</label>
                <textarea className="ftxt" value={form.description} rows={3}
                  placeholder="Describe the property — size, nearby places, what makes it special…"
                  onChange={e => upd("description", e.target.value)} />
                <div style={{ fontSize:11, color:"#9CA3AF", textAlign:"right", marginTop:3 }}>
                  {form.description.length}/500
                </div>
              </div>

              {/* Fee preview */}
              <div style={{ background:"#FFFBEB", border:"1px solid #FDE68A", borderRadius:12, padding:"12px 16px", marginBottom:16, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div>
                  <div style={{ fontSize:13, color:"#92400E", fontWeight:600 }}>Listing Fee · {TYPE_LABELS[form.type]}</div>
                  <div style={{ fontSize:11, color:"#B45309", marginTop:2 }}>Active for 30 days · Goes live after payment</div>
                </div>
                <div style={{ fontSize:24, fontWeight:800, color:"#D97706" }}>KSh {fee}</div>
              </div>

              <button className="btn-main" disabled={!step1ok} onClick={() => setStep(2)}>
                Continue → Amenities
              </button>
            </>
          )}

          {/* ── STEP 2: AMENITIES ── */}
          {step === 2 && (
            <>
              <p style={{ fontSize:14, color:"#6B7280", marginBottom:16 }}>
                Select all amenities your property has. This helps tenants find your listing!
              </p>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:20 }}>
                {AMENITIES.map(a => (
                  <button key={a}
                    onClick={() => toggleAm(a)}
                    style={{
                      padding:"7px 14px", borderRadius:24,
                      border:`1.5px solid ${form.amenities.includes(a) ? "#1E6B4A" : "#E5E7EB"}`,
                      background:form.amenities.includes(a) ? "#D1FAE5" : "#fff",
                      color:form.amenities.includes(a) ? "#065F46" : "#374151",
                      fontSize:13, fontWeight:form.amenities.includes(a) ? 700 : 500,
                      cursor:"pointer", fontFamily:"inherit", transition:"all .15s",
                    }}>
                    {form.amenities.includes(a) ? "✓ " : ""}{a}
                  </button>
                ))}
              </div>
              <div style={{ fontSize:12, color:"#6B7280", marginBottom:20 }}>
                {form.amenities.length} amenit{form.amenities.length !== 1 ? "ies" : "y"} selected
              </div>
              <div style={{ display:"flex", gap:10 }}>
                <button className="btn-sec" onClick={() => setStep(1)}>← Back</button>
                <button className="btn-main" style={{ flex:1 }} onClick={() => setStep(3)}>
                  Continue → Photos
                </button>
              </div>
            </>
          )}

          {/* ── STEP 3: PHOTOS ── */}
          {step === 3 && (
            <>
              <p style={{ fontSize:13, color:"#6B7280", marginBottom:16 }}>
                📸 Listings with photos get <strong>3× more inquiries</strong>. Max 8 photos, 5MB each.
              </p>

              {/* Upload area */}
              {form.images.length < 8 && (
                <div
                  className={`drop-zone ${drag ? "drop-active" : ""}`}
                  onDragOver={e => { e.preventDefault(); setDrag(true); }}
                  onDragLeave={() => setDrag(false)}
                  onDrop={e => { e.preventDefault(); setDrag(false); addImages(e.dataTransfer.files); }}
                  onClick={() => document.getElementById("img-input").click()}
                >
                  <div style={{ fontSize:36, marginBottom:8 }}>📸</div>
                  <div style={{ fontWeight:700, marginBottom:4 }}>Drop photos here or tap to select</div>
                  <div style={{ fontSize:12, color:"#9CA3AF" }}>JPG or PNG · Max 5MB each</div>
                  <input id="img-input" type="file" accept="image/*" multiple
                    style={{ display:"none" }} onChange={e => addImages(e.target.files)} />
                </div>
              )}

              {/* Photo grid */}
              {form.images.length > 0 && (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginTop:12 }}>
                  {form.images.map((img, i) => (
                    <div key={i} style={{ position:"relative", borderRadius:10, overflow:"hidden", aspectRatio:"1", background:"#F3F4F6" }}>
                      <img src={img.url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />

                      {img.uploading && (
                        <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,.5)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:6 }}>
                          <div className="spin" style={{ borderColor:"rgba(255,255,255,.3)", borderTopColor:"#fff" }} />
                          <span style={{ fontSize:11, color:"#fff" }}>{uploadProgress[i] || 0}%</span>
                        </div>
                      )}

                      {i === 0 && !img.uploading && (
                        <div style={{ position:"absolute", bottom:6, left:6, background:"#1E6B4A", color:"#fff", fontSize:9, fontWeight:700, padding:"2px 7px", borderRadius:20 }}>
                          COVER
                        </div>
                      )}

                      {!img.uploading && (
                        <button onClick={() => removeImage(i)} style={{
                          position:"absolute", top:5, right:5, width:22, height:22, borderRadius:"50%",
                          background:"rgba(0,0,0,.6)", border:"none", color:"#fff", fontSize:11,
                          cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
                        }}>✕</button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {form.images.length > 0 && (
                <div style={{ fontSize:11, color:"#9CA3AF", textAlign:"center", marginTop:8 }}>
                  {form.images.length}/8 photos · First photo is your cover image
                </div>
              )}

              <div style={{ display:"flex", gap:10, marginTop:20 }}>
                <button className="btn-sec" onClick={() => setStep(2)}>← Back</button>
                <button className="btn-main" style={{ flex:1 }} onClick={() => setStep(4)} disabled={uploading}>
                  {uploading ? <><span className="spin" /> Uploading…</> : "Continue → Review"}
                </button>
              </div>
            </>
          )}

          {/* ── STEP 4: REVIEW ── */}
          {step === 4 && (
            <>
              <div className="review-card">
                <div style={{ fontSize:40, textAlign:"center", marginBottom:12 }}>{PROPERTY_EMOJIS[form.type]}</div>
                {[
                  ["Title",       form.title],
                  ["Type",        TYPE_LABELS[form.type]],
                  ["Location",    form.location],
                  ["County",      form.county],
                  ["Rent",        `KSh ${Number(form.price).toLocaleString()}/month`],
                  ["Amenities",   form.amenities.length > 0 ? form.amenities.join(", ") : "None selected"],
                  ["Photos",      `${form.images.length} uploaded`],
                  ["Listing Fee", `KSh ${fee} (one-time · 30 days)`],
                ].map(([k, v]) => (
                  <div key={k} className="review-row">
                    <span className="review-k">{k}</span>
                    <span className="review-v" style={k==="Listing Fee"?{color:"#D97706",fontWeight:700}:{}}>{v}</span>
                  </div>
                ))}
              </div>

              <div style={{ display:"flex", gap:10, marginTop:20 }}>
                <button className="btn-sec" onClick={() => setStep(3)}>← Edit</button>
                <button className="btn-main" style={{ flex:1 }} onClick={goToPayment}>
                  Pay KSh {fee} & Publish 🚀
                </button>
              </div>
            </>
          )}

          {/* ── STEP 5: PAYMENT ── */}
          {step === 5 && (
            <MpesaPayment
              amount={fee}
              propertyType={form.type}
              propertyId={propertyId || "demo-" + Date.now()}
              landlordId={userId}
              defaultPhone={profile?.phone || ""}
              onSuccess={handleSuccess}
              onBack={() => setStep(4)}
            />
          )}

          {/* ── STEP 6: SUCCESS ── */}
          {step === 6 && (
            <div className="success">
              <div className="success-ico">🎉</div>
              <h3>You're LIVE on NestList!</h3>
              <p>Your listing is now visible to tenants across Kenya. Share it to get inquiries faster!</p>
              <div className="review-card" style={{ marginTop:16, marginBottom:20 }}>
                {[
                  ["Property", form.title],
                  ["Type",     TYPE_LABELS[form.type]],
                  ["Location", form.location],
                  ["Rent",     `KSh ${Number(form.price).toLocaleString()}/mo`],
                  ["Active Until", new Date(Date.now() + 30 * 86400000).toLocaleDateString("en-KE", { day:"numeric", month:"long", year:"numeric" })],
                ].map(([k, v]) => (
                  <div key={k} className="review-row">
                    <span className="review-k">{k}</span>
                    <span className="review-v">{v}</span>
                  </div>
                ))}
              </div>
              <button className="btn-main" onClick={onClose}>View My Dashboard</button>
            </div>
          )}
        </div>
      </div>

      <style>{MODAL_CSS}</style>
    </div>
  );
}

const MODAL_CSS = `
  .drop-zone{border:2px dashed #E5E7EB;border-radius:14px;padding:32px 20px;text-align:center;cursor:pointer;transition:all .2s;background:#FAFAFA;}
  .drop-zone:hover,.drop-active{border-color:#1E6B4A;background:#F0FDF4;}
  .review-card{background:#F9FAFB;border:1px solid #E5E7EB;border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:0;}
  .review-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #F3F4F6;font-size:13px;}
  .review-row:last-child{border-bottom:none;}
  .review-k{color:#6B7280;}
  .review-v{font-weight:600;color:#111827;text-align:right;max-width:60%;}
`;
