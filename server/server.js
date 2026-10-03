const express = require("express");
const cors    = require("cors");
const axios   = require("axios");
const crypto  = require("crypto");
const app     = express();

const IS_PRODUCTION = process.env.NODE_ENV === "production";

// ── CORS: only the NestList web app may call this API from a browser ─────────
// Override with ALLOWED_ORIGINS="https://a.example,https://b.example" (comma separated).
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ||
  "https://nestlist.co.ke,https://www.nestlist.co.ke,http://localhost:5173,http://localhost:3000")
  .split(",").map((o) => o.trim()).filter(Boolean);

app.use(cors({
  origin(origin, cb) {
    // No Origin header = not a browser (Safaricom webhook, curl, server-to-server): CORS doesn't apply.
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(null, false);
  },
}));

// Keep the raw body: payment-provider webhooks sign the exact bytes they send.
app.use(express.json({ verify: (req, _res, buf) => { req.rawBody = buf; } }));

// ── Credentials (set as Render Environment Variables - never hardcode) ───────
const KEY       = process.env.MPESA_KEY       || "";
const SECRET    = process.env.MPESA_SECRET    || "";
const PASSKEY   = process.env.MPESA_PASSKEY   || "";
const MPESA_ENV = process.env.MPESA_ENV       || "sandbox";
// 174379 is Safaricom's public *sandbox* shortcode; production must set its own.
const SHORTCODE = process.env.MPESA_SHORTCODE || (MPESA_ENV === "production" ? "" : "174379");
const BASE      = MPESA_ENV === "production"
  ? "https://api.safaricom.co.ke"
  : "https://sandbox.safaricom.co.ke";

// Supabase is used only to verify the caller's access token (anon key + the user's own JWT).
const SUPABASE_URL      = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim().replace(/\/+$/, "");
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "").trim();

// Optional but strongly recommended: a random string appended to the callback URL as ?token=...
// so only Safaricom (who is given that exact URL) can post payment results.
const CALLBACK_SECRET = process.env.CALLBACK_SECRET || "";

const ADMIN_ROLES = new Set(["admin", "superadmin"]);

(function warnAboutMissingConfig() {
  const missing = [];
  if (!KEY) missing.push("MPESA_KEY");
  if (!SECRET) missing.push("MPESA_SECRET");
  if (!PASSKEY) missing.push("MPESA_PASSKEY");
  if (!SHORTCODE) missing.push("MPESA_SHORTCODE");
  if (!SUPABASE_URL) missing.push("SUPABASE_URL (or VITE_SUPABASE_URL)");
  if (!SUPABASE_ANON_KEY) missing.push("SUPABASE_ANON_KEY (or VITE_SUPABASE_ANON_KEY)");
  if (!CALLBACK_SECRET) missing.push("CALLBACK_SECRET");
  if (missing.length) {
    console.warn(`[WARN] Missing environment variables: ${missing.join(", ")}. Affected endpoints will refuse requests.`);
  }
})();

// ── In-memory payment store (replace with Supabase when ready) ───────────────
const payments = new Map();
const PAYMENT_TTL_MS = 24 * 60 * 60 * 1000;
setInterval(() => {
  const cutoff = Date.now() - PAYMENT_TTL_MS;
  for (const [id, p] of payments) if (p.createdAt < cutoff) payments.delete(id);
}, 60 * 60 * 1000).unref();

// ── Helpers ───────────────────────────────────────────────────────────────────
function timestamp() {
  return new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
}

function password(ts) {
  return Buffer.from(SHORTCODE + PASSKEY + ts).toString("base64");
}

function formatPhone(phone) {
  let p = String(phone).replace(/\s/g, "").replace(/\D/g, "");
  if (p.startsWith("0"))   p = "254" + p.slice(1);
  if (p.startsWith("+"))   p = p.slice(1);
  if (!p.startsWith("254")) p = "254" + p;
  return p;
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

const mpesaConfigured = () => !!(KEY && SECRET && PASSKEY && SHORTCODE);

async function getToken() {
  const creds = Buffer.from(`${KEY}:${SECRET}`).toString("base64");
  const res   = await axios.get(
    `${BASE}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${creds}` } }
  );
  return res.data.access_token;
}

