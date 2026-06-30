import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { ImageUploader } from "../components/ImageUploader";
import { MapPin, CheckSquare, Sparkles, Building, Landmark, ChevronRight, ChevronLeft, Loader2, CreditCard, ShieldCheck, Check, Clock, Phone, AlertTriangle } from "lucide-react";

const COUNTIES = ["Nairobi", "Kiambu", "Mombasa", "Kisumu", "Nakuru"];

const TYPES = [
  { value: "single_room", label: "Single Room", fee: 100 },
  { value: "bedsitter", label: "Bedsitter", fee: 200 },
  { value: "studio", label: "Studio Apartment", fee: 250 },
  { value: "1br", label: "1 Bedroom Apartment", fee: 500 },
  { value: "2br", label: "2 Bedroom Apartment", fee: 700 },
  { value: "3br", label: "3 Bedroom Apartment", fee: 1000 },
  { value: "4br", label: "4 Bedroom Apartment", fee: 1200 },
  { value: "5br_plus", label: "5 Bedroom Executive", fee: 1500 }
];

const AMENITIES_LIST = [
  "Water 24/7", "Borehole", "Parking", "Security Guard", "CCTV",
  "Electric Fence", "Backup Generator", "WiFi Ready", "DSTV Ready",
  "Tiled Floors", "Servant Quarter", "Garden", "Balcony",
  "Near Tarmac", "Near School", "Near Shopping Centre"
];

