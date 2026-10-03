import { useState, useRef, useEffect } from "react";
import { LISTING_FEES, TYPE_LABELS } from "../lib/constants";
import { getAuthHeaders } from "../lib/apiAuth";

// Uses Render backend at VITE_API_URL to avoid CORS issues
const API = import.meta.env.VITE_API_URL || "https://nestlist-server.onrender.com";

export default function MpesaPayment({
  amount, propertyType, propertyId, landlordId,
  defaultPhone = "", onSuccess, onBack,
}) {
  const [status, setStatus]   = useState("idle"); // idle|loading|waiting|confirmed|failed
  const [phone, setPhone]     = useState(defaultPhone);
  const [phoneErr, setPhoneErr] = useState("");
  const [error, setError]     = useState("");
  const [countdown, setCountdown] = useState(120);
  const [checkoutId, setCheckoutId] = useState(null);
  const timerRef = useRef(null);
  const pollRef  = useRef(null);

  useEffect(() => () => {
    clearInterval(timerRef.current);
    clearInterval(pollRef.current);
  }, []);

  // Countdown timer
  useEffect(() => {
    if (status === "waiting") {
      let secs = 120;
      setCountdown(secs);
      timerRef.current = setInterval(() => {
        secs--;
        setCountdown(secs);
        if (secs <= 0) {
          clearInterval(timerRef.current);
          setError("Payment timed out. If you paid, click 'I have paid' below.");
        }
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [status]);

  async function handlePay() {
    const clean = phone.replace(/\D/g, "");
    if (clean.length < 9) { setPhoneErr("Enter a valid Kenyan number"); return; }
    setPhoneErr(""); setError(""); setStatus("loading");

    try {
      const res = await fetch(`${API}/api/mpesa/stk`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) },
        body: JSON.stringify({
          phone: "254" + clean.replace(/^0/, "").replace(/^254/, "").slice(-9),
          amount: Math.ceil(amount),
          listingId: propertyId,
          listingTitle: TYPE_LABELS[propertyType] || "Property",
        }),
      });

      const data = await res.json();

      if (data.success && data.checkoutId) {
        setCheckoutId(data.checkoutId);
        setStatus("waiting");
        startPolling(data.checkoutId);
      } else {
        throw new Error(data.error || "STK Push failed. Please try again.");
      }
    } catch (e) {
      setError(e.message);
      setStatus("failed");
    }
  }

  // Poll Render backend for payment confirmation
  function startPolling(cid) {
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`${API}/api/mpesa/status?checkoutId=${cid}`, { headers: await getAuthHeaders() });
        const data = await res.json();
        if (data.status === "confirmed") {
          clearInterval(pollRef.current);
          clearInterval(timerRef.current);
          setStatus("confirmed");
          onSuccess?.({ code: data.mpesaCode, amount, checkoutId: cid });
        } else if (data.status === "failed" || data.status === "cancelled") {
          clearInterval(pollRef.current);
          setError("Payment was not completed. Please try again.");
          setStatus("failed");
        }
      } catch (_) { /* network hiccup, keep polling */ }
      if (attempts >= 40) {
        clearInterval(pollRef.current);
        // Don't fail — let user confirm manually
      }
    }, 3000);
  }

  // Manual confirm — user says they paid
  async function handleManualConfirm() {
    clearInterval(pollRef.current);
    clearInterval(timerRef.current);
    setStatus("confirmed");
    onSuccess?.({ code: "MANUAL-" + Date.now(), amount, checkoutId });
  }

  function reset() {
    clearInterval(timerRef.current);
    clearInterval(pollRef.current);
    setStatus("idle"); setError(""); setPhone(""); setCountdown(120);
  }

  const mins = Math.floor(countdown / 60);
  const secs = String(countdown % 60).padStart(2, "0");
  const fmtPhone = (p) => {
    const c = p.replace(/\D/g, "");
    return "+254 " + (c.startsWith("0") ? c.slice(1) : c).replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3");
  };

  return (
    <>
      <style>{CSS}</style>

      {/* Fee summary — always visible */}
      <div className="mp-amount">
        <div>
          <div className="mp-type">{TYPE_LABELS[propertyType] || "Property"} · Listing Fee</div>
          <div className="mp-dur">Active for 30 days · Goes live instantly</div>
        </div>
        <div className="mp-amt-val">KSh {amount?.toLocaleString()}</div>
      </div>

      {/* IDLE / FAILED */}
      {(status === "idle" || status === "failed") && (
        <>
          {(status === "failed" && error) && (
            <div className="err-banner"><span>⚠</span><span>{error}</span></div>
          )}

          <div className="mp-steps">
            <p>📱 How M-Pesa STK Push works</p>
            {[
              "Enter your Safaricom number below",
              "A payment prompt appears on your phone instantly",
              "Enter your M-Pesa PIN to confirm",
              "Your listing goes live automatically ✅",
            ].map((s, i) => (
              <div className="mp-step" key={i}>
                <span className="mp-num">{i + 1}</span>
                <span>{s}</span>
              </div>
            ))}
          </div>

          <div className="fld">
            <label className="flbl">M-Pesa Phone Number</label>
            <div className="ph-row">
              <span className="ph-flag">🇰🇪 +254</span>
              <input
                className="finp" placeholder="712 345 678"
                value={phone} inputMode="numeric" maxLength={10}
                onChange={e => {
                  setPhoneErr("");
                  setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                }}
                onKeyDown={e => e.key === "Enter" && handlePay()}
              />
            </div>
            {phoneErr && <div className="field-err">⚠ {phoneErr}</div>}
          </div>

          <button
            className="btn-main btn-mpesa"
            onClick={handlePay}
            disabled={!phone || status === "loading"}
          >
            {status === "loading"
              ? <><span className="spin" /> Sending M-Pesa prompt…</>
              : <>💚 Pay KSh {amount?.toLocaleString()} via M-Pesa</>}
          </button>

          {onBack && (
            <button className="btn-sec" onClick={onBack} style={{ marginTop: 8 }}>
              ← Back
            </button>
          )}
        </>
      )}

      {/* WAITING */}
      {status === "waiting" && (
        <div className="mp-waiting">
          <div className="mp-phone-wrap">
            <div className="mp-phone-ani">📱</div>
            <div className="mp-pulse" />
          </div>
          <h3>Check your phone!</h3>
          <p>
            A payment prompt was sent to<br />
            <strong>{fmtPhone(phone)}</strong><br />
            Enter your M-Pesa PIN to pay <strong>KSh {amount?.toLocaleString()}</strong>
          </p>

          <div className="mp-prog"><div className="mp-prog-fill" /></div>
          <div className={`mp-timer ${countdown <= 15 ? "mp-timer-red" : ""}`}>
            ⏳ {mins}:{secs} remaining
          </div>

          {error && <div className="err-banner" style={{ marginBottom: 16 }}><span>⚠</span><span>{error}</span></div>}

          <button className="btn-main btn-confirm" onClick={handleManualConfirm}>
            ✅ I have paid — Activate my listing
          </button>

          <div className="mp-waiting-actions">
            <button className="btn-link" onClick={handlePay}>🔄 Resend prompt</button>
            <button className="btn-cancel" onClick={reset}>✕ Cancel</button>
          </div>
        </div>
      )}

      {/* CONFIRMED */}
      {status === "confirmed" && (
        <div className="mp-success">
          <div className="success-ico">🎉</div>
          <h3>Payment confirmed!</h3>
          <p>Your listing is now <strong>LIVE</strong> on NestList.</p>
          <div className="mp-receipt">
            <div className="mp-r-row">
              <span className="mp-r-k">Amount Paid</span>
              <span className="mp-r-v">KSh {amount?.toLocaleString()}</span>
            </div>
            <div className="mp-r-row">
              <span className="mp-r-k">Property Type</span>
              <span className="mp-r-v">{TYPE_LABELS[propertyType]}</span>
            </div>
            <div className="mp-r-row">
              <span className="mp-r-k">Active Until</span>
              <span className="mp-r-v">
                {new Date(Date.now() + 30 * 86400000).toLocaleDateString("en-KE", {
                  day: "numeric", month: "long", year: "numeric",
                })}
              </span>
            </div>
          </div>
          <p className="mp-share-hint">Share your listing with tenants! 🏠</p>
        </div>
      )}
    </>
  );
}

