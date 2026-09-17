-- Migration: Add Listing Boosts and Pay-Per-Lead features
-- Description: Alters properties/inquiries tables and provisions listing_boosts/lead_unlocks with RLS

-- 1. Alter properties table to support boosts and lead credits
ALTER TABLE properties ADD COLUMN IF NOT EXISTS is_boosted BOOLEAN DEFAULT FALSE;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS boost_tier VARCHAR(50) DEFAULT NULL;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS boost_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS boost_badge VARCHAR(100) DEFAULT NULL;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS lead_credits INTEGER DEFAULT 0;

-- Create index on is_boosted for high-performance sorting
CREATE INDEX IF NOT EXISTS idx_properties_is_boosted ON properties(is_boosted) WHERE is_boosted = TRUE;

-- 2. Alter inquiries table to support locking and pay-per-lead unlocking
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS unlock_price NUMERIC DEFAULT 50.0;

-- 3. Create listing_boosts table
CREATE TABLE IF NOT EXISTS listing_boosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  landlord_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  boost_tier VARCHAR(50) NOT NULL,
  amount_paid NUMERIC NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  mpesa_checkout_request_id VARCHAR(100) DEFAULT NULL,
  payment_method VARCHAR(50) DEFAULT 'stk_push',
  mpesa_code VARCHAR(100) DEFAULT NULL,
  starts_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  warning_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) on listing_boosts
ALTER TABLE listing_boosts ENABLE ROW LEVEL SECURITY;

-- Create policies for listing_boosts
CREATE POLICY "Allow landlords to view their own boosts" ON listing_boosts
  FOR SELECT USING (auth.uid()::text = landlord_id);

CREATE POLICY "Allow landlords to insert their own boosts" ON listing_boosts
  FOR INSERT WITH CHECK (auth.uid()::text = landlord_id);

CREATE POLICY "Allow admins full access to boosts" ON listing_boosts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()::text AND role IN ('admin', 'superadmin')
    )
  );

-- 4. Create lead_unlocks table
CREATE TABLE IF NOT EXISTS lead_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  landlord_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  inquiry_id UUID REFERENCES inquiries(id) ON DELETE SET NULL,
  amount_paid NUMERIC NOT NULL,
  bundle_size INTEGER DEFAULT 1,
  status VARCHAR(50) DEFAULT 'pending',
  mpesa_checkout_request_id VARCHAR(100) DEFAULT NULL,
  payment_method VARCHAR(50) DEFAULT 'stk_push',
  mpesa_code VARCHAR(100) DEFAULT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) on lead_unlocks
ALTER TABLE lead_unlocks ENABLE ROW LEVEL SECURITY;

-- Create policies for lead_unlocks
CREATE POLICY "Allow landlords to view their own unlocks" ON lead_unlocks
  FOR SELECT USING (auth.uid()::text = landlord_id);

CREATE POLICY "Allow landlords to insert their own unlocks" ON lead_unlocks
  FOR INSERT WITH CHECK (auth.uid()::text = landlord_id);

CREATE POLICY "Allow admins full access to unlocks" ON lead_unlocks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()::text AND role IN ('admin', 'superadmin')
    )
  );

-- 5. Create credit_transactions audit table
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  unlock_id UUID REFERENCES lead_unlocks(id) ON DELETE SET NULL,
  amount_paid NUMERIC DEFAULT 0,
  credits_added INTEGER NOT NULL,
  type TEXT CHECK (type IN ('bundle_purchase', 'single_purchase', 'reconciliation', 'admin_adjustment', 'lead_spent', 'admin_grant')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "credit_transactions_read" ON credit_transactions;
CREATE POLICY "credit_transactions_read" ON credit_transactions FOR SELECT USING (true);
DROP POLICY IF EXISTS "credit_transactions_insert" ON credit_transactions;
CREATE POLICY "credit_transactions_insert" ON credit_transactions FOR INSERT WITH CHECK (true);