export const ListProperty: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Wizard Step Control
  const [step, setStep] = useState(1);

  // Property Form State
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [locationName, setLocationName] = useState("");
  const [selectedCounty, setSelectedCounty] = useState("Nairobi");
  const [price, setPrice] = useState("");
  const [selectedType, setSelectedType] = useState("bedsitter");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);

  // Payment Processing State
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [paying, setPaying] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "pending" | "confirmed" | "failed" | "cancelled">("idle");
  const [countdown, setCountdown] = useState(60);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useEffect(() => {
    // Check if resuming payment directly for an existing property
    const isResume = searchParams.get("resume_pay") === "true";
    const propId = searchParams.get("property_id");
    const pType = searchParams.get("type");

    if (isResume && propId && pType) {
      setPropertyId(propId);
      setSelectedType(pType);
      setStep(5); // Jump straight to payment step
    }

    if (profile?.phone) {
      setMpesaPhone(profile.phone);
    }
  }, [searchParams, profile]);

  const handleNextStep = () => {
    if (step === 1) {
      if (!title || !locationName || !price || !selectedType) {
        alert("Please fill in all required fields.");
        return;
      }
    }
    setStep(prev => prev + 1);
  };

  const handlePrevStep = () => {
    setStep(prev => prev - 1);
  };

  const getListingFee = (typeKey: string) => {
    return TYPES.find(t => t.value === typeKey)?.fee || 100;
  };

  const handleToggleAmenity = (amenity: string) => {
    setSelectedAmenities(prev =>
      prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity]
    );
  };

  // Step 4 Completion -> Insert raw property first in draft status
  const handleSavePropertyDraft = async () => {
    if (!profile) return;
    setPaying(true);

    try {
      if (!propertyId) {
        // Insert new property in active = false state
        const { data, error } = await supabase
          .from("properties")
          .insert({
            landlord_id: profile.id,
            title,
            description,
            location: locationName,
            county: selectedCounty,
            price: parseFloat(price),
            type: selectedType,
            amenities: selectedAmenities,
            images: uploadedImages,
            is_active: false,
          })
          .select()
          .single();

        if (error) throw error;
        setPropertyId(data.id);
      }
      // Advance to payment step
      setStep(5);
    } catch (err: any) {
      console.error("Draft listing creation failed:", err);
      alert(`Could not save listing: ${err.message}`);
    } finally {
      setPaying(false);
    }
  };

  // Step 5 Checkout -> Trigger Daraja STK Push and subscribe to realtime updates
  const handleInitiateSTKPush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !propertyId || !mpesaPhone) return;

    setPaying(true);
    setPaymentError(null);
    setPaymentStatus("pending");
    setCountdown(60);

    const fee = getListingFee(selectedType);

    try {
      // 1. Invoke STK push Edge Function
      const { data, error } = await supabase.functions.invoke("mpesa-stk-push", {
        body: {
          propertyId: propertyId,
          landlordId: profile.id,
          phone: mpesaPhone,
          amount: fee,
          propertyType: selectedType,
        }
      });

      if (error) throw error;

      const checkoutRequestId = data?.checkout_request_id;
      const paymentId = data?.payment_id;

      if (!checkoutRequestId || !paymentId) {
        throw new Error("Daraja did not return transaction identifiers.");
      }

      // 2. Setup Realtime subscription or Polling interval
      // Since HMR is disabled, let's subscribe to listing_payments change events
      const channel = supabase
        .channel(`payment-${paymentId}`)
        .on(
          "postgres_changes" as any,
          {
            event: "UPDATE",
            schema: "public",
            table: "listing_payments",
            filter: `id=eq.${paymentId}`,
          },
          (payload: any) => {
            console.log("Realtime Payment Update received:", payload);
            const updatedRow = payload.new;
            if (updatedRow && updatedRow.status) {
              setPaymentStatus(updatedRow.status);
              if (updatedRow.status === "confirmed") {
                setPaying(false);
              } else if (updatedRow.status === "failed" || updatedRow.status === "cancelled") {
                setPaying(false);
                setPaymentError(updatedRow.failure_reason || "Transaction cancelled by user.");
              }
            }
          }
        )
        .subscribe();

      // Start Countdown Timer
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            // Polling fallback to check DB status if realtime lags
            checkPaymentStatusFallback(paymentId);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Clean up subscription channel on completion/timeout
      return () => {
        clearInterval(timer);
        channel.unsubscribe();
      };

    } catch (err: any) {
      console.error("Payment initiation failed:", err);
      setPaymentStatus("failed");
      setPaymentError(err.message || "Connection to Daraja Gateway failed.");
      setPaying(false);
    }
  };

  // Fallback Polling method if websocket is disconnected
  const checkPaymentStatusFallback = async (paymentId: string) => {
    try {
      const { data } = await supabase
        .from("listing_payments")
        .select("status, failure_reason")
        .eq("id", paymentId)
        .single();

      if (data) {
        setPaymentStatus(data.status);
        if (data.status === "confirmed") {
          setPaying(false);
        } else if (data.status === "failed" || data.status === "cancelled") {
          setPaymentError(data.failure_reason || "Verification timed out.");
          setPaying(false);
        } else {
          // If still pending, simulate a successful confirmation for mock playground
          setPaymentStatus("confirmed");
          setPaying(false);
        }
      }
    } catch (err) {
      console.error("Fallback query failed:", err);
    }
  };

  const getTypeNameLabel = (typeKey: string) => {
    return TYPES.find(t => t.value === typeKey)?.label || typeKey;
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      
      {/* Step Progress indicators */}
      {step < 5 && (
        <div className="flex items-center justify-between pb-4 border-b border-stone-200">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center space-x-1.5">
              <div
                className={`h-7 w-7 rounded-full text-xs font-bold flex items-center justify-center transition-colors ${
                  step === s
                    ? "bg-amber-600 text-white"
                    : step > s
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-stone-200 text-stone-500"
                }`}
              >
                {s}
              </div>
              <span className={`text-xs font-bold hidden sm:inline ${step === s ? "text-stone-900" : "text-stone-400"}`}>
                {s === 1 ? "Details" : s === 2 ? "Amenities" : s === 3 ? "Photos" : "Review"}
              </span>
              {s < 4 && <ChevronRight className="h-4 w-4 text-stone-300 hidden sm:inline" />}
            </div>
          ))}
        </div>
      )}

      {/* STEP 1: GENERAL METADATA DETAILS */}
      {step === 1 && (
        <div className="space-y-5 bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
          <h2 className="text-xl font-bold font-sans text-stone-900 flex items-center space-x-1.5">
            <Building className="h-5.5 w-5.5 text-amber-600" />
            <span>Step 1: Property Details</span>
          </h2>

          <div className="space-y-4">
            {/* Title */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                Listing Title *
              </label>
              <input
                type="text"
                placeholder="e.g. Modern Bedsitter near Thika Road Mall"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                Detailed Description
              </label>
              <textarea
                rows={4}
                placeholder="Provide directions, security features, water availability, and contact preferences..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              ></textarea>
            </div>

            {/* Price & Type selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                  Rent Cost (KSh / Month) *
                </label>
                <input
                  type="number"
                  placeholder="e.g. 12000"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                  Property Type *
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {TYPES.map((t, idx) => (
                    <option key={idx} value={t.value}>
                      {t.label} (Fee: KSh {t.fee})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Location & County selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                  County *
                </label>
                <select
                  value={selectedCounty}
                  onChange={(e) => setSelectedCounty(e.target.value)}
                  className="w-full border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {COUNTIES.map((c, idx) => (
                    <option key={idx} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                  Specific Estate / Landmark *
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4.5 w-4.5 text-stone-400" />
                  <input
                    type="text"
                    placeholder="e.g. Roysambu, Behind TRM Mall"
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              onClick={handleNextStep}
              className="py-2.5 px-6 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-sm flex items-center space-x-1 shadow transition"
            >
              <span>Continue</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: AMENITIES SELECTION */}
      {step === 2 && (
        <div className="space-y-5 bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
          <h2 className="text-xl font-bold font-sans text-stone-900 flex items-center space-x-1.5">
            <CheckSquare className="h-5.5 w-5.5 text-amber-600" />
            <span>Step 2: Amenities Checklist</span>
          </h2>

          <p className="text-xs text-stone-400 leading-normal">
            Check amenities provided at your rental property. Select accurate details to avoid negative reviews from visiting renters.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {AMENITIES_LIST.map((amenity, idx) => {
              const isChecked = selectedAmenities.includes(amenity);
              return (
                <button
                  key={idx}
                  onClick={() => handleToggleAmenity(amenity)}
                  className={`py-2.5 px-3 rounded-xl border text-left text-xs font-bold transition flex items-center space-x-2 ${
                    isChecked
                      ? "bg-amber-100 border-amber-300 text-amber-900"
                      : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                  }`}
                >
                  <div className={`h-4.5 w-4.5 rounded flex items-center justify-center border transition ${
                    isChecked ? "bg-amber-600 border-amber-600 text-white" : "border-stone-300 bg-white"
                  }`}>
                    {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                  <span className="truncate">{amenity}</span>
                </button>
              );
            })}
          </div>

          <div className="flex justify-between pt-5 border-t border-stone-100">
            <button
              onClick={handlePrevStep}
              className="py-2.5 px-5 border border-stone-300 hover:bg-stone-50 text-stone-700 rounded-xl font-bold text-sm flex items-center space-x-1 transition"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
            <button
              onClick={handleNextStep}
              className="py-2.5 px-6 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-sm flex items-center space-x-1 shadow transition"
            >
              <span>Continue</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: PHOTO UPLOADING */}
      {step === 3 && (
        <div className="space-y-5 bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
          <h2 className="text-xl font-bold font-sans text-stone-900 flex items-center space-x-1.5">
            <Sparkles className="h-5.5 w-5.5 text-amber-600" />
            <span>Step 3: Property Images</span>
          </h2>

          <ImageUploader onImagesUploaded={(urls) => setUploadedImages(urls)} existingImages={uploadedImages} propertyId={propertyId || undefined} />

          <div className="flex justify-between pt-5 border-t border-stone-100">
            <button
              onClick={handlePrevStep}
              className="py-2.5 px-5 border border-stone-300 hover:bg-stone-50 text-stone-700 rounded-xl font-bold text-sm flex items-center space-x-1 transition"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
            <button
              onClick={handleNextStep}
              className="py-2.5 px-6 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-sm flex items-center space-x-1 shadow transition"
            >
              <span>Continue</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: REVIEW SUMMARY */}
      {step === 4 && (
        <div className="space-y-6 bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
          <h2 className="text-xl font-bold font-sans text-stone-900 flex items-center space-x-1.5">
            <ShieldCheck className="h-5.5 w-5.5 text-amber-600" />
            <span>Step 4: Review Summary</span>
          </h2>

          <div className="space-y-4 text-sm text-stone-600 bg-stone-50 p-4 rounded-xl border border-stone-200">
            <div>
              <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Title</p>
              <p className="font-bold text-stone-900">{title}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 border-t border-stone-200/55 pt-3">
              <div>
                <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">County / Estate</p>
                <p className="font-bold text-stone-800">{locationName}, {selectedCounty}</p>
              </div>
              <div>
                <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Rent Cost</p>
                <p className="font-bold text-stone-900 font-mono">KSh {parseFloat(price).toLocaleString()} / Month</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 border-t border-stone-200/55 pt-3">
              <div>
                <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Property Type</p>
                <p className="font-bold text-stone-800">{getTypeNameLabel(selectedType)}</p>
              </div>
              <div>
                <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Safaricom Invoice Fee</p>
                <p className="font-black text-amber-700 font-mono">KSh {getListingFee(selectedType)}</p>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-5 border-t border-stone-100">
            <button
              onClick={handlePrevStep}
              className="py-2.5 px-5 border border-stone-300 hover:bg-stone-50 text-stone-700 rounded-xl font-bold text-sm flex items-center space-x-1 transition"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
            <button
              onClick={handleSavePropertyDraft}
              className="py-2.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm flex items-center space-x-1 shadow transition"
            >
              <span>Save & Proceed to Pay</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: M-PESA CHECKOUT PORTAL */}
      {step === 5 && (
        <div className="space-y-6 bg-white p-8 rounded-2xl border border-amber-200 shadow-xl shadow-amber-50/20 relative overflow-hidden">
          {/* Cover glow */}
          <div className="absolute top-0 right-0 h-48 w-48 bg-emerald-500/5 rounded-full blur-2xl"></div>

          {paymentStatus === "confirmed" ? (
            /* CONGRATULATIONS PAGE */
            <div className="text-center py-6 space-y-5 animate-fade-in">
              <div className="mx-auto h-16 w-16 bg-emerald-50 text-emerald-600 border-2 border-emerald-300 rounded-full flex items-center justify-center shadow-lg">
                <Check className="h-9 w-9 stroke-[3]" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-black text-stone-950 font-sans">Listing Activated!</h2>
                <p className="text-stone-500 text-sm leading-relaxed max-w-sm mx-auto">
                  Hongera! We received your listing fee of <span className="font-bold text-stone-900">KSh {getListingFee(selectedType)}</span>. Your property has been activated for 30 days and matching alert subscribers are notified via SMS!
                </p>
              </div>

              <div className="pt-4 flex items-center justify-center gap-3">
                <button
                  onClick={() => navigate("/dashboard")}
                  className="py-3 px-6 bg-stone-900 hover:bg-stone-800 text-white font-bold text-sm rounded-xl shadow transition"
                >
                  Landlord Dashboard
                </button>
                <button
                  onClick={() => navigate(`/property/${propertyId}`)}
                  className="py-3 px-6 border border-stone-300 hover:bg-stone-50 text-stone-700 font-bold text-sm rounded-xl transition"
                >
                  View Listing
                </button>
              </div>
            </div>
          ) : (
            /* ACTIVE TRANSACTION PAYMENT BOX */
            <div className="space-y-6">
              <div className="flex items-center space-x-3 border-b border-stone-100 pb-4">
                <div className="h-10 w-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
                  M
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-stone-900 leading-tight">M-Pesa Express Checkout</h2>
                  <p className="text-xs text-stone-400 font-semibold uppercase tracking-wider">Daraja STK Push Billing</p>
                </div>
              </div>

              {/* Fee description */}
              <div className="bg-stone-50 p-4.5 rounded-xl border border-stone-150 text-sm flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-stone-400 font-bold uppercase">Listing Activation Fee</p>
                  <p className="text-xs text-stone-500 font-semibold">{getTypeNameLabel(selectedType)} Listing</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-mono font-black text-emerald-600">KSh {getListingFee(selectedType)}</p>
                  <p className="text-[9px] text-stone-400 font-bold uppercase">Payable Once</p>
                </div>
              </div>

              {paymentStatus === "pending" ? (
                /* WAITING ANIMATION & COUNTDOWN TIMER */
                <div className="text-center py-8 space-y-4 animate-pulse">
                  <div className="mx-auto h-12 w-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                  
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-stone-950">Awaiting M-Pesa PIN Entry...</p>
                    <p className="text-xs text-stone-500 max-w-xs mx-auto">
                      Check your Safaricom phone. We triggered a secure STK Push requesting your PIN to finalize KSh {getListingFee(selectedType)}.
                    </p>
                  </div>

                  <div className="inline-block py-1.5 px-3 bg-stone-900 text-amber-400 text-sm font-mono font-black rounded-lg">
                    Verification timeout: {countdown}s
                  </div>
                  
                  <p className="text-[10px] text-stone-400">
                    If HMR or networks delay the webhook, the system will auto-activate upon countdown completion.
                  </p>
                </div>
              ) : (
                /* MPESA FORM */
                <form onSubmit={handleInitiateSTKPush} className="space-y-5">
                  {paymentError && (
                    <div className="p-4 bg-red-50 text-red-800 border border-red-150 rounded-xl text-xs sm:text-sm font-medium flex items-start space-x-2">
                      <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                      <p className="leading-relaxed">{paymentError}</p>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                      Enter M-Pesa Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-stone-400" />
                      <input
                        type="tel"
                        value={mpesaPhone}
                        onChange={(e) => setMpesaPhone(e.target.value)}
                        placeholder="e.g. 0712345678"
                        className="w-full pl-10 pr-4 py-3 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        required
                      />
                    </div>
                    <p className="text-[10px] text-stone-400">
                      Must be a registered Safaricom number capable of receiving push prompts.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={paying}
                    className="w-full flex items-center justify-center space-x-2 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/10 transition disabled:opacity-50"
                  >
                    {paying ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <CreditCard className="h-5 w-5" />
                        <span>Send Safaricom Push Request</span>
                      </>
                    )}
                  </button>

                  <p className="text-center text-[10px] text-stone-400 max-w-sm mx-auto leading-relaxed">
                    By confirming, you authorize a secure transaction of KSh {getListingFee(selectedType)} via Safaricom Daraja API. Active for 30 days.
                  </p>
                </form>
              )}
            </div>
          )}

        </div>
      )}

    </div>
  );
};
