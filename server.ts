/**
 * DEPRECATED / RETIRED EXPRESS SERVER
 * -----------------------------------------------------------------------------
 * Note: All REST endpoints (/api/mpesa/stk, /api/boost/*, /api/leads/*, /api/admin/*)
 * have been retired and rewired on the frontend to call Supabase Edge Functions
 * (e.g. `supabase.functions.invoke("mpesa-stk-push")`) or direct Supabase client queries.
 * 
 * On Vercel deployment, requests operate strictly as a static SPA redirecting to index.html (vercel.json).
 * This server.ts file serves exclusively as a dev-server wrapper in local environments.
 * -----------------------------------------------------------------------------
 */

import express from 'express';
import cors from 'cors';
import axios from 'axios';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// =====================================================================
// CONSTANTS (exactly as specified)
// =====================================================================
const ADMIN_PHONE = '+254715185037';
const ADMIN_EMAIL = 'info@nestlist.co.ke';
const MPESA_PAYBILL = '247247';
const MPESA_ACCOUNT = '0715185037';
const APP_URL = 'https://nestlist.co.ke';

const LISTING_FEES: Record<string, number> = {
  single_room: 100,
  bedsitter:   200,
  studio:      250,
  '1br':       500,
  '2br':       700,
  '3br':       1000,
  '4br':       1200,
  '5br_plus':  1500,
};

const AT_API_KEY = process.env.AT_API_KEY || process.env.AFRICASTALKING_API_KEY || '';
const AT_USERNAME = process.env.AT_USERNAME || 'sandbox';
const AT_BASE = 'https://api.sandbox.africastalking.com';

// M-Pesa STK Push Config
const MPESA_KEY = process.env.MPESA_KEY || process.env.MPESA_CONSUMER_KEY || '';
const MPESA_SECRET = process.env.MPESA_SECRET || process.env.MPESA_CONSUMER_SECRET || '';
const MPESA_SHORTCODE = process.env.MPESA_SHORTCODE || '';
const MPESA_PASSKEY = process.env.MPESA_PASSKEY || '';
const MPESA_ENV = process.env.MPESA_ENV || 'sandbox';
const MPESA_BASE = MPESA_ENV === 'production'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke';
const CALLBACK_URL = process.env.CALLBACK_URL || 'https://nestlist.co.ke/api/mpesa/callback';

function validateEnvironmentSecrets() {
  const required = {
    MPESA_KEY,
    MPESA_SECRET,
    MPESA_SHORTCODE,
    MPESA_PASSKEY,
    AT_API_KEY
  };
  const missing = Object.entries(required).filter(([_, val]) => !val).map(([k]) => k);
  if (missing.length > 0) {
    console.warn(`[WARN] Missing environment variables: ${missing.join(', ')}. Hardcoded fallback credentials have been completely removed.`);
  }
}
validateEnvironmentSecrets();

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://nestlist.co.ke',
    'https://www.nestlist.co.ke',
    'https://nestlist.com',
    'https://www.nestlist.com'
  ],
  credentials: true
}));

// Export entire codebase API endpoint
app.get('/api/codebase/bundle', (req, res) => {
  try {
    const rootDir = process.cwd();
    const filesList: { path: string; content: string }[] = [];

    const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.cache', '.vite', '.next']);
    const ALLOWED_EXTENSIONS = new Set([
      '.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.html', '.md', '.sql', '.env.example', '.txt', '.config.js', '.config.ts'
    ]);

    function walkDir(currentDir: string, relativePath: string = '') {
      const items = fs.readdirSync(currentDir);
      for (const item of items) {
        if (IGNORED_DIRS.has(item)) continue;
        const fullPath = path.join(currentDir, item);
        const rel = relativePath ? `${relativePath}/${item}` : item;
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          walkDir(fullPath, rel);
        } else if (stat.isFile()) {
          const ext = path.extname(item).toLowerCase();
          if (ALLOWED_EXTENSIONS.has(ext) || item.endsWith('.json') || item === 'Dockerfile' || item === '.gitignore') {
            try {
              const content = fs.readFileSync(fullPath, 'utf-8');
              filesList.push({ path: rel, content });
            } catch (err) {
              console.warn(`Could not read file ${rel}:`, err);
            }
          }
        }
      }
    }

    walkDir(rootDir);
    res.json({ success: true, count: filesList.length, files: filesList });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to scan codebase' });
  }
});

// M-Pesa Helper Functions
function formatPhone(phone: string): string {
  let p = String(phone).replace(/\s+/g, '').replace(/[^0-9+]/g, '');
  if (p.startsWith('0')) p = '254' + p.slice(1);
  if (p.startsWith('+254')) p = p.slice(1);
  if (p.startsWith('+')) p = p.slice(1);
  if (!p.startsWith('254')) p = '254' + p;
  return p;
}

function mpesaTimestamp(): string {
  return new Date()
    .toISOString()
    .replace(/[^0-9]/g, '')
    .slice(0, 14);
}

function mpesaPassword(ts: string): string {
  const str = MPESA_SHORTCODE + MPESA_PASSKEY + ts;
  return Buffer.from(str).toString('base64');
}

async function getMpesaToken(): Promise<string> {
  const creds = Buffer.from(`${MPESA_KEY}:${MPESA_SECRET}`).toString('base64');
  const res = await axios.get(
    `${MPESA_BASE}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${creds}` } }
  );
  if (!res.data.access_token) {
    throw new Error('Failed to get M-Pesa token');
  }
  return res.data.access_token;
}

// =====================================================================
// SUPABASE REAL DATABASE SETUP
// =====================================================================
const sanitizeUrl = (url: string): string => {
  let clean = (url || "").trim();
  if (clean.endsWith("/rest/v1/")) {
    clean = clean.slice(0, -9);
  } else if (clean.endsWith("/rest/v1")) {
    clean = clean.slice(0, -8);
  }
  if (clean.endsWith("/")) {
    clean = clean.slice(0, -1);
  }
  return clean;
};

const supabaseUrl = sanitizeUrl(process.env.VITE_SUPABASE_URL || "");
const supabaseAnonKey = (process.env.VITE_SUPABASE_ANON_KEY || "").trim();
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey).trim();

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
  console.log("Backend connecting to real Supabase database via Service Key...");
  supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
} else {
  console.log("Backend running in simulated mock mode (file-based persistence)...");
}

// =====================================================================
// SIMULATED DATABASE FILE (db.json)
// =====================================================================
const DB_FILE = path.join(process.cwd(), "db.json");

interface MockDb {
  properties: any[];
  profiles: any[];
  listing_payments: any[];
  inquiries: any[];
  saved_properties: any[];
  search_alerts: any[];
  sms_logs: any[];
  listing_boosts: any[];
  lead_unlocks: any[];
}

function getMockDb(): MockDb {
  if (!fs.existsSync(DB_FILE)) {
    const initialDb: MockDb = {
      properties: [],
      profiles: [],
      listing_payments: [],
      inquiries: [],
      saved_properties: [],
      search_alerts: [],
      sms_logs: [],
      listing_boosts: [],
      lead_unlocks: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2));
    return initialDb;
  }
  try {
    const db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    if (!db.properties) db.properties = [];
    if (!db.profiles) db.profiles = [];
    if (!db.listing_payments) db.listing_payments = [];
    if (!db.inquiries) db.inquiries = [];
    if (!db.saved_properties) db.saved_properties = [];
    if (!db.search_alerts) db.search_alerts = [];
    if (!db.sms_logs) db.sms_logs = [];
    if (!db.listing_boosts) db.listing_boosts = [];
    if (!db.lead_unlocks) db.lead_unlocks = [];
    return db;
  } catch (err) {
    return {
      properties: [],
      profiles: [],
      listing_payments: [],
      inquiries: [],
      saved_properties: [],
      search_alerts: [],
      sms_logs: []
    };
  }
}

function saveMockDb(db: MockDb) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// =====================================================================
// NOTIFICATION HELPERS (SMS & EMAIL)
// =====================================================================
async function sendSMS(phone: string, message: string, type: string): Promise<void> {
  try {
    let tel = phone.replace(/\s/g, '');
    if (tel.startsWith('0')) tel = '+254' + tel.slice(1);
    if (!tel.startsWith('+')) tel = '+' + tel;

    const params = new URLSearchParams({
      username: AT_USERNAME,
      to: tel,
      message,
      from: 'NestList',
    });

    const res = await axios.post(
      AT_BASE + '/version1/messaging',
      params.toString(),
      {
        headers: {
          apiKey: AT_API_KEY,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
      }
    );

    // Log to DB
    if (useRealSupabase) {
      await supabaseClient.from('sms_logs').insert({
        recipient_phone: tel,
        message,
        type,
        status: 'sent',
        at_response: res.data,
      });
    } else {
      const db = getMockDb();
      db.sms_logs.push({
        id: `sms-${Date.now()}`,
        recipient_phone: tel,
        message,
        type,
        status: 'sent',
        at_response: res.data,
        created_at: new Date().toISOString()
      });
      saveMockDb(db);
    }

    console.log('SMS sent to', tel, ':', message.slice(0, 40) + '...');
  } catch (err: any) {
    console.error('SMS failed (non-critical):', err.message);
    // Log failure
    try {
      if (useRealSupabase) {
        await supabaseClient.from('sms_logs').insert({
          recipient_phone: phone,
          message,
          type,
          status: 'failed',
        });
      } else {
        const db = getMockDb();
        db.sms_logs.push({
          id: `sms-${Date.now()}`,
          recipient_phone: phone,
          message,
          type,
          status: 'failed',
          created_at: new Date().toISOString()
        });
        saveMockDb(db);
      }
    } catch (_) {}
  }
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: 'gardisonkirui11@gmail.com',
        pass: 'nlwzpdajfaxbcfja',
      },
    });

    await transporter.sendMail({
      from: '"NestList Support" <support@nestlist.co.ke>',
      to,
      subject,
      html,
    });

    console.log('Email sent to', to);
  } catch (err: any) {
    console.error('Email failed (non-critical):', err.message);
  }
}

// =====================================================================
// API ROUTES
// =====================================================================

// ── HEALTH CHECK ─────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    version: "1.0.0",
    platform: "NestList Kenya",
    timestamp: new Date().toISOString(),
    supabase: useRealSupabase ? "connected" : "mock mode"
  });
});

// ── LISTINGS ─────────────────────────────────────────────────────────

