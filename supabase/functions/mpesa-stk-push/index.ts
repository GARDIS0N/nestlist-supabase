import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

const BOOST_PRICES: Record<string, number> = {
  '3day':  50,
  '7day':  100,
  '14day': 200,
  '30day': 350,
};

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

const LEAD_BUNDLES: Record<string, { count: number; price: number }> = {
  single_room: { count: 5, price: 100 },
  bedsitter:   { count: 5, price: 200 },
  studio:      { count: 5, price: 250 },
  '1br':       { count: 5, price: 500 },
  '2br':       { count: 5, price: 700 },
  '3br':       { count: 5, price: 1000 },
  '4br':       { count: 5, price: 1200 },
  '5br_plus':  { count: 5, price: 1500 },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authenticate calling user from JWT
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized: Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const {
      paymentType = 'listing_fee',
      propertyId,
      phone,
      amount,
      propertyType,
      boostTier,
      inquiryId,
      bundleSize,
      paymentMethod = 'stk_push',
      mpesaCode
    } = body;

    // Force landlordId to authenticated caller user id
    const landlordId = user.id;

    if (!propertyId || !amount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: propertyId and amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return new Response(
        JSON.stringify({ error: "Invalid payment amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Lookup property type for fee validation
    let propType = propertyType || 'bedsitter';
    if (propertyId) {
      const { data: prop } = await serviceClient
        .from("properties")
        .select("type")
        .eq("id", propertyId)
        .maybeSingle();
      if (prop?.type) propType = prop.type;
    }

    // Validate fee requirements by paymentType
    let requiredFee = 100;
    if (paymentType === 'listing_fee') {
      requiredFee = LISTING_FEES[propType] || 100;
    } else if (paymentType === 'boost') {
      requiredFee = BOOST_PRICES[boostTier || '7day'] || 50;
    } else if (paymentType === 'lead_unlock') {
      requiredFee = (bundleSize && bundleSize >= 5)
        ? (LEAD_BUNDLES[propType]?.price || 200)
        : (LEAD_PRICES[propType] || 50);
    }

    if (numAmount < requiredFee) {
      return new Response(
        JSON.stringify({ error: `Insufficient amount. Required fee for ${paymentType} (${propType}) is KES ${requiredFee}` }),
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
      const cleanCode = mpesaCode.toUpperCase().trim();

      if (paymentType === 'listing_fee') {
        const { data, error } = await serviceClient
          .from("listing_payments")
          .insert({
            property_id: propertyId,
            landlord_id: landlordId,
            amount: Math.ceil(numAmount),
            property_type: propType,
            payment_method: 'manual',
            mpesa_code: cleanCode,
            status: 'pending'
          })
          .select()
          .single();
        if (error) throw error;
        recordId = data.id;
      } else if (paymentType === 'boost') {
        const { data, error } = await serviceClient
          .from("listing_boosts")
          .insert({
            property_id: propertyId,
            landlord_id: landlordId,
            boost_tier: boostTier || '7day',
            amount_paid: Math.ceil(numAmount),
            payment_method: 'manual',
            mpesa_code: cleanCode,
            status: 'pending'
          })
          .select()
          .single();
        if (error) throw error;
        recordId = data.id;
      } else if (paymentType === 'lead_unlock') {
        const { data, error } = await serviceClient
          .from("lead_unlocks")
          .insert({
            property_id: propertyId,
            inquiry_id: inquiryId || null,
            landlord_id: landlordId,
            bundle_size: bundleSize || 1,
            amount_paid: Math.ceil(numAmount),
            payment_method: 'manual',
            mpesa_code: cleanCode,
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

    const consumerKey = Deno.env.get("MPESA_CONSUMER_KEY");
    const consumerSecret = Deno.env.get("MPESA_CONSUMER_SECRET");
    const shortcode = Deno.env.get("MPESA_SHORTCODE") || "174379";
    const passkey = Deno.env.get("MPESA_PASSKEY") || "";
    let callbackUrl = Deno.env.get("MPESA_CALLBACK_URL") || `${supabaseUrl}/functions/v1/mpesa-callback`;

    const callbackSecret = Deno.env.get("CALLBACK_SECRET");
    if (callbackSecret) {
      callbackUrl = `${callbackUrl}?token=${encodeURIComponent(callbackSecret)}`;
    }

    const envMode = Deno.env.get("ENVIRONMENT") || "development";
    if (!consumerKey || !consumerSecret) {
      if (envMode === "production") {
        return new Response(
          JSON.stringify({ error: "M-Pesa payment gateway credentials missing in production" }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Format phone to 254XXXXXXXXX
    let formattedPhone = String(phone).trim().replace("+", "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "254" + formattedPhone.substring(1);
    }
    if (!formattedPhone.startsWith("254")) {
      formattedPhone = "254" + formattedPhone;
    }

    let checkoutRequestId = `ws_CO_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    let mpesaResponseData: any = null;

    if (consumerKey && consumerSecret) {
      const auth = btoa(`${consumerKey}:${consumerSecret}`);
      const mpesaBase = Deno.env.get("MPESA_ENV") === "production"
        ? "https://api.safaricom.co.ke"
        : "https://sandbox.safaricom.co.ke";

      const oauthResponse = await fetch(
        `${mpesaBase}/oauth/v1/generate?grant_type=client_credentials`,
        { headers: { Authorization: `Basic ${auth}` } }
      );
      const oauthData = await oauthResponse.json();
      const accessToken = oauthData.access_token;

      if (!accessToken) {
        throw new Error(`M-Pesa OAuth failed: ${oauthData.errorMessage || JSON.stringify(oauthData)}`);
      }

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
        Amount: Math.ceil(numAmount),
        PartyA: formattedPhone,
        PartyB: shortcode,
        PhoneNumber: formattedPhone,
        CallBackURL: callbackUrl,
        AccountReference: `NestList-${propertyId.slice(0, 8).toUpperCase()}`,
        TransactionDesc: `Payment for ${paymentType}`,
      };

      const stkResponse = await fetch(
        `${mpesaBase}/mpesa/stkpush/v1/processrequest`,
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
      } else {
        throw new Error(mpesaResponseData.ResponseDescription || mpesaResponseData.errorMessage || "STK Push failed");
      }
    }

    let recordId = "";
    if (paymentType === 'listing_fee') {
      const { data, error } = await serviceClient
        .from("listing_payments")
        .insert({
          property_id: propertyId,
          landlord_id: landlordId,
          amount: Math.ceil(numAmount),
          property_type: propType,
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
      const { data, error } = await serviceClient
        .from("listing_boosts")
        .insert({
          property_id: propertyId,
          landlord_id: landlordId,
          boost_tier: boostTier || '7day',
          amount_paid: Math.ceil(numAmount),
          mpesa_checkout_request_id: checkoutRequestId,
          payment_method: 'stk_push',
          status: "pending",
        })
        .select()
        .single();
      if (error) throw error;
      recordId = data.id;
    } else if (paymentType === 'lead_unlock') {
      const { data, error } = await serviceClient
        .from("lead_unlocks")
        .insert({
          property_id: propertyId,
          inquiry_id: inquiryId || null,
          landlord_id: landlordId,
          bundle_size: bundleSize || 1,
          amount_paid: Math.ceil(numAmount),
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
        message: "STK Push sent to phone",
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
