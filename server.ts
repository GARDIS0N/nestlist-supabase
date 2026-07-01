import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// =====================================================================
// SUPABASE REAL DATABASE SETUP
// =====================================================================
const supabaseUrl = (process.env.VITE_SUPABASE_URL || "").trim();
const supabaseAnonKey = (process.env.VITE_SUPABASE_ANON_KEY || "").trim();

const isPlaceholder = (val: string) => {
  if (!val) return true;
  const clean = val.toLowerCase();
  return (
    clean === "" ||
    clean === "null" ||
    clean === "undefined" ||
    clean.includes("placeholder") ||
    clean.includes("your_")
  );
};

const useRealSupabase = !isPlaceholder(supabaseUrl) && !isPlaceholder(supabaseAnonKey);
let supabaseClient: any = null;

if (useRealSupabase) {
  console.log("Backend connecting to real Supabase database...");
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
} else {
  console.log("Backend running in simulated mock mode (file-based persistence)...");
}

// =====================================================================
// SIMULATED DATABASE FILE (db.json)
// =====================================================================
const DB_FILE = path.join(process.cwd(), "db.json");

interface MockProperty {
  id: string;
  landlord_id: string;
  title: string;
  description: string;
  location: string;
  county: string;
  price: number;
  type: string;
  amenities: string[];
  images: string[];
  status: string;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  payment_status: "unpaid" | "pending_verification" | "verified" | "rejected";
  mpesa_code?: string;
  mpesa_phone?: string;
  amount_paid?: number;
  submitted_at?: string;
  verified_by?: string;
  verified_at?: string;
  rejection_reason?: string;
}

interface MockListingPayment {
  id: string;
  property_id: string;
  landlord_id: string;
  amount: number;
  property_type: string;
  mpesa_code: string;
  mpesa_checkout_request_id: string;
  amount_paid: number;
  payer_phone?: string;
  failure_reason?: string;
  status: 'pending' | 'confirmed' | 'failed' | 'cancelled';
  confirmed_at?: string;
  created_at: string;
}

// Load database
function getMockDb(): { properties: MockProperty[]; listing_payments?: MockListingPayment[] } {
  if (!fs.existsSync(DB_FILE)) {
    // Initial seeds if needed
    const initialDb = { properties: [], listing_payments: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2));
    return initialDb;
  }
  try {
    const db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    if (!db.listing_payments) {
      db.listing_payments = [];
    }
    return db;
  } catch (err) {
    return { properties: [], listing_payments: [] };
  }
}

// Save database
function saveMockDb(db: { properties: MockProperty[]; listing_payments?: MockListingPayment[] }) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// Sync property from frontend to db.json in mock mode (called upon submit)
function upsertMockProperty(property: any) {
  const db = getMockDb();
  const idx = db.properties.findIndex(p => p.id === property.id);
  if (idx !== -1) {
    db.properties[idx] = { ...db.properties[idx], ...property };
  } else {
    db.properties.push(property);
  }
  saveMockDb(db);
}

// =====================================================================
// API ROUTE ENDPOINTS
// =====================================================================

// Basic Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", mode: useRealSupabase ? "real-supabase" : "mock-simulator" });
});

/**
 * 1. POST /api/listings/:id/payment
 * Accepts mpesa_code, mpesa_phone (optional), and amount_paid
 * Records manual payment inside the listing_payments table
 */
