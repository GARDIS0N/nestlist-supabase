import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { User, Phone, CheckCircle2, AlertCircle, Camera, Loader2, Trash2 } from "lucide-react";

export const Onboarding: React.FC = () => {
  const { session, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const queryParams = new URLSearchParams(window.location.search);
  const isEditing = queryParams.get("edit") === "true";

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"landlord" | "tenant">("tenant");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // If user already has a complete profile and is NOT in editing mode, redirect to correct starting page
    if (!isEditing && profile && profile.role) {
      if (profile.role === "landlord") {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    }
  }, [profile, isEditing, navigate]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
      setRole(profile.role || "tenant");
      setAvatarUrl(profile.avatar_url || null);
    } else if (session?.user) {
      setFullName(session.user.user_metadata?.full_name || "");
    }
  }, [profile, session]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!session?.user?.id) return;
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type (JPG, PNG, WEBP)
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      alert("Only JPG, PNG, and WEBP images are allowed.");
      return;
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Avatar image file size must be less than 5MB.");
      return;
    }

    setAvatarUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `avatar_${Date.now()}.${fileExt}`;
      const filePath = `${session.user.id}/${fileName}`;

      // Validate path on frontend before upload to prevent uploading to another user's folder
      if (!filePath.startsWith(session.user.id + "/")) {
        throw new Error("Unauthorized file path: destination must reside in your user folder.");
      }

      const { error: uploadErr } = await supabase.storage
        .from("App-files")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadErr) throw uploadErr;

      const { data } = supabase.storage
        .from("App-files")
        .getPublicUrl(filePath);

      if (data?.publicUrl) {
        setAvatarUrl(data.publicUrl);
        
        // If profile exists and is editing, write to db immediately
        if (profile) {
          await supabase
            .from("profiles")
            .update({ avatar_url: data.publicUrl })
            .eq("id", session.user.id);
          await refreshProfile();
        }
      }
    } catch (err: any) {
      console.error("Avatar upload failed:", err);
      alert(`Avatar upload failed: ${err.message || "Unknown error"}`);
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleAvatarRemove = async () => {
    if (!session?.user?.id || !avatarUrl) return;

    const getPathFromUrl = (url: string): string | null => {
      const bucketToken = "App-files/";
      const idx = url.indexOf(bucketToken);
      if (idx !== -1) {
        return decodeURIComponent(url.substring(idx + bucketToken.length));
      }
      return null;
    };

    const filePath = getPathFromUrl(avatarUrl);
    if (filePath) {
      if (!filePath.startsWith(session.user.id + "/")) {
        console.warn("Unauthorized delete attempt on avatar.");
        return;
      }
      try {
        await supabase.storage.from("App-files").remove([filePath]);
      } catch (err) {
        console.error("Failed to delete avatar from storage:", err);
      }
    }

    setAvatarUrl(null);
    if (profile) {
      await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", session.user.id);
      await refreshProfile();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) {
      setError("No active session found. Please log in first.");
      return;
    }
    if (!fullName || !phone || !role) {
      setError("Please complete all fields.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Insert or Update profile row using upsert
      const { error: upsertError } = await supabase
        .from("profiles")
        .upsert({
          id: session.user.id,
          full_name: fullName,
          phone: phone,
          role: role,
          avatar_url: avatarUrl,
          created_at: profile?.created_at || new Date().toISOString()
        });

      if (upsertError) throw upsertError;

      // Ensure local state context updates
      await refreshProfile();

      if (!isEditing) {
        // Send simulated welcome SMS on first onboarding
        try {
          await supabase.functions.invoke("send-sms", {
            body: {
              type: `welcome_${role}`,
              phone: phone,
              data: { name: fullName }
            }
          });
        } catch (smsErr) {
          console.warn("SMS greeting trigger skipped during onboarding:", smsErr);
        }
      }

      // Redirect
      if (role === "landlord") {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } catch (err: any) {
      console.error("Onboarding failed:", err);
      setError(err.message || "Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-stone-50 px-4 py-12">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl border border-stone-200 shadow-xl shadow-stone-100">
        
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-md shadow-amber-600/10">
            <span className="font-sans text-2xl font-black">N</span>
          </div>
          <h2 className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight text-stone-950">
            {isEditing ? "Profile Settings" : "One last step!"}
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-stone-500 font-medium">
            {isEditing ? "Update your personal details and profile picture." : "Complete your profile to unlock Nestlist's features."}
          </p>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 p-4 border border-red-100 flex items-start space-x-3 text-red-700 text-xs sm:text-sm">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
            <p className="font-medium leading-relaxed">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Avatar Profile Picture Upload */}
          <div className="flex flex-col items-center justify-center space-y-2 py-2">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block text-center">
              Profile Photo
            </label>
            <div className="relative group">
              <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-amber-600 bg-stone-100 shadow-md flex items-center justify-center relative">
                {avatarUploading ? (
                  <div className="absolute inset-0 bg-stone-900/40 flex items-center justify-center text-white z-10">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : null}
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Profile preview"
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="text-stone-400">
                    <User className="h-10 w-10" />
                  </div>
                )}
              </div>
              
              {/* Camera Icon Overlay to Upload */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                className="absolute bottom-0 right-0 p-2 bg-amber-600 hover:bg-amber-700 text-white rounded-full shadow-lg border border-white transition transform hover:scale-105"
                title="Upload Photo"
              >
                <Camera className="h-4 w-4" />
              </button>
              
              {avatarUrl && !avatarUploading && (
                <button
                  type="button"
                  onClick={handleAvatarRemove}
                  className="absolute top-0 right-0 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg border border-white transition transform hover:scale-105"
                  title="Remove Photo"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarUpload}
              accept="image/png, image/jpeg, image/jpg, image/webp"
              className="hidden"
            />
            <p className="text-[10px] text-stone-400 text-center font-medium">
              JPG, PNG or WEBP up to 5MB
            </p>
          </div>

          {/* Role selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
              Which describes you best?
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setRole("tenant")}
                className={`py-3 px-4 rounded-xl border-2 text-center transition font-bold text-sm flex flex-col items-center space-y-1 ${
                  role === "tenant"
                    ? "border-amber-600 bg-amber-50/40 text-amber-900"
                    : "border-stone-200 text-stone-500 hover:border-stone-300"
                }`}
              >
                <span className="text-lg">🏡</span>
                <span>Tenant / Rental Finder</span>
              </button>
              <button
                type="button"
                onClick={() => setRole("landlord")}
                className={`py-3 px-4 rounded-xl border-2 text-center transition font-bold text-sm flex flex-col items-center space-y-1 ${
                  role === "landlord"
                    ? "border-amber-600 bg-amber-50/40 text-amber-900"
                    : "border-stone-200 text-stone-500 hover:border-stone-300"
                }`}
              >
                <span className="text-lg">🔑</span>
                <span>Landlord / Land Owner</span>
              </button>
            </div>
          </div>

          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
              Preferred Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 h-5 w-5 text-stone-400" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Peter Kamau"
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                required
              />
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
              M-Pesa Connected Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-3 h-5 w-5 text-stone-400" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 0712345678"
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                required
              />
            </div>
            <p className="text-[11px] text-stone-400 font-medium">
              Important: This phone receives inquiries, listing receipts, and alerts!
            </p>
          </div>

          {/* Complete Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 text-sm font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-lg shadow-amber-600/10 transition duration-150 disabled:opacity-50 pt-1"
          >
            {loading ? (
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5" />
                <span>{isEditing ? "Save Profile Changes" : "Complete Onboarding"}</span>
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
};
