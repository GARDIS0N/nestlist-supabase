import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { MapPin, MessageSquare, ChevronLeft, ChevronRight, Check, Heart, ShieldCheck, ArrowLeft, Loader2, Send, AlertTriangle, Sparkles, Building2, UserCheck } from "lucide-react";
import { PropertyGallery } from "../components/PropertyGallery";

export const PropertyDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { profile, updateProfile } = useAuth();
  const navigate = useNavigate();

  const [property, setProperty] = useState<any | null>(null);
  const [landlord, setLandlord] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  // Inquiry Modal State
  const [inquiryModalOpen, setInquiryModalOpen] = useState(false);
  const [inquiryMessage, setInquiryMessage] = useState("");
  const [sendingInquiry, setSendingInquiry] = useState(false);
  const [inquirySuccess, setInquirySuccess] = useState(false);
  const [tenantPhone, setTenantPhone] = useState("");

  useEffect(() => {
    if (profile?.phone) {
      setTenantPhone(profile.phone);
    }
  }, [profile]);

  useEffect(() => {
    const fetchPropertyDetails = async () => {
      if (!id) return;
      setLoading(true);

      try {
        // Fetch property row
        const { data: propData, error: propError } = await supabase
          .from("properties")
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (propError) throw propError;

        if (propData) {
          setProperty(propData);

          // Track session-deduplicated view count
          const sessionKey = `viewed_property_${id}`;
          if (!sessionStorage.getItem(sessionKey)) {
            sessionStorage.setItem(sessionKey, "true");
            try {
              await supabase.rpc("increment_view_count", { p_id: id });
            } catch (vErr) {
              // Ignore view increment error silently
            }
          }

          // Fetch host profile: strictly non-contact identity fields (id, full_name, avatar_url, role, agency_name)
          const { data: landlordData } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url, role, agency_name")
            .eq("id", propData.landlord_id)
            .maybeSingle();

          if (landlordData) {
            const lData = landlordData as any;
            setLandlord({
              id: lData.id,
              full_name: lData.full_name || "Verified Host",
              avatar_url: lData.avatar_url,
              role: lData.role || "landlord",
              agency_name: lData.agency_name || null
            });
          }

          // Check if saved by current tenant
          if (profile && profile.role === "tenant") {
            const { data: savedData } = await supabase
              .from("saved_properties")
              .select("*")
              .eq("tenant_id", profile.id)
              .eq("property_id", id)
              .maybeSingle();

            setIsSaved(!!savedData);
          }
        }
      } catch (err) {
        console.error("Error loading property details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPropertyDetails();
  }, [id, profile]);

  const handleToggleSave = async () => {
    if (!profile) {
      navigate("/login");
      return;
    }
    if (profile.role !== "tenant") {
      alert("Only tenant accounts can save properties.");
      return;
    }

    try {
      if (isSaved) {
        await supabase
          .from("saved_properties")
          .delete()
          .eq("tenant_id", profile.id)
          .eq("property_id", property.id);
        setIsSaved(false);
      } else {
        await supabase
          .from("saved_properties")
          .insert({
            tenant_id: profile.id,
            property_id: property.id,
          });
        setIsSaved(true);
      }
    } catch (err: any) {
      console.error("Error saving property:", err);
    }
  };

  const handleSendInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      navigate("/login");
      return;
    }
    if (!inquiryMessage.trim()) return;

    const activePhone = profile.phone || tenantPhone;
    if (!activePhone) {
      alert("Please provide a valid phone number before submitting.");
      return;
    }

    setSendingInquiry(true);

    try {
      // 1. If tenant has no phone stored in profile, save it now
      if (!profile.phone) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ phone: activePhone })
          .eq("id", profile.id);

        if (updateError) throw updateError;
        
        if (typeof updateProfile === "function") {
          await updateProfile({ phone: activePhone });
        }
      }

      // 2. Insert new inquiry row
      const { error } = await supabase
        .from("inquiries")
        .insert({
          property_id: property.id,
          tenant_id: profile.id,
          landlord_id: property.landlord_id,
          message: inquiryMessage,
          status: "pending",
        });

      if (error) throw error;

      // 3. Notify landlord/manager via SMS securely
      try {
        await supabase.functions.invoke("send-sms", {
          body: {
            type: "inquiry_received",
            data: {
              landlord_id: property.landlord_id,
              landlord_name: landlord?.full_name || "Host",
              property_title: property.title,
            }
          }
        });
      } catch (smsErr) {
        console.warn("SMS notification failed (non-blocking):", smsErr);
      }

      setInquirySuccess(true);
      setInquiryMessage("");
    } catch (err: any) {
      console.error("Inquiry submission failed:", err);
      alert(`Could not send inquiry: ${err.message}`);
    } finally {
      setSendingInquiry(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-stone-50">
        <div className="flex flex-col items-center space-y-3">
          <Loader2 className="h-10 w-10 text-primary-600 animate-spin" />
          <p className="text-stone-500 font-medium text-sm">Loading rental details...</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-stone-900">Property Not Found</h2>
        <p className="text-stone-500 mt-2">The listing you are trying to view has expired, been deactivated or deleted.</p>
        <Link to="/" className="mt-6 inline-flex items-center space-x-1.5 py-2 px-4 bg-primary-600 text-white rounded-lg text-sm font-semibold shadow">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Browse</span>
        </Link>
      </div>
    );
  }

  const getPropertyTypeLabel = (typeKey: string) => {
    const typesMap: Record<string, string> = {
      single_room: "Single Room",
      bedsitter: "Bedsitter",
      studio: "Studio",
      "1br": "1 Bedroom Apartment",
      "2br": "2 Bedroom Apartment",
      "3br": "3 Bedroom Apartment",
      "4br": "4 Bedroom Apartment",
      "5br_plus": "5 Bedroom Executive House"
    };
    return typesMap[typeKey] || typeKey;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Back to Browse */}
      <div className="flex items-center justify-between">
        <Link to="/" className="inline-flex items-center space-x-1 text-sm font-semibold text-stone-500 hover:text-stone-900">
          <ChevronLeft className="h-4 w-4" />
          <span>Back to Listings</span>
        </Link>

        {(!profile || profile.role === "tenant") && (
          <button
            onClick={handleToggleSave}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold shadow-sm transition ${
              isSaved
                ? "bg-rose-50 border-rose-200 text-rose-600"
                : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
            }`}
          >
            <Heart className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
            <span>{isSaved ? "Saved" : "Save Rental"}</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Details and Media Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Visual Carousel with smooth touch swipe, drag, indicators & arrows */}
          <PropertyGallery
            images={property.images || []}
            title={property.title}
          />

          {/* Heading Metadata */}
          <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="bg-gold-100 text-gold-900 border border-gold-200/30 text-xs font-bold px-3 py-1 rounded-full capitalize">
                  {getPropertyTypeLabel(property.type)}
                </span>
                <h1 className="text-xl sm:text-2xl font-bold font-sans text-stone-950 mt-2.5">
                  {property.title}
                </h1>
                <div className="flex items-center space-x-1 text-stone-500 text-xs sm:text-sm font-semibold mt-1">
                  <MapPin className="h-4 w-4 text-primary-600 shrink-0" />
                  <span>{property.location}, {property.county}</span>
                </div>
              </div>

              <div className="text-right">
                <p className="text-2xl sm:text-3xl font-black text-stone-950 font-sans">
                  KSh {parseFloat(property.price).toLocaleString()}
                </p>
                <p className="text-xs text-stone-400 font-semibold leading-none">Per Month</p>
              </div>
            </div>

            {/* Description */}
            <div className="border-t border-stone-100 pt-4 space-y-2">
              <h3 className="font-bold text-stone-900 text-sm uppercase tracking-wide">
                Property Description
              </h3>
              <p className="text-stone-600 text-sm leading-relaxed whitespace-pre-line">
                {property.description}
              </p>
            </div>
          </div>

          {/* Amenities Grid */}
          <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-sm space-y-4">
            <h3 className="font-bold text-stone-900 text-sm uppercase tracking-wide">
              Included Amenities & Utilities
            </h3>
            {property.amenities && property.amenities.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {property.amenities.map((amenity: string, idx: number) => (
                  <div key={idx} className="flex items-center space-x-2 text-stone-700 text-xs font-medium">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                      <Check className="h-3 w-3 stroke-[3]" />
                    </div>
                    <span>{amenity}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-stone-400 text-xs">No amenities specified for this listing.</p>
            )}
          </div>

        </div>

        {/* Sidebar Column (Landlord Details & Inquiry Call to Action) */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-sm space-y-6 sticky top-24">
            <h3 className="font-sans font-bold text-stone-900 text-base border-b border-stone-100 pb-3">
              Listing Contact
            </h3>

            {/* Check if listing is awaiting activation */}
            {(!property.is_active || property.payment_status === "unpaid" || property.payment_status === "pending_verification") ? (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-3 text-center">
                <AlertTriangle className="h-6 w-6 text-amber-600 mx-auto" />
                <h4 className="font-bold text-amber-950 text-xs uppercase tracking-wide">Awaiting Activation</h4>
                <p className="text-xs text-amber-800 leading-relaxed">
                  This listing is awaiting landlord payment or verification. Contact details and inquiries are disabled until activated.
                </p>
              </div>
            ) : landlord ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 bg-stone-50 p-3.5 rounded-xl border border-stone-200/50">
                  {landlord.avatar_url ? (
                    <img
                      src={landlord.avatar_url}
                      alt={landlord.full_name || "Verified Host"}
                      className="h-11 w-11 rounded-full object-cover border border-primary-200 shadow-xs"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="h-11 w-11 rounded-full bg-primary-50 border border-primary-200 text-primary-900 font-bold flex items-center justify-center text-sm capitalize">
                      {landlord.full_name?.charAt(0) || "H"}
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-stone-900 text-sm leading-tight flex items-center gap-1.5">
                      <span>{landlord.full_name || "Verified Host"}</span>
                    </h4>
                    <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider mt-0.5 flex items-center gap-1">
                      <UserCheck className="h-3 w-3 text-emerald-600" />
                      <span>{landlord.role === "agent" ? (landlord.agency_name ? `Agent (${landlord.agency_name})` : "Real Estate Agent") : landlord.role === "caretaker" ? "Property Caretaker" : "Verified Landlord"}</span>
                    </p>
                  </div>
                </div>

                <div className="bg-emerald-50/60 border border-emerald-200/80 p-3.5 rounded-xl space-y-2">
                  <div className="flex items-center space-x-2 text-xs font-bold text-emerald-950">
                    <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Private & Secure In-App Communication</span>
                  </div>
                  <p className="text-[11px] text-emerald-900 leading-relaxed font-medium">
                    Host contact numbers are kept private for safety. Send a free enquiry below to schedule viewings or ask questions.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-stone-50 p-4 rounded-xl border border-stone-200/50 text-center text-stone-400 text-xs">
                Host details unretrievable.
              </div>
            )}

            <div className="border-t border-stone-100 pt-5 space-y-3">
              <div className="flex items-start space-x-2 text-[11px] text-stone-400 font-medium leading-relaxed bg-[#FEF3C7]/40 p-2.5 rounded-lg border border-[#FDE68A]/50">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <p>
                  Host identity verified. Nestlist logs communications for tenant security. Never pay a deposit or booking fee prior to physical viewing.
                </p>
              </div>

              {/* Inquiry Trigger */}
              {(!property.is_active || property.payment_status === "unpaid") ? null : (profile?.role === "landlord" || profile?.role === "caretaker" || profile?.role === "agent") && profile?.id === property.landlord_id ? (
                <div className="text-center p-3 text-xs bg-stone-100 text-stone-500 rounded-xl font-medium">
                  You are viewing your own listing.
                </div>
              ) : (
                <button
                  onClick={() => setInquiryModalOpen(true)}
                  className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-[#1E6B4A] hover:bg-[#165238] text-white rounded-xl shadow-md font-bold text-sm transition"
                >
                  <Send className="h-4.5 w-4.5" />
                  <span>Enquire Now (Free)</span>
                </button>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* INQUIRY MODAL POPUP */}
      {inquiryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-stone-200 overflow-hidden shadow-2xl relative">
            
            {/* Modal Header */}
            <div className="bg-stone-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="font-sans font-bold text-base">Inquire about Listing</h3>
                <p className="text-xs text-stone-400 truncate max-w-xs">{property.title}</p>
              </div>
              <button
                onClick={() => {
                  setInquiryModalOpen(false);
                  setInquirySuccess(false);
                }}
                className="text-stone-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {inquirySuccess ? (
                <div className="space-y-4 text-center py-6">
                  <div className="mx-auto h-12 w-12 bg-emerald-50 rounded-full text-emerald-600 flex items-center justify-center border border-emerald-100">
                    <Check className="h-6 w-6 stroke-[3]" />
                  </div>
                  <h4 className="font-sans font-extrabold text-stone-900 text-base">Inquiry Sent Successfully!</h4>
                  <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
                    Jambo! Your message was submitted securely. The host has been notified and will review your inquiry. You can follow up via the in-app messages console once they connect!
                  </p>
                  <button
                    onClick={() => {
                      setInquiryModalOpen(false);
                      setInquirySuccess(false);
                    }}
                    className="mt-2 py-2 px-6 bg-stone-900 text-white rounded-xl text-xs font-bold hover:bg-stone-800 transition"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSendInquiry} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                      Write a message to {landlord?.full_name || "the host"}
                    </label>
                    <textarea
                      rows={5}
                      value={inquiryMessage}
                      onChange={(e) => setInquiryMessage(e.target.value)}
                      placeholder="e.g. Jambo, I am interested in renting this property. Is it available for viewing this Saturday at 10 AM?"
                      className="w-full border border-stone-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6B4A]/20 focus:border-[#1E6B4A]"
                      required
                    ></textarea>
                    {!profile?.phone ? (
                      <div className="space-y-1.5 mt-3">
                        <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                          Your Phone Number *
                        </label>
                        <input
                          type="tel"
                          required
                          placeholder="e.g. +254700123456"
                          value={tenantPhone}
                          onChange={(e) => setTenantPhone(e.target.value)}
                          className="w-full border border-stone-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6B4A]/20 focus:border-[#1E6B4A]"
                        />
                        <p className="text-[10px] text-stone-400">
                          Enter your phone number so verified managers can reach out once your enquiry is accepted.
                        </p>
                      </div>
                    ) : (
                      <p className="text-[10px] text-stone-400 leading-normal">
                        Your verified account will be linked to this message inquiry.
                      </p>
                    )}

                    <p className="text-[10.5px] text-stone-500 leading-normal mt-3 border-t border-stone-100 pt-3">
                      By submitting this inquiry you agree to our{" "}
                      <Link to="/privacy" className="text-emerald-750 hover:text-emerald-900 underline font-semibold">
                        Privacy Policy
                      </Link>{" "}
                      and communications guidelines.
                    </p>
                  </div>

                  <div className="flex items-center justify-end space-x-3 pt-3 border-t border-stone-100">
                    <button
                      type="button"
                      onClick={() => setInquiryModalOpen(false)}
                      className="py-2.5 px-4 text-xs font-semibold border border-stone-200 text-stone-600 rounded-xl hover:bg-stone-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={sendingInquiry}
                      className="flex items-center space-x-1.5 py-2.5 px-5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50"
                    >
                      {sendingInquiry ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5" />
                          <span>Submit Inquiry</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