app.post("/api/listings/:id/payment", async (req, res) => {
  const { id } = req.params;
  const { mpesa_code, mpesa_phone, amount_paid } = req.body;

  // Validate request body
  if (!mpesa_code || typeof mpesa_code !== "string") {
    return res.status(400).json({ error: "M-Pesa confirmation code is required." });
  }

  // M-Pesa codes are exactly 10 alphanumeric characters (or 8-12 as a reasonable guard)
  const cleanCode = mpesa_code.trim().toUpperCase();
  const mpesaRegex = /^[A-Z0-9]{8,12}$/;
  if (!mpesaRegex.test(cleanCode)) {
    return res.status(400).json({
      error: "Invalid M-Pesa reference code format. It must be 8-12 alphanumeric characters (e.g. QBG582Y78X)."
    });
  }

  const parsedAmount = parseFloat(amount_paid);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: "A valid positive payment amount is required." });
  }

  const submittedAt = new Date().toISOString();

  if (useRealSupabase) {
    try {
      // Check if property exists
      const { data: property, error: fetchErr } = await supabaseClient
        .from("properties")
        .select("id, landlord_id, type")
        .eq("id", id)
        .single();

      if (fetchErr || !property) {
        return res.status(404).json({ error: "Property listing not found." });
      }

      // Check for duplicate payment submissions
      const { data: existingPayment } = await supabaseClient
        .from("listing_payments")
        .select("id")
        .eq("mpesa_code", cleanCode)
        .maybeSingle();

      if (existingPayment) {
        return res.status(400).json({ error: "This payment reference code has already been submitted." });
      }

      // Insert record in listing_payments
      const { data, error: insertErr } = await supabaseClient
        .from("listing_payments")
        .insert({
          property_id: id,
          landlord_id: property.landlord_id,
          amount: parsedAmount,
          property_type: property.type,
          mpesa_code: cleanCode,
          mpesa_checkout_request_id: `MANUAL-${id}-${cleanCode}`,
          amount_paid: parsedAmount,
          payer_phone: mpesa_phone || null,
          status: "pending"
        })
        .select()
        .single();

      if (insertErr) {
        console.error("Supabase payment insert error:", insertErr);
        if (insertErr.code === "23505") {
          return res.status(400).json({ error: "This payment reference code has already been submitted." });
        }
        return res.status(500).json({ error: "Could not record payment. Please try again." });
      }

      return res.json({
        success: true,
        message: "Payment submitted successfully. Awaiting administrator verification.",
        payment: data
      });
    } catch (err: any) {
      console.error("Unexpected real database payment submission error:", err);
      return res.status(500).json({ error: err.message || "Internal server error." });
    }
  } else {
    // Simulated Mock Mode
    const db = getMockDb();
    let property = db.properties.find(p => p.id === id);

    // If property doesn't exist in backend file yet, create a placeholder from request or initialize it
    if (!property) {
      property = {
        id,
        landlord_id: "landlord-1",
        title: "Draft Listing",
        description: "",
        location: "Unknown",
        county: "Nairobi",
        price: 0,
        type: "bedsitter",
        amenities: [],
        images: [],
        status: "available",
        is_active: false,
        expires_at: null,
        created_at: new Date().toISOString(),
        payment_status: "unpaid"
      };
      db.properties.push(property);
    }

    // Update legacy fields for compatibility
    property.payment_status = "pending_verification";
    property.mpesa_code = cleanCode;
    property.mpesa_phone = mpesa_phone || "";
    property.amount_paid = parsedAmount;
    property.submitted_at = submittedAt;

    // Record into mock listing_payments
    db.listing_payments = db.listing_payments || [];
    const paymentId = `pay-${Date.now()}`;
    const newPayment: MockListingPayment = {
      id: paymentId,
      property_id: id,
      landlord_id: property.landlord_id,
      amount: parsedAmount,
      property_type: property.type,
      mpesa_code: cleanCode,
      mpesa_checkout_request_id: `MANUAL-${id}-${cleanCode}`,
      amount_paid: parsedAmount,
      payer_phone: mpesa_phone || undefined,
      status: "pending",
      created_at: submittedAt
    };
    db.listing_payments.push(newPayment);

    saveMockDb(db);

    return res.json({
      success: true,
      message: "Payment submitted successfully (Simulated).",
      property,
      payment: newPayment
    });
  }
});

/**
 * 2. GET /api/admin/payments/pending
 * Returns all listings with payment status = 'pending_verification'
 * Fetches from the listing_payments table and formats the result for retro-compatibility!
 */
app.get("/api/admin/payments/pending", async (req, res) => {
  // Placeholder Admin auth check
  const isAdmin = true; // Assume standard middleware checks
  if (!isAdmin) {
    return res.status(403).json({ error: "Unauthorized access to admin portal." });
  }

  if (useRealSupabase) {
    try {
      // Query database for listings pending manual verification
      const { data: lpData, error } = await supabaseClient
        .from("listing_payments")
        .select("*, landlord:profiles(full_name, phone), property:properties(title)")
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Supabase fetch pending error:", error);
        return res.status(500).json({ error: "Could not fetch pending payments." });
      }

      // Map to property shapes expected by legacy Admin page
      const mapped = (lpData || []).map((p: any) => ({
        id: p.property_id, // maps id to propertyId so legacy actions work
        title: p.property?.title || "Property Listing",
        landlord: p.landlord,
        amount_paid: p.amount_paid || p.amount,
        mpesa_code: p.mpesa_code,
        mpesa_phone: p.payer_phone,
        payment_status: "pending_verification",
        rejection_reason: p.failure_reason,
        submitted_at: p.created_at
      }));

      return res.json({ success: true, payments: mapped });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Internal server error." });
    }
  } else {
    // Simulated Mock Mode
    const db = getMockDb();
    const pendingPayments = (db.listing_payments || []).filter(p => p.status === "pending");

    const mapped = pendingPayments.map(p => {
      const property = db.properties.find(prop => prop.id === p.property_id);
      return {
        id: p.property_id,
        title: property?.title || "Draft Listing",
        landlord: {
          full_name: "Peter Kamau",
          phone: p.payer_phone || "0712345678"
        },
        amount_paid: p.amount_paid || p.amount,
        mpesa_code: p.mpesa_code,
        mpesa_phone: p.payer_phone,
        payment_status: "pending_verification",
        rejection_reason: p.failure_reason,
        submitted_at: p.created_at
      };
    });

    return res.json({ success: true, payments: mapped });
  }
});