// GET /api/listings
app.get('/api/listings', async (req, res) => {
  const { county, type, maxPrice, search, page = '1', limit = '20' } = req.query;
  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const offset = (pageNum - 1) * limitNum;

  if (useRealSupabase) {
    try {
      let query = supabaseClient
        .from('properties')
        .select('*', { count: 'exact' })
        .eq('is_active', true)
        .neq('payment_status', 'unpaid')
        .neq('payment_status', 'pending_verification');

      if (county && county !== 'All Counties' && county !== 'all') {
        query = query.eq('county', county);
      }
      if (type && type !== 'all') {
        query = query.eq('type', type);
      }
      if (maxPrice) {
        query = query.lte('price', parseInt(maxPrice as string, 10));
      }

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limitNum - 1);

      if (error) throw error;

      let filtered = data || [];
      if (search) {
        const term = (search as string).toLowerCase();
        filtered = filtered.filter((p: any) =>
          p.title.toLowerCase().includes(term) ||
          p.location.toLowerCase().includes(term) ||
          (p.description && p.description.toLowerCase().includes(term))
        );
      }

      return res.json({
        success: true,
        listings: filtered,
        total: count || filtered.length,
        page: pageNum,
        limit: limitNum
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    let filtered = db.properties.filter(p => p.is_active && p.payment_status !== 'unpaid' && p.payment_status !== 'pending_verification' && p.status !== 'awaiting_activation');

    if (county && county !== 'All Counties' && county !== 'all') {
      filtered = filtered.filter(p => p.county?.toLowerCase() === (county as string).toLowerCase());
    }
    if (type && type !== 'all') {
      filtered = filtered.filter(p => p.type === type);
    }
    if (maxPrice) {
      filtered = filtered.filter(p => p.price <= parseInt(maxPrice as string, 10));
    }
    if (search) {
      const term = (search as string).toLowerCase();
      filtered = filtered.filter(p =>
        p.title?.toLowerCase().includes(term) ||
        p.location?.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term)
      );
    }

    // Sort
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const total = filtered.length;
    const listings = filtered.slice(offset, offset + limitNum);

    return res.json({
      success: true,
      listings,
      total,
      page: pageNum,
      limit: limitNum
    });
  }
});

// GET /api/listings/:id
app.get('/api/listings/:id', async (req, res) => {
  const { id } = req.params;
  const tenantId = (req.query.tenantId || req.headers.tenant_id || '') as string;

  if (useRealSupabase) {
    try {
      // Fetch property
      const { data: listing, error } = await supabaseClient
        .from('properties')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !listing) {
        return res.status(404).json({ error: "Listing not found" });
      }

      // Check active / payment status
      if (!listing.is_active || listing.payment_status === 'unpaid' || listing.payment_status === 'pending_verification' || listing.status === 'awaiting_activation') {
        const isLandlord = tenantId && tenantId === listing.landlord_id;
        if (!isLandlord) {
          return res.status(403).json({
            error: "This listing is awaiting activation/payment and is not publicly contactable.",
            isAwaitingActivation: true
          });
        }
      }

      // Fetch landlord
      const { data: landlord } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', listing.landlord_id)
        .single();

      // Check payment model
      const isPayPerInquiry = listing.payment_model === 'pay_per_inquiry' || listing.listing_model === 'pay_per_lead';
      const isOwnerOrAdmin = tenantId && (tenantId === listing.landlord_id || landlord?.role === 'admin');

      // Landlord contact is ONLY visible if pay_once OR requesting user is owner/admin
      const isUnlocked = !isPayPerInquiry || isOwnerOrAdmin;

      // Increment view count
      await supabaseClient
        .from('properties')
        .update({ view_count: (listing.view_count || 0) + 1 })
        .eq('id', id);

      // Strip sensitive contact details if pay_per_inquiry and not owner/admin
      const sanitizedLandlord = isUnlocked ? landlord : {
        id: landlord?.id,
        full_name: landlord?.full_name || 'Landlord',
        avatar_url: landlord?.avatar_url,
        phone: null,
        email: null
      };

      return res.json({
        success: true,
        isUnlocked: !!isUnlocked,
        listing: { ...listing, view_count: (listing.view_count || 0) + 1 },
        landlord: sanitizedLandlord
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    const listing = db.properties.find(p => p.id === id);
    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }

    if (!listing.is_active || listing.payment_status === 'unpaid' || listing.status === 'awaiting_activation') {
      const isLandlord = tenantId && tenantId === listing.landlord_id;
      if (!isLandlord) {
        return res.status(403).json({
          error: "This listing is awaiting activation/payment and is not publicly contactable.",
          isAwaitingActivation: true
        });
      }
    }

    listing.view_count = (listing.view_count || 0) + 1;
    saveMockDb(db);

    const landlord = db.profiles.find(p => p.id === listing.landlord_id);

    const isPayPerInquiry = listing.payment_model === 'pay_per_inquiry' || listing.listing_model === 'pay_per_lead';
    const isOwnerOrAdmin = tenantId && (tenantId === listing.landlord_id || landlord?.role === 'admin');
    const isUnlocked = !isPayPerInquiry || isOwnerOrAdmin;

    const sanitizedLandlord = isUnlocked ? landlord : {
      id: landlord?.id,
      full_name: landlord?.full_name || 'Landlord',
      avatar_url: landlord?.avatar_url,
      phone: null,
      email: null
    };

    return res.json({
      success: true,
      isUnlocked: !!isUnlocked,
      listing,
      landlord: sanitizedLandlord
    });
  }
});

// POST /listings/:id/unlock-lead & POST /api/listings/:id/unlock-lead
app.post(['/listings/:id/unlock-lead', '/api/listings/:id/unlock-lead'], async (req, res) => {
  const { id } = req.params;
  const tenantId = req.body.tenantId || req.body.tenant_id || req.body.userId;

  if (!tenantId) {
    return res.status(401).json({ success: false, error: "Authentication required to unlock tenant contact info." });
  }

  if (useRealSupabase) {
    try {
      // 1. Fetch listing
      const { data: listing, error: lErr } = await supabaseClient
        .from('properties')
        .select('*')
        .eq('id', id)
        .single();

      if (lErr || !listing) {
        return res.status(404).json({ success: false, error: "Listing not found" });
      }

      // 2. Check active & paid status
      if (!listing.is_active || listing.payment_status === 'unpaid' || listing.payment_status === 'pending_verification' || listing.status === 'awaiting_activation') {
        return res.status(403).json({ success: false, error: "This listing is awaiting landlord payment/activation and cannot be unlocked." });
      }

      // 3. Fetch landlord
      const { data: landlord } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', listing.landlord_id)
        .single();

      // 4. Check if already unlocked
      const { data: existingUnlock } = await supabaseClient
        .from('lead_unlocks')
        .select('*')
        .eq('tenant_id', tenantId)
        .or(`listing_id.eq.${id},property_id.eq.${id}`)
        .eq('status', 'confirmed')
        .maybeSingle();

      if (existingUnlock) {
        return res.json({
          success: true,
          unlocked: true,
          alreadyUnlocked: true,
          message: "Contact info is already unlocked for this listing.",
          contactInfo: {
            landlordName: landlord?.full_name || "Landlord",
            phone: landlord?.phone || null,
            email: landlord?.email || null,
            whatsapp: landlord?.phone || null
          }
        });
      }

      // 5. Check tenant credit balance
      const { data: tenantProfile } = await supabaseClient
        .from('profiles')
        .select('lead_credits')
        .eq('id', tenantId)
        .single();

      const tenantCredits = tenantProfile?.lead_credits || 0;
      const propertyCredits = listing.lead_credits || 0;

      if (tenantCredits < 1 && propertyCredits < 1) {
        return res.status(402).json({
          success: false,
          error: "0 lead credits available. Please purchase a lead credit bundle to unlock landlord contact details.",
          code: "INSUFFICIENT_CREDITS"
        });
      }

      // 6. Deduct 1 credit & create unlock record
      if (tenantCredits >= 1) {
        await supabaseClient.from('profiles').update({ lead_credits: tenantCredits - 1 }).eq('id', tenantId);
        await supabaseClient.from('credit_transactions').insert({
          landlord_id: tenantId,
          property_id: id,
          credits_added: -1,
          type: 'lead_spent',
          notes: 'Unlocked property contact'
        });
      } else if (propertyCredits >= 1) {
        await supabaseClient.from('properties').update({ lead_credits: propertyCredits - 1 }).eq('id', id);
        await supabaseClient.from('credit_transactions').insert({
          landlord_id: listing.landlord_id,
          property_id: id,
          credits_added: -1,
          type: 'lead_spent',
          notes: 'Unlocked property contact'
        });
      }

      const { data: newUnlock, error: uErr } = await supabaseClient
        .from('lead_unlocks')
        .insert({
          tenant_id: tenantId,
          listing_id: id,
          property_id: id,
          landlord_id: listing.landlord_id,
          credits_spent: 1,
          amount_paid: 0,
          payment_method: 'credit',
          status: 'confirmed',
          unlocked_at: new Date().toISOString()
        })
        .select()
        .single();

      if (uErr) throw uErr;

      // 7. Return unmasked contact info
      return res.json({
        success: true,
        unlocked: true,
        message: "Lead unlocked successfully!",
        contactInfo: {
          landlordName: landlord?.full_name || "Landlord",
          phone: landlord?.phone || null,
          email: landlord?.email || null,
          whatsapp: landlord?.phone || null
        }
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  } else {
    // Mock DB implementation
    const db = getMockDb();
    const listing = db.properties.find(p => p.id === id);
    if (!listing) return res.status(404).json({ success: false, error: "Listing not found" });

    if (!listing.is_active || listing.payment_status === 'unpaid' || listing.status === 'awaiting_activation') {
      return res.status(403).json({ success: false, error: "This listing is awaiting landlord payment/activation and cannot be unlocked." });
    }

    const landlord = db.profiles.find(p => p.id === listing.landlord_id);

    const existingUnlock = db.lead_unlocks.find(u =>
      u.tenant_id === tenantId &&
      (u.listing_id === id || u.property_id === id) &&
      u.status === 'confirmed'
    );

    if (existingUnlock) {
      return res.json({
        success: true,
        unlocked: true,
        alreadyUnlocked: true,
        message: "Contact info is already unlocked for this listing.",
        contactInfo: {
          landlordName: landlord?.full_name || "Landlord",
          phone: landlord?.phone || null,
          email: landlord?.email || null,
          whatsapp: landlord?.phone || null
        }
      });
    }

    const tenantProfile = db.profiles.find(p => p.id === tenantId);
    const tenantCredits = tenantProfile?.lead_credits || 0;
    const propertyCredits = listing.lead_credits || 0;

    if (tenantCredits < 1 && propertyCredits < 1) {
      return res.status(402).json({
        success: false,
        error: "0 lead credits available. Please purchase a lead credit bundle to unlock landlord contact details.",
        code: "INSUFFICIENT_CREDITS"
      });
    }

    if (tenantCredits >= 1 && tenantProfile) {
      tenantProfile.lead_credits = tenantCredits - 1;
      if (!db.credit_transactions) db.credit_transactions = [];
      db.credit_transactions.push({
        id: `tx-${Date.now()}`,
        landlord_id: tenantId,
        property_id: id,
        credits_added: -1,
        type: 'lead_spent',
        notes: 'Unlocked property contact',
        created_at: new Date().toISOString()
      });
    } else if (propertyCredits >= 1) {
      listing.lead_credits = propertyCredits - 1;
      if (!db.credit_transactions) db.credit_transactions = [];
      db.credit_transactions.push({
        id: `tx-${Date.now()}`,
        landlord_id: listing.landlord_id,
        property_id: id,
        credits_added: -1,
        type: 'lead_spent',
        notes: 'Unlocked property contact',
        created_at: new Date().toISOString()
      });
    }

    db.lead_unlocks.push({
      id: `unl-${Date.now()}`,
      tenant_id: tenantId,
      listing_id: id,
      property_id: id,
      landlord_id: listing.landlord_id,
      credits_spent: 1,
      amount_paid: 0,
      payment_method: 'credit',
      status: 'confirmed',
      unlocked_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    });

    saveMockDb(db);

    return res.json({
      success: true,
      unlocked: true,
      message: "Lead unlocked successfully!",
      contactInfo: {
        landlordName: landlord?.full_name || "Landlord",
        phone: landlord?.phone || null,
        email: landlord?.email || null,
        whatsapp: landlord?.phone || null
      }
    });
  }
});


// POST /api/listings
app.post('/api/listings', async (req, res) => {
  const { title, type, price, location, county, description, amenities, images, landlordId } = req.body;

  if (!title || !price || !landlordId) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (useRealSupabase) {
    try {
      const { data, error } = await supabaseClient
        .from('properties')
        .insert({
          title,
          type,
          price: parseInt(price, 10),
          location,
          county,
          description,
          amenities: amenities || [],
          images: images || [],
          landlord_id: landlordId,
          is_active: false
        })
        .select()
        .single();

      if (error) throw error;
      return res.json({ success: true, listing: data });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    const listing = {
      id: `prop-${Date.now()}`,
      title,
      type,
      price: parseInt(price, 10),
      location,
      county,
      description,
      amenities: amenities || [],
      images: images || [],
      landlord_id: landlordId,
      is_active: false,
      view_count: 0,
      inquiry_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    db.properties.push(listing);
    saveMockDb(db);

    return res.json({ success: true, listing });
  }
});

// PUT /api/listings/:id
app.put('/api/listings/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  if (useRealSupabase) {
    try {
      const { data, error } = await supabaseClient
        .from('properties')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return res.json({ success: true, listing: data });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    const idx = db.properties.findIndex(p => p.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Listing not found" });
    }

    db.properties[idx] = {
      ...db.properties[idx],
      ...updates,
      updated_at: new Date().toISOString()
    };
    saveMockDb(db);

    return res.json({ success: true, listing: db.properties[idx] });
  }
});

// DELETE /api/listings/:id
app.delete('/api/listings/:id', async (req, res) => {
  const { id } = req.params;

  if (useRealSupabase) {
    try {
      // Delete listing
      const { error } = await supabaseClient
        .from('properties')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return res.json({ success: true, message: "Listing deleted" });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    db.properties = db.properties.filter(p => p.id !== id);
    db.listing_payments = db.listing_payments.filter(p => p.property_id !== id);
    db.inquiries = db.inquiries.filter(i => i.property_id !== id);
    saveMockDb(db);

    return res.json({ success: true, message: "Listing deleted" });
  }
});

// GET /api/listings/:id/fee
app.get('/api/listings/:id/fee', async (req, res) => {
  const { id } = req.params;

  let type = 'bedsitter';

  if (useRealSupabase) {
    try {
      const { data } = await supabaseClient
        .from('properties')
        .select('type')
        .eq('id', id)
        .single();
      if (data) type = data.type;
    } catch (_) {}
  } else {
    const db = getMockDb();
    const property = db.properties.find(p => p.id === id);
    if (property) type = property.type;
  }

  const fee = LISTING_FEES[type] || 100;

  return res.json({
    fee,
    type,
    paybill: MPESA_PAYBILL,
    account: MPESA_ACCOUNT,
    instructions: `Send KES ${fee} to Paybill ${MPESA_PAYBILL}, Account: ${MPESA_ACCOUNT}`
  });
});

// POST /api/listings/:id/payment
app.post('/api/listings/:id/payment', async (req, res) => {
  const { id } = req.params;
  const { mpesaCode, payerPhone, amountPaid } = req.body;

  if (!mpesaCode || typeof mpesaCode !== 'string') {
    return res.status(400).json({ error: "M-Pesa reference code is required" });
  }

  const cleanCode = mpesaCode.trim().toUpperCase();
  const mpesaRegex = /^[A-Z0-9]{8,12}$/;
  if (!mpesaRegex.test(cleanCode)) {
    return res.status(400).json({ error: "Invalid M-Pesa code format. Must be 8-12 alphanumeric characters." });
  }

  const amount = parseFloat(amountPaid);
  if (isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: "Invalid payment amount" });
  }

  let property: any = null;
  let landlord: any = null;

  if (useRealSupabase) {
    try {
      // Get property
      const { data: prop, error: pErr } = await supabaseClient
        .from('properties')
        .select('*')
        .eq('id', id)
        .single();

      if (pErr || !prop) return res.status(404).json({ error: "Property not found" });
      property = prop;

      // Get fee
      const fee = LISTING_FEES[property.type] || 100;
      if (amount < fee) {
        return res.status(400).json({ error: `Amount paid is less than the required fee of KES ${fee}` });
      }

      // Check duplicate payment
      const { data: existing } = await supabaseClient
        .from('listing_payments')
        .select('id')
        .eq('mpesa_code', cleanCode)
        .maybeSingle();

      if (existing) {
        return res.status(400).json({ error: "This M-Pesa code has already been submitted." });
      }

      // Insert payment
      const { error: insErr } = await supabaseClient
        .from('listing_payments')
        .insert({
          property_id: id,
          landlord_id: property.landlord_id,
          amount: fee,
          amount_paid: amount,
          property_type: property.type,
          mpesa_code: cleanCode,
          payer_phone: payerPhone || null,
          status: 'pending'
        });

      if (insErr) throw insErr;

      // Update property status is not needed since properties does not have payment_status, listing_payments tracks this
      // Get Landlord Profile
      const { data: prof } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', property.landlord_id)
        .single();
      landlord = prof;
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    const prop = db.properties.find(p => p.id === id);
    if (!prop) return res.status(404).json({ error: "Property not found" });
    property = prop;

    const fee = LISTING_FEES[property.type] || 100;
    if (amount < fee) {
      return res.status(400).json({ error: `Amount paid is less than the required fee of KES ${fee}` });
    }

    const dup = db.listing_payments.find(p => p.mpesa_code === cleanCode);
    if (dup) return res.status(400).json({ error: "This M-Pesa code has already been submitted." });

    const newPayment = {
      id: `pay-${Date.now()}`,
      property_id: id,
      landlord_id: property.landlord_id,
      amount: fee,
      amount_paid: amount,
      property_type: property.type,
      mpesa_code: cleanCode,
      payer_phone: payerPhone || "N/A",
      status: 'pending',
      created_at: new Date().toISOString()
    };

    db.listing_payments.push(newPayment);
    saveMockDb(db);

    landlord = db.profiles.find(p => p.id === property.landlord_id) || { full_name: "Mock Landlord", phone: payerPhone };
  }

  // SEND NOTIFICATIONS
  const landlordName = landlord?.full_name || 'Landlord';
  const landlordPhone = landlord?.phone || payerPhone || 'N/A';

  // 1. SMS to Admin
  const adminMsg = `NestList: New payment pending verification. Property: ${property.title} (${property.type}). M-Pesa Code: ${cleanCode}. Amount: KES ${amount}. Landlord: ${landlordName} - ${landlordPhone}. Verify: ${APP_URL}/admin`;
  await sendSMS(ADMIN_PHONE, adminMsg, 'payment_submitted_admin');

  // 2. SMS to Landlord
  const landlordMsg = `NestList: Your M-Pesa code ${cleanCode} has been submitted. We will verify and activate your listing within minutes. Thank you.`;
  await sendSMS(landlordPhone, landlordMsg, 'payment_submitted_landlord');

  // 3. Email to Admin
  const emailHtml = `
    <h2>New Listing Payment Pending Verification</h2>
    <p><strong>Property:</strong> ${property.title}</p>
    <p><strong>Type:</strong> ${property.type}</p>
    <p><strong>Required Fee:</strong> KES ${LISTING_FEES[property.type] || 100}</p>
    <p><strong>Amount Submitted:</strong> KES ${amount}</p>
    <p><strong>M-Pesa Reference:</strong> ${cleanCode}</p>
    <p><strong>Sender Phone:</strong> ${landlordPhone}</p>
    <p><strong>Landlord Name:</strong> ${landlordName}</p>
    <br>
    <p><a href="${APP_URL}/admin" style="padding: 10px 20px; background-color: #15803d; color: white; text-decoration: none; border-radius: 5px;">Verify in Admin Portal</a></p>
  `;
  await sendEmail(ADMIN_EMAIL, `New Payment Pending - ${property.title}`, emailHtml);

  return res.json({ success: true, message: "Payment submitted for verification" });
});

// =====================================================================
// M-PESA STK PUSH ENDPOINTS
// =====================================================================

// GET /api/mpesa/token
// Get OAuth token (for testing)
app.get('/api/mpesa/token', async (req, res) => {
  try {
    const token = await getMpesaToken();
    res.json({ success: true, token });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// POST /api/mpesa/stk
// Initiate STK Push
app.post('/api/mpesa/stk', async (req, res) => {
  const { phone, amount, propertyId, propertyTitle, landlordId } = req.body;

  if (!phone || !amount || !propertyId) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: phone, amount, propertyId'
    });
  }

  try {
    const token = await getMpesaToken();
    const ts = mpesaTimestamp();
    const pwd = mpesaPassword(ts);
    const tel = formatPhone(phone);

    const stkRes = await axios.post(
      `${MPESA_BASE}/mpesa/stkpush/v1/processrequest`,
      {
        BusinessShortCode: MPESA_SHORTCODE,
        Password: pwd,
        Timestamp: ts,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.ceil(amount),
        PartyA: tel,
        PartyB: MPESA_SHORTCODE,
        PhoneNumber: tel,
        CallBackURL: CALLBACK_URL,
        AccountReference: 'NESTLIST-' + propertyId.slice(0, 8).toUpperCase(),
        TransactionDesc: `NestList: ${(propertyTitle || 'Listing Fee').slice(0, 20)}`,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const d = stkRes.data;

    if (d.ResponseCode !== '0') {
      throw new Error(
        d.ResponseDescription ||
        d.errorMessage ||
        'STK Push failed'
      );
    }

    let paymentId = null;

    if (useRealSupabase) {
      // Save pending payment to Supabase
      const { data: payment, error: payErr } = await supabaseClient
        .from('listing_payments')
        .insert({
          property_id: propertyId,
          landlord_id: landlordId || null,
          amount: Math.ceil(amount),
          status: 'pending',
          mpesa_checkout_request_id: d.CheckoutRequestID,
          payment_method: 'stk_push',
        })
        .select()
        .single();

      if (payErr) {
        console.error('Supabase insert error:', payErr);
      } else {
        paymentId = payment?.id;
      }

      // Update property payment_status
      await supabaseClient
        .from('properties')
        .update({ payment_status: 'pending_verification' })
        .eq('id', propertyId);
    } else {
      const db = getMockDb();
      paymentId = `pay-${Date.now()}`;
      
      const mockPayment = {
        id: paymentId,
        property_id: propertyId,
        landlord_id: landlordId || null,
        amount: Math.ceil(amount),
        status: 'pending',
        mpesa_checkout_request_id: d.CheckoutRequestID,
        payment_method: 'stk_push',
        created_at: new Date().toISOString()
      };
      
      db.listing_payments.push(mockPayment);

      const prop = db.properties.find(p => p.id === propertyId);
      if (prop) {
        prop.payment_status = 'pending_verification';
      }
      saveMockDb(db);
    }

    res.json({
      success: true,
      checkoutId: d.CheckoutRequestID,
      paymentId: paymentId,
      message: 'STK Push sent! Check your phone.',
    });

  } catch (err: any) {
    console.error('STK Push error:', err.response?.data || err.message);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// POST /api/mpesa/callback
// Safaricom webhook — called after user pays or cancels
app.post('/api/mpesa/callback', async (req, res) => {
  try {
    const cb = req.body?.Body?.stkCallback;
    const checkoutId = cb?.CheckoutRequestID;
    const resultCode = cb?.ResultCode;

    console.log('M-Pesa callback received:', JSON.stringify(cb));

    if (!checkoutId) {
      return res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    const statusVal = resultCode === 1032 ? 'cancelled' : 'failed';

    if (resultCode === 0) {
      // PAYMENT SUCCESS
      const items = cb?.CallbackMetadata?.Item || [];
      const getItem = (name: string) => items.find((i: any) => i.Name === name)?.Value;

      const mpesaCode = getItem('MpesaReceiptNumber');
      const amountPaid = getItem('Amount');
      const payerPhone = getItem('PhoneNumber');

      console.log(`✅ Webhook confirmed success! Code: ${mpesaCode}`);

      let processed = false;

      // 1. Process standard listing payment
      let payment: any = null;
      if (useRealSupabase) {
        const { data: updatedPayment } = await supabaseClient
          .from('listing_payments')
          .update({
            status: 'confirmed',
            mpesa_code: mpesaCode,
            amount_paid: amountPaid,
            payer_phone: String(payerPhone || ''),
            verified_at: new Date().toISOString(),
            verified_by: 'stk_auto',
          })
          .eq('mpesa_checkout_request_id', checkoutId)
          .select()
          .maybeSingle();
        payment = updatedPayment;
        if (payment) processed = true;
      } else {
        const db = getMockDb();
        const pIndex = db.listing_payments.findIndex(pay => pay.mpesa_checkout_request_id === checkoutId);
        if (pIndex !== -1) {
          db.listing_payments[pIndex] = {
            ...db.listing_payments[pIndex],
            status: 'confirmed',
            mpesa_code: mpesaCode,
            amount_paid: amountPaid,
            payer_phone: String(payerPhone || ''),
            verified_at: new Date().toISOString(),
            verified_by: 'stk_auto',
          };
          payment = db.listing_payments[pIndex];
          const prop = db.properties.find(p => p.id === payment.property_id);
          if (prop) {
            prop.is_active = true;
            prop.payment_status = 'verified';
            prop.expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
          }
          saveMockDb(db);
          processed = true;
        }
      }

      if (processed && payment) {
        if (useRealSupabase && payment.property_id) {
          await supabaseClient
            .from('properties')
            .update({
              is_active: true,
              payment_status: 'verified',
              expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            })
            .eq('id', payment.property_id);
        }

        console.log(`🏠 Listing ${payment.property_id} activated via STK`);

        let landlordProfile: any = null;
        if (payment.landlord_id) {
          if (useRealSupabase) {
            const { data: profile } = await supabaseClient
              .from('profiles')
              .select('phone, full_name, email')
              .eq('id', payment.landlord_id)
              .single();
            landlordProfile = profile;
          } else {
            const db = getMockDb();
            const profile = db.profiles.find(u => u.id === payment.landlord_id);
            landlordProfile = profile || { full_name: 'Landlord', phone: String(payerPhone || ''), email: '' };
          }

          if (landlordProfile?.phone) {
            await sendSMS(
              landlordProfile.phone,
              `NestList: ✅ Your listing is now LIVE! Receipt: ${mpesaCode}. Active for 30 days. View at nestlist.co.ke`,
              'listing_confirmed_stk'
            );
          }

          if (landlordProfile?.email) {
            await sendEmail(
              landlordProfile.email,
              '✅ Your NestList listing is now LIVE!',
              `
                <h2>Your listing is live! 🎉</h2>
                <p>Hi ${landlordProfile.full_name},</p>
                <p>Your property listing is now visible to thousands of tenants on NestList.</p>
                <p><strong>M-Pesa Receipt:</strong> ${mpesaCode}</p>
                <p><strong>Amount Paid:</strong> KES ${amountPaid}</p>
                <p><strong>Active Until:</strong> ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-KE', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}</p>
                <p><a href="https://nestlist.co.ke/dashboard">View My Dashboard</a></p>
                <p>The NestList Team</p>
              `
            );
          }

          await sendSMS(
            ADMIN_PHONE,
            `NestList: New STK listing activated! Landlord: ${landlordProfile?.full_name}. Code: ${mpesaCode}. Amount: KES ${amountPaid}`,
            'admin_stk_notification'
          );
        }
      }

      // 2. Process listing boost
      if (!processed) {
        let boost: any = null;
        if (useRealSupabase) {
          const { data: updatedBoost } = await supabaseClient
            .from('listing_boosts')
            .update({
              status: 'active',
              mpesa_code: mpesaCode,
              starts_at: new Date().toISOString()
            })
            .eq('mpesa_checkout_request_id', checkoutId)
            .select('*, property:properties(title)')
            .maybeSingle();

          if (updatedBoost) {
            boost = updatedBoost;
            processed = true;
            const durationDays = boost.boost_tier === '3day' ? 3 : boost.boost_tier === '7day' ? 7 : boost.boost_tier === '14day' ? 14 : boost.boost_tier === '30day' ? 30 : 7;
            const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
            const badgeText = boost.boost_tier === '3day' ? '⚡ Featured' : boost.boost_tier === '7day' ? '⭐ Featured' : boost.boost_tier === '14day' ? '🔥 Hot Property' : '👑 Premium';

            await supabaseClient.from('listing_boosts').update({ expires_at: expiresAt }).eq('id', boost.id);

            await supabaseClient.from('properties').update({
              is_boosted: true,
              boost_tier: boost.boost_tier,
              boost_expires_at: expiresAt,
              boost_badge: badgeText
            }).eq('id', boost.property_id);

            const { data: profile } = await supabaseClient.from('profiles').select('phone').eq('id', boost.landlord_id).single();
            if (profile?.phone) {
              await sendSMS(
                profile.phone,
                `NestList: 🚀 Your listing '${boost.property?.title}' is now BOOSTED! It appears at the top of search results for ${durationDays} days. nestlist.co.ke`,
                'boost_activated'
              );
            }
          }
        } else {
          const db = getMockDb();
          const bIndex = db.listing_boosts.findIndex(b => b.mpesa_checkout_request_id === checkoutId);
          if (bIndex !== -1) {
            boost = db.listing_boosts[bIndex];
            boost.status = 'active';
            boost.mpesa_code = mpesaCode;
            const durationDays = boost.boost_tier === '3day' ? 3 : boost.boost_tier === '7day' ? 7 : boost.boost_tier === '14day' ? 14 : boost.boost_tier === '30day' ? 30 : 7;
            const startsAt = new Date().toISOString();
            const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
            const badgeText = boost.boost_tier === '3day' ? '⚡ Featured' : boost.boost_tier === '7day' ? '⭐ Featured' : boost.boost_tier === '14day' ? '🔥 Hot Property' : '👑 Premium';

            boost.starts_at = startsAt;
            boost.expires_at = expiresAt;

            const prop = db.properties.find(p => p.id === boost.property_id);
            if (prop) {
              prop.is_boosted = true;
              prop.boost_tier = boost.boost_tier;
              prop.boost_expires_at = expiresAt;
              prop.boost_badge = badgeText;
            }

            const landlord = db.profiles.find(p => p.id === boost.landlord_id);
            if (landlord?.phone) {
              await sendSMS(
                landlord.phone,
                `NestList: 🚀 Your listing '${prop?.title || "Property"}' is now BOOSTED! It appears at the top of search results for ${durationDays} days. nestlist.co.ke`,
                'boost_activated'
              );
            }
            saveMockDb(db);
            processed = true;
          }
        }
      }

      // 3. Process lead unlocks / bundles
      if (!processed) {
        let unlock: any = null;
        if (useRealSupabase) {
          const { data: foundUnlock } = await supabaseClient
            .from('lead_unlocks')
            .select('id')
            .eq('mpesa_checkout_request_id', checkoutId)
            .maybeSingle();

          if (foundUnlock) {
            unlock = foundUnlock;
            processed = true;
            await processLeadUnlockConfirmation(foundUnlock.id, mpesaCode);

            // Fetch landlord profile to send notification
            const { data: fullUnlock } = await supabaseClient
              .from('lead_unlocks')
              .select('*, property:properties(title, lead_credits)')
              .eq('id', foundUnlock.id)
              .single();

            if (fullUnlock) {
              const { data: profile } = await supabaseClient.from('profiles').select('phone').eq('id', fullUnlock.landlord_id).maybeSingle();
              if (profile?.phone) {
                if (fullUnlock.credits_added > 0) {
                  await sendSMS(
                    profile.phone,
                    `NestList: ✅ ${fullUnlock.credits_added} lead credits added to '${fullUnlock.property?.title || "Property"}'. nestlist.co.ke`,
                    'bundle_purchased'
                  );
                } else {
                  await sendSMS(
                    profile.phone,
                    `NestList: 🔓 Lead unlocked! View tenant contact at nestlist.co.ke/dashboard`,
                    'lead_unlocked'
                  );
                }
              }
            }
          }
        } else {
          const db = getMockDb();
          const uIndex = db.lead_unlocks.findIndex(u => u.mpesa_checkout_request_id === checkoutId);
          if (uIndex !== -1) {
            unlock = db.lead_unlocks[uIndex];
            unlock.status = 'confirmed';
            unlock.mpesa_code = mpesaCode;
            unlock.unlocked_at = new Date().toISOString();

            const prop = db.properties.find(p => p.id === unlock.property_id);
            const landlord = db.profiles.find(p => p.id === unlock.landlord_id);

            if (unlock.bundle_size === 5) {
              const currentCredits = prop?.lead_credits || 0;
              const newBalance = currentCredits + 5;
              if (prop) prop.lead_credits = newBalance;

              if (landlord?.phone) {
                await sendSMS(
                  landlord.phone,
                  `NestList: ✅ 5 lead credits added to '${prop?.title || "Property"}'. Credits: ${newBalance}. nestlist.co.ke`,
                  'bundle_purchased'
                );
              }
            } else {
              if (unlock.inquiry_id) {
                const inq = db.inquiries.find(i => i.id === unlock.inquiry_id);
                if (inq) {
                  inq.is_unlocked = true;
                  inq.is_locked = false;
                  inq.unlocked_at = new Date().toISOString();
                }
              }

              if (landlord?.phone) {
                await sendSMS(
                  landlord.phone,
                  `NestList: 🔓 Lead unlocked! View tenant contact at nestlist.co.ke/dashboard`,
                  'lead_unlocked'
                );
              }
            }
            saveMockDb(db);
            processed = true;
          }
        }
      }

    } else {
      // PAYMENT FAILED OR CANCELLED
      const reason = cb?.ResultDesc || 'Payment was not completed';
      console.log(`❌ Payment failed: ${reason}`);

      if (useRealSupabase) {
        await supabaseClient.from('listing_payments').update({ status: statusVal, failure_reason: reason }).eq('mpesa_checkout_request_id', checkoutId);
        await supabaseClient.from('listing_boosts').update({ status: 'cancelled' }).eq('mpesa_checkout_request_id', checkoutId);
        await supabaseClient.from('lead_unlocks').update({ status: 'failed' }).eq('mpesa_checkout_request_id', checkoutId);
      } else {
        const db = getMockDb();
        const pIndex = db.listing_payments.findIndex(pay => pay.mpesa_checkout_request_id === checkoutId);
        if (pIndex !== -1) {
          db.listing_payments[pIndex].status = statusVal;
          db.listing_payments[pIndex].failure_reason = reason;
        }
        const bIndex = db.listing_boosts.findIndex(b => b.mpesa_checkout_request_id === checkoutId);
        if (bIndex !== -1) {
          db.listing_boosts[bIndex].status = 'cancelled';
        }
        const uIndex = db.lead_unlocks.findIndex(u => u.mpesa_checkout_request_id === checkoutId);
        if (uIndex !== -1) {
          db.lead_unlocks[uIndex].status = 'failed';
        }
        saveMockDb(db);
      }
    }

  } catch (err: any) {
    console.error('Callback error:', err.message);
  }

  // ALWAYS return 200 to Safaricom
  res.status(200).json({
    ResultCode: 0,
    ResultDesc: 'Accepted'
  });
});

// GET /api/mpesa/status
// Poll payment status
app.get('/api/mpesa/status', async (req, res) => {
  const { checkoutId, propertyId } = req.query;

  if (!checkoutId && !propertyId) {
    return res.status(400).json({
      error: 'Provide checkoutId or propertyId'
    });
  }

  try {
    let payment: any = null;

    if (useRealSupabase) {
      let query = supabaseClient
        .from('listing_payments')
        .select('status, mpesa_code, amount_paid, failure_reason');

      if (checkoutId) {
        query = query.eq('mpesa_checkout_request_id', checkoutId);
      } else {
        query = query.eq('property_id', propertyId)
          .order('created_at', { ascending: false })
          .limit(1);
      }

      const { data, error } = await query.maybeSingle();
      if (!error && data) {
        payment = data;
      }
    } else {
      const db = getMockDb();
      if (checkoutId) {
        payment = db.listing_payments.find(pay => pay.mpesa_checkout_request_id === checkoutId);
      } else {
        const filtered = db.listing_payments.filter(pay => pay.property_id === propertyId);
        if (filtered.length > 0) {
          filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          payment = filtered[0];
        }
      }
    }

    if (!payment) {
      return res.json({ status: 'pending' });
    }

    res.json({
      status: payment.status,
      mpesaCode: payment.mpesa_code || payment.mpesaCode || null,
      amount: payment.amount_paid || payment.amount || null,
      failureReason: payment.failure_reason || payment.rejection_reason || null,
    });

  } catch (err: any) {
    res.json({ status: 'pending' });
  }
});

// ── ADMIN ENDPOINTS ──────────────────────────────────────────────────

// GET /api/admin/payments/pending
app.get('/api/admin/payments/pending', async (req, res) => {
  if (useRealSupabase) {
    try {
      const { data, error } = await supabaseClient
        .from('listing_payments')
        .select('*, landlord:profiles(full_name, phone), property:properties(title, type)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map((p: any) => ({
        id: p.property_id,
        payment_id: p.id,
        title: p.property?.title || "Draft Listing",
        landlord: p.landlord || { full_name: "Unknown", phone: "N/A" },
        amount_paid: p.amount_paid || p.amount,
        mpesa_code: p.mpesa_code,
        mpesa_phone: p.payer_phone,
        payment_status: "pending_verification",
        submitted_at: p.created_at
      }));

      return res.json({ success: true, payments: mapped });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    const pend = db.listing_payments.filter(p => p.status === 'pending');
    const mapped = pend.map(p => {
      const property = db.properties.find(prop => prop.id === p.property_id);
      const landlord = db.profiles.find(prof => prof.id === p.landlord_id) || { full_name: "Mock Landlord", phone: p.payer_phone || "N/A" };
      return {
        id: p.property_id,
        payment_id: p.id,
        title: property?.title || "Draft Listing",
        landlord,
        amount_paid: p.amount_paid || p.amount,
        mpesa_code: p.mpesa_code,
        mpesa_phone: p.payer_phone,
        payment_status: "pending_verification",
        submitted_at: p.created_at
      };
    });

    return res.json({ success: true, payments: mapped });
  }
});

// GET /api/admin/payments/all
app.get('/api/admin/payments/all', async (req, res) => {
  if (useRealSupabase) {
    try {
      const { data, error } = await supabaseClient
        .from('listing_payments')
        .select('*, landlord:profiles(full_name, phone), property:properties(title, type)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.json({ success: true, payments: data });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    const mapped = db.listing_payments.map(p => {
      const property = db.properties.find(prop => prop.id === p.property_id);
      const landlord = db.profiles.find(prof => prof.id === p.landlord_id) || { full_name: "Mock Landlord", phone: p.payer_phone || "N/A" };
      return {
        ...p,
        property,
        landlord
      };
    });
    return res.json({ success: true, payments: mapped });
  }
});

// POST /api/admin/payments/:id/verify (here :id is property_id or payment property_id)
app.post('/api/admin/payments/:id/verify', async (req, res) => {
  const { id } = req.params;
  const { adminNote } = req.body;
  const verifiedAt = new Date().toISOString();

  let property: any = null;
  let landlord: any = null;

  if (useRealSupabase) {
    try {
      // Find property
      const { data: prop, error: pErr } = await supabaseClient
        .from('properties')
        .select('*')
        .eq('id', id)
        .single();
      if (pErr || !prop) return res.status(404).json({ error: "Property not found" });
      property = prop;

      // Update listing payment
      const { error: lpErr } = await supabaseClient
        .from('listing_payments')
        .update({
          status: 'confirmed',
          verified_at: verifiedAt,
          verified_by: 'admin'
        })
        .eq('property_id', id)
        .eq('status', 'pending');

      // Update property
      const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const { error: prErr } = await supabaseClient
        .from('properties')
        .update({
          is_active: true,
          expires_at: expiry
        })
        .eq('id', id);

      if (prErr) throw prErr;

      // Get Landlord Profile
      const { data: prof } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', property.landlord_id)
        .single();
      landlord = prof;
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    const prop = db.properties.find(p => p.id === id);
    if (!prop) return res.status(404).json({ error: "Property not found" });
    property = prop;

    const payment = db.listing_payments.find(p => p.property_id === id && p.status === 'pending');
    if (payment) {
      payment.status = 'confirmed';
      payment.verified_at = verifiedAt;
      payment.verified_by = 'admin';
    }

    const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    prop.is_active = true;
    prop.expires_at = expiry;

    saveMockDb(db);

    landlord = db.profiles.find(p => p.id === property.landlord_id) || { full_name: "Mock Landlord", phone: "N/A" };
  }

  // NOTIFICATION
  const landlordPhone = landlord?.phone || '';
  const landlordEmail = landlord?.email || '';
  const expiryDateFormatted = new Date(property.expires_at || Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-KE', { dateStyle: 'long' });

  // 1. SMS to Landlord
  if (landlordPhone) {
    const landlordSMS = `NestList: ✅ Your listing '${property.title}' is now LIVE! Tenants across Kenya can now see your property. Active for 30 days until ${expiryDateFormatted}. View: ${APP_URL}`;
    await sendSMS(landlordPhone, landlordSMS, 'payment_confirmed');
  }

  // 2. Email to Landlord
  if (landlordEmail) {
    const emailHtml = `
      <h2>✅ Your NestList listing is now LIVE!</h2>
      <p>Dear ${landlord?.full_name || 'Landlord'},</p>
      <p>Congratulations! We have successfully verified your payment.</p>
      <p>Your listing <strong>"${property.title}"</strong> is now live on NestList and visible to thousands of tenants seeking rentals in Kenya.</p>
      <p><strong>Details:</strong></p>
      <ul>
        <li><strong>Property Type:</strong> ${property.type}</li>
        <li><strong>Location:</strong> ${property.location}, ${property.county}</li>
        <li><strong>Monthly Rent:</strong> KES ${property.price.toLocaleString()}</li>
        <li><strong>Expiry Date:</strong> ${expiryDateFormatted}</li>
      </ul>
      <p><a href="${APP_URL}/listings/${property.id}" style="padding: 10px 20px; background-color: #15803d; color: white; text-decoration: none; border-radius: 5px;">View Listing</a></p>
      <p>Thank you for choosing NestList!</p>
    `;
    await sendEmail(landlordEmail, `✅ Your NestList listing is now LIVE!`, emailHtml);
  }

  return res.json({ success: true, message: "Payment verified. Listing is now live." });
});

// POST /api/admin/payments/:id/reject
app.post('/api/admin/payments/:id/reject', async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  if (!reason) {
    return res.status(400).json({ error: "Rejection reason is required" });
  }

  let property: any = null;
  let landlord: any = null;

  if (useRealSupabase) {
    try {
      // Find property
      const { data: prop, error: pErr } = await supabaseClient
        .from('properties')
        .select('*')
        .eq('id', id)
        .single();
      if (pErr || !prop) return res.status(404).json({ error: "Property not found" });
      property = prop;

      // Update payment status
      await supabaseClient
        .from('listing_payments')
        .update({
          status: 'failed',
          rejection_reason: reason
        })
        .eq('property_id', id)
        .eq('status', 'pending');

      // Update property status
      await supabaseClient
        .from('properties')
        .update({
          is_active: false
        })
        .eq('id', id);

      // Fetch landlord
      const { data: prof } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', property.landlord_id)
        .single();
      landlord = prof;
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    const prop = db.properties.find(p => p.id === id);
    if (!prop) return res.status(404).json({ error: "Property not found" });
    property = prop;

    const payment = db.listing_payments.find(p => p.property_id === id && p.status === 'pending');
    if (payment) {
      payment.status = 'failed';
      payment.rejection_reason = reason;
    }

    prop.is_active = false;

    saveMockDb(db);

    landlord = db.profiles.find(p => p.id === property.landlord_id) || { full_name: "Mock Landlord", phone: "N/A" };
  }

  // NOTIFICATION
  const landlordPhone = landlord?.phone || '';
  const landlordEmail = landlord?.email || '';

  // 1. SMS to Landlord
  if (landlordPhone) {
    const landlordSMS = `NestList: ❌ Payment verification for '${property.title}' was unsuccessful. Reason: ${reason}. Please resubmit or contact: ${ADMIN_EMAIL}`;
    await sendSMS(landlordPhone, landlordSMS, 'payment_rejected');
  }

  // 2. Email to Landlord
  if (landlordEmail) {
    const emailHtml = `
      <h2>Payment Verification Issue - ${property.title}</h2>
      <p>Dear ${landlord?.full_name || 'Landlord'},</p>
      <p>Unfortunately, we could not verify your recent payment submission for your property <strong>"${property.title}"</strong>.</p>
      <p><strong>Reason provided:</strong> ${reason}</p>
      <p>Please double-check your payment reference code and submit again in the app, or reply directly to this email for manual assistance.</p>
      <p>Best regards,<br>NestList Admin Team</p>
    `;
    await sendEmail(landlordEmail, `Payment Verification Issue - ${property.title}`, emailHtml);
  }

  return res.json({ success: true, message: "Payment rejected." });
});

// GET /api/admin/stats
app.get('/api/admin/stats', async (req, res) => {
  if (useRealSupabase) {
    try {
      const { data: listings } = await supabaseClient.from('properties').select('*');
      const { data: payments } = await supabaseClient.from('listing_payments').select('*');
      const { data: users } = await supabaseClient.from('profiles').select('*');
      const { data: boosts } = await supabaseClient.from('listing_boosts').select('*');
      const { data: unlocks } = await supabaseClient.from('lead_unlocks').select('*');

      const totalListings = listings?.length || 0;
      const activeListings = listings?.filter((l: any) => l.is_active).length || 0;
      const pendingPayments = payments?.filter((p: any) => p.status === 'pending').length || 0;
      const totalUsers = users?.length || 0;

      const confirmedPayments = payments?.filter((p: any) => p.status === 'confirmed') || [];
      const listingRevenue = confirmedPayments.reduce((acc: number, cur: any) => acc + (cur.amount_paid || cur.amount || 0), 0);

      const confirmedBoosts = boosts?.filter((b: any) => b.status === 'active' || b.status === 'expired') || [];
      const boostRevenue = confirmedBoosts.reduce((acc: number, cur: any) => acc + (cur.amount_paid || 0), 0);

      const confirmedUnlocks = unlocks?.filter((u: any) => u.status === 'confirmed') || [];
      const leadRevenue = confirmedUnlocks.reduce((acc: number, cur: any) => acc + (cur.amount_paid || 0), 0);

      const totalRevenue = listingRevenue + boostRevenue + leadRevenue;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const monthlyPayments = confirmedPayments.filter((p: any) => new Date(p.created_at) >= thirtyDaysAgo);
      const monthlyRevenue = monthlyPayments.reduce((acc: number, cur: any) => acc + (cur.amount_paid || cur.amount || 0), 0);

      const recentPayments = payments?.slice(0, 10) || [];

      const listingsByType: Record<string, number> = {};
      const listingsByCounty: Record<string, number> = {};

      listings?.forEach((l: any) => {
        listingsByType[l.type] = (listingsByType[l.type] || 0) + 1;
        listingsByCounty[l.county] = (listingsByCounty[l.county] || 0) + 1;
      });

      return res.json({
        totalListings,
        activeListings,
        pendingPayments,
        totalUsers,
        totalRevenue,
        monthlyRevenue,
        listingRevenue,
        boostRevenue,
        leadRevenue,
        recentPayments,
        listingsByType,
        listingsByCounty
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    const totalListings = db.properties.length;
    const activeListings = db.properties.filter(p => p.is_active).length;
    const pendingPayments = db.listing_payments.filter(p => p.status === 'pending').length;
    const totalUsers = db.profiles.length;

    const confirmedPayments = db.listing_payments.filter(p => p.status === 'confirmed');
    const listingRevenue = confirmedPayments.reduce((acc, p) => acc + (p.amount_paid || p.amount), 0);

    const confirmedBoosts = db.listing_boosts.filter(b => b.status === 'active' || b.status === 'expired');
    const boostRevenue = confirmedBoosts.reduce((acc, b) => acc + (b.amount_paid || 0), 0);

    const confirmedUnlocks = db.lead_unlocks.filter(u => u.status === 'confirmed');
    const leadRevenue = confirmedUnlocks.reduce((acc, u) => acc + (u.amount_paid || 0), 0);

    const totalRevenue = listingRevenue + boostRevenue + leadRevenue;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const monthlyPayments = confirmedPayments.filter(p => new Date(p.created_at) >= thirtyDaysAgo);
    const monthlyRevenue = monthlyPayments.reduce((acc, p) => acc + (p.amount_paid || p.amount), 0);

    const recentPayments = db.listing_payments.slice().reverse().slice(0, 10);

    const listingsByType: Record<string, number> = {};
    const listingsByCounty: Record<string, number> = {};

    db.properties.forEach(l => {
      listingsByType[l.type] = (listingsByType[l.type] || 0) + 1;
      listingsByCounty[l.county] = (listingsByCounty[l.county] || 0) + 1;
    });

    return res.json({
      totalListings,
      activeListings,
      pendingPayments,
      totalUsers,
      totalRevenue,
      monthlyRevenue,
      listingRevenue,
      boostRevenue,
      leadRevenue,
      recentPayments,
      listingsByType,
      listingsByCounty
    });
  }
});

// GET /api/admin/listings
app.get('/api/admin/listings', async (req, res) => {
  if (useRealSupabase) {
    try {
      const { data, error } = await supabaseClient
        .from('properties')
        .select('*, landlord:profiles(full_name, phone, email)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.json({ success: true, listings: data });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    const mapped = db.properties.map(p => {
      const landlord = db.profiles.find(prof => prof.id === p.landlord_id) || { full_name: "Mock Landlord", phone: "N/A" };
      return {
        ...p,
        landlord
      };
    });
    return res.json({ success: true, listings: mapped });
  }
});

// POST /api/admin/listings/:id/suspend
app.post('/api/admin/listings/:id/suspend', async (req, res) => {
  const { id } = req.params;

  let property: any = null;
  let landlord: any = null;

  if (useRealSupabase) {
    try {
      const { data: prop } = await supabaseClient.from('properties').update({ is_active: false }).eq('id', id).select().single();
      property = prop;
      const { data: prof } = await supabaseClient.from('profiles').select('*').eq('id', property.landlord_id).single();
      landlord = prof;
    } catch (_) {}
  } else {
    const db = getMockDb();
    const prop = db.properties.find(p => p.id === id);
    if (prop) {
      prop.is_active = false;
      property = prop;
      landlord = db.profiles.find(p => p.id === prop.landlord_id);
    }
    saveMockDb(db);
  }

  if (landlord?.phone) {
    await sendSMS(landlord.phone, `NestList: Your property listing '${property?.title || 'listing'}' has been suspended by our administration.`, 'listing_suspended');
  }

  return res.json({ success: true, message: "Listing has been suspended" });
});

// POST /api/admin/listings/:id/restore
app.post('/api/admin/listings/:id/restore', async (req, res) => {
  const { id } = req.params;

  let property: any = null;
  let landlord: any = null;

  if (useRealSupabase) {
    try {
      const { data: prop } = await supabaseClient.from('properties').update({ is_active: true }).eq('id', id).select().single();
      property = prop;
      const { data: prof } = await supabaseClient.from('profiles').select('*').eq('id', property.landlord_id).single();
      landlord = prof;
    } catch (_) {}
  } else {
    const db = getMockDb();
    const prop = db.properties.find(p => p.id === id);
    if (prop) {
      prop.is_active = true;
      property = prop;
      landlord = db.profiles.find(p => p.id === prop.landlord_id);
    }
    saveMockDb(db);
  }

  if (landlord?.phone) {
    await sendSMS(landlord.phone, `NestList: Your property listing '${property?.title || 'listing'}' has been restored and is now active.`, 'listing_restored');
  }

  return res.json({ success: true, message: "Listing has been restored" });
});

// GET /api/admin/users
app.get('/api/admin/users', async (req, res) => {
  if (useRealSupabase) {
    try {
      const { data: profiles, error } = await supabaseClient.from('profiles').select('*').order('created_at', { ascending: false });
      if (error) throw error;

      const { data: properties } = await supabaseClient.from('properties').select('id, landlord_id');

      const mapped = (profiles || []).map((user: any) => {
        const count = properties?.filter((p: any) => p.landlord_id === user.id).length || 0;
        return {
          ...user,
          listing_count: count
        };
      });

      return res.json({ success: true, users: mapped });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    const mapped = db.profiles.map(user => {
      const count = db.properties.filter(p => p.landlord_id === user.id).length;
      return {
        ...user,
        listing_count: count
      };
    });
    return res.json({ success: true, users: mapped });
  }
});

// POST /api/admin/users/:id/suspend
app.post('/api/admin/users/:id/suspend', async (req, res) => {
  const { id } = req.params;
  if (useRealSupabase) {
    await supabaseClient.from('profiles').update({ is_active: false }).eq('id', id);
  } else {
    const db = getMockDb();
    const u = db.profiles.find(p => p.id === id);
    if (u) u.is_active = false;
    saveMockDb(db);
  }
  return res.json({ success: true, message: "User profile suspended" });
});

// POST /api/admin/users/:id/restore
app.post('/api/admin/users/:id/restore', async (req, res) => {
  const { id } = req.params;
  if (useRealSupabase) {
    await supabaseClient.from('profiles').update({ is_active: true }).eq('id', id);
  } else {
    const db = getMockDb();
    const u = db.profiles.find(p => p.id === id);
    if (u) u.is_active = true;
    saveMockDb(db);
  }
  return res.json({ success: true, message: "User profile restored" });
});

// ── INQUIRIES ENDPOINTS ──────────────────────────────────────────────

const LEAD_PRICES: Record<string, number> = {
  single_room: 25,
  bedsitter:   50,
  studio:      60,
  '1br':       120,
  '2br':       160,
  '3br':       220,
  '4br':       260,
  '5br_plus':  300,
};

// POST /api/inquiries
app.post('/api/inquiries', async (req, res) => {
  const { propertyId, landlordId, message, tenantName, tenantPhone, tenantEmail, tenantId } = req.body;

  if (!propertyId || !landlordId || !message || !tenantName || !tenantPhone) {
    return res.status(400).json({ error: "Missing required inquiry fields" });
  }

  let propertyTitle = 'property';
  let isLocked = false;
  let unlockPrice = null;

  if (useRealSupabase) {
    try {
      // Get property details
      const { data: prop } = await supabaseClient.from('properties').select('title, type, payment_model, listing_model').eq('id', propertyId).single();
      if (prop) {
        propertyTitle = prop.title;
        isLocked = prop.payment_model === 'pay_per_inquiry' || prop.listing_model === 'pay_per_lead';
        unlockPrice = isLocked ? (LEAD_PRICES[prop.type] || 50) : null;
      }

      await supabaseClient.from('inquiries').insert({
        property_id: propertyId,
        landlord_id: landlordId,
        tenant_id: tenantId || null,
        message,
        tenant_name: tenantName,
        tenant_phone: tenantPhone,
        tenant_email: tenantEmail || null,
        status: 'pending',
        is_unlocked: !isLocked,
        is_locked: isLocked,
        unlock_price: unlockPrice
      });

      // Update count on properties
      const { data: currentProp } = await supabaseClient.from('properties').select('inquiry_count').eq('id', propertyId).single();
      await supabaseClient.from('properties').update({ inquiry_count: (currentProp?.inquiry_count || 0) + 1 }).eq('id', propertyId);

    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    const prop = db.properties.find(p => p.id === propertyId);
    if (prop) {
      propertyTitle = prop.title;
      prop.inquiry_count = (prop.inquiry_count || 0) + 1;
      isLocked = prop.listing_model === 'pay_per_lead';
      unlockPrice = isLocked ? (LEAD_PRICES[prop.type] || 50) : null;
    }

    const inquiry = {
      id: `inq-${Date.now()}`,
      property_id: propertyId,
      landlord_id: landlordId,
      tenant_id: tenantId || null,
      message,
      tenant_name: tenantName,
      tenant_phone: tenantPhone,
      tenant_email: tenantEmail || null,
      status: 'pending',
      is_locked: isLocked,
      unlock_price: unlockPrice,
      created_at: new Date().toISOString()
    };

    db.inquiries.push(inquiry);
    saveMockDb(db);
  }

  // SMS to landlord
  let landlordPhone = '';
  if (useRealSupabase) {
    const { data } = await supabaseClient.from('profiles').select('phone').eq('id', landlordId).single();
    if (data) landlordPhone = data.phone;
  } else {
    const db = getMockDb();
    const l = db.profiles.find(p => p.id === landlordId);
    if (l) landlordPhone = l.phone;
  }

  if (landlordPhone) {
    const inqMsg = isLocked
      ? `NestList: 🔒 New inquiry for '${propertyTitle}'! Unlock the tenant's contact for KES ${unlockPrice}. nestlist.co.ke/dashboard`
      : `NestList: ${tenantName} is interested in your property '${propertyTitle}'. Phone: ${tenantPhone}. Login to reply: ${APP_URL}/dashboard`;
    await sendSMS(landlordPhone, inqMsg, 'inquiry_received');
  }

  return res.json({ success: true, message: "Inquiry sent successfully" });
});

// POST /api/inquiries/:id/unlock - Atomic lead unlock RPC wrapper for landlords
app.post('/api/inquiries/:id/unlock', async (req, res) => {
  const { id } = req.params;
  const { landlordId } = req.body;

  if (!landlordId) {
    return res.status(401).json({ success: false, error: "Landlord ID required" });
  }

  if (useRealSupabase) {
    try {
      const { data, error } = await supabaseClient.rpc('unlock_lead', {
        p_enquiry_id: id,
        p_landlord_id: landlordId
      });

      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }

      if (data && data.success === false) {
        return res.status(data.code === 'INSUFFICIENT_CREDITS' ? 402 : 400).json(data);
      }

      return res.json(data);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  } else {
    const db = getMockDb();
    const inq = db.inquiries.find((i: any) => i.id === id);
    if (!inq) return res.status(404).json({ success: false, error: "Enquiry not found" });

    const landlord = db.profiles.find((p: any) => p.id === landlordId);
    if (!landlord) return res.status(404).json({ success: false, error: "Landlord profile not found" });

    if (inq.is_unlocked || !inq.is_locked) {
      return res.json({
        success: true,
        already_unlocked: true,
        inquiry_id: id,
        tenant_name: inq.tenant_name,
        tenant_phone: inq.tenant_phone,
        tenant_email: inq.tenant_email,
        message_text: inq.message
      });
    }

    const credits = Number(landlord.lead_credits || 0);
    if (credits < 1) {
      return res.status(402).json({
        success: false,
        error: "Insufficient lead credits. Please top up your Unlock Leads bundle.",
        code: "INSUFFICIENT_CREDITS"
      });
    }

    landlord.lead_credits = credits - 1;
    inq.is_unlocked = true;
    inq.is_locked = false;
    inq.unlocked_at = new Date().toISOString();

    db.credit_transactions.push({
      id: `ctx-${Date.now()}`,
      landlord_id: landlordId,
      property_id: inq.property_id,
      credits_added: -1,
      type: 'lead_spent',
      notes: `Unlocked lead enquiry ${id}`,
      created_at: new Date().toISOString()
    });

    saveMockDb(db);

    return res.json({
      success: true,
      inquiry_id: id,
      tenant_name: inq.tenant_name,
      tenant_phone: inq.tenant_phone,
      tenant_email: inq.tenant_email,
      message_text: inq.message,
      remaining_credits: landlord.lead_credits
    });
  }
});

// GET /api/inquiries/landlord/:landlordId
app.get('/api/inquiries/landlord/:landlordId', async (req, res) => {
  const { landlordId } = req.params;

  if (useRealSupabase) {
    try {
      const { data, error } = await supabaseClient
        .from('inquiries')
        .select('*, property:properties(title)')
        .eq('landlord_id', landlordId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Mask details for locked inquiries securely
      const mapped = (data || []).map((i: any) => {
        if (i.is_locked) {
          return {
            ...i,
            tenant_name: "●●●●● ●●●●●",
            tenant_phone: "+254 ●●● ●●● ●●●",
            tenant_email: "●●●@●●●.●●●",
            message: i.message ? i.message.slice(0, 20) + "..." : "I am interested in..."
          };
        }
        return i;
      });

      return res.json({ success: true, inquiries: mapped });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    const filtered = db.inquiries.filter(i => i.landlord_id === landlordId);
    const mapped = filtered.map(i => {
      const property = db.properties.find(p => p.id === i.property_id);
      if (i.is_locked) {
        return {
          ...i,
          property,
          tenant_name: "●●●●● ●●●●●",
          tenant_phone: "+254 ●●● ●●● ●●●",
          tenant_email: "●●●@●●●.●●●",
          message: i.message ? i.message.slice(0, 20) + "..." : "I am interested in..."
        };
      }
      return {
        ...i,
        property
      };
    });
    return res.json({ success: true, inquiries: mapped.reverse() });
  }
});

// POST /api/inquiries/:id/reply
app.post('/api/inquiries/:id/reply', async (req, res) => {
  const { id } = req.params;
  const { reply } = req.body;

  if (!reply) {
    return res.status(400).json({ error: "Reply text is required" });
  }

  let inquiry: any = null;
  let propertyTitle = 'property';

  if (useRealSupabase) {
    try {
      const { data, error } = await supabaseClient
        .from('inquiries')
        .update({
          reply,
          replied_at: new Date().toISOString(),
          status: 'responded'
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      inquiry = data;

      const { data: prop } = await supabaseClient.from('properties').select('title').eq('id', inquiry.property_id).single();
      if (prop) propertyTitle = prop.title;
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    const idx = db.inquiries.findIndex(i => i.id === id);
    if (idx === -1) return res.status(404).json({ error: "Inquiry not found" });

    db.inquiries[idx] = {
      ...db.inquiries[idx],
      reply,
      replied_at: new Date().toISOString(),
      status: 'responded'
    };
    inquiry = db.inquiries[idx];

    const prop = db.properties.find(p => p.id === inquiry.property_id);
    if (prop) propertyTitle = prop.title;

    saveMockDb(db);
  }

  // SMS to Tenant
  if (inquiry?.tenant_phone) {
    const replySMS = `NestList: The landlord has replied to your inquiry about '${propertyTitle}'. Login to view: ${APP_URL}`;
    await sendSMS(inquiry.tenant_phone, replySMS, 'inquiry_replied');
  }

  return res.json({ success: true, message: "Reply submitted" });
});

// ── PROFILES ENDPOINTS ───────────────────────────────────────────────

// GET /api/profiles/:id
app.get('/api/profiles/:id', async (req, res) => {
  const { id } = req.params;

  if (useRealSupabase) {
    try {
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return res.json({ success: true, profile: data || null });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    const profile = db.profiles.find(p => p.id === id);
    return res.json({ success: true, profile: profile || null });
  }
});

// POST /api/profiles (Upsert)
app.post('/api/profiles', async (req, res) => {
  const { id, full_name, phone, email, role } = req.body;

  if (!id) return res.status(400).json({ error: "User ID is required" });

  if (useRealSupabase) {
    try {
      const { data, error } = await supabaseClient
        .from('profiles')
        .upsert({
          id,
          full_name,
          phone,
          email,
          role: role || 'tenant',
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return res.json({ success: true, profile: data });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    const idx = db.profiles.findIndex(p => p.id === id);
    const profile = {
      id,
      full_name,
      phone,
      email,
      role: role || 'tenant',
      is_active: true,
      created_at: idx !== -1 ? db.profiles[idx].created_at : new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (idx !== -1) {
      db.profiles[idx] = profile;
    } else {
      db.profiles.push(profile);
    }
    saveMockDb(db);

    // Send Welcome SMS
    const welcomeSMS = `Welcome to NestList! Your ${profile.role} profile is ready. Browse and discover rental properties in Kenya seamlessly.`;
    await sendSMS(phone || '', welcomeSMS, `welcome_${profile.role}`);

    return res.json({ success: true, profile });
  }
});

// PUT /api/profiles/:id
app.put('/api/profiles/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  if (useRealSupabase) {
    try {
      const { data, error } = await supabaseClient
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return res.json({ success: true, profile: data });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    const idx = db.profiles.findIndex(p => p.id === id);
    if (idx === -1) return res.status(404).json({ error: "Profile not found" });

    db.profiles[idx] = {
      ...db.profiles[idx],
      ...updates,
      updated_at: new Date().toISOString()
    };
    saveMockDb(db);

    return res.json({ success: true, profile: db.profiles[idx] });
  }
});

// ── SAVED PROPERTIES ENDPOINTS ───────────────────────────────────────

// GET /api/saved/:tenantId
app.get('/api/saved/:tenantId', async (req, res) => {
  const { tenantId } = req.params;

  if (useRealSupabase) {
    try {
      const { data, error } = await supabaseClient
        .from('saved_properties')
        .select('*, property:properties(*)')
        .eq('tenant_id', tenantId);

      if (error) throw error;
      const listings = (data || []).map((d: any) => d.property).filter(Boolean);
      return res.json({ success: true, listings });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    const saved = db.saved_properties.filter(s => s.tenant_id === tenantId);
    const listings = saved.map(s => db.properties.find(p => p.id === s.property_id)).filter(Boolean);
    return res.json({ success: true, listings });
  }
});

// POST /api/saved
app.post('/api/saved', async (req, res) => {
  const { tenantId, propertyId } = req.body;

  if (!tenantId || !propertyId) return res.status(400).json({ error: "Missing required fields" });

  if (useRealSupabase) {
    try {
      const { data, error } = await supabaseClient
        .from('saved_properties')
        .insert({ tenant_id: tenantId, property_id: propertyId })
        .select()
        .single();

      if (error && error.code !== '23505') throw error;
      return res.json({ success: true, saved: data });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    const dup = db.saved_properties.find(s => s.tenant_id === tenantId && s.property_id === propertyId);
    if (dup) return res.json({ success: true, saved: dup });

    const saved = {
      id: `save-${Date.now()}`,
      tenant_id: tenantId,
      property_id: propertyId,
      created_at: new Date().toISOString()
    };
    db.saved_properties.push(saved);
    saveMockDb(db);

    return res.json({ success: true, saved });
  }
});

// ── MONETIZATION ENDPOINTS (BOOSTS & LEADS) ───────────────────────────

// POST /api/boost/pay
app.post('/api/boost/pay', async (req, res) => {
  const { propertyId, landlordId, boostTier, amount, paymentMethod, mpesaCode, phone } = req.body;

  if (!propertyId || !landlordId || !boostTier || !amount || !paymentMethod) {
    return res.status(400).json({ error: "Missing required fields for boost" });
  }

  const id = `bst-${Date.now()}`;

  if (paymentMethod === 'stk_push') {
    if (!phone) return res.status(400).json({ error: "Phone number required for STK push" });
    try {
      const token = await getMpesaToken();
      const ts = mpesaTimestamp();
      const pwd = mpesaPassword(ts);
      const tel = formatPhone(phone);

      const stkRes = await axios.post(
        `${MPESA_BASE}/mpesa/stkpush/v1/processrequest`,
        {
          BusinessShortCode: MPESA_SHORTCODE,
          Password: pwd,
          Timestamp: ts,
          TransactionType: 'CustomerPayBillOnline',
          Amount: Math.ceil(amount),
          PartyA: tel,
          PartyB: MPESA_SHORTCODE,
          PhoneNumber: tel,
          CallBackURL: CALLBACK_URL,
          AccountReference: 'BOOST-' + propertyId.slice(0, 8).toUpperCase(),
          TransactionDesc: `NestList Boost: ${boostTier}`,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const d = stkRes.data;
      if (d.ResponseCode !== '0') {
        throw new Error(d.ResponseDescription || d.errorMessage || 'STK Push failed');
      }

      if (useRealSupabase) {
        await supabaseClient.from('listing_boosts').insert({
          property_id: propertyId,
          landlord_id: landlordId,
          boost_tier: boostTier,
          amount_paid: amount,
          status: 'pending',
          mpesa_checkout_request_id: d.CheckoutRequestID,
          payment_method: 'stk_push'
        });
      } else {
        const db = getMockDb();
        db.listing_boosts.push({
          id,
          property_id: propertyId,
          landlord_id: landlordId,
          boost_tier: boostTier,
          amount_paid: amount,
          status: 'pending',
          mpesa_checkout_request_id: d.CheckoutRequestID,
          payment_method: 'stk_push',
          created_at: new Date().toISOString()
        });
        saveMockDb(db);
      }

      return res.json({ success: true, checkoutId: d.CheckoutRequestID, boostId: id, message: "STK Push sent!" });
    } catch (err: any) {
      console.error('Boost STK Push error:', err.response?.data || err.message);
      return res.status(500).json({ error: err.message });
    }
  } else {
    // Manual payment
    if (useRealSupabase) {
      try {
        const { data, error } = await supabaseClient.from('listing_boosts').insert({
          property_id: propertyId,
          landlord_id: landlordId,
          boost_tier: boostTier,
          amount_paid: amount,
          status: 'pending',
          mpesa_code: mpesaCode || null,
          payment_method: 'manual'
        }).select().single();
        if (error) throw error;
        return res.json({ success: true, boostId: data.id });
      } catch (err: any) {
        return res.status(500).json({ error: err.message });
      }
    } else {
      const db = getMockDb();
      db.listing_boosts.push({
        id,
        property_id: propertyId,
        landlord_id: landlordId,
        boost_tier: boostTier,
        amount_paid: amount,
        status: 'pending',
        mpesa_code: mpesaCode || null,
        payment_method: 'manual',
        created_at: new Date().toISOString()
      });
      saveMockDb(db);
      return res.json({ success: true, boostId: id });
    }
  }
});

// POST /api/boost/:id/confirm
app.post('/api/boost/:id/confirm', async (req, res) => {
  const { id } = req.params;

  if (useRealSupabase) {
    try {
      const { data: boost, error: bErr } = await supabaseClient
        .from('listing_boosts')
        .select('*, property:properties(title)')
        .eq('id', id)
        .single();
      if (bErr || !boost) throw new Error("Boost not found");

      const durationDays = boost.boost_tier === '3day' ? 3 : boost.boost_tier === '7day' ? 7 : boost.boost_tier === '14day' ? 14 : boost.boost_tier === '30day' ? 30 : 7;
      const startsAt = new Date().toISOString();
      const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
      const badgeText = boost.boost_tier === '3day' ? '⚡ Featured' : boost.boost_tier === '7day' ? '⭐ Featured' : boost.boost_tier === '14day' ? '🔥 Hot Property' : '👑 Premium';

      await supabaseClient.from('listing_boosts').update({
        status: 'active',
        starts_at: startsAt,
        expires_at: expiresAt
      }).eq('id', id);

      await supabaseClient.from('properties').update({
        is_boosted: true,
        boost_tier: boost.boost_tier,
        boost_expires_at: expiresAt,
        boost_badge: badgeText
      }).eq('id', boost.property_id);

      // Fetch landlord phone to notify
      const { data: profile } = await supabaseClient.from('profiles').select('phone').eq('id', boost.landlord_id).single();
      if (profile?.phone) {
        await sendSMS(
          profile.phone,
          `NestList: 🚀 Your listing '${boost.property?.title}' is now BOOSTED! It appears at the top of search results for ${durationDays} days. nestlist.co.ke`,
          'boost_activated'
        );
      }

      return res.json({ success: true, message: "Boost activated successfully" });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    const idx = db.listing_boosts.findIndex(b => b.id === id);
    if (idx === -1) return res.status(404).json({ error: "Boost not found" });

    const boost = db.listing_boosts[idx];
    const durationDays = boost.boost_tier === '3day' ? 3 : boost.boost_tier === '7day' ? 7 : boost.boost_tier === '14day' ? 14 : boost.boost_tier === '30day' ? 30 : 7;
    const startsAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
    const badgeText = boost.boost_tier === '3day' ? '⚡ Featured' : boost.boost_tier === '7day' ? '⭐ Featured' : boost.boost_tier === '14day' ? '🔥 Hot Property' : '👑 Premium';

    boost.status = 'active';
    boost.starts_at = startsAt;
    boost.expires_at = expiresAt;

    const prop = db.properties.find(p => p.id === boost.property_id);
    if (prop) {
      prop.is_boosted = true;
      prop.boost_tier = boost.boost_tier;
      prop.boost_expires_at = expiresAt;
      prop.boost_badge = badgeText;
    }

    const landlord = db.profiles.find(p => p.id === boost.landlord_id);
    if (landlord?.phone) {
      await sendSMS(
        landlord.phone,
        `NestList: 🚀 Your listing '${prop?.title || "Property"}' is now BOOSTED! It appears at the top of search results for ${durationDays} days. nestlist.co.ke`,
        'boost_activated'
      );
    }

    saveMockDb(db);
    return res.json({ success: true, message: "Boost activated successfully" });
  }
});

// POST /api/boost/:id/reject
app.post('/api/boost/:id/reject', async (req, res) => {
  const { id } = req.params;
  if (useRealSupabase) {
    try {
      await supabaseClient.from('listing_boosts').update({ status: 'cancelled' }).eq('id', id);
      return res.json({ success: true, message: "Boost rejected" });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    const b = db.listing_boosts.find(b => b.id === id);
    if (b) b.status = 'cancelled';
    saveMockDb(db);
    return res.json({ success: true, message: "Boost rejected" });
  }
});

// GET /api/boost/status
app.get('/api/boost/status', async (req, res) => {
  const { boostId } = req.query;
  if (!boostId) return res.status(400).json({ error: "Missing boostId" });

  if (useRealSupabase) {
    try {
      const { data, error } = await supabaseClient.from('listing_boosts').select('*').eq('id', boostId).single();
      if (error) throw error;
      return res.json({ success: true, status: data.status, expiresAt: data.expires_at });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    const boost = db.listing_boosts.find(b => b.id === boostId);
    if (!boost) return res.status(404).json({ error: "Boost not found" });
    return res.json({ success: true, status: boost.status, expiresAt: boost.expires_at });
  }
});

// TODO: Review for removal or refactoring in a follow-up. This route appears to be dead/unused code implementing a different unlock flow than the direct Supabase / RPC / /api/inquiries/:id/unlock flows used by the frontend.
// POST /api/leads/unlock
app.post('/api/leads/unlock', async (req, res) => {
  const { inquiryId, propertyId, landlordId, amount, paymentMethod, mpesaCode, bundleSize, phone } = req.body;

  if (!propertyId || !landlordId || !paymentMethod) {
    return res.status(400).json({ error: "Missing required fields for unlock" });
  }

  const id = `unl-${Date.now()}`;
  const isBundle = bundleSize === 5;

  if (paymentMethod === 'credit') {
    // Deduct credit
    if (useRealSupabase) {
      try {
        const { data: prop, error: pErr } = await supabaseClient.from('properties').select('lead_credits, title').eq('id', propertyId).single();
        if (pErr || !prop) throw new Error("Property not found");

        if ((prop.lead_credits || 0) < 1) {
          return res.status(400).json({ error: "Insufficient lead credits available." });
        }

        const newCredits = prop.lead_credits - 1;
        await supabaseClient.from('properties').update({ lead_credits: newCredits }).eq('id', propertyId);

        // Update inquiry
        if (inquiryId) {
          await supabaseClient.from('inquiries').update({ is_unlocked: true, is_locked: false, unlocked_at: new Date().toISOString() }).eq('id', inquiryId);
        }

        // Create confirmed unlock record
        await supabaseClient.from('lead_unlocks').insert({
          property_id: propertyId,
          landlord_id: landlordId,
          inquiry_id: inquiryId || null,
          amount_paid: 0,
          status: 'confirmed',
          payment_method: 'credit',
          unlocked_at: new Date().toISOString()
        });

        // Send SMS confirmation
        const { data: profile } = await supabaseClient.from('profiles').select('phone').eq('id', landlordId).single();
        if (profile?.phone) {
          await sendSMS(
            profile.phone,
            `NestList: 🔓 Lead unlocked! View tenant contact at nestlist.co.ke/dashboard`,
            'lead_unlocked'
          );
        }

        // Return newly unmasked inquiry
        let inquiryData = null;
        if (inquiryId) {
          const { data: inq } = await supabaseClient.from('inquiries').select('*').eq('id', inquiryId).single();
          inquiryData = inq;
        }

        return res.json({ success: true, message: "Lead unlocked with credits", inquiry: inquiryData });
      } catch (err: any) {
        return res.status(500).json({ error: err.message });
      }
    } else {
      const db = getMockDb();
      const propIdx = db.properties.findIndex(p => p.id === propertyId);
      if (propIdx === -1) return res.status(404).json({ error: "Property not found" });

      const prop = db.properties[propIdx];
      if ((prop.lead_credits || 0) < 1) {
        return res.status(400).json({ error: "Insufficient lead credits available." });
      }

      prop.lead_credits = prop.lead_credits - 1;

      if (inquiryId) {
        const inq = db.inquiries.find(i => i.id === inquiryId);
        if (inq) {
          inq.is_unlocked = true;
          inq.is_locked = false;
          inq.unlocked_at = new Date().toISOString();
        }
      }

      db.lead_unlocks.push({
        id,
        property_id: propertyId,
        landlord_id: landlordId,
        inquiry_id: inquiryId || null,
        amount_paid: 0,
        status: 'confirmed',
        payment_method: 'credit',
        unlocked_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      });

      const landlord = db.profiles.find(p => p.id === landlordId);
      if (landlord?.phone) {
        await sendSMS(
          landlord.phone,
          `NestList: 🔓 Lead unlocked! View tenant contact at nestlist.co.ke/dashboard`,
          'lead_unlocked'
        );
      }

      saveMockDb(db);
      const inquiryData = inquiryId ? db.inquiries.find(i => i.id === inquiryId) : null;
      return res.json({ success: true, message: "Lead unlocked with credits", inquiry: inquiryData });
    }
  } else if (paymentMethod === 'stk_push') {
    if (!phone) return res.status(400).json({ error: "Phone number required for STK push" });
    try {
      const token = await getMpesaToken();
      const ts = mpesaTimestamp();
      const pwd = mpesaPassword(ts);
      const tel = formatPhone(phone);

      const stkRes = await axios.post(
        `${MPESA_BASE}/mpesa/stkpush/v1/processrequest`,
        {
          BusinessShortCode: MPESA_SHORTCODE,
          Password: pwd,
          Timestamp: ts,
          TransactionType: 'CustomerPayBillOnline',
          Amount: Math.ceil(amount),
          PartyA: tel,
          PartyB: MPESA_SHORTCODE,
          PhoneNumber: tel,
          CallBackURL: CALLBACK_URL,
          AccountReference: (isBundle ? 'BNDL-' : 'LEAD-') + propertyId.slice(0, 8).toUpperCase(),
          TransactionDesc: `NestList Lead Unlock`,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const d = stkRes.data;
      if (d.ResponseCode !== '0') {
        throw new Error(d.ResponseDescription || d.errorMessage || 'STK Push failed');
      }

      if (useRealSupabase) {
        await supabaseClient.from('lead_unlocks').insert({
          property_id: propertyId,
          landlord_id: landlordId,
          inquiry_id: inquiryId || null,
          amount_paid: amount,
          bundle_size: bundleSize || 1,
          status: 'pending',
          mpesa_checkout_request_id: d.CheckoutRequestID,
          payment_method: 'stk_push'
        });
      } else {
        const db = getMockDb();
        db.lead_unlocks.push({
          id,
          property_id: propertyId,
          landlord_id: landlordId,
          inquiry_id: inquiryId || null,
          amount_paid: amount,
          bundle_size: bundleSize || 1,
          status: 'pending',
          mpesa_checkout_request_id: d.CheckoutRequestID,
          payment_method: 'stk_push',
          created_at: new Date().toISOString()
        });
        saveMockDb(db);
      }

      return res.json({ success: true, checkoutId: d.CheckoutRequestID, unlockId: id, message: "STK Push sent!" });
    } catch (err: any) {
      console.error('Lead Unlock STK error:', err.response?.data || err.message);
      return res.status(500).json({ error: err.message });
    }
  } else {
    // Manual Payment
    if (useRealSupabase) {
      try {
        const { data, error } = await supabaseClient.from('lead_unlocks').insert({
          property_id: propertyId,
          landlord_id: landlordId,
          inquiry_id: inquiryId || null,
          amount_paid: amount,
          bundle_size: bundleSize || 1,
          status: 'pending',
          mpesa_code: mpesaCode || null,
          payment_method: 'manual'
        }).select().single();
        if (error) throw error;
        return res.json({ success: true, unlockId: data.id });
      } catch (err: any) {
        return res.status(500).json({ error: err.message });
      }
    } else {
      const db = getMockDb();
      db.lead_unlocks.push({
        id,
        property_id: propertyId,
        landlord_id: landlordId,
        inquiry_id: inquiryId || null,
        amount_paid: amount,
        bundle_size: bundleSize || 1,
        status: 'pending',
        mpesa_code: mpesaCode || null,
        payment_method: 'manual',
        created_at: new Date().toISOString()
      });
      saveMockDb(db);
      return res.json({ success: true, unlockId: id });
    }
  }
});

// Helper for atomic payment confirmation & credit issuance
export async function processLeadUnlockConfirmation(unlockId: string, mpesaCode?: string) {
  if (useRealSupabase) {
    // 1. Attempt atomic RPC stored procedure
    try {
      const { data: rpcData, error: rpcErr } = await supabaseClient.rpc(
        'confirm_lead_unlock_and_issue_credits',
        { p_unlock_id: unlockId, p_mpesa_code: mpesaCode || null }
      );
      if (!rpcErr && rpcData?.success) {
        return rpcData;
      }
    } catch (e) {
      console.warn("RPC confirm_lead_unlock_and_issue_credits failed or unavailable, using JS transaction fallback:", e);
    }

    // 2. JS Fallback with atomic state updates
    const { data: unlock, error: uErr } = await supabaseClient
      .from('lead_unlocks')
      .select('*, property:properties(id, title, lead_credits)')
      .eq('id', unlockId)
      .single();

    if (uErr || !unlock) throw new Error("Unlock record not found");

    const amountPaid = Number(unlock.amount_paid || 0);
    const bundleSize = Number(unlock.bundle_size || 1);
    const isBundle = bundleSize > 1 || amountPaid >= 200 || !unlock.inquiry_id;
    const creditsToAdd = isBundle ? (unlock.credits_added > 0 ? unlock.credits_added : (bundleSize > 1 ? bundleSize : 5)) : 0;

    // Update lead_unlocks
    const { error: updErr } = await supabaseClient
      .from('lead_unlocks')
      .update({
        status: 'confirmed',
        credits_added: creditsToAdd,
        mpesa_code: mpesaCode || unlock.mpesa_code || null,
        unlocked_at: new Date().toISOString()
      })
      .eq('id', unlockId);

    if (updErr) throw updErr;

    if (creditsToAdd > 0) {
      if (unlock.property_id) {
        const currentPropCredits = Number(unlock.property?.lead_credits || 0);
        await supabaseClient
          .from('properties')
          .update({ lead_credits: currentPropCredits + creditsToAdd })
          .eq('id', unlock.property_id);
      }

      if (unlock.landlord_id) {
        const { data: prof } = await supabaseClient
          .from('profiles')
          .select('lead_credits')
          .eq('id', unlock.landlord_id)
          .maybeSingle();

        const currentLandlordCredits = Number(prof?.lead_credits || 0);
        await supabaseClient
          .from('profiles')
          .update({ lead_credits: currentLandlordCredits + creditsToAdd })
          .eq('id', unlock.landlord_id);
      }

      // Log to audit ledger
      await supabaseClient.from('credit_transactions').insert({
        landlord_id: unlock.landlord_id,
        property_id: unlock.property_id,
        unlock_id: unlockId,
        amount_paid: amountPaid,
        credits_added: creditsToAdd,
        type: 'bundle_purchase',
        notes: `Confirmed M-Pesa bundle purchase of ${creditsToAdd} credits`
      });
    } else if (unlock.inquiry_id) {
      await supabaseClient.from('inquiries').update({ is_unlocked: true, is_locked: false, unlocked_at: new Date().toISOString() }).eq('id', unlock.inquiry_id);
    }

    return { success: true, creditsAdded: creditsToAdd };
  } else {
    const db = getMockDb();
    const unlock = db.lead_unlocks.find(u => u.id === unlockId);
    if (!unlock) throw new Error("Unlock record not found");

    unlock.status = 'confirmed';
    if (mpesaCode) unlock.mpesa_code = mpesaCode;
    unlock.unlocked_at = new Date().toISOString();

    const amountPaid = Number(unlock.amount_paid || 0);
    const bundleSize = Number(unlock.bundle_size || 1);
    const isBundle = bundleSize > 1 || amountPaid >= 200 || !unlock.inquiry_id;
    const creditsToAdd = isBundle ? (unlock.credits_added > 0 ? unlock.credits_added : (bundleSize > 1 ? bundleSize : 5)) : 0;
    unlock.credits_added = creditsToAdd;

    const prop = db.properties.find(p => p.id === unlock.property_id);
    const landlord = db.profiles.find(p => p.id === unlock.landlord_id);

    if (creditsToAdd > 0) {
      if (prop) prop.lead_credits = (prop.lead_credits || 0) + creditsToAdd;
      if (landlord) landlord.lead_credits = (landlord.lead_credits || 0) + creditsToAdd;
    } else if (unlock.inquiry_id) {
      const inq = db.inquiries.find(i => i.id === unlock.inquiry_id);
      if (inq) {
        inq.is_unlocked = true;
        inq.is_locked = false;
        inq.unlocked_at = new Date().toISOString();
      }
    }

    saveMockDb(db);
    return { success: true, creditsAdded: creditsToAdd };
  }
}

// Reconciliation function
export async function reconcileMissingCredits() {
  console.log("🔍 Running automated credit reconciliation audit...");
  if (useRealSupabase) {
    try {
      const { data: brokenUnlocks, error } = await supabaseClient
        .from('lead_unlocks')
        .select('*, property:properties(lead_credits)')
        .eq('status', 'confirmed');

      if (error || !brokenUnlocks) return { reconciledCount: 0 };

      let count = 0;
      for (const unlock of brokenUnlocks) {
        const amountPaid = Number(unlock.amount_paid || 0);
        const bundleSize = Number(unlock.bundle_size || 1);
        const isBundle = bundleSize > 1 || amountPaid >= 200 || !unlock.inquiry_id;

        if (isBundle && (!unlock.credits_added || unlock.credits_added === 0)) {
          const creditsToIssue = bundleSize > 1 ? bundleSize : 5;

          await supabaseClient
            .from('lead_unlocks')
            .update({ credits_added: creditsToIssue })
            .eq('id', unlock.id);

          if (unlock.property_id) {
            const currentCredits = Number(unlock.property?.lead_credits || 0);
            await supabaseClient
              .from('properties')
              .update({ lead_credits: currentCredits + creditsToIssue })
              .eq('id', unlock.property_id);
          }

          if (unlock.landlord_id) {
            const { data: prof } = await supabaseClient
              .from('profiles')
              .select('lead_credits')
              .eq('id', unlock.landlord_id)
              .maybeSingle();

            const currentLandlordCredits = Number(prof?.lead_credits || 0);
            await supabaseClient
              .from('profiles')
              .update({ lead_credits: currentLandlordCredits + creditsToIssue })
              .eq('id', unlock.landlord_id);
          }

          await supabaseClient.from('credit_transactions').insert({
            landlord_id: unlock.landlord_id,
            property_id: unlock.property_id,
            unlock_id: unlock.id,
            amount_paid: amountPaid,
            credits_added: creditsToIssue,
            type: 'reconciliation',
            notes: `Auto-reconciled missing credits for confirmed bundle payment ID ${unlock.id}`
          });

          count++;
          console.log(`✅ Reconciled unlock ${unlock.id}: issued +${creditsToIssue} credits.`);
        }
      }

      return { success: true, reconciledCount: count };
    } catch (err: any) {
      console.error("Error during credit reconciliation:", err.message);
      return { success: false, error: err.message };
    }
  } else {
    const db = getMockDb();
    let count = 0;
    db.lead_unlocks.forEach((unlock) => {
      const amountPaid = Number(unlock.amount_paid || 0);
      const bundleSize = Number(unlock.bundle_size || 1);
      const isBundle = bundleSize > 1 || amountPaid >= 200 || !unlock.inquiry_id;

      if (unlock.status === 'confirmed' && isBundle && (!unlock.credits_added || unlock.credits_added === 0)) {
        const creditsToIssue = bundleSize > 1 ? bundleSize : 5;
        unlock.credits_added = creditsToIssue;

        const prop = db.properties.find(p => p.id === unlock.property_id);
        const landlord = db.profiles.find(p => p.id === unlock.landlord_id);

        if (prop) prop.lead_credits = (prop.lead_credits || 0) + creditsToIssue;
        if (landlord) landlord.lead_credits = (landlord.lead_credits || 0) + creditsToIssue;

        count++;
      }
    });

    if (count > 0) saveMockDb(db);
    return { success: true, reconciledCount: count };
  }
}

// POST /api/admin/reconcile-credits
app.post('/api/admin/reconcile-credits', async (req, res) => {
  const result = await reconcileMissingCredits();
  return res.json(result);
});

// POST /api/leads/unlock/:id/confirm
app.post('/api/leads/unlock/:id/confirm', async (req, res) => {
  const { id } = req.params;
  const { mpesaCode } = req.body || {};

  try {
    const result = await processLeadUnlockConfirmation(id, mpesaCode);
    return res.json({ success: true, message: "Lead/bundle confirmed successfully", ...result });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/leads/unlock/:id/reject
app.post('/api/leads/unlock/:id/reject', async (req, res) => {
  const { id } = req.params;
  if (useRealSupabase) {
    try {
      await supabaseClient.from('lead_unlocks').update({ status: 'failed' }).eq('id', id);
      return res.json({ success: true, message: "Unlock rejected" });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    const u = db.lead_unlocks.find(u => u.id === id);
    if (u) u.status = 'failed';
    saveMockDb(db);
    return res.json({ success: true, message: "Unlock rejected" });
  }
});

// GET /api/leads/unlock/status
app.get('/api/leads/unlock/status', async (req, res) => {
  const { unlockId } = req.query;
  if (!unlockId) return res.status(400).json({ error: "Missing unlockId" });

  if (useRealSupabase) {
    try {
      const { data: unlock, error: uErr } = await supabaseClient.from('lead_unlocks').select('*').eq('id', unlockId).single();
      if (uErr) throw uErr;

      let inquiry = null;
      if (unlock.status === 'confirmed' && unlock.inquiry_id) {
        const { data: inq } = await supabaseClient.from('inquiries').select('*').eq('id', unlock.inquiry_id).single();
        inquiry = inq;
      }

      return res.json({ success: true, status: unlock.status, inquiry });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    const unlock = db.lead_unlocks.find(u => u.id === unlockId);
    if (!unlock) return res.status(404).json({ error: "Unlock not found" });

    let inquiry = null;
    if (unlock.status === 'confirmed' && unlock.inquiry_id) {
      inquiry = db.inquiries.find(i => i.id === unlock.inquiry_id);
    }

    return res.json({ success: true, status: unlock.status, inquiry });
  }
});

// GET /api/admin/boosts
app.get('/api/admin/boosts', async (req, res) => {
  if (useRealSupabase) {
    try {
      const { data, error } = await supabaseClient
        .from('listing_boosts')
        .select('*, property:properties(title), landlord:profiles(full_name, phone)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return res.json({ success: true, boosts: data });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    const mapped = db.listing_boosts.map(b => {
      const property = db.properties.find(p => p.id === b.property_id);
      const landlord = db.profiles.find(p => p.id === b.landlord_id);
      return { ...b, property, landlord };
    });
    return res.json({ success: true, boosts: mapped.reverse() });
  }
});

// GET /api/admin/lead-unlocks
app.get('/api/admin/lead-unlocks', async (req, res) => {
  if (useRealSupabase) {
    try {
      const { data, error } = await supabaseClient
        .from('lead_unlocks')
        .select('*, property:properties(title, type), landlord:profiles(full_name, phone), inquiry:inquiries(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return res.json({ success: true, unlocks: data });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    const mapped = db.lead_unlocks.map(u => {
      const property = db.properties.find(p => p.id === u.property_id);
      const landlord = db.profiles.find(p => p.id === u.landlord_id);
      const inquiry = db.inquiries.find(i => i.id === u.inquiry_id);
      return { ...u, property, landlord, inquiry };
    });
    return res.json({ success: true, unlocks: mapped.reverse() });
  }
});

// DELETE /api/saved/:tenantId/:propertyId
app.delete('/api/saved/:tenantId/:propertyId', async (req, res) => {
  const { tenantId, propertyId } = req.params;

  if (useRealSupabase) {
    try {
      const { error } = await supabaseClient
        .from('saved_properties')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('property_id', propertyId);

      if (error) throw error;
      return res.json({ success: true, message: "Listing unsaved" });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    db.saved_properties = db.saved_properties.filter(s => !(s.tenant_id === tenantId && s.property_id === propertyId));
    saveMockDb(db);
    return res.json({ success: true, message: "Listing unsaved" });
  }
});

// ── SMS PROXY ENDPOINT ───────────────────────────────────────────────
app.post('/api/sms', async (req, res) => {
  const { phone, message, type } = req.body;
  if (!phone || !message) return res.status(400).json({ error: "Phone and message are required" });

  await sendSMS(phone, message, type || 'direct');
  return res.json({ success: true });
});

// ── AUTOMATED EXPIRY & WARNING CRON ─────────────────────────────────
app.post('/api/admin/expire-listings', async (req, res) => {
  const now = new Date();
  const warningBoundStr = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  const nowStr = now.toISOString();

  let warningCount = 0;
  let expiredCount = 0;

  if (useRealSupabase) {
    try {
      // Expire listing boosts
      const { data: expiredBoosts } = await supabaseClient
        .from('listing_boosts')
        .select('*, property:properties(title), landlord:profiles(phone)')
        .eq('status', 'active')
        .lt('expires_at', nowStr);
      
      if (expiredBoosts && expiredBoosts.length > 0) {
        for (const b of expiredBoosts) {
          await supabaseClient.from('listing_boosts').update({ status: 'expired' }).eq('id', b.id);
          await supabaseClient.from('properties').update({
            is_boosted: false,
            boost_tier: null,
            boost_expires_at: null,
            boost_badge: null
          }).eq('id', b.property_id);

          if (b.landlord?.phone) {
            await sendSMS(
              b.landlord.phone,
              `NestList: Your listing boost has ended. Re-boost to get back to the top: nestlist.co.ke`,
              'boost_expired'
            );
          }
        }
      }

      // Warm about expiring boosts (1 day before)
      const oneDayFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const { data: warningBoosts } = await supabaseClient
        .from('listing_boosts')
        .select('*, property:properties(title), landlord:profiles(phone)')
        .eq('status', 'active')
        .eq('warning_sent', false)
        .lte('expires_at', oneDayFromNow)
        .gt('expires_at', nowStr);
      
      if (warningBoosts && warningBoosts.length > 0) {
        for (const b of warningBoosts) {
          if (b.landlord?.phone) {
            await sendSMS(
              b.landlord.phone,
              `NestList: ⚠️ Your listing boost expires tomorrow. Renew at nestlist.co.ke/dashboard to stay on top.`,
              'boost_expiring_soon'
            );
          }
          await supabaseClient.from('listing_boosts').update({ warning_sent: true }).eq('id', b.id);
        }
      }

      // 1. Process warnings (3 days until expiry)
      const { data: warnings } = await supabaseClient
        .from('properties')
        .select('*, landlord:profiles(phone, full_name)')
        .eq('is_active', true)
        .eq('expiry_sms_sent', false)
        .lte('expires_at', warningBoundStr)
        .gt('expires_at', nowStr);

      if (warnings && warnings.length > 0) {
        for (const p of warnings) {
          const phone = p.landlord?.phone;
          if (phone) {
            await sendSMS(phone, `NestList: Your property listing '${p.title}' is expiring in 3 days. Please renew to keep it visible to tenants.`, 'listing_expiring');
          }
          await supabaseClient.from('properties').update({ expiry_sms_sent: true }).eq('id', p.id);
          warningCount++;
        }
      }

      // 2. Process actually expired listings
      const { data: expired } = await supabaseClient
        .from('properties')
        .select('*, landlord:profiles(phone)')
        .eq('is_active', true)
        .lte('expires_at', nowStr);

      if (expired && expired.length > 0) {
        for (const p of expired) {
          const phone = p.landlord?.phone;
          if (phone) {
            await sendSMS(phone, `NestList: Your property listing '${p.title}' has expired. It is no longer visible to tenants. Pay to reactivate.`, 'listing_expired');
          }
          await supabaseClient.from('properties').update({ is_active: false }).eq('id', p.id);
          expiredCount++;
        }
      }
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();

    // Expire listing boosts in mock
    const expiredBoosts = db.listing_boosts.filter(b => b.status === 'active' && b.expires_at && new Date(b.expires_at) < now);
    for (const b of expiredBoosts) {
      b.status = 'expired';
      const prop = db.properties.find(p => p.id === b.property_id);
      if (prop) {
        prop.is_boosted = false;
        prop.boost_tier = null;
        prop.boost_expires_at = null;
        prop.boost_badge = null;
      }
      const landlord = db.profiles.find(p => p.id === b.landlord_id);
      if (landlord?.phone) {
        await sendSMS(
          landlord.phone,
          `NestList: Your listing boost has ended. Re-boost to get back to the top: nestlist.co.ke`,
          'boost_expired'
        );
      }
    }

    // Warm about expiring boosts in mock (1 day before)
    const oneDayFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const warningBoosts = db.listing_boosts.filter(b => b.status === 'active' && !b.warning_sent && b.expires_at && new Date(b.expires_at) <= oneDayFromNow && new Date(b.expires_at) > now);
    for (const b of warningBoosts) {
      b.warning_sent = true;
      const landlord = db.profiles.find(p => p.id === b.landlord_id);
      if (landlord?.phone) {
        await sendSMS(
          landlord.phone,
          `NestList: ⚠️ Your listing boost expires tomorrow. Renew at nestlist.co.ke/dashboard to stay on top.`,
          'boost_expiring_soon'
        );
      }
    }

    const warnings = db.properties.filter(p =>
      p.is_active &&
      !p.expiry_sms_sent &&
      p.expires_at &&
      new Date(p.expires_at) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) &&
      new Date(p.expires_at) > now
    );

    for (const p of warnings) {
      const landlord = db.profiles.find(prof => prof.id === p.landlord_id);
      if (landlord?.phone) {
        await sendSMS(landlord.phone, `NestList: Your property listing '${p.title}' is expiring in 3 days. Please renew to keep it visible to tenants.`, 'listing_expiring');
      }
      p.expiry_sms_sent = true;
      warningCount++;
    }

    const expired = db.properties.filter(p =>
      p.is_active &&
      p.expires_at &&
      new Date(p.expires_at) <= now
    );

    for (const p of expired) {
      const landlord = db.profiles.find(prof => prof.id === p.landlord_id);
      if (landlord?.phone) {
        await sendSMS(landlord.phone, `NestList: Your property listing '${p.title}' has expired. It is no longer visible to tenants. Pay to reactivate.`, 'listing_expired');
      }
      p.is_active = false;
      expiredCount++;
    }

    saveMockDb(db);
  }

  return res.json({
    success: true,
    processed_warnings: warningCount,
    processed_expiries: expiredCount
  });
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

  const db = getMockDb();
  const idx = db.properties.findIndex(p => p.id === property.id);
  if (idx !== -1) {
    db.properties[idx] = { ...db.properties[idx], ...property };
  } else {
    db.properties.push(property);
  }
  saveMockDb(db);

  return res.json({ success: true, message: "Property synced to backend mock db." });
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
    // Run automated credit reconciliation on server startup to repair historical discrepancies
    reconcileMissingCredits().catch(err => console.error("Startup credit reconciliation failed:", err));
  });
}

mountViteMiddleware();
