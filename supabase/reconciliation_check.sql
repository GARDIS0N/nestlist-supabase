-- ====================================================================
-- NestList: One-Off Lead Reconciliation Audit Check
-- Date: 2026-07-27
-- Purpose: Detect any pay_per_inquiry (or pay_per_lead) inquiries where
-- `is_unlocked = true` (or `is_locked = false`) but no matching
-- `credit_transactions` row of type 'lead_spent' exists.
-- ====================================================================

-- 1. AUDIT QUERY: List all unearned/revealed leads
SELECT 
  i.id AS enquiry_id,
  i.property_id,
  p.title AS property_title,
  p.payment_model,
  p.listing_model,
  i.landlord_id,
  pr.full_name AS landlord_name,
  pr.phone AS landlord_phone,
  i.tenant_name,
  i.tenant_phone,
  i.is_unlocked,
  i.unlocked_at,
  i.created_at AS enquiry_created_at
FROM inquiries i
JOIN properties p ON p.id = i.property_id
LEFT JOIN profiles pr ON pr.id = i.landlord_id
WHERE (p.payment_model = 'pay_per_inquiry' OR p.listing_model = 'pay_per_lead')
  AND (i.is_unlocked IS TRUE OR i.is_locked IS FALSE)
  AND NOT EXISTS (
    SELECT 1 
    FROM credit_transactions ct 
    WHERE ct.landlord_id = i.landlord_id
      AND ct.property_id = i.property_id
      AND ct.type = 'lead_spent'
      AND (
        ct.notes LIKE '%' || i.id::text || '%' 
        OR i.unlocked_by_credit_tx_id = ct.id
      )
  )
ORDER BY i.created_at DESC;


-- 2. REMEDIATION OPTION A: RE-LOCK UNPAID LEADS
-- Run this block if you want to immediately lock back all revealed leads that were never paid for.
/*
UPDATE inquiries
SET 
  is_unlocked = false,
  is_locked = true,
  unlocked_at = NULL,
  unlocked_by_credit_tx_id = NULL
WHERE id IN (
  SELECT i.id
  FROM inquiries i
  JOIN properties p ON p.id = i.property_id
  WHERE (p.payment_model = 'pay_per_inquiry' OR p.listing_model = 'pay_per_lead')
    AND (i.is_unlocked IS TRUE OR i.is_locked IS FALSE)
    AND NOT EXISTS (
      SELECT 1 
      FROM credit_transactions ct 
      WHERE ct.landlord_id = i.landlord_id
        AND ct.property_id = i.property_id
        AND ct.type = 'lead_spent'
        AND (
          ct.notes LIKE '%' || i.id::text || '%' 
          OR i.unlocked_by_credit_tx_id = ct.id
        )
    )
);
*/


-- 3. REMEDIATION OPTION B: BACKFILL CORRECTIVE AUDIT LEDGER
-- Run this block to record a -1 credit reconciliation audit transaction for unlocked leads.
/*
INSERT INTO credit_transactions (
  landlord_id,
  property_id,
  credits_added,
  amount_paid,
  type,
  notes,
  created_at
)
SELECT 
  i.landlord_id,
  i.property_id,
  -1,
  0,
  'lead_spent',
  'Corrective backfill transaction for historical unlocked enquiry ' || i.id::text,
  COALESCE(i.unlocked_at, NOW())
FROM inquiries i
JOIN properties p ON p.id = i.property_id
WHERE (p.payment_model = 'pay_per_inquiry' OR p.listing_model = 'pay_per_lead')
  AND (i.is_unlocked IS TRUE OR i.is_locked IS FALSE)
  AND NOT EXISTS (
    SELECT 1 
    FROM credit_transactions ct 
    WHERE ct.landlord_id = i.landlord_id
      AND ct.property_id = i.property_id
      AND ct.type = 'lead_spent'
      AND (
        ct.notes LIKE '%' || i.id::text || '%' 
        OR i.unlocked_by_credit_tx_id = ct.id
      )
  );
*/