const CSS = `
  .mp-amount{background:#F0FDF4;border:1px solid #A7F3D0;border-radius:12px;padding:14px 16px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;gap:12px;}
  .mp-type{font-size:13px;font-weight:600;color:#065F46;}
  .mp-dur{font-size:11px;color:#6B7280;margin-top:2px;}
  .mp-amt-val{font-size:26px;font-weight:800;color:#1E6B4A;white-space:nowrap;}
  .mp-steps{background:#F0FDF4;border-radius:10px;padding:14px 16px;margin-bottom:16px;}
  .mp-steps p{font-size:13px;font-weight:700;color:#065F46;margin-bottom:10px;}
  .mp-step{display:flex;gap:10px;align-items:flex-start;margin-bottom:8px;font-size:13px;color:#374151;line-height:1.5;}
  .mp-num{background:#1E6B4A;color:#fff;min-width:20px;height:20px;border-radius:50%;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;}
  .ph-row{display:flex;gap:8px;margin-bottom:4px;}
  .ph-flag{padding:11px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:14px;background:#F9FAFB;font-weight:600;white-space:nowrap;}
  .field-err{font-size:12px;color:#EF4444;margin-top:4px;}
  .btn-mpesa{background:#1E6B4A!important;font-size:15px!important;padding:14px!important;}
  .btn-mpesa:hover:not(:disabled){background:#165438!important;}
  .mp-waiting{text-align:center;padding:24px 0;}
  .mp-phone-wrap{position:relative;display:inline-block;margin-bottom:16px;}
  .mp-phone-ani{font-size:56px;animation:phoneBounce .8s ease-in-out infinite alternate;}
  @keyframes phoneBounce{from{transform:scale(1) rotate(-3deg)}to{transform:scale(1.08) rotate(3deg)}}
  .mp-pulse{position:absolute;inset:-10px;border-radius:50%;border:3px solid #1E6B4A;opacity:.4;animation:pulseRing 1.5s ease-out infinite;}
  @keyframes pulseRing{0%{transform:scale(.8);opacity:.6}100%{transform:scale(1.4);opacity:0}}
  .mp-waiting h3{font-size:20px;font-weight:700;margin-bottom:8px;}
  .mp-waiting p{font-size:14px;color:#6B7280;line-height:1.7;margin-bottom:18px;}
  .mp-prog{height:4px;background:#E5E7EB;border-radius:2px;overflow:hidden;margin-bottom:8px;}
  .mp-prog-fill{height:100%;background:#1E6B4A;animation:progPulse 1.8s ease-in-out infinite;}
  @keyframes progPulse{0%,100%{width:10%}50%{width:90%}}
  .mp-timer{font-size:13px;color:#6B7280;font-weight:600;margin-bottom:20px;}
  .mp-timer-red{color:#EF4444!important;animation:timerFlash .5s ease-in-out infinite alternate;}
  @keyframes timerFlash{from{opacity:1}to{opacity:.4}}
  .btn-confirm{background:#1E6B4A!important;margin-bottom:12px!important;}
  .mp-waiting-actions{display:flex;gap:12px;justify-content:center;}
  .btn-link{background:none;border:none;color:#1E6B4A;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;padding:4px;}
  .btn-cancel{background:none;border:1.5px solid #E5E7EB;color:#9CA3AF;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;padding:6px 14px;border-radius:8px;transition:all .15s;}
  .btn-cancel:hover{border-color:#EF4444;color:#EF4444;}
  .mp-success{text-align:center;padding:12px 0;}
  .mp-success .success-ico{font-size:56px;margin-bottom:12px;animation:popIn .5s cubic-bezier(.34,1.56,.64,1);}
  @keyframes popIn{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}}
  .mp-success h3{font-size:22px;font-weight:700;margin-bottom:8px;color:#1E6B4A;}
  .mp-success p{font-size:14px;color:#6B7280;margin-bottom:16px;}
  .mp-receipt{background:#F0FDF4;border:1px solid #A7F3D0;border-radius:10px;padding:14px;margin:12px 0;text-align:left;}
  .mp-r-row{display:flex;justify-content:space-between;font-size:13px;padding:6px 0;border-bottom:1px solid rgba(30,107,74,.1);}
  .mp-r-row:last-child{border-bottom:none;}
  .mp-r-k{color:#6B7280;}
  .mp-r-v{font-weight:700;color:#1E6B4A;}
  .mp-share-hint{font-size:13px;color:#6B7280;margin-top:8px;}
  .err-banner{background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:12px 14px;display:flex;gap:8px;align-items:flex-start;font-size:13px;color:#DC2626;margin-bottom:14px;}
`;
