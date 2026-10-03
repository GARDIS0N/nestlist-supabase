// ── useToast.js ───────────────────────────────────────────────────────────────
import { useState, useCallback } from "react";

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const show = useCallback((msg, type = "success") => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);

  const remove = useCallback((id) => {
    setToasts(t => t.filter(x => x.id !== id));
  }, []);

  return { toasts, show, remove };
}

// ── useMpesa.js ───────────────────────────────────────────────────────────────
import { useState, useRef, useEffect } from "react";
import { getAuthHeaders } from "../lib/apiAuth";

const API = import.meta.env.VITE_API_URL || "https://nestlist-server.onrender.com";

export function useMpesa() {
  const [status, setStatus]     = useState("idle"); // idle|loading|waiting|confirmed|failed
  const [checkoutId, setCheckoutId] = useState(null);
  const [error, setError]       = useState("");
  const [countdown, setCountdown] = useState(120);
  const timerRef = useRef(null);
  const pollRef  = useRef(null);

  useEffect(() => () => {
    clearInterval(timerRef.current);
    clearInterval(pollRef.current);
  }, []);

  function startCountdown() {
    let secs = 120;
    setCountdown(secs);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      secs--;
      setCountdown(secs);
      if (secs <= 0) clearInterval(timerRef.current);
    }, 1000);
  }

  function startPolling(cid, onSuccess) {
    clearInterval(pollRef.current);
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      try {
        const res  = await fetch(`${API}/api/mpesa/status?checkoutId=${cid}`, { headers: await getAuthHeaders() });
        const data = await res.json();
        if (data.status === "confirmed") {
          clearInterval(pollRef.current);
          clearInterval(timerRef.current);
          setStatus("confirmed");
          onSuccess?.({ mpesaCode: data.mpesaCode, amount: data.amount, checkoutId: cid });
        } else if (data.status === "failed" || data.status === "cancelled") {
          clearInterval(pollRef.current);
          setError("Payment was not completed. Please try again.");
          setStatus("failed");
        }
      } catch (_) { /* network hiccup */ }
      if (attempts >= 40) clearInterval(pollRef.current);
    }, 3000);
  }

  async function initiate({ phone, amount, listingId, listingTitle, onSuccess }) {
    setError(""); setStatus("loading");
    try {
      const res  = await fetch(`${API}/api/mpesa/stk`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) },
        body:    JSON.stringify({ phone, amount: Math.ceil(amount), listingId, listingTitle }),
      });
      const data = await res.json();

      if (data.success && data.checkoutId) {
        setCheckoutId(data.checkoutId);
        setStatus("waiting");
        startCountdown();
        startPolling(data.checkoutId, onSuccess);
        return { success: true, checkoutId: data.checkoutId };
      } else {
        throw new Error(data.error || "STK Push failed. Please try again.");
      }
    } catch (err) {
      setError(err.message);
      setStatus("failed");
      return { success: false, error: err.message };
    }
  }

  function manualConfirm(onSuccess) {
    clearInterval(pollRef.current);
    clearInterval(timerRef.current);
    setStatus("confirmed");
    onSuccess?.({ mpesaCode: "MANUAL-" + Date.now(), checkoutId });
  }

  function reset() {
    clearInterval(timerRef.current);
    clearInterval(pollRef.current);
    setStatus("idle");
    setError("");
    setCheckoutId(null);
    setCountdown(120);
  }

  return { status, error, countdown, checkoutId, initiate, manualConfirm, reset };
}