// ── Authentication ────────────────────────────────────────────────────────────
// Verifies a Supabase access token and looks up the caller's role.
async function authenticate(req) {
  const m = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || "");
  if (!m) return null;
  const headers = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${m[1].trim()}` };

  try {
    const { data: user } = await axios.get(`${SUPABASE_URL}/auth/v1/user`, { headers, timeout: 8000 });
    if (!user || !user.id) return null;

    let role = "tenant"; // fail closed: unknown role is never admin
    try {
      const { data: rows } = await axios.get(`${SUPABASE_URL}/rest/v1/profiles`, {
        headers, timeout: 8000, params: { select: "role", id: `eq.${user.id}` },
      });
      if (Array.isArray(rows) && rows[0] && rows[0].role) role = rows[0].role;
    } catch (_) { /* keep default role */ }

    return { id: user.id, email: user.email, role };
  } catch (_) {
    return null;
  }
}

// Routes reachable without a Supabase token. The payment providers authenticate themselves
// (callback secret / webhook signatures), so they cannot carry a user token.
const PUBLIC_ROUTES = [
  ["POST", /^\/api\/mpesa\/callback$/i],
  ["POST", /^\/api\/flutterwave\/webhook$/i],
  ["POST", /^\/api\/paystack\/webhook$/i],
];
const ADMIN_ONLY_ROUTES = [
  ["POST", /^\/api\/sms\/?$/i],
];

// Default-deny: anything under /api that is not listed in PUBLIC_ROUTES needs a valid token.
app.use("/api", async (req, res, next) => {
  const fullPath = req.baseUrl + req.path;
  if (PUBLIC_ROUTES.some(([m, re]) => m === req.method && re.test(fullPath))) return next();

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(503).json({ error: "Authentication backend is not configured" });
  }

  req.user = await authenticate(req);
  if (!req.user) return res.status(401).json({ error: "Authentication required" });

  if (ADMIN_ONLY_ROUTES.some(([m, re]) => m === req.method && re.test(fullPath)) && !ADMIN_ROLES.has(req.user.role)) {
    return res.status(403).json({ error: "Administrator access required" });
  }
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────

// Health check
app.get("/", (_, res) => res.json({
  status:  "NestList API running",
  version: "1.0.0",
}));

// Initiate STK Push
app.post("/api/mpesa/stk", async (req, res) => {
  const { phone, amount, listingId, listingTitle } = req.body || {};

  if (!phone || !amount || !listingId) {
    return res.status(400).json({ success: false, error: "Missing phone, amount or listingId" });
  }
  const amt = Number(amount);
  // 1..150000 is the M-Pesa per-transaction range.
  if (!Number.isFinite(amt) || amt < 1 || amt > 150000) {
    return res.status(400).json({ success: false, error: "Invalid amount" });
  }
  if (typeof listingId !== "string") {
    return res.status(400).json({ success: false, error: "Invalid listingId" });
  }
  if (!mpesaConfigured()) {
    console.error("STK refused: M-Pesa credentials are not configured");
    return res.status(503).json({ success: false, error: "Payments are temporarily unavailable" });
  }

  try {
    const token = await getToken();
    const ts    = timestamp();
    const pwd   = password(ts);
    const tel   = formatPhone(phone);

    const cb = new URL(process.env.CALLBACK_URL || "https://nestlist-server.onrender.com/api/mpesa/callback");
    if (CALLBACK_SECRET) cb.searchParams.set("token", CALLBACK_SECRET);

    const stkRes = await axios.post(
      `${BASE}/mpesa/stkpush/v1/processrequest`,
      {
        BusinessShortCode: SHORTCODE,
        Password:          pwd,
        Timestamp:         ts,
        TransactionType:   "CustomerPayBillOnline",
        Amount:            Math.ceil(amt),
        PartyA:            tel,
        PartyB:            SHORTCODE,
        PhoneNumber:       tel,
        CallBackURL:       cb.toString(),
        AccountReference:  "NESTLIST-" + listingId.slice(0, 8).toUpperCase(),
        TransactionDesc:   "NestList: " + String(listingTitle || "Listing Fee").slice(0, 20),
      },
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
    );

    const d = stkRes.data;
    if (d.ResponseCode !== "0") {
      throw new Error(d.ResponseDescription || "STK Push failed");
    }

    // Store payment as pending, bound to the user who started it
    const checkoutId = d.CheckoutRequestID;
    payments.set(checkoutId, {
      userId: req.user.id,
      listingId,
      amount: Math.ceil(amt),
      phone: tel,
      status: "pending",
      createdAt: Date.now(),
    });

    res.json({ success: true, checkoutId, message: "STK Push sent! Check your phone." });
  } catch (err) {
    console.error("STK error:", err.response?.data || err.message);
    res.status(500).json({ success: false, error: "STK Push failed. Please try again." });
  }
});

// M-Pesa Callback (called by Safaricom)
app.post("/api/mpesa/callback", (req, res) => {
  // Only Safaricom knows the callback URL (with its secret token) - reject everyone else.
  if (CALLBACK_SECRET && !safeEqual(req.query.token || "", CALLBACK_SECRET)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const cb   = req.body?.Body?.stkCallback;
    const cid  = cb?.CheckoutRequestID;
    const code = cb?.ResultCode;

    // Log only identifiers - the full payload contains the payer's phone number.
    console.log("M-Pesa callback received:", cid, "result:", code);

    const payment = cid ? payments.get(cid) : null;
    // Ignore unknown ids and duplicates/late callbacks: a payment settles exactly once.
    if (payment && payment.status === "pending") {
      if (code === 0) {
        const items     = cb?.CallbackMetadata?.Item || [];
        const mpesaCode = items.find((i) => i.Name === "MpesaReceiptNumber")?.Value;
        const amtPaid   = items.find((i) => i.Name === "Amount")?.Value;

        if (!mpesaCode || !(Number(amtPaid) >= payment.amount)) {
          payments.set(cid, { ...payment, status: "failed", reason: "amount_mismatch", amtPaid });
          console.warn(`⚠️ Payment ${cid} rejected: paid ${amtPaid}, expected ${payment.amount}`);
        } else {
          payments.set(cid, { ...payment, status: "confirmed", mpesaCode, amtPaid, confirmedAt: Date.now() });
          console.log("✅ Payment confirmed! Receipt:", mpesaCode);
        }
      } else {
        payments.set(cid, { ...payment, status: "failed", reason: cb?.ResultDesc });
        console.log("❌ Payment failed:", cb?.ResultDesc);
      }
    }
  } catch (err) {
    console.error("Callback error:", err.message);
  }
  res.json({ ResultCode: 0, ResultDesc: "Accepted" });
});

// Poll payment status (called by frontend)
app.get("/api/mpesa/status", (req, res) => {
  const { checkoutId } = req.query;
  if (!checkoutId) return res.status(400).json({ error: "Missing checkoutId" });

  const payment = payments.get(String(checkoutId));
  // Unknown ids and other people's payments look identical, so ids can't be probed.
  if (!payment || (payment.userId !== req.user.id && !ADMIN_ROLES.has(req.user.role))) {
    return res.json({ status: "pending" });
  }

  res.json({
    status:    payment.status,
    mpesaCode: payment.mpesaCode || null,
    amount:    payment.amtPaid || payment.amount,
  });
});

// Flutterwave webhook
app.post("/api/flutterwave/webhook", (req, res) => {
  const expected = process.env.FLUTTERWAVE_HASH;
  const secret   = req.headers["verif-hash"];
  // An unset secret must never validate (undefined === undefined would let anyone in).
  if (!expected || !secret || !safeEqual(secret, expected)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const { status, meta } = req.body?.data || {};
  console.log("Flutterwave webhook:", status, meta);
  res.sendStatus(200);
});

// Paystack webhook
app.post("/api/paystack/webhook", (req, res) => {
  const key = process.env.PAYSTACK_SECRET;
  // An empty key would make the signature trivially forgeable, so refuse to verify without one.
  if (!key || !req.rawBody) return res.status(401).json({ error: "Unauthorized" });

  // Paystack signs the exact raw request body, not a re-serialised copy.
  const hash = crypto.createHmac("sha512", key).update(req.rawBody).digest("hex");
  const sig  = req.headers["x-paystack-signature"];
  if (!sig || !safeEqual(hash, sig)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  console.log("Paystack event:", req.body?.event);
  res.sendStatus(200);
});

// Africa's Talking SMS proxy (admin only - it spends money and can be abused for spam)
app.post("/api/sms", async (req, res) => {
  const { phone, message } = req.body || {};
  if (!phone || !message) return res.status(400).json({ error: "Missing phone or message" });

  const AT_KEY = process.env.AT_API_KEY;
  if (!AT_KEY) {
    console.error("SMS refused: AT_API_KEY is not configured");
    return res.status(503).json({ success: false, error: "SMS is temporarily unavailable" });
  }

  try {
    const AT_USER = process.env.AT_USERNAME || "sandbox";
    const AT_BASE = AT_USER === "sandbox"
      ? "https://api.sandbox.africastalking.com"
      : "https://api.africastalking.com";

    const params = new URLSearchParams({
      username: AT_USER,
      to:       String(phone).startsWith("+") ? String(phone) : "+" + phone,
      message:  String(message),
      from:     "NestList",
    });

    const r = await axios.post(
      `${AT_BASE}/version1/messaging`,
      params.toString(),
      { headers: { apiKey: AT_KEY, "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" } }
    );
    res.json({ success: true, result: r.data });
  } catch (err) {
    console.error("SMS error:", err.message);
    res.status(500).json({ success: false, error: "Failed to send SMS" });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅ NestList API running on port ${PORT} [${MPESA_ENV}]`));
