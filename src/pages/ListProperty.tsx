import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { PhotoUpload } from "../components/PhotoUpload";
import { MapPin, CheckSquare, Sparkles, Building, Landmark, ChevronRight, ChevronLeft, Loader2, CreditCard, ShieldCheck, Check, Clock, Phone, AlertTriangle, X, Hash } from "lucide-react";

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
  const [tempId] = useState(() => "temp-" + Math.random().toString(36).slice(2, 10));
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [locationName, setLocationName] = useState("");
  const [selectedCounty, setSelectedCounty] = useState("Nairobi");
  const [price, setPrice] = useState("");
  const [selectedType, setSelectedType] = useState("bedsitter");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);

  // Payment Processing State (Manual M-Pesa Verification Flow)
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [mpesaCode, setMpesaCode] = useState("");
  const [paying, setPaying] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "pending_verification" | "verified" | "rejected">("idle");
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

  // Step 4 Completion -> Insert raw property first in draft status ('unpaid')
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
            is_active: false
          })
          .select()
          .single();

        if (error) throw error;
        setPropertyId(data.id);

        // Sync with backend mock database file if running in mock simulator mode
        const { getSupabaseConfig } = await import("../lib/supabase");
        if (getSupabaseConfig().isMock) {
          try {
            await fetch("/api/mock/sync-property", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data)
            });
          } catch (syncErr) {
            console.warn("Backend mock sync failed:", syncErr);
          }
        }
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

  // Step 5 Submit Manual Payment -> Post M-Pesa Code to backend verification endpoint
  const handleSubmitManualPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !propertyId || !mpesaCode) return;

    setPaying(true);
    setPaymentError(null);

    const fee = getListingFee(selectedType);

    try {
      // 1. Post to Express Backend manual verification API
      const response = await fetch(`/api/listings/${propertyId}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mpesa_code: mpesaCode,
          mpesa_phone: mpesaPhone,
          amount_paid: fee
        })
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || "Could not submit payment code. Please check code format.");
      }

      // 2. Synchronize frontend local client (localStorage / Supabase Simulator)
      const { error } = await supabase
        .from("listing_payments")
        .insert({
          property_id: propertyId,
          landlord_id: profile.id,
          amount: fee,
          property_type: selectedType,
          mpesa_code: mpesaCode.trim().toUpperCase(),
          mpesa_checkout_request_id: `MANUAL-${propertyId}-${mpesaCode.trim().toUpperCase()}`,
          amount_paid: fee,
          payer_phone: mpesaPhone || null,
          status: "pending"
        });

      if (error) {
        console.error("Failed to update local property state:", error);
      }

      setPaymentStatus("pending_verification");
    } catch (err: any) {
      console.error("Payment submission failed:", err);
      setPaymentError(err.message || "Connection to verification server failed.");
    } finally {
      setPaying(false);
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

          <PhotoUpload propertyId={propertyId || tempId} photos={uploadedImages} onChange={(urls) => setUploadedImages(urls)} />

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

      {/* STEP 5: MANUAL M-PESA CHECKOUT PORTAL */}
      {step === 5 && (
        <div className="space-y-6 bg-white p-8 rounded-2xl border border-stone-200 shadow-xl relative overflow-hidden">
          {/* Cover glow */}
          <div className="absolute top-0 right-0 h-48 w-48 bg-amber-500/5 rounded-full blur-2xl"></div>

          {paymentStatus === "verified" ? (
            /* CONGRATULATIONS / VERIFIED PAGE */
            <div className="text-center py-6 space-y-5 animate-fade-in">
              <div className="mx-auto h-16 w-16 bg-emerald-50 text-emerald-600 border-2 border-emerald-300 rounded-full flex items-center justify-center shadow-lg">
                <Check className="h-9 w-9 stroke-[3]" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-black text-stone-950 font-sans">Listing Activated!</h2>
                <p className="text-stone-500 text-sm leading-relaxed max-w-sm mx-auto">
                  Hongera! We verified your manual payment of <span className="font-bold text-stone-900">KSh {getListingFee(selectedType)}</span>. Your property listing is now live on NestList and alert subscribers have been notified!
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
          ) : paymentStatus === "pending_verification" ? (
            /* PENDING REVIEW PAGE */
            <div className="text-center py-6 space-y-5 animate-fade-in">
              <div className="mx-auto h-16 w-16 bg-amber-50 text-amber-600 border-2 border-amber-300 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                <Clock className="h-9 w-9" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-black text-stone-950 font-sans">Verification in Progress</h2>
                <p className="text-stone-500 text-sm leading-relaxed max-w-sm mx-auto">
                  Your payment submission is received! Our administrators are manually cross-referencing your code <span className="font-mono font-bold text-stone-950">{mpesaCode.toUpperCase()}</span>.
                </p>
                <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4 text-xs text-amber-900 font-medium max-w-md mx-auto mt-4 space-y-1">
                  <p>✓ Code Submitted: {mpesaCode.toUpperCase()}</p>
                  <p>✓ Amount to Verify: KSh {getListingFee(selectedType)}</p>
                  <p className="text-stone-500 font-normal pt-1">
                    Manual verification takes between 1 to 2 hours during normal business hours. Your listing will automatically go live once approved!
                  </p>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-center gap-3">
                <button
                  onClick={() => navigate("/dashboard")}
                  className="py-3 px-6 bg-stone-900 hover:bg-stone-800 text-white font-bold text-sm rounded-xl shadow transition"
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          ) : paymentStatus === "rejected" ? (
            /* REJECTED STATE */
            <div className="text-center py-6 space-y-5 animate-fade-in">
              <div className="mx-auto h-16 w-16 bg-red-50 text-red-600 border-2 border-red-300 rounded-full flex items-center justify-center shadow-lg">
                <X className="h-9 w-9" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-black text-stone-950 font-sans">Verification Rejected</h2>
                <p className="text-stone-500 text-sm leading-relaxed max-w-sm mx-auto">
                  Our administrators could not verify your manual transaction code.
                </p>
                <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-xs text-red-800 font-medium max-w-md mx-auto">
                  <p className="font-bold">Reason for rejection:</p>
                  <p className="text-stone-600 font-normal mt-1">
                    The provided transaction reference code is incorrect or could not be found on our statement.
                  </p>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={() => {
                    setPaymentStatus("idle");
                    setMpesaCode("");
                  }}
                  className="py-3 px-6 bg-stone-900 hover:bg-stone-800 text-white font-bold text-sm rounded-xl shadow transition"
                >
                  Re-submit Confirmation Code
                </button>
              </div>
            </div>
          ) : (
            /* ACTIVE MANUAL PAYMENT SUBMISSION BOX */
            <div className="space-y-6">
              <div className="flex items-center space-x-3 border-b border-stone-100 pb-4">
                <div className="h-10 w-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
                  M
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-stone-900 leading-tight">Manual M-Pesa Payment</h2>
                  <p className="text-xs text-stone-400 font-semibold uppercase tracking-wider">Paybill Verification Flow</p>
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

              {/* PAYBILL INSTRUCTIONS PANEL */}
              <div className="bg-amber-50/40 rounded-xl border border-amber-150 p-5 space-y-4">
                <h3 className="text-stone-900 font-extrabold text-xs uppercase tracking-wider">M-Pesa Payment Steps:</h3>
                <div className="grid grid-cols-2 gap-4 pb-1">
                  <div className="bg-white border border-amber-200/60 p-3 rounded-lg text-center">
                    <p className="text-[10px] text-stone-400 uppercase font-bold">Paybill Number</p>
                    <p className="text-lg font-mono font-black text-amber-900">247247</p>
                  </div>
                  <div className="bg-white border border-amber-200/60 p-3 rounded-lg text-center">
                    <p className="text-[10px] text-stone-400 uppercase font-bold">Account Number</p>
                    <p className="text-sm font-mono font-extrabold text-stone-950 truncate">0715185037</p>
                  </div>
                </div>
                <ol className="text-xs text-stone-600 space-y-2 list-decimal pl-4 leading-normal">
                  <li>Go to your M-Pesa menu and select <span className="font-bold">Lipa na M-Pesa</span>.</li>
                  <li>Select <span className="font-bold">Paybill</span> and enter Business Number <span className="font-bold text-stone-950">247247</span>.</li>
                  <li>Enter Account Number <span className="font-bold text-stone-950">0715185037</span>.</li>
                  <li>Enter the exact amount of <span className="font-bold text-emerald-700">KSh {getListingFee(selectedType)}</span>.</li>
                  <li>Complete the payment and wait for the Safaricom confirmation SMS.</li>
                  <li>Enter the 10-character transaction code below to submit for validation.</li>
                </ol>
              </div>

              {/* MANUAL PAYMENT SUBMISSION FORM */}
              <form onSubmit={handleSubmitManualPayment} className="space-y-5">
                {paymentError && (
                  <div className="p-4 bg-red-50 text-red-800 border border-red-150 rounded-xl text-xs sm:text-sm font-medium flex items-start space-x-2">
                    <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">{paymentError}</p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                    M-Pesa Confirmation Code (Required)
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-stone-400" />
                    <input
                      type="text"
                      value={mpesaCode}
                      onChange={(e) => setMpesaCode(e.target.value)}
                      placeholder="e.g. QBG582Y78X"
                      maxLength={12}
                      className="w-full pl-10 pr-4 py-3 border border-stone-300 rounded-xl text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-stone-400">
                    Enter the exact transaction reference code from your Safaricom SMS.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                    Sender Phone Number (Optional)
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-stone-400" />
                    <input
                      type="tel"
                      value={mpesaPhone}
                      onChange={(e) => setMpesaPhone(e.target.value)}
                      placeholder="e.g. 0715185037"
                      className="w-full pl-10 pr-4 py-3 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                  <p className="text-[10px] text-stone-400">
                    The Safaricom number that initiated the Paybill payment to help verify.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={paying || !mpesaCode}
                  className="w-full flex items-center justify-center space-x-2 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {paying ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-5 w-5" />
                      <span>Submit Payment Confirmation Code</span>
                    </>
                  )}
                </button>

                <p className="text-center text-[10px] text-stone-400 max-w-sm mx-auto leading-relaxed">
                  By submitting, you represent that you have completed this transaction. Intentionally submitting false codes may lead to account ban.
                </p>
              </form>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
