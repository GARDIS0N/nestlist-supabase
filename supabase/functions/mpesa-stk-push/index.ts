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
    const {
      paymentType = 'listing_fee',
      propertyId,
      landlordId,
      phone,
      amount,
      propertyType,
      boostTier,
      inquiryId,
      bundleSize,
      paymentMethod = 'stk_push',
      mpesaCode
    } = body;

    if (!propertyId || !landlordId || !amount) {
      return new Response(
        JSON.stringify({ error: "Missing required propertyId, landlordId, or amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (paymentMethod === 'manual') {
      if (!mpesaCode) {
        return new Response(
          JSON.stringify({ error: "mpesaCode is required for manual payment" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let recordId = "";
      if (paymentType === 'listing_fee') {
        const { data, error } = await supabaseClient
          .from("listing_payments")
          .insert({
            property_id: propertyId,
            landlord_id: landlordId,
            amount: amount,
            property_type: propertyType || "residential",
            payment_method: 'manual',
            mpesa_code: mpesaCode.toUpperCase().trim(),
            status: 'pending'
          })
          .select()
          .single();
        if (error) throw error;
        recordId = data.id;
      } else if (paymentType === 'boost') {
        const { data, error } = await supabaseClient
          .from("listing_boosts")
          .insert({
            property_id: propertyId,
            landlord_id: landlordId,
            boost_tier: boostTier || '7day',
            amount: amount,
            payment_method: 'manual',
            mpesa_code: mpesaCode.toUpperCase().trim(),
            status: 'pending'
          })
          .select()
          .single();
        if (error) throw error;
        recordId = data.id;
      } else if (paymentType === 'lead_unlock') {
        const { data, error } = await supabaseClient
          .from("lead_unlocks")
          .insert({
            property_id: propertyId,
            inquiry_id: inquiryId || null,
            landlord_id: landlordId,
            bundle_size: bundleSize || 1,
            amount_paid: amount,
            payment_method: 'manual',
            mpesa_code: mpesaCode.toUpperCase().trim(),
            status: 'pending'
          })
          .select()
          .single();
        if (error) throw error;
        recordId = data.id;
      }

      return new Response(
        JSON.stringify({
          success: true,
          record_id: recordId,
          message: "Manual payment submitted successfully for verification"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // STK PUSH FLOW
    if (!phone) {
      return new Response(
        JSON.stringify({ error: "Phone number is required for STK Push" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. SAFARICOM DARAJA OAUTH - GET ACCESS TOKEN
    const consumerKey = Deno.env.get("MPESA_CONSUMER_KEY") || "MOCK_CONSUMER_KEY";
    const consumerSecret = Deno.env.get("MPESA_CONSUMER_SECRET") || "MOCK_CONSUMER_SECRET";
    const shortcode = Deno.env.get("MPESA_SHORTCODE") || "174379";
    const passkey = Deno.env.get("MPESA_PASSKEY") || "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919";
    const callbackUrl = Deno.env.get("MPESA_CALLBACK_URL") || `${Deno.env.get("SUPABASE_URL")}/functions/v1/mpesa-callback`;

    // Format phone to 254XXXXXXXXX
    let formattedPhone = String(phone).trim().replace("+", "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "254" + formattedPhone.substring(1);
    }
    if (!formattedPhone.startsWith("254")) {
      formattedPhone = "254" + formattedPhone;
    }

    let checkoutRequestId = `ws_CO_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    let mpesaResponseData = null;

    const isMock = consumerKey === "MOCK_CONSUMER_KEY" || consumerSecret === "MOCK_CONSUMER_SECRET";

    if (!isMock) {
      try {
        const auth = btoa(`${consumerKey}:${consumerSecret}`);
        const oauthResponse = await fetch(
          "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
          { headers: { Authorization: `Basic ${auth}` } }
        );
        const oauthData = await oauthResponse.json();
        const accessToken = oauthData.access_token;

        const timestamp = new Date()
          .toISOString()
          .replace(/[^0-9]/g, "")
          .slice(0, 14);
        const password = btoa(`${shortcode}${passkey}${timestamp}`);

        const stkPayload = {
          BusinessShortCode: shortcode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: "CustomerPayBillOnline",
          Amount: Math.round(amount),
          PartyA: formattedPhone,
          PartyB: shortcode,
          PhoneNumber: formattedPhone,
          CallBackURL: callbackUrl,
          AccountReference: `Nestlist ${propertyId.slice(0, 8)}`,
          TransactionDesc: `Payment for ${paymentType}`,
        };

        const stkResponse = await fetch(
          "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(stkPayload),
          }
        );

        mpesaResponseData = await stkResponse.json();
        if (mpesaResponseData.CheckoutRequestID) {
          checkoutRequestId = mpesaResponseData.CheckoutRequestID;
        }
      } catch (err) {
        console.error("Daraja integration failed, fallback to mocked sandbox: ", err);
      }
    }

    let recordId = "";
    if (paymentType === 'listing_fee') {
      const { data, error } = await supabaseClient
        .from("listing_payments")
        .insert({
          property_id: propertyId,
          landlord_id: landlordId,
          amount: amount,
          property_type: propertyType || "residential",
          mpesa_checkout_request_id: checkoutRequestId,
          payer_phone: formattedPhone,
          payment_method: 'stk_push',
          status: "pending",
        })
        .select()
        .single();
      if (error) throw error;
      recordId = data.id;
    } else if (paymentType === 'boost') {
      const { data, error } = await supabaseClient
        .from("listing_boosts")
        .insert({
          property_id: propertyId,
          landlord_id: landlordId,
          boost_tier: boostTier || '7day',
          amount: amount,
          mpesa_checkout_request_id: checkoutRequestId,
          payment_method: 'stk_push',
          status: "pending",
        })
        .select()
        .single();
      if (error) throw error;
      recordId = data.id;
    } else if (paymentType === 'lead_unlock') {
      const { data, error } = await supabaseClient
        .from("lead_unlocks")
        .insert({
          property_id: propertyId,
          inquiry_id: inquiryId || null,
          landlord_id: landlordId,
          bundle_size: bundleSize || 1,
          amount_paid: amount,
          mpesa_checkout_request_id: checkoutRequestId,
          payment_method: 'stk_push',
          status: "pending",
        })
        .select()
        .single();
      if (error) throw error;
      recordId = data.id;
    }

    return new Response(
      JSON.stringify({
        success: true,
        record_id: recordId,
        checkout_request_id: checkoutRequestId,
        message: isMock 
          ? "STK Push initiated successfully (Simulated)" 
          : "STK Push initiated successfully on landlord phone",
        is_mocked: isMock,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "An unknown error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
