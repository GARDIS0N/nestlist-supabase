import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runReconciliation() {
  console.log('--------------------------------------------------');
  console.log('🔄 NESTLIST CREDIT RECONCILIATION AUDIT SCRIPT');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('--------------------------------------------------');

  try {
    // Fetch confirmed lead_unlocks records
    const { data: unlocks, error } = await supabase
      .from('lead_unlocks')
      .select('*, property:properties(title, lead_credits), landlord:profiles(full_name, lead_credits)')
      .eq('status', 'confirmed');

    if (error) {
      console.error('❌ Failed to fetch lead_unlocks:', error.message);
      process.exit(1);
    }

    if (!unlocks || unlocks.length === 0) {
      console.log('✅ No lead unlock records found.');
      process.exit(0);
    }

    console.log(`Found ${unlocks.length} total confirmed lead_unlocks records.`);

    let repairedCount = 0;
    let totalCreditsIssued = 0;

    for (const unlock of unlocks) {
      const amountPaid = Number(unlock.amount_paid || 0);
      const bundleSize = Number(unlock.bundle_size || 1);
      const isBundle = bundleSize > 1 || amountPaid >= 200 || !unlock.inquiry_id;

      // Check if confirmed bundle transaction has credits_added = 0 or NULL
      if (isBundle && (!unlock.credits_added || unlock.credits_added === 0)) {
        const creditsToIssue = bundleSize > 1 ? bundleSize : 5;

        console.log(`\n⚠️ DISCREPANCY DETECTED:`);
        console.log(` - Transaction ID: ${unlock.id}`);
        console.log(` - Property ID:    ${unlock.property_id} (${unlock.property?.title || 'Unknown'})`);
        console.log(` - Landlord ID:    ${unlock.landlord_id}`);
        console.log(` - Amount Paid:    KES ${amountPaid}`);
        console.log(` - Stored Credits: ${unlock.credits_added || 0}`);
        console.log(` -> Action: Issuing +${creditsToIssue} credits and updating ledger...`);

        // 1. Update lead_unlocks row
        const { error: updUnlockErr } = await supabase
          .from('lead_unlocks')
          .update({ credits_added: creditsToIssue })
          .eq('id', unlock.id);

        if (updUnlockErr) {
          console.error(`   ❌ Failed to update lead_unlocks ${unlock.id}:`, updUnlockErr.message);
          continue;
        }

        // 2. Increment property lead_credits
        if (unlock.property_id) {
          const currentPropCredits = Number(unlock.property?.lead_credits || 0);
          const { error: updPropErr } = await supabase
            .from('properties')
            .update({ lead_credits: currentPropCredits + creditsToIssue })
            .eq('id', unlock.property_id);

          if (updPropErr) {
            console.error(`   ❌ Failed to update property lead_credits:`, updPropErr.message);
          } else {
            console.log(`   ✓ Property lead_credits updated to: ${currentPropCredits + creditsToIssue}`);
          }
        }

        // 3. Increment landlord profile lead_credits
        if (unlock.landlord_id) {
          const currentLandlordCredits = Number(unlock.landlord?.lead_credits || 0);
          const { error: updLandlordErr } = await supabase
            .from('profiles')
            .update({ lead_credits: currentLandlordCredits + creditsToIssue })
            .eq('id', unlock.landlord_id);

          if (updLandlordErr) {
            console.error(`   ❌ Failed to update landlord lead_credits:`, updLandlordErr.message);
          } else {
            console.log(`   ✓ Landlord lead_credits updated to: ${currentLandlordCredits + creditsToIssue}`);
          }
        }

        // 4. Insert into credit_transactions audit ledger
        await supabase.from('credit_transactions').insert({
          landlord_id: unlock.landlord_id,
          property_id: unlock.property_id,
          unlock_id: unlock.id,
          amount_paid: amountPaid,
          credits_added: creditsToIssue,
          type: 'reconciliation',
          notes: `CLI Reconciliation script issued missing +${creditsToIssue} credits for confirmed bundle ID ${unlock.id}`
        });

        repairedCount++;
        totalCreditsIssued += creditsToIssue;
      }
    }

    console.log('\n--------------------------------------------------');
    console.log('🎉 RECONCILIATION AUDIT COMPLETED SUCCESSFULLY');
    console.log(`Repaired Transactions: ${repairedCount}`);
    console.log(`Total Credits Issued:  +${totalCreditsIssued} credits`);
    console.log('--------------------------------------------------');
  } catch (err: any) {
    console.error('❌ Critical error during reconciliation:', err.message);
    process.exit(1);
  }
}

runReconciliation();
