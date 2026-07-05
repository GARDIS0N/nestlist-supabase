import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { 
  Shield, Landmark, Users, Home, RefreshCw, Check, X, 
  Loader2, ArrowLeft, Calendar, Coins, MapPin, User, Mail, 
  Phone, Eye, Power, AlertCircle, FileText, CheckCircle2 
} from "lucide-react";

export const AdminPanel: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (profile && profile.role !== 'admin') {
      navigate('/', { replace: true });
    }
  }, [profile]);

  const [activeTab, setActiveTab] = useState<"payments" | "listings" | "users">("payments");
  const [loading, setLoading] = useState(true);

  // States
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [allListings, setAllListings] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  // Toast message state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Helper to show custom notification toast
  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  if (profile?.role !== 'admin') {
    return null;
  }

  // Data Fetching functions
  const fetchPendingPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('listing_payments')
        .select(`
          *,
          properties(title, type, price, location),
          profiles!landlord_id(full_name, phone)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setPendingPayments(data || []);
    } catch (err: any) {
      console.error("Failed to fetch pending payments:", err);
      showToast("Error loading pending payments: " + err.message, "error");
    }
  };

  const fetchAllListings = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*, profiles!landlord_id(full_name, phone)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAllListings(data || []);
    } catch (err: any) {
      console.error("Failed to fetch listings:", err);
      showToast("Error loading listings: " + err.message, "error");
    }
  };

  const fetchAllUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAllUsers(data || []);
    } catch (err: any) {
      console.error("Failed to fetch users:", err);
      showToast("Error loading users: " + err.message, "error");
    }
  };

  // Consolidated loading handler based on active tab
  const refreshData = async () => {
    setLoading(true);
    if (activeTab === "payments") {
      await fetchPendingPayments();
    } else if (activeTab === "listings") {
      await fetchAllListings();
    } else if (activeTab === "users") {
      await fetchAllUsers();
    }
    setLoading(false);
  };

  // Trigger initial fetch when tab changes
  useEffect(() => {
    if (profile?.role === 'admin') {
      refreshData();
    }
  }, [activeTab, profile]);

  // Action: Approve Payment
  const handleApprovePayment = async (payment: any) => {
    try {
      // 1. Update payment status to confirmed
      const { error: paymentError } = await supabase
        .from('listing_payments')
        .update({ 
          status: 'confirmed', 
          confirmed_at: new Date().toISOString() 
        })
        .eq('id', payment.id);

      if (paymentError) throw paymentError;

      // 2. Activate the property listing and set its expiry to 30 days
      const { error: propertyError } = await supabase
        .from('properties')
        .update({ 
          is_active: true, 
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('id', payment.property_id);

      if (propertyError) throw propertyError;

      // Notify and filter the local UI state
      showToast("✅ Listing approved and activated!", "success");
      setPendingPayments(prev => prev.filter(p => p.id !== payment.id));
    } catch (err: any) {
      console.error("Failed to approve listing:", err);
      showToast("Approval failed: " + err.message, "error");
    }
  };

  // Action: Reject Payment
  const handleRejectPayment = async (payment: any) => {
    try {
      const { error } = await supabase
        .from('listing_payments')
        .update({ 
          status: 'failed', 
          failure_reason: 'Rejected by admin' 
        })
        .eq('id', payment.id);

      if (error) throw error;

      showToast("❌ Payment rejected", "info");
      setPendingPayments(prev => prev.filter(p => p.id !== payment.id));
    } catch (err: any) {
      console.error("Failed to reject payment:", err);
      showToast("Rejection failed: " + err.message, "error");
    }
  };

  // Action: Toggle Listing Activation (Tab 2)
  const handleToggleListingActive = async (property: any) => {
    const nextActive = !property.is_active;
    try {
      // Setup payload, including expires_at updates if activating
      const payload: any = { is_active: nextActive };
      if (nextActive) {
        payload.expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      } else {
        payload.expires_at = null;
      }

      const { error } = await supabase
        .from('properties')
        .update(payload)
        .eq('id', property.id);

      if (error) throw error;

      showToast(`Property listing successfully ${nextActive ? "activated" : "deactivated"}!`, "success");
      
      // Update local state instantly
      setAllListings(prev => prev.map(p => 
        p.id === property.id 
          ? { ...p, is_active: nextActive, expires_at: payload.expires_at } 
          : p
      ));
    } catch (err: any) {
      console.error("Failed to toggle property state:", err);
      showToast("Error updating listing status: " + err.message, "error");
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 font-sans" id="admin-panel-page">
      {/* Toast Notification Container */}
      {toast && (
        <div 
          className={`fixed top-20 right-4 z-50 flex items-center gap-2.5 py-3 px-5 rounded-xl border shadow-lg text-sm transition-all duration-300 animate-fade-in ${
            toast.type === "success" 
              ? "bg-emerald-50 border-emerald-100 text-emerald-800"
              : toast.type === "info"
              ? "bg-stone-800 border-stone-700 text-stone-100"
              : "bg-rose-50 border-rose-100 text-rose-800"
          }`}
          id="admin-toast-message"
        >
          {toast.type === "success" && <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0" />}
          {toast.type === "info" && <AlertCircle className="h-4.5 w-4.5 text-gold-500 shrink-0" />}
          {toast.type === "error" && <AlertCircle className="h-4.5 w-4.5 text-rose-600 shrink-0" />}
          <p className="font-semibold">{toast.message}</p>
        </div>
      )}

      {/* Header Panel */}
      <div className="bg-white border border-stone-200/80 rounded-2xl p-6 mb-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary-50 text-primary-800 rounded-lg border border-primary-200/50">
              <Shield className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold text-stone-900 tracking-tight">Nestlist Admin Hub</h1>
          </div>
          <p className="text-stone-500 text-xs mt-1 font-medium">
            Verified Administrator Terminal • Managed by <span className="font-mono text-stone-750 font-bold">gardisonkirui11@gmail.com</span>
          </p>
        </div>

        <button
          onClick={refreshData}
          disabled={loading}
          className="flex items-center gap-1.5 border border-stone-200 hover:bg-stone-50 text-stone-600 hover:text-stone-900 font-medium text-xs py-2 px-4 rounded-full transition active:scale-95 cursor-pointer shrink-0 disabled:opacity-45"
          id="admin-global-refresh-btn"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-primary-600" : ""}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Segmented Tab Controls */}
      <div className="flex border-b border-stone-200 mb-8 overflow-x-auto shrink-0 pb-px gap-2" id="admin-segmented-tabs">
        <button
          onClick={() => setActiveTab("payments")}
          className={`relative py-3 px-4 font-sans font-bold text-xs uppercase tracking-wider transition-all duration-150 border-b-2 whitespace-nowrap flex items-center gap-2 ${
            activeTab === "payments" 
              ? "border-emerald-700 text-emerald-800" 
              : "border-transparent text-stone-500 hover:text-stone-800"
          }`}
          id="tab-btn-pending-payments"
        >
          <Landmark className="h-4 w-4 shrink-0" />
          <span>Pending Payments</span>
          <span className={`text-[10px] py-0.5 px-2 rounded-full font-bold ${
            activeTab === "payments"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-100"
              : "bg-stone-100 text-stone-600"
          }`}>
            {pendingPayments.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("listings")}
          className={`relative py-3 px-4 font-sans font-bold text-xs uppercase tracking-wider transition-all duration-150 border-b-2 whitespace-nowrap flex items-center gap-2 ${
            activeTab === "listings" 
              ? "border-emerald-700 text-emerald-800" 
              : "border-transparent text-stone-500 hover:text-stone-800"
          }`}
          id="tab-btn-all-listings"
        >
          <Home className="h-4 w-4 shrink-0" />
          <span>All Listings</span>
          <span className="text-[10px] bg-stone-100 text-stone-600 py-0.5 px-2 rounded-full font-bold">
            {allListings.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("users")}
          className={`relative py-3 px-4 font-sans font-bold text-xs uppercase tracking-wider transition-all duration-150 border-b-2 whitespace-nowrap flex items-center gap-2 ${
            activeTab === "users" 
              ? "border-emerald-700 text-emerald-800" 
              : "border-transparent text-stone-500 hover:text-stone-800"
          }`}
          id="tab-btn-all-users"
        >
          <Users className="h-4 w-4 shrink-0" />
          <span>All Users</span>
          <span className="text-[10px] bg-stone-100 text-stone-600 py-0.5 px-2 rounded-full font-bold">
            {allUsers.length}
          </span>
        </button>
      </div>

      {/* Main Tab Render Space */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-stone-200/80 rounded-2xl shadow-xs">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-700 mb-3" />
          <p className="text-stone-500 text-xs font-semibold uppercase tracking-wider">Syncing Database...</p>
        </div>
      ) : (
        <div id="admin-tab-content-container">
          
          {/* ==================== TAB 1: PENDING PAYMENTS ==================== */}
          {activeTab === "payments" && (
            <div>
              {pendingPayments.length === 0 ? (
                <div className="text-center py-16 px-4 bg-white border border-stone-200/80 rounded-2xl shadow-xs animate-fade-in" id="empty-payments-state">
                  <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 mb-4">
                    <Check className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-bold text-stone-900">All caught up! No pending payments.</h3>
                  <p className="text-stone-500 text-xs mt-1 max-w-sm mx-auto leading-relaxed">
                    All landlords' manual M-Pesa submissions have been successfully processed and cataloged.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="pending-payments-cards-grid">
                  {pendingPayments.map((payment) => (
                    <div 
                      key={payment.id} 
                      className="bg-white border border-stone-200/85 rounded-2xl shadow-sm hover:shadow transition-all duration-200 flex flex-col overflow-hidden animate-fade-in"
                      id={`payment-card-${payment.id}`}
                    >
                      {/* Card Top Banner / Status Indicator */}
                      <div className="bg-gold-500/5 px-4 py-3 border-b border-stone-100 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gold-850 bg-gold-50 border border-gold-200/40 py-0.5 px-2 rounded-full">
                          M-Pesa Verification Needed
                        </span>
                        <span className="text-[10px] text-stone-400 font-semibold font-mono">
                          {new Date(payment.created_at).toLocaleDateString("en-KE")}
                        </span>
                      </div>

                      {/* Card Content Area */}
                      <div className="p-5 flex-1 space-y-4">
                        {/* Landlord Contact Info */}
                        <div className="space-y-1">
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">Landlord Details</span>
                          <div className="flex items-center gap-1.5 text-stone-800">
                            <User className="h-4 w-4 text-stone-400 shrink-0" />
                            <p className="font-bold text-sm">{payment.profiles?.full_name || "Unknown Landlord"}</p>
                          </div>
                          <div className="flex items-center gap-1.5 text-stone-500 text-xs font-medium font-mono">
                            <Phone className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                            <span>{payment.profiles?.phone || "N/A"}</span>
                          </div>
                        </div>

                        {/* Property Details */}
                        <div className="space-y-1 pt-3 border-t border-stone-100">
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">Property Information</span>
                          <p className="font-bold text-sm text-stone-900 leading-snug">{payment.properties?.title || "Property Listing"}</p>
                          <div className="flex items-center gap-1 text-xs text-stone-500 font-semibold capitalize">
                            <MapPin className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                            <span>{payment.properties?.type || "Unit"} • {payment.properties?.location || "N/A"}</span>
                          </div>
                        </div>

                        {/* M-Pesa Transaction Code display */}
                        <div className="bg-stone-50/70 border border-stone-200/80 rounded-xl p-3.5 text-center space-y-1">
                          <span className="block text-[9.5px] font-bold uppercase tracking-widest text-stone-400">M-PESA Code</span>
                          <p className="text-lg font-black font-mono tracking-wider text-stone-900 uppercase">
                            {payment.mpesa_code || "N/A"}
                          </p>
                          {payment.payer_phone && (
                            <span className="block text-[10px] text-stone-400 font-mono">Sender: {payment.payer_phone}</span>
                          )}
                        </div>

                        {/* Expected fee vs submitted payment values */}
                        <div className="grid grid-cols-2 gap-3 pt-1 text-center">
                          <div className="p-2 border border-stone-100 rounded-lg">
                            <span className="block text-[9px] font-bold text-stone-400 uppercase">Amount Paid</span>
                            <span className="text-xs font-bold text-emerald-800">
                              KSh {(payment.amount_paid || 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="p-2 border border-stone-100 rounded-lg">
                            <span className="block text-[9px] font-bold text-stone-400 uppercase">Expected Fee</span>
                            <span className="text-xs font-bold text-stone-600">
                              KSh {(payment.amount || 0).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="px-4 py-3 bg-stone-50 border-t border-stone-100 grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleRejectPayment(payment)}
                          className="flex items-center justify-center gap-1 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs rounded-xl transition cursor-pointer border border-rose-200/40 active:scale-95"
                        >
                          <X className="h-3.5 w-3.5" />
                          <span>Reject</span>
                        </button>
                        
                        <button
                          onClick={() => handleApprovePayment(payment)}
                          className="flex items-center justify-center gap-1 py-2 bg-emerald-700 hover:bg-emerald-850 text-white font-semibold text-xs rounded-xl transition cursor-pointer shadow-sm active:scale-95"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Approve</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==================== TAB 2: ALL LISTINGS ==================== */}
          {activeTab === "listings" && (
            <div className="bg-white border border-stone-200/80 rounded-2xl shadow-sm overflow-hidden animate-fade-in" id="all-listings-table-container">
              {allListings.length === 0 ? (
                <div className="text-center py-16 text-stone-500 font-medium">No active or pending listings found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead className="bg-stone-50 text-stone-400 font-bold uppercase border-b border-stone-200">
                      <tr>
                        <th className="p-4">Title</th>
                        <th className="p-4">Type</th>
                        <th className="p-4">Price</th>
                        <th className="p-4">Landlord</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Expires</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-150 text-stone-700 font-medium">
                      {allListings.map((property) => (
                        <tr key={property.id} className="hover:bg-stone-50/40">
                          {/* Title & Location Column */}
                          <td className="p-4">
                            <p className="font-bold text-stone-900 max-w-xs truncate" title={property.title}>
                              {property.title}
                            </p>
                            <span className="block text-[10px] text-stone-400 font-medium">{property.location}</span>
                          </td>
                          {/* Type */}
                          <td className="p-4 text-stone-500 capitalize">{property.type || "Apartment"}</td>
                          {/* Price */}
                          <td className="p-4 font-mono font-bold text-stone-800">
                            KSh {(parseFloat(property.price) || 0).toLocaleString()}
                          </td>
                          {/* Landlord Info */}
                          <td className="p-4">
                            <p className="font-bold text-stone-900 text-xs">
                              {property.profiles?.full_name || "Unknown Landlord"}
                            </p>
                            <span className="block text-[10px] text-stone-400 font-mono">
                              {property.profiles?.phone || "N/A"}
                            </span>
                          </td>
                          {/* Status Badge */}
                          <td className="p-4">
                            <span className={`inline-block text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full ${
                              property.is_active 
                                ? "bg-emerald-50 text-emerald-850 border border-emerald-100" 
                                : "bg-stone-100 text-stone-500 border border-stone-200/50"
                            }`}>
                              {property.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          {/* Expiration date */}
                          <td className="p-4 text-xs font-mono text-stone-500">
                            {property.expires_at 
                              ? new Date(property.expires_at).toLocaleDateString("en-KE", { dateStyle: "medium" }) 
                              : "No expiry set"
                            }
                          </td>
                          {/* Actions Column */}
                          <td className="p-4 text-right">
                            <button
                              onClick={() => handleToggleListingActive(property)}
                              className={`inline-flex items-center gap-1 font-semibold text-xs py-1.5 px-3 rounded-full border transition cursor-pointer active:scale-95 ${
                                property.is_active
                                  ? "bg-rose-50 hover:bg-rose-100 border-rose-200/40 text-rose-700"
                                  : "bg-emerald-50 hover:bg-emerald-100 border-emerald-200/40 text-emerald-800"
                              }`}
                            >
                              <Power className="h-3 w-3 shrink-0" />
                              <span>{property.is_active ? "Deactivate" : "Activate"}</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ==================== TAB 3: ALL USERS ==================== */}
          {activeTab === "users" && (
            <div className="bg-white border border-stone-200/80 rounded-2xl shadow-sm overflow-hidden animate-fade-in" id="all-users-table-container">
              {allUsers.length === 0 ? (
                <div className="text-center py-16 text-stone-500 font-medium">No registered profiles registered.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead className="bg-stone-50 text-stone-400 font-bold uppercase border-b border-stone-200">
                      <tr>
                        <th className="p-4">Name</th>
                        <th className="p-4">Email</th>
                        <th className="p-4">Role</th>
                        <th className="p-4">Phone</th>
                        <th className="p-4">Joined</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-150 text-stone-700 font-medium">
                      {allUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-stone-50/40">
                          {/* Avatar & Name */}
                          <td className="p-4">
                            <div className="flex items-center gap-2.5">
                              {user.avatar_url ? (
                                <img 
                                  src={user.avatar_url} 
                                  alt={user.full_name || "Profile"} 
                                  className="h-7 w-7 rounded-full object-cover shrink-0 border border-stone-200"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="h-7 w-7 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 shrink-0 border border-stone-200">
                                  <User className="h-3.5 w-3.5" />
                                </div>
                              )}
                              <p className="font-bold text-stone-900">{user.full_name || "NestList User"}</p>
                            </div>
                          </td>
                          {/* Email */}
                          <td className="p-4 text-stone-600 font-semibold">{user.email || "N/A"}</td>
                          {/* Role Badge */}
                          <td className="p-4">
                            <span className={`inline-block text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                              user.role === "admin"
                                ? "bg-gold-100 text-gold-900 border border-gold-200/40"
                                : user.role === "landlord"
                                ? "bg-emerald-50 text-emerald-850 border border-emerald-100"
                                : "bg-blue-50 text-blue-800 border border-blue-100"
                            }`}>
                              {user.role || "tenant"}
                            </span>
                          </td>
                          {/* Phone */}
                          <td className="p-4 font-mono font-semibold text-stone-600">{user.phone || "N/A"}</td>
                          {/* Joined Date */}
                          <td className="p-4 text-xs font-mono text-stone-400">
                            {new Date(user.created_at).toLocaleDateString("en-KE", { dateStyle: "medium" })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
};
