import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { uploadAvatar } from "../lib/storage";
import { 
  User, Mail, Phone, Shield, Lock, Bell, Check, Loader2, 
  Save, AlertTriangle, CheckCircle, KeyRound, Smartphone, AtSign,
  Camera, Upload
} from "lucide-react";

export const Profile: React.FC = () => {
  const { profile, refreshProfile, updateProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Avatar Upload State
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarSuccess, setAvatarSuccess] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  // Basic Info Form State
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [updatingInfo, setUpdatingInfo] = useState(false);
  const [infoSuccess, setInfoSuccess] = useState(false);
  const [infoError, setInfoError] = useState<string | null>(null);

  // Notification Preferences State
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(true);
  const [updatingPrefs, setUpdatingPrefs] = useState(false);
  const [prefsSuccess, setPrefsSuccess] = useState(false);
  const [prefsError, setPrefsError] = useState<string | null>(null);

  // Password Update State
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Load initial profile data
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
      
      // Load notification preferences from database, default to true
      setEmailNotifications(profile.email_notifications !== false);
      setSmsNotifications(profile.sms_notifications !== false);
    }
  }, [profile]);

  // Generate initials for avatar placeholder
  const getInitials = (name?: string | null) => {
    if (!name || !name.trim()) return "NL";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Handle Avatar Image Selection & Upload
  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    // Reset input so user can re-select same file if needed
    if (fileInputRef.current) fileInputRef.current.value = "";

    // 1. Client-side Size Validation (2MB)
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("File size exceeds 2MB. Please select an image under 2MB.");
      return;
    }

    // 2. Client-side MIME Type Validation
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setAvatarError("Unsupported file type. Please upload a JPG, PNG, or WebP image.");
      return;
    }

    setUploadingAvatar(true);
    setAvatarError(null);
    setAvatarSuccess(false);

    try {
      // 3. Upload & Auto-Crop to 512x512 square via storage helper
      const publicUrl = await uploadAvatar(file, profile.id);

      // 4. Update avatar_url on profiles table via updateProfile
      const { error: dbError } = await updateProfile({
        avatar_url: publicUrl,
      });

      if (dbError) throw new Error(dbError);

      setAvatarSuccess(true);
      setTimeout(() => setAvatarSuccess(false), 4000);
    } catch (err: any) {
      console.error("Avatar upload error:", err);
      setAvatarError(err.message || "Failed to upload avatar. Please try again.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Handle Basic Info Save
  const handleUpdateInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!fullName.trim()) {
      setInfoError("Full name cannot be empty");
      return;
    }

    setUpdatingInfo(true);
    setInfoError(null);
    setInfoSuccess(false);

    try {
      // Update profile info via AuthContext helper
      const { error } = await updateProfile({
        full_name: fullName.trim(),
        phone: phone.trim(),
      });

      if (error) throw new Error(error);

      setInfoSuccess(true);
      setTimeout(() => setInfoSuccess(false), 4000);
    } catch (err: any) {
      console.error("Failed to update profile info:", err);
      setInfoError(err.message || "Failed to update profile info. Please try again.");
    } finally {
      setUpdatingInfo(false);
    }
  };

  // Handle Notification Preferences Toggle
  const handleToggleNotifications = async (type: "email" | "sms", value: boolean) => {
    if (!profile) return;

    // Optimistic UI update
    if (type === "email") setEmailNotifications(value);
    if (type === "sms") setSmsNotifications(value);

    setUpdatingPrefs(true);
    setPrefsError(null);
    setPrefsSuccess(false);

    try {
      const updates = {
        email_notifications: type === "email" ? value : emailNotifications,
        sms_notifications: type === "sms" ? value : smsNotifications,
      };

      const { error } = await updateProfile(updates);

      // If we got a PG column missing error (e.g. migration hasn't run on Supabase),
      // fallback gracefully to storing it in localStorage but still show success
      if (error) {
        console.warn("Could not write notification preferences to database, falling back to localStorage:", error);
        localStorage.setItem(`nestlist-prefs-${profile.id}`, JSON.stringify(updates));
      }

      await refreshProfile();
      setPrefsSuccess(true);
      setTimeout(() => setPrefsSuccess(false), 3000);
    } catch (err: any) {
      console.error("Failed to update notification preferences:", err);
      setPrefsError("Failed to persist notification settings");
    } finally {
      setUpdatingPrefs(false);
    }
  };

  // Handle Password Update
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setPasswordError("Please enter a new password");
      return;
    }
    if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters long");
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    setUpdatingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(false);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setPassword("");
      setConfirmPassword("");
      setPasswordSuccess(true);
      setTimeout(() => setPasswordSuccess(false), 5000);
    } catch (err: any) {
      console.error("Password update error:", err);
      setPasswordError(err.message || "Failed to update password. Please try again.");
    } finally {
      setUpdatingPassword(false);
    }
  };

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600 mx-auto mb-4" />
        <p className="text-stone-600 font-medium">Loading user profile details...</p>
      </div>
    );
  }

  const roleLabels: Record<string, string> = {
    tenant: "Verified Tenant",
    landlord: "Property Landlord",
    caretaker: "Property Caretaker",
    agent: "Real Estate Agent",
    admin: "Platform Administrator",
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 font-sans" id="user-profile-page">
      {/* Top Welcome Card with Avatar Upload */}
      <div className="bg-white border border-stone-200/80 rounded-2xl p-6 mb-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-center gap-5 text-center sm:text-left">
          
          {/* Avatar with click-to-upload & hover badge */}
          <div className="relative group shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="relative block h-20 w-20 rounded-full focus:outline-none focus:ring-2 focus:ring-[#1E6B4A] focus:ring-offset-2 overflow-hidden shadow-md group-hover:opacity-90 transition cursor-pointer"
              title="Click to change profile picture"
            >
              {profile.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt={profile.full_name || "Profile"} 
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="h-full w-full bg-[#F0FDF4] border-2 border-[#1E6B4A]/20 flex items-center justify-center text-[#1E6B4A] font-bold text-xl font-sans">
                  {getInitials(profile.full_name)}
                </div>
              )}

              {/* Uploading Spinner Overlay */}
              {uploadingAvatar && (
                <div className="absolute inset-0 bg-stone-900/60 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                </div>
              )}

              {/* Hover overlay hint */}
              {!uploadingAvatar && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                  <Camera className="h-5 w-5 mb-0.5" />
                  <span className="text-[9px] font-bold tracking-tight">Change</span>
                </div>
              )}
            </button>

            {/* Quick Camera Icon Badge */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute -bottom-1 -right-1 h-7 w-7 bg-[#1E6B4A] hover:bg-[#165238] text-white rounded-full flex items-center justify-center shadow-md border-2 border-white transition active:scale-95 cursor-pointer"
              title="Upload photo"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>

            {/* Hidden File Input (Accepts image/jpeg, image/png, image/webp) */}
            <input 
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarSelect}
              className="hidden"
            />
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <h1 className="text-xl font-bold text-stone-900 tracking-tight leading-snug">
                {profile.full_name || "NestList User"}
              </h1>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="text-xs font-semibold text-[#1E6B4A] hover:text-[#165238] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Upload className="h-3 w-3" />
                <span>Change photo</span>
              </button>
            </div>

            <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-1.5">
              <Shield className="h-3.5 w-3.5 text-primary-600" />
              <span className="text-xs font-semibold text-primary-800 uppercase tracking-wider bg-primary-50 px-2.5 py-0.5 rounded-full border border-primary-200/40">
                {roleLabels[profile.role || "tenant"] || "Tenant"}
              </span>
            </div>

            <p className="text-[11px] text-stone-400 mt-1">
              JPG, PNG, or WebP (max 2MB). Auto-cropped to 512×512px.
            </p>
          </div>
        </div>
        
        <div className="text-stone-500 text-xs text-center md:text-right shrink-0">
          <p className="font-medium">Account ID: <span className="font-mono text-stone-700">{profile.id.substring(0, 12)}...</span></p>
          <p className="mt-1">Member since: {new Date(profile.created_at).toLocaleDateString('en-KE', { dateStyle: 'medium' })}</p>
        </div>
      </div>

      {/* Avatar feedback banners */}
      {avatarSuccess && (
        <div className="mb-6 flex items-center gap-2.5 p-3.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-sm animate-fade-in shadow-sm">
          <CheckCircle className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
          <p className="font-medium">Profile picture updated successfully!</p>
        </div>
      )}

      {avatarError && (
        <div className="mb-6 flex items-center justify-between gap-3 p-3.5 bg-rose-50 text-rose-800 rounded-xl border border-rose-200 text-sm animate-fade-in shadow-sm">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-4.5 w-4.5 text-rose-600 shrink-0" />
            <p className="font-medium">{avatarError}</p>
          </div>
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()}
            className="text-xs font-bold text-rose-900 underline hover:text-rose-950 shrink-0 cursor-pointer"
          >
            Retry Upload
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left column / main settings block */}
        <div className="md:col-span-2 space-y-8">
          
          {/* Section 1: Contact Details Form */}
          <div className="bg-white border border-stone-200/80 rounded-2xl shadow-sm p-6" id="profile-contact-details">
            <div className="flex items-center gap-2 mb-5 pb-3 border-b border-stone-100">
              <User className="h-5 w-5 text-emerald-700" />
              <h2 className="text-base font-bold text-stone-900">Personal Information</h2>
            </div>

            <form onSubmit={handleUpdateInfo} className="space-y-4">
              {infoSuccess && (
                <div className="flex items-center gap-2.5 p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100 text-sm animate-fade-in">
                  <CheckCircle className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                  <p className="font-medium">Contact details updated successfully!</p>
                </div>
              )}

              {infoError && (
                <div className="flex items-center gap-2.5 p-3 bg-rose-50 text-rose-800 rounded-xl border border-rose-100 text-sm animate-fade-in">
                  <AlertTriangle className="h-4.5 w-4.5 text-rose-600 shrink-0" />
                  <p>{infoError}</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Kelvin Mutua"
                      className="w-full pl-9 pr-4 py-2 text-sm bg-stone-50/50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E6B4A]/20 focus:border-[#1E6B4A] transition-all font-medium text-stone-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +254 712 345678"
                      className="w-full pl-9 pr-4 py-2 text-sm bg-stone-50/50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E6B4A]/20 focus:border-[#1E6B4A] transition-all font-medium text-stone-800"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                  Email Address (Unchangeable)
                </label>
                <div className="relative opacity-65">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                  <input
                    type="email"
                    value={profile.email || ""}
                    disabled
                    className="w-full pl-9 pr-4 py-2 text-sm bg-stone-100 border border-stone-200 rounded-xl text-stone-600 font-medium cursor-not-allowed"
                  />
                </div>
                <span className="block text-[11px] text-stone-400 mt-1 font-medium">
                  Your email is managed securely via auth credentials.
                </span>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={updatingInfo}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-800 to-emerald-700 hover:from-emerald-750 hover:to-emerald-650 text-white font-medium text-xs py-2 px-5 rounded-full shadow-sm hover:shadow transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {updatingInfo ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Section 2: Update Password Form */}
          <div className="bg-white border border-stone-200/80 rounded-2xl shadow-sm p-6" id="profile-password-change">
            <div className="flex items-center gap-2 mb-5 pb-3 border-b border-stone-100">
              <Lock className="h-5 w-5 text-primary-700" />
              <h2 className="text-base font-bold text-stone-900">Security & Password</h2>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              {passwordSuccess && (
                <div className="flex items-center gap-2.5 p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100 text-sm animate-fade-in">
                  <CheckCircle className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                  <p className="font-medium">Password updated securely!</p>
                </div>
              )}

              {passwordError && (
                <div className="flex items-center gap-2.5 p-3 bg-rose-50 text-rose-800 rounded-xl border border-rose-100 text-sm animate-fade-in">
                  <AlertTriangle className="h-4.5 w-4.5 text-rose-600 shrink-0" />
                  <p>{passwordError}</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full pl-9 pr-4 py-2 text-sm bg-stone-50/50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E6B4A]/20 focus:border-[#1E6B4A] transition-all font-medium text-stone-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className="w-full pl-9 pr-4 py-2 text-sm bg-stone-50/50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E6B4A]/20 focus:border-[#1E6B4A] transition-all font-medium text-stone-800"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={updatingPassword}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-stone-800 to-stone-750 hover:from-stone-750 hover:to-stone-700 text-white font-medium text-xs py-2 px-5 rounded-full shadow-sm hover:shadow transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {updatingPassword ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-3.5 w-3.5" />
                      <span>Update Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

        </div>

        {/* Right column / Alerts, metadata, preferences */}
        <div className="space-y-8">
          
          {/* Section 3: Notification Preferences */}
          <div className="bg-white border border-stone-200/80 rounded-2xl shadow-sm p-6" id="profile-notification-preferences">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-stone-100">
              <Bell className="h-5 w-5 text-primary-600" />
              <h2 className="text-base font-bold text-stone-900">Notifications</h2>
            </div>

            <p className="text-stone-500 text-xs leading-relaxed mb-6 font-medium">
              Configure how you wish to receive transaction receipts, listing verification alerts, and inquiry updates.
            </p>

            <div className="space-y-5">
              {/* Email Toggle */}
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <AtSign className="h-4 w-4 text-stone-400" />
                    <span className="text-sm font-semibold text-stone-800">Email Alerts</span>
                  </div>
                  <p className="text-[11px] text-stone-400 font-medium">
                    Inquiry replies, payments confirmation & invoices.
                  </p>
                </div>
                
                <button
                  onClick={() => handleToggleNotifications("email", !emailNotifications)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    emailNotifications ? "bg-emerald-700" : "bg-stone-200"
                  }`}
                  role="switch"
                  aria-checked={emailNotifications}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      emailNotifications ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* SMS Toggle */}
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <Smartphone className="h-4 w-4 text-stone-400" />
                    <span className="text-sm font-semibold text-stone-800">SMS Alerts</span>
                  </div>
                  <p className="text-[11px] text-stone-400 font-medium">
                    Immediate SMS alerts for inquiries & critical updates.
                  </p>
                </div>
                
                <button
                  onClick={() => handleToggleNotifications("sms", !smsNotifications)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    smsNotifications ? "bg-emerald-700" : "bg-stone-200"
                  }`}
                  role="switch"
                  aria-checked={smsNotifications}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      smsNotifications ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            {prefsSuccess && (
              <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-700 font-semibold bg-emerald-50 py-1.5 px-2.5 rounded-lg border border-emerald-100">
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span>Preferences updated!</span>
              </div>
            )}
          </div>

          {/* Quick Help Card */}
          <div className="bg-gradient-to-br from-stone-900 to-stone-850 text-white rounded-2xl p-5 shadow-md">
            <h3 className="text-sm font-bold tracking-tight mb-2 flex items-center gap-1.5 text-gold-400">
              <Shield className="h-4 w-4" />
              Need Assistance?
            </h3>
            <p className="text-stone-300 text-[11.5px] leading-relaxed mb-4">
              If you wish to change your role or require account deletion under Kenyan data protection regulations, please contact support.
            </p>
            <div className="border-t border-stone-800 pt-3 flex items-center justify-between text-[11px] font-semibold text-stone-300">
              <span>Support Email</span>
              <a href="mailto:support@nestlist.co.ke" className="text-gold-400 hover:underline">
                support@nestlist.co.ke
              </a>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
