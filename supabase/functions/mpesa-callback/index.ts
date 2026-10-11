import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();
    console.log("M-Pesa Callback received payload:", JSON.stringify(body));

    const stkCallback = body?.Body?.stkCallback;
    if (!stkCallback) {
      return new Response(JSON.stringify({ error: "Invalid payload format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const checkoutRequestId = stkCallback.CheckoutRequestID;
    const resultCode = stkCallback.ResultCode;
    const resultDesc = stkCallback.ResultDesc;

    // Search listing_payments, listing_boosts, and lead_unlocks (in that order)
    let matchedTable: "listing_payments" | "listing_boosts" | "lead_unlocks" | null = null;
    let matchedRow: any = null;

    const { data: lpRow } = await supabaseClient
      .from("listing_payments")
      .select("*")
      .eq("mpesa_checkout_request_id", checkoutRequestId)
      .maybeSingle();

    if (lpRow) {
      matchedTable = "listing_payments";
      matchedRow = lpRow;
    } else {
      const { data: lbRow } = await supabaseClient
        .from("listing_boosts")
        .select("*")
        .eq("mpesa_checkout_request_id", checkoutRequestId)
        .maybeSingle();

      if (lbRow) {
        matchedTable = "listing_boosts";
        matchedRow = lbRow;
      } else {
        const { data: luRow } = await supabaseClient
          .from("lead_unlocks")
          .select("*")
          .eq("mpesa_checkout_request_id", checkoutRequestId)
          .maybeSingle();

        if (luRow) {
          matchedTable = "lead_unlocks";
          matchedRow = luRow;
        }
      }
    }

    if (!matchedRow || !matchedTable) {
      console.warn(`No payment/boost/unlock row found matching checkout ID: ${checkoutRequestId}`);
      return new Response(JSON.stringify({ message: "No match found, logged." }), { status: 200 });
    }

    if (resultCode === 0) {
      // Transaction successful
      let mpesaCode = "";
      let amountPaid = matchedRow.amount || matchedRow.amount_paid || 0;
      let payerPhone = matchedRow.payer_phone || "";

      const metadataItems = stkCallback.CallbackMetadata?.Item || [];
      for (const item of metadataItems) {
        if (item.Name === "MpesaReceiptNumber") {
          mpesaCode = String(item.Value);
        } else if (item.Name === "Amount") {
          amountPaid = item.Value;
        } else if (item.Name === "PhoneNumber") {
          payerPhone = String(item.Value);
        }
      }

      if (!mpesaCode) {
        mpesaCode = `MPX_${Date.now()}`;
      }

      if (matchedTable === "listing_payments") {
        const { error: updateError } = await supabaseClient
          .from("listing_payments")
          .update({
            status: "confirmed",
            mpesa_code: mpesaCode,
            amount_paid: amountPaid,
            payer_phone: payerPhone,
            confirmed_at: new Date().toISOString(),
          })
          .eq("id", matchedRow.id);

        if (updateError) {
          console.error("Failed to update listing_payments:", updateError);
          return new Response(JSON.stringify({ error: "Failed to update db" }), { status: 500 });
        }

        if (matchedRow.property_id) {
          await supabaseClient
            .from("properties")
            .update({ is_active: true, status: "available" })
            .eq("id", matchedRow.property_id);
        }
      } else if (matchedTable === "listing_boosts") {
        const startsAt = new Date();
        const tier = String(matchedRow.boost_tier || "7day").toLowerCase();
        let days = 7;
        let badge = "⭐ Featured";

        if (tier.includes("3") && !tier.includes("30")) {
          days = 3;
          badge = "⚡ Featured";
        } else if (tier.includes("7")) {
          days = 7;
          badge = "⭐ Featured";
        } else if (tier.includes("14")) {
          days = 14;
          badge = "🔥 Hot Property";
        } else if (tier.includes("30")) {
          days = 30;
          badge = "👑 Premium";
        }

        const expiresAt = new Date(startsAt.getTime() + days * 24 * 60 * 60 * 1000);

        const { error: updateError } = await supabaseClient
          .from("listing_boosts")
          .update({
            status: "active",
            mpesa_code: mpesaCode,
            starts_at: startsAt.toISOString(),
            expires_at: expiresAt.toISOString(),
          })
          .eq("id", matchedRow.id);

        if (updateError) {
          console.error("Failed to update listing_boosts:", updateError);
          return new Response(JSON.stringify({ error: "Failed to update db" }), { status: 500 });
        }

        if (matchedRow.property_id) {
          await supabaseClient
            .from("properties")
            .update({
              is_boosted: true,
              boost_tier: matchedRow.boost_tier,
              boost_expires_at: expiresAt.toISOString(),
              boost_badge: badge,
            })
            .eq("id", matchedRow.property_id);
        }

        // Send SMS to landlord
        let landlordPhone = payerPhone;
        let landlordName = "Landlord";
        if (matchedRow.landlord_id) {
          const { data: prof } = await supabaseClient
            .from("profiles")
            .select("phone, full_name")
            .eq("id", matchedRow.landlord_id)
            .maybeSingle();
          if (prof?.phone) landlordPhone = prof.phone;
          if (prof?.full_name) landlordName = prof.full_name;
        }

        let propTitle = "your property";
        if (matchedRow.property_id) {
          const { data: prop } = await supabaseClient
            .from("properties")
            .select("title")
            .eq("id", matchedRow.property_id)
            .maybeSingle();
          if (prop?.title) propTitle = prop.title;
        }

        if (landlordPhone) {
          await supabaseClient.functions.invoke("send-sms", {
            body: {
              type: "boost_activated",
              phone: landlordPhone,
              data: {
                landlord_name: landlordName,
                property_title: propTitle,
                duration: `${days} days (${badge})`
              }
            }
          });
        }
      } else if (matchedTable === "lead_unlocks") {
        // Attempt atomic RPC procedure first
        const { data: rpcData, error: rpcError } = await supabaseClient.rpc(
          "confirm_lead_unlock_and_issue_credits",
          { p_unlock_id: matchedRow.id, p_mpesa_code: mpesaCode }
        );

        if (rpcError || !rpcData?.success) {
          console.warn("RPC confirm_lead_unlock_and_issue_credits failed in Edge Function, executing fallback:", rpcError);
          const { error: updateError } = await supabaseClient
            .from("lead_unlocks")
            .update({
              status: "confirmed",
              mpesa_code: mpesaCode,
              unlocked_at: new Date().toISOString(),
            })
            .eq("id", matchedRow.id);

          if (updateError) {
            console.error("Failed to update lead_unlocks:", updateError);
            return new Response(JSON.stringify({ error: "Failed to update db" }), { status: 500 });
          }

          if (matchedRow.inquiry_id) {
            await supabaseClient
              .from("inquiries")
              .update({
                is_locked: false,
                is_unlocked: true,
                unlocked_at: new Date().toISOString()
              })
              .eq("id", matchedRow.inquiry_id);
          }

          const bundleSize = matchedRow.bundle_size || 1;
          const amountPaid = matchedRow.amount_paid || matchedRow.amount || 0;
          const isBundle = bundleSize > 1 || amountPaid >= 200 || !matchedRow.inquiry_id;
          const creditsToAdd = isBundle ? (matchedRow.credits_added > 0 ? matchedRow.credits_added : (bundleSize > 1 ? bundleSize : 5)) : 0;

          if (creditsToAdd > 0) {
            if (matchedRow.property_id) {
              const { data: prop } = await supabaseClient
                .from("properties")
                .select("lead_credits")
                .eq("id", matchedRow.property_id)
                .maybeSingle();
              const currentPropCredits = Number(prop?.lead_credits || 0);
              await supabaseClient
                .from("properties")
                .update({ lead_credits: currentPropCredits + creditsToAdd })
                .eq("id", matchedRow.property_id);
            }

            if (matchedRow.landlord_id) {
              const { data: prof } = await supabaseClient
                .from("profiles")
                .select("lead_credits")
                .eq("id", matchedRow.landlord_id)
                .maybeSingle();
              const currentLandlordCredits = Number(prof?.lead_credits || 0);
              await supabaseClient
                .from("profiles")
                .update({ lead_credits: currentLandlordCredits + creditsToAdd })
                .eq("id", matchedRow.landlord_id);
            }

            await supabaseClient.from("credit_transactions").insert({
              landlord_id: matchedRow.landlord_id,
              property_id: matchedRow.property_id,
              unlock_id: matchedRow.id,
              amount_paid: amountPaid,
              credits_added: creditsToAdd,
              type: "bundle_purchase",
              notes: `M-Pesa callback confirmed bundle purchase of ${creditsToAdd} credits`
            });
          }
        }

        let landlordPhone = payerPhone;
        let landlordName = "Landlord";
        if (matchedRow.landlord_id) {
          const { data: prof } = await supabaseClient
            .from("profiles")
            .select("phone, full_name")
            .eq("id", matchedRow.landlord_id)
            .maybeSingle();
          if (prof?.phone) landlordPhone = prof.phone;
          if (prof?.full_name) landlordName = prof.full_name;
        }

        let propTitle = "your property";
        if (matchedRow.property_id) {
          const { data: prop } = await supabaseClient
            .from("properties")
            .select("title")
            .eq("id", matchedRow.property_id)
            .maybeSingle();
          if (prop?.title) propTitle = prop.title;
        }

        if (landlordPhone) {
          await supabaseClient.functions.invoke("send-sms", {
            body: {
              type: "lead_unlocked",
              phone: landlordPhone,
              data: {
                landlord_name: landlordName,
                property_title: propTitle
              }
            }
          });
        }
      }

      console.log(`Payment confirmed successfully on table ${matchedTable} for ID: ${matchedRow.id}`);
    } else {
      // Transaction failed / cancelled
      const status: "failed" | "cancelled" = resultCode === 1032 ? "cancelled" : "failed";

      const { error: updateError } = await supabaseClient
        .from(matchedTable)
        .update({
          status: status,
          failure_reason: resultDesc || `ResultCode ${resultCode}`,
        })
        .eq("id", matchedRow.id);

      if (updateError) {
        console.error("Failed to update failed payment status:", updateError);
        return new Response(JSON.stringify({ error: "Failed to update db" }), { status: 500 });
      }

      console.log(`Payment status set to ${status} on table ${matchedTable} for ID: ${matchedRow.id}`);
    }

    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Success" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in callback handler:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