/**
 * 3. POST /api/admin/payments/:id/verify
 * Admin marks payment as verified
 * Flips listing_payments.status to 'confirmed', which triggers db properties.is_active = true!
 */
app.post("/api/admin/payments/:id/verify", async (req, res) => {
  const { id } = req.params; // Property ID (or payment property_id)
  const { admin_id } = req.body;

  // Admin auth check placeholder
  const isAdmin = true;
  if (!isAdmin) {
    return res.status(403).json({ error: "Unauthorized access." });
  }

  const verifiedAt = new Date().toISOString();

  if (useRealSupabase) {
    try {
      // Update listing_payments row
      const { data, error } = await supabaseClient
        .from("listing_payments")
        .update({
          status: "confirmed",
          confirmed_at: verifiedAt,
          amount_paid: 200 // Mock listing fee or fetch dynamically
        })
        .eq("property_id", id)
        .eq("status", "pending")
        .select()
        .single();

      if (error) {
        console.error("Supabase verification update error:", error);
        return res.status(500).json({ error: "Verification database update failed. No pending payment found for this property." });
      }

      return res.json({
        success: true,
        message: "Payment verified. Listing is now live via database triggers!",
        payment: data
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Internal server error." });
    }
  } else {
    // Simulated Mock Mode
    const db = getMockDb();
    db.listing_payments = db.listing_payments || [];
    
    // Find pending payment
    const payment = db.listing_payments.find(p => p.property_id === id && p.status === "pending");
    const property = db.properties.find(p => p.id === id);

    if (!property) {
      return res.status(404).json({ error: "Listing not found in database." });
    }

    if (payment) {
      payment.status = "confirmed";
      payment.confirmed_at = verifiedAt;
    }

    property.payment_status = "verified";
    property.is_active = true;
    property.verified_by = admin_id || "admin-1";
    property.verified_at = verifiedAt;
    property.expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    property.rejection_reason = undefined;

    saveMockDb(db);

    return res.json({
      success: true,
      message: "Payment successfully verified. Listing is now live!",
      property
    });
  }
});

/**
 * 4. POST /api/admin/payments/:id/reject
 * Admin marks payment as rejected, with optional reason
 */
app.post("/api/admin/payments/:id/reject", async (req, res) => {
  const { id } = req.params; // Property ID (or payment property_id)
  const { reason, admin_id } = req.body;

  // Admin auth check placeholder
  const isAdmin = true;
  if (!isAdmin) {
    return res.status(403).json({ error: "Unauthorized access." });
  }

  if (useRealSupabase) {
    try {
      const { data, error } = await supabaseClient
        .from("listing_payments")
        .update({
          status: "failed",
          failure_reason: reason || "M-Pesa code could not be verified."
        })
        .eq("property_id", id)
        .eq("status", "pending")
        .select()
        .single();

      if (error) {
        console.error("Supabase rejection update error:", error);
        return res.status(500).json({ error: "Rejection database update failed." });
      }

      return res.json({
        success: true,
        message: "Payment verification rejected.",
        payment: data
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Internal server error." });
    }
  } else {
    // Simulated Mock Mode
    const db = getMockDb();
    db.listing_payments = db.listing_payments || [];
    
    const payment = db.listing_payments.find(p => p.property_id === id && p.status === "pending");
    const property = db.properties.find(p => p.id === id);

    if (!property) {
      return res.status(404).json({ error: "Listing not found in database." });
    }

    if (payment) {
      payment.status = "failed";
      payment.failure_reason = reason || "M-Pesa code could not be verified.";
    }

    property.payment_status = "rejected";
    property.is_active = false;
    property.verified_by = admin_id || "admin-1";
    property.verified_at = new Date().toISOString();
    property.rejection_reason = reason || "M-Pesa code could not be verified.";

    saveMockDb(db);

    return res.json({
      success: true,
      message: "Payment verification rejected.",
      property
    });
  }
});

// Sync endpoint for the simulator in mock mode
app.post("/api/mock/sync-property", (req, res) => {
  if (useRealSupabase) {
    return res.json({ success: true, note: "Ignored because running in real Supabase mode" });
  }
  const property = req.body;
  if (!property || !property.id) {
    return res.status(400).json({ error: "Invalid property schema." });
  }
  upsertMockProperty(property);
  res.json({ success: true, message: "Property synced to backend mock db." });
});

// =====================================================================
// VITE DEV SERVER OR STATIC PRODUCTION BUILD MIDDLEWARE
// =====================================================================
async function mountViteMiddleware() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`NestList App Server running on http://localhost:${PORT}`);
  });
}

mountViteMiddleware();
