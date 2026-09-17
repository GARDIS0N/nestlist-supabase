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
    const { propertyId, landlordId, inquiryId } = body;

    if (!propertyId || !landlordId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: propertyId and landlordId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Check properties.lead_credits >= 1
    const { data: property, error: propError } = await supabaseClient
      .from("properties")
      .select("lead_credits, title")
      .eq("id", propertyId)
      .maybeSingle();

    if (propError || !property) {
      return new Response(
        JSON.stringify({ error: "Property not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const currentCredits = Number(property.lead_credits || 0);
    if (currentCredits < 1) {
      return new Response(
        JSON.stringify({ error: "Insufficient lead credits available." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Decrement lead_credits by 1
    const { error: decError } = await supabaseClient
      .from("properties")
      .update({ lead_credits: currentCredits - 1 })
      .eq("id", propertyId);

    if (decError) {
      throw new Error(`Failed to decrement lead credits: ${decError.message}`);
    }

    // 3. Set inquiries.is_locked = false if inquiryId provided
    let updatedInquiry = null;
    if (inquiryId) {
      const { data: inq, error: inqError } = await supabaseClient
        .from("inquiries")
        .update({
          is_locked: false,
          is_unlocked: true,
          unlocked_at: new Date().toISOString()
        })
        .eq("id", inquiryId)
        .select()
        .maybeSingle();

      if (inqError) {
        console.error("Failed to update inquiry status:", inqError);
      } else {
        updatedInquiry = inq;
      }
    }

    // 4. Insert lead_unlocks row
    const { error: unlockErr } = await supabaseClient
      .from("lead_unlocks")
      .insert({
        property_id: propertyId,
        inquiry_id: inquiryId || null,
        landlord_id: landlordId,
        bundle_size: 1,
        amount_paid: 0,
        status: "confirmed",
        payment_method: "credit",
        unlocked_at: new Date().toISOString()
      });

    if (unlockErr) {
      console.error("Failed to log lead_unlocks row:", unlockErr);
    }

    // 5. Send SMS notification to landlord
    let landlordPhone = "";
    let landlordName = "Landlord";
    if (landlordId) {
      const { data: prof } = await supabaseClient
        .from("profiles")
        .select("phone, full_name")
        .eq("id", landlordId)
        .maybeSingle();
      if (prof?.phone) landlordPhone = prof.phone;
      if (prof?.full_name) landlordName = prof.full_name;
    }

    if (landlordPhone) {
      await supabaseClient.functions.invoke("send-sms", {
        body: {
          type: "lead_unlocked",
          phone: landlordPhone,
          data: {
            landlord_name: landlordName,
            property_title: property.title || "your property"
          }
        }
      });
    }

    return new Response(
      JSON.stringify({ success: true, inquiry: updatedInquiry }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in redeem-lead-credit edge function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An unknown error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
