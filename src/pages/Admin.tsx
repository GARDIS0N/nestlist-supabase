import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { 
  Shield, Landmark, Users, Home, RefreshCw, Check, X, 
  Loader2, ArrowLeft, Calendar, Coins, MapPin, User, Mail, 
  Phone, Eye, Power, AlertCircle, FileText, CheckCircle2,
  Download, Bell, Clock, Trash, AlertTriangle, ShieldCheck
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
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [activityLimit, setActivityLimit] = useState(5);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [isPulling, setIsPulling] = useState(false);

  // Stats State
  const [stats, setStats] = useState({
    totalRevenue: 0,
    activeListings: 0,
    pendingPayments: 0,
    totalUsers: 0,
  });

  // Toast message state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Search & Filter States
  const [listingSearch, setListingSearch] = useState("");
  const [listingFilter, setListingFilter] = useState<"all" | "active" | "pending" | "expired" | "rejected">("all");

  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<string>("all");

  // Dialog & Modal States
  const [verifyingPayment, setVerifyingPayment] = useState<any | null>(null);
  const [verifyingLoading, setVerifyingLoading] = useState(false);

  const [rejectingPayment, setRejectingPayment] = useState<any | null>(null);
  const [rejectingLoading, setRejectingLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const [userActionLoading, setUserActionLoading] = useState<string | null>(null);
  const [listingActionLoading, setListingActionLoading] = useState<string | null>(null);

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
        .select(`
          *,
          profiles!landlord_id(full_name, phone),
          listing_payments(status, mpesa_code, amount)
        `)
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

  const fetchRecentActivity = async () => {
    try {
      const [
        { data: profilesData },
        { data: paymentsData }
      ] = await Promise.all([
        supabase.from('profiles')
          .select('id, full_name, role, created_at')
          .order('created_at', { ascending: false })
          .limit(10),
        supabase.from('listing_payments')
          .select('id, mpesa_code, status, created_at, properties(title)')
          .order('created_at', { ascending: false })
          .limit(10)
      ]);

      const activities: any[] = [];

      profilesData?.forEach((p: any) => {
        activities.push({
          id: `user-${p.id}`,
          type: 'user',
          text: `${p.full_name || 'A new user'} registered as ${p.role ? p.role.charAt(0).toUpperCase() + p.role.slice(1) : 'Tenant'}`,
          color: 'blue',
          timestamp: new Date(p.created_at)
        });
      });

      paymentsData?.forEach((pm: any) => {
        if (pm.status === 'pending') {
          activities.push({
            id: `payment-sub-${pm.id}`,
            type: 'payment_pending',
            text: `Payment ${pm.mpesa_code || 'code'} submitted for ${pm.properties?.title || 'a property'}`,
            color: 'gold',
            timestamp: new Date(pm.created_at)
          });
        } else if (pm.status === 'confirmed') {
          activities.push({
            id: `payment-live-${pm.id}`,
            type: 'payment_verified',
            text: `Listing '${pm.properties?.title || 'property'}' went LIVE`,
            color: 'green',
            timestamp: new Date(pm.created_at)
          });
        } else if (pm.status === 'failed') {
          activities.push({
            id: `payment-fail-${pm.id}`,
            type: 'payment_failed',
            text: `Payment ${pm.mpesa_code || 'code'} was rejected`,
            color: 'red',
            timestamp: new Date(pm.created_at)
          });
        }
      });

      // Sort combined array by timestamp desc
      activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setRecentActivities(activities);
    } catch (err) {
      console.error("Failed to load recent activity:", err);
    }
  };

  // Consolidated loading handler based on active tab
  const refreshData = async () => {
    setLoading(true);

    try {
      const [
        { count: listings },
        { count: pending },
        { count: users },
        { data: payments },
      ] = await Promise.all([
        supabase.from('properties')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true),
        supabase.from('listing_payments')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase.from('profiles')
          .select('*', { count: 'exact', head: true }),
        supabase.from('listing_payments')
          .select('amount')
          .eq('status', 'confirmed'),
      ]);

      const revenue = payments?.reduce(
        (sum, p) => sum + (p.amount || 0), 0
      ) || 0;

      setStats({
        totalRevenue: revenue,
        activeListings: listings || 0,
        pendingPayments: pending || 0,
        totalUsers: users || 0,
      });
      setLastUpdated(new Date().toLocaleTimeString("en-KE"));
    } catch (err) {
      console.error("Failed to load statistics:", err);
    }

    // Refresh current selected view
    await Promise.all([
      fetchPendingPayments(),
      fetchAllListings(),
      fetchAllUsers(),
      fetchRecentActivity()
    ]);

    setLoading(false);
  };

  // Trigger initial fetch when tab changes or loads
  useEffect(() => {
    if (profile?.role === 'admin') {
      refreshData();
    }
  }, [profile]);

  // Real-time notification subscription for new pending payments
  useEffect(() => {
    const channel = supabase
      .channel('admin-payments')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'listing_payments',
          filter: 'status=eq.pending'
        },
        (payload) => {
          // Show toast notification
          showToast(
            '🆕 New payment submitted! ' + payload.new.mpesa_code,
            'info'
          );
          // Refresh data automatically
          refreshData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Pull to refresh setup
  useEffect(() => {
    let startY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
      }
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (startY && window.scrollY === 0) {
        const currentY = e.touches[0].clientY;
        const pullDistance = currentY - startY;
        if (pullDistance > 120 && !loading) {
          setIsPulling(true);
        }
      }
    };
    const handleTouchEnd = () => {
      if (isPulling) {
        setIsPulling(false);
        refreshData();
      }
      startY = 0;
    };

    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [loading, isPulling]);

  // Actions: Approve Payment Submit
  const handleApprovePaymentSubmit = async () => {
    if (!verifyingPayment) return;
    setVerifyingLoading(true);
    try {
      // 1. Update payment status to confirmed
      const { error: paymentError } = await supabase
        .from('listing_payments')
        .update({ 
          status: 'confirmed', 
          confirmed_at: new Date().toISOString(),
          verified_at: new Date().toISOString()
        })
        .eq('id', verifyingPayment.id);

      if (paymentError) throw paymentError;

      // 2. Activate the property listing and set its expiry to 30 days
      const { error: propertyError } = await supabase
        .from('properties')
        .update({ 
          is_active: true, 
          payment_status: 'verified',
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('id', verifyingPayment.property_id);

      if (propertyError) throw propertyError;

      showToast("✅ Listing is now LIVE!", "success");
      setVerifyingPayment(null);
      await refreshData();
    } catch (err: any) {
      console.error("Failed to approve listing:", err);
      showToast("Approval failed: " + err.message, "error");
    } finally {
      setVerifyingLoading(false);
    }
  };

  // Actions: Reject Payment Submit
  const handleRejectPaymentSubmit = async () => {
    if (!rejectingPayment) return;
    if (!rejectionReason.trim()) {
      showToast("Reason for rejection is required.", "error");
      return;
    }
    setRejectingLoading(true);
    try {
      const { error: paymentError } = await supabase
        .from('listing_payments')
        .update({ 
          status: 'failed', 
          rejection_reason: rejectionReason 
        })
        .eq('id', rejectingPayment.id);

      if (paymentError) throw paymentError;

      // Update property payment status as well
      const { error: propertyError } = await supabase
        .from('properties')
        .update({
          payment_status: 'rejected',
          rejection_reason: rejectionReason
        })
        .eq('id', rejectingPayment.property_id);

      if (propertyError) throw propertyError;

      showToast("Payment rejected. Landlord notified.", "success");
      setRejectingPayment(null);
      setRejectionReason("");
      await refreshData();
    } catch (err: any) {
      console.error("Failed to reject payment:", err);
      showToast("Rejection failed: " + err.message, "error");
    } finally {
      setRejectingLoading(false);
    }
  };

  // Actions: Toggle Listing Activation
  const handleToggleListingActive = async (property: any) => {
    const nextActive = !property.is_active;
    setListingActionLoading(property.id);
    try {
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

      showToast(`Property listing successfully ${nextActive ? "activated" : "suspended"}!`, "success");
      await refreshData();
    } catch (err: any) {
      console.error("Failed to toggle property state:", err);
      showToast("Error updating listing status: " + err.message, "error");
    } finally {
      setListingActionLoading(null);
    }
  };

  // Actions: Toggle User status (Suspend / Restore)
  const handleToggleUserActive = async (user: any) => {
    const nextActive = !user.is_active;
    setUserActionLoading(user.id);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: nextActive })
        .eq('id', user.id);

      if (error) throw error;

      showToast(`User account successfully ${nextActive ? "restored" : "suspended"}!`, "success");
      await refreshData();
    } catch (err: any) {
      console.error("Failed to toggle user status:", err);
      showToast("Error updating user status: " + err.message, "error");
    } finally {
      setUserActionLoading(null);
    }
  };

  // Scroll to active payments view when notification bell clicked
  const handleBellClick = () => {
    setActiveTab("payments");
    const el = document.getElementById("admin-segmented-tabs");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  // CSV Exporter helper
  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]);
    const rows = data.map(row =>
      headers.map(h => {
        const val = row[h];
        return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : JSON.stringify(val ?? '');
      }).join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename + '.csv';
    a.click();
  };

  // Export Users action
  const handleExportUsers = () => {
    const dataToExport = filteredUsers.map(u => ({
      Name: u.full_name || '',
      Email: u.email || '',
      Phone: u.phone || '',
      Role: u.role || 'tenant',
      "Joined Date": u.created_at ? new Date(u.created_at).toLocaleDateString("en-KE") : '',
      "Listing Count": allListings.filter(p => p.landlord_id === u.id).length,
      Status: u.is_active ? 'Active' : 'Suspended'
    }));
    exportToCSV(dataToExport, 'nestlist_users_' + new Date().toISOString().split('T')[0]);
    showToast("Users exported successfully!", "success");
  };

  // Export Payments action
  const handleExportPayments = async () => {
    try {
      showToast("Preparing CSV export...", "info");
      const { data, error } = await supabase
        .from('listing_payments')
        .select(`
          mpesa_code,
          amount,
          status,
          created_at,
          verified_at,
          properties(title, type),
          profiles!landlord_id(full_name, phone)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        showToast("No payments found to export.", "error");
        return;
      }

      const formatted = data.map((p: any) => ({
        "M-Pesa Code": p.mpesa_code || '',
        "Landlord Name": p.profiles?.full_name || '',
        Phone: p.profiles?.phone || '',
        "Property Title": p.properties?.title || '',
        Type: p.properties?.type || '',
        Amount: p.amount || 0,
        Status: p.status || 'pending',
        "Submission Date": p.created_at ? new Date(p.created_at).toLocaleDateString("en-KE") : '',
        "Verification Date": p.verified_at ? new Date(p.verified_at).toLocaleDateString("en-KE") : ''
      }));

      exportToCSV(formatted, 'nestlist_payments_' + new Date().toISOString().split('T')[0]);
      showToast("Payments exported successfully!", "success");
    } catch (err: any) {
      console.error(err);
      showToast("Export failed: " + err.message, "error");
    }
  };

  // Helper: Format Time Ago
  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 5) return "just now";
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // Filter listings based on listingSearch & listingFilter
  const filteredListings = allListings.filter(property => {
    const titleMatch = property.title?.toLowerCase().includes(listingSearch.toLowerCase());
    const landlordMatch = property.profiles?.full_name?.toLowerCase().includes(listingSearch.toLowerCase());
    const matchesSearch = titleMatch || landlordMatch;

    if (!matchesSearch) return false;

    if (listingFilter !== "all") {
      const now = new Date();
      const hasExpiry = property.expires_at ? new Date(property.expires_at) : null;
      
      if (listingFilter === "active") {
        return property.is_active && (!hasExpiry || hasExpiry >= now);
      }
      if (listingFilter === "expired") {
        return hasExpiry && hasExpiry < now;
      }
      if (listingFilter === "rejected") {
        return !!property.rejection_reason || property.payment_status === "rejected";
      }
      if (listingFilter === "pending") {
        // Look at database property details or its listing_payments pending state
        const hasPendingPayment = property.listing_payments?.some((p: any) => p.status === 'pending');
        return hasPendingPayment || (!property.is_active && !property.rejection_reason && (!hasExpiry || hasExpiry >= now));
      }
    }
    return true;
  });

  // Filter users based on userSearch & userRoleFilter
  const filteredUsers = allUsers.filter(u => {
    const nameMatch = u.full_name?.toLowerCase().includes(userSearch.toLowerCase());
    const emailMatch = u.email?.toLowerCase().includes(userSearch.toLowerCase());
    const phoneMatch = u.phone?.toLowerCase().includes(userSearch.toLowerCase());
    const matchesSearch = nameMatch || emailMatch || phoneMatch;

    if (!matchesSearch) return false;

    if (userRoleFilter !== "all") {
      const r = u.role?.toLowerCase() || 'tenant';
      if (userRoleFilter === "landlords" && r !== "landlord") return false;
      if (userRoleFilter === "caretakers" && r !== "caretaker") return false;
      if (userRoleFilter === "agents" && r !== "agent") return false;
      if (userRoleFilter === "tenants" && r !== "tenant") return false;
      if (userRoleFilter === "admins" && r !== "admin" && r !== "superadmin") return false;
    }
    return true;
  });

  // Helper to determine accurate payment status for any property
  const getPropertyStatusDetails = (property: any) => {
    const now = new Date();
    const hasExpiry = property.expires_at ? new Date(property.expires_at) : null;
    if (hasExpiry && hasExpiry < now) {
      return { label: "Expired", bg: "bg-stone-100 text-stone-600 border-stone-200" };
    }
    if (property.is_active) {
      return { label: "Verified & Active", bg: "bg-green-100 text-green-800 border-green-200" };
    }
    if (property.rejection_reason || property.payment_status === "rejected") {
      return { label: "Rejected", bg: "bg-red-100 text-red-800 border-red-200" };
    }
    // Check associated payments
    const hasPending = property.listing_payments?.some((p: any) => p.status === 'pending');
    if (hasPending || property.payment_status === "pending_verification") {
      return { label: "Pending Verification", bg: "bg-amber-100 text-amber-800 border-amber-200" };
    }
    return { label: "Unpaid", bg: "bg-rose-100 text-rose-800 border-rose-200" };
  };

  return (
    <div 
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(30,107,74,0.04) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        minHeight: '100vh',
        backgroundColor: '#FAFAF8'
      }}
      className="w-full pb-16"
    >
      {/* Toast Notification */}
      {toast && (
        <div 
          className={`fixed top-20 right-4 z-50 flex items-center gap-2.5 py-3 px-5 rounded-xl border shadow-lg text-sm transition-all duration-300 animate-fade-in ${
            toast.type === "success" 
              ? "bg-emerald-50 border-emerald-100 text-emerald-800"
              : toast.type === "info"
              ? "bg-blue-50 border-blue-100 text-blue-800"
              : "bg-rose-50 border-rose-100 text-rose-800"
          }`}
          id="admin-toast-message"
        >
          {toast.type === "success" && <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0" />}
          {toast.type === "info" && <AlertCircle className="h-4.5 w-4.5 text-blue-600 shrink-0" />}
          {toast.type === "error" && <AlertCircle className="h-4.5 w-4.5 text-rose-600 shrink-0" />}
          <p className="font-semibold">{toast.message}</p>
        </div>
      )}

      {/* Pull down gesture release message */}
      {isPulling && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-emerald-700 text-white px-4 py-2 rounded-full shadow-lg text-xs font-bold flex items-center gap-2 z-50 animate-bounce">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          <span>Release to refresh terminal...</span>
        </div>
      )}

      {/* Main bounded container of exactly max-width 900px, centered with 16px padding */}
      <div className="max-w-[900px] mx-auto pt-8 px-4" id="admin-panel-page">
        
        {/* ==================== CHANGE 1: HEADER BANNER ==================== */}
        <div 
          style={{
            background: 'linear-gradient(135deg, #0A4D2E, #1E6B4A)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            color: 'white',
          }}
          className="shadow-md relative"
        >
          {/* Bell notification badge top right */}
          <button 
            onClick={handleBellClick}
            className="absolute top-4 right-16 p-2 rounded-full hover:bg-white/10 transition text-white relative cursor-pointer"
            title="Pending notification bell"
          >
            <Bell className={`h-5 w-5 ${stats.pendingPayments > 0 ? "animate-swing" : ""}`} />
            {stats.pendingPayments > 0 && (
              <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-red-500 rounded-full ring-2 ring-[#0A4D2E]" />
            )}
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white/10 rounded-xl">
                <Shield className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-[22px] font-bold text-white font-serif leading-none flex items-center gap-2">
                  Nestlist Admin Hub
                </h1>
                <p className="text-white/60 text-xs mt-1.5 font-medium">Verified Administrator Terminal</p>
                <p className="text-white/60 text-xs font-mono">Managed by gardisonkirui11@gmail.com</p>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-1 shrink-0 self-end sm:self-center pt-2 sm:pt-0">
              <button
                onClick={refreshData}
                disabled={loading}
                className="h-9 w-9 rounded-full border border-white/20 hover:bg-white/10 text-white flex items-center justify-center transition active:scale-95 cursor-pointer disabled:opacity-40"
                title="Refresh all data"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </button>
              <span className="text-[11px] text-white/50">Last updated: {lastUpdated || "never"}</span>
            </div>
          </div>

          {/* Bottom row (4 mini stats inline, 2x2 grid on mobile) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-6">
            <div className="bg-white/15 rounded-lg px-3 py-2 flex items-center gap-2">
              <span className="text-lg">💰</span>
              <div>
                <p className="text-[11px] text-white/70 leading-tight">Total Revenue</p>
                <p className="text-sm sm:text-[18px] font-bold text-white font-mono leading-tight">KES {stats.totalRevenue.toLocaleString()}</p>
              </div>
            </div>
            <div className="bg-white/15 rounded-lg px-3 py-2 flex items-center gap-2">
              <span className="text-lg">🏠</span>
              <div>
                <p className="text-[11px] text-white/70 leading-tight">Active Listings</p>
                <p className="text-sm sm:text-[18px] font-bold text-white font-mono leading-tight">{stats.activeListings}</p>
              </div>
            </div>
            <div className="bg-white/15 rounded-lg px-3 py-2 flex items-center gap-2">
              <span className="text-lg">⏳</span>
              <div>
                <p className="text-[11px] text-white/70 leading-tight">Pending</p>
                <p className="text-sm sm:text-[18px] font-bold text-white font-mono leading-tight">{stats.pendingPayments}</p>
              </div>
            </div>
            <div className="bg-white/15 rounded-lg px-3 py-2 flex items-center gap-2">
              <span className="text-lg">👥</span>
              <div>
                <p className="text-[11px] text-white/70 leading-tight">Users</p>
                <p className="text-sm sm:text-[18px] font-bold text-white font-mono leading-tight">{stats.totalUsers}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ==================== CHANGE 2: STATS CARDS ROW ==================== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Card 1 — Total Revenue */}
          <div 
            className="bg-white border border-[#E2EAE6] rounded-xl p-4 shadow-sm flex flex-col justify-between transition hover:shadow-md"
            style={{ borderTop: '3px solid #1E6B4A' }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-stone-500 uppercase">Total Revenue</span>
              <div className="h-8 w-8 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-sm">
                💰
              </div>
            </div>
            <div>
              <p className="text-base sm:text-lg font-bold text-stone-900 font-mono">KES {stats.totalRevenue.toLocaleString()}</p>
              <p className="text-[11px] text-stone-400 mt-0.5">All time</p>
            </div>
          </div>

          {/* Card 2 — Active Listings */}
          <div 
            className="bg-white border border-[#E2EAE6] rounded-xl p-4 shadow-sm flex flex-col justify-between transition hover:shadow-md"
            style={{ borderTop: '3px solid #2D9E6B' }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-stone-500 uppercase">Active Listings</span>
              <div className="h-8 w-8 rounded-full bg-green-50 border border-green-100 flex items-center justify-center text-sm">
                🏠
              </div>
            </div>
            <div>
              <p className="text-base sm:text-lg font-bold text-stone-900 font-mono">{stats.activeListings}</p>
              <p className="text-[11px] text-stone-400 mt-0.5">Currently live</p>
            </div>
          </div>

          {/* Card 3 — Pending Payments */}
          <div 
            className={`bg-white border border-[#E2EAE6] rounded-xl p-4 shadow-sm flex flex-col justify-between transition hover:shadow-md ${
              stats.pendingPayments > 0 ? "animate-pulse border-red-200" : ""
            }`}
            style={{ 
              borderTop: stats.pendingPayments > 0 ? '3px solid #DC2626' : '3px solid #D97706' 
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-stone-500 uppercase">Pending Review</span>
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm ${
                stats.pendingPayments > 0 ? "bg-red-50 text-red-700 animate-bounce" : "bg-amber-50 text-amber-700"
              }`}>
                ⏳
              </div>
            </div>
            <div>
              <p className="text-base sm:text-lg font-bold text-stone-900 font-mono">{stats.pendingPayments}</p>
              <p className="text-[11px] text-stone-400 mt-0.5">Awaiting verification</p>
            </div>
          </div>

          {/* Card 4 — Total Users */}
          <div 
            className="bg-white border border-[#E2EAE6] rounded-xl p-4 shadow-sm flex flex-col justify-between transition hover:shadow-md"
            style={{ borderTop: '3px solid #0A4D2E' }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-stone-500 uppercase">Registered Users</span>
              <div className="h-8 w-8 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center text-sm">
                👥
              </div>
            </div>
            <div>
              <p className="text-base sm:text-lg font-bold text-stone-900 font-mono">{stats.totalUsers}</p>
              <p className="text-[11px] text-stone-400 mt-0.5">Landlords & tenants</p>
            </div>
          </div>
        </div>

        {/* ==================== CHANGE 9: RECENT ACTIVITY FEED ==================== */}
        <div className="bg-white border border-[#E2EAE6] rounded-2xl p-5 mb-8 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 text-[#1E6B4A]" />
            <h2 className="text-xs font-bold text-stone-800 uppercase tracking-wider">Recent Activity</h2>
          </div>
          
          {recentActivities.length === 0 ? (
            <p className="text-xs text-stone-400">No recent activities available.</p>
          ) : (
            <div className="divide-y divide-stone-100">
              {recentActivities.slice(0, activityLimit).map((item) => (
                <div key={item.id} className="py-2.5 flex items-start gap-3 text-xs">
                  {/* Dot color indicator */}
                  <span className={`h-2.5 w-2.5 rounded-full mt-1.5 shrink-0 ${
                    item.color === 'green' ? 'bg-emerald-500' :
                    item.color === 'gold' ? 'bg-amber-500' :
                    item.color === 'red' ? 'bg-red-500' : 'bg-blue-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-stone-700 font-medium">{item.text}</p>
                  </div>
                  <span className="text-[10px] text-stone-400 font-mono shrink-0">
                    {formatTimeAgo(item.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {recentActivities.length > 5 && activityLimit === 5 && (
            <button
              onClick={() => setActivityLimit(15)}
              className="text-xs text-[#1E6B4A] font-bold mt-3 hover:underline flex items-center gap-1 cursor-pointer"
            >
              View all activity →
            </button>
          )}
          {activityLimit > 5 && (
            <button
              onClick={() => setActivityLimit(5)}
              className="text-xs text-[#1E6B4A] font-bold mt-3 hover:underline flex items-center gap-1 cursor-pointer"
            >
              Collapse activity feed ↑
            </button>
          )}
        </div>

        {/* ==================== CHANGE 3 & 10: STICKY TAB NAVIGATION ==================== */}
        <div 
          className="sticky top-[64px] z-40 bg-white border border-[#E2EAE6] rounded-xl p-1 flex gap-1 mb-6 shadow-sm"
          id="admin-segmented-tabs"
        >
          <button
            onClick={() => setActiveTab("payments")}
            className={`flex-1 py-2.5 px-2 rounded-lg font-bold text-[13px] transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "payments" 
                ? "bg-[#F0FDF4] text-[#1E6B4A] border-b-2 border-[#1E6B4A]" 
                : "bg-transparent text-[#4B5E54] hover:bg-[#FAFAF8]"
            }`}
            id="tab-btn-pending-payments"
          >
            <span className="text-base shrink-0">🏛</span>
            <span className="hidden sm:inline">Pending</span>
            <span className={`text-[10px] font-black rounded-full px-2 py-0.5 leading-none ${
              stats.pendingPayments > 0
                ? "bg-red-100 text-red-700 animate-pulse"
                : "bg-green-100 text-green-700"
            }`}>
              {stats.pendingPayments}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("listings")}
            className={`flex-1 py-2.5 px-2 rounded-lg font-bold text-[13px] transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "listings" 
                ? "bg-[#F0FDF4] text-[#1E6B4A] border-b-2 border-[#1E6B4A]" 
                : "bg-transparent text-[#4B5E54] hover:bg-[#FAFAF8]"
            }`}
            id="tab-btn-all-listings"
          >
            <span className="text-base shrink-0">🏠</span>
            <span className="hidden sm:inline">Listings</span>
            <span className="text-[10px] bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 leading-none font-bold">
              {stats.activeListings}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("users")}
            className={`flex-1 py-2.5 px-2 rounded-lg font-bold text-[13px] transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "users" 
                ? "bg-[#F0FDF4] text-[#1E6B4A] border-b-2 border-[#1E6B4A]" 
                : "bg-transparent text-[#4B5E54] hover:bg-[#FAFAF8]"
            }`}
            id="tab-btn-all-users"
          >
            <span className="text-base shrink-0">👥</span>
            <span className="hidden sm:inline">Users</span>
            <span className="text-[10px] bg-green-100 text-green-700 rounded-full px-2 py-0.5 leading-none font-bold">
              {stats.totalUsers}
            </span>
          </button>
        </div>

        {/* ==================== MAIN TAB RENDER SPACE ==================== */}
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
                  /* PENDING PAYMENTS EMPTY STATE (Change 4) */
                  <div className="text-center py-12 px-6 bg-white border border-stone-200/80 rounded-2xl shadow-xs animate-fade-in" id="empty-payments-state">
                    <style>{`
                      @keyframes pulseCheck {
                        0%, 100% { transform: scale(1); }
                        50% { transform: scale(1.06); }
                      }
                      .pulse-check-anim {
                        animation: pulseCheck 2s infinite ease-in-out;
                      }
                    `}</style>
                    <div className="mx-auto w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 mb-4 pulse-check-anim">
                      <Check className="h-8 w-8" />
                    </div>
                    <h3 className="text-lg font-bold text-stone-900">All caught up! ✅</h3>
                    <p className="text-stone-500 text-sm mt-1 max-w-sm mx-auto leading-relaxed">
                      No payments are waiting for verification.
                    </p>
                    
                    {/* Green Hint Box */}
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 mt-6 text-left max-w-md mx-auto">
                      <p className="text-xs text-green-800 leading-relaxed font-semibold">
                        💡 When a landlord submits their M-Pesa code it will appear here for you to verify.
                      </p>
                      <div className="mt-2.5 pt-2.5 border-t border-green-200/60 flex justify-between text-[11px] font-mono text-green-700">
                        <span>Paybill: <strong className="font-extrabold">247247</strong></span>
                        <span>Account: <strong className="font-extrabold">0715185037</strong></span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4" id="pending-payments-cards-grid">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-stone-500 uppercase">{pendingPayments.length} pending submissions</span>
                      <button
                        onClick={handleExportPayments}
                        className="flex items-center gap-1.5 border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 hover:text-stone-900 font-semibold text-xs py-1.5 px-3 rounded-lg transition active:scale-95 cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Export CSV</span>
                      </button>
                    </div>

                    {pendingPayments.map((payment) => (
                      /* Payment Card (Change 5 & 10) */
                      <div 
                        key={payment.id} 
                        style={{
                          border: '1px solid #E2EAE6',
                          borderLeft: '4px solid #D97706',
                          borderRadius: '14px',
                          padding: '16px 18px',
                          background: 'white',
                          boxShadow: '0 2px 8px rgba(15,26,20,0.06)'
                        }}
                        className="animate-fade-in hover:shadow-md transition-shadow duration-150"
                        id={`payment-card-${payment.id}`}
                      >
                        {/* Row 1: Title + time ago */}
                        <div className="flex justify-between items-start gap-3">
                          <h4 className="font-bold text-sm sm:text-base text-stone-900 line-clamp-1">
                            {payment.properties?.title || "Listing Activation"}
                          </h4>
                          <span className="text-[11px] text-stone-400 font-mono shrink-0 pt-0.5">
                            {formatTimeAgo(new Date(payment.created_at))}
                          </span>
                        </div>

                        {/* Row 2: Property Type + Location Badges */}
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          <span className="bg-emerald-50 border border-emerald-100/60 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full capitalize">
                            {payment.properties?.type?.replace('_', ' ') || "Apartment"}
                          </span>
                          <span className="bg-stone-100 border border-stone-200/60 text-stone-600 text-[10px] font-bold px-2 py-0.5 rounded-full line-clamp-1 max-w-[150px]">
                            📍 {payment.properties?.location || "N/A"}
                          </span>
                        </div>

                        {/* Row 3: Landlord Info & Price */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 pt-4 border-t border-stone-100">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-stone-700">
                              <User className="h-3.5 w-3.5 text-stone-400" />
                              <span className="text-xs font-bold">{payment.profiles?.full_name || "Unknown Landlord"}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-stone-500">
                              <Phone className="h-3.5 w-3.5 text-stone-400" />
                              <span className="text-xs font-mono">{payment.profiles?.phone || "No phone info"}</span>
                            </div>
                          </div>

                          <div className="text-left sm:text-right shrink-0">
                            <span className="block text-[9px] text-stone-400 font-bold uppercase tracking-wider">Amount Paid</span>
                            <span className="text-lg sm:text-xl font-black text-emerald-700 font-mono">
                              KES {(payment.amount || payment.amount_paid || 0).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {/* Row 4: M-Pesa Code Display */}
                        <div className="mt-4 bg-[#F0FDF4] border border-[#A7F3D0] rounded-xl p-3 flex flex-col items-center justify-center">
                          <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider mb-1">M-PESA CODE</span>
                          <span className="text-lg sm:text-2xl font-black font-mono tracking-widest text-[#1E6B4A] uppercase">
                            {payment.mpesa_code}
                          </span>
                        </div>

                        {/* Row 5: Action Buttons */}
                        <div className="grid grid-cols-2 gap-3 mt-4">
                          <button
                            type="button"
                            onClick={() => setRejectingPayment(payment)}
                            className="w-full h-12 sm:h-auto py-2.5 bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] font-bold text-sm sm:text-xs rounded-xl flex items-center justify-center gap-1.5 hover:bg-[#DC2626] hover:text-white transition active:scale-95 duration-150 cursor-pointer"
                          >
                            <X className="h-4 w-4 shrink-0" />
                            <span>Reject</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setVerifyingPayment(payment)}
                            className="w-full h-12 sm:h-auto py-2.5 bg-[#D1FAE5] border border-[#A7F3D0] text-[#065F46] font-bold text-sm sm:text-xs rounded-xl flex items-center justify-center gap-1.5 hover:bg-[#1E6B4A] hover:text-white transition active:scale-95 duration-150 cursor-pointer"
                          >
                            <Check className="h-4 w-4 shrink-0" />
                            <span>Verify Payment</span>
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
              <div className="animate-fade-in" id="all-listings-tab">
                
                {/* Search Bar & Status Filter Row (Change 6) */}
                <div className="bg-white border border-[#E2EAE6] rounded-2xl p-4 mb-4 shadow-sm space-y-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input 
                      type="text"
                      placeholder="🔍 Search by title or landlord..."
                      value={listingSearch}
                      onChange={(e) => setListingSearch(e.target.value)}
                      style={{ border: '1.5px solid #E2EAE6' }}
                      className="w-full p-2.5 px-3.5 rounded-xl text-sm focus:border-[#1E6B4A] focus:ring-1 focus:ring-[#1E6B4A] outline-none transition"
                    />
                    
                    <button
                      onClick={handleExportPayments}
                      className="flex items-center justify-center gap-1.5 border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 hover:text-stone-900 font-semibold text-xs py-2.5 px-4 rounded-xl transition active:scale-95 cursor-pointer shrink-0"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Export Payments CSV</span>
                    </button>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex flex-wrap gap-2 pt-1 border-t border-stone-100">
                    {(["all", "active", "pending", "expired", "rejected"] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setListingFilter(f)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition font-bold cursor-pointer ${
                          listingFilter === f
                            ? "bg-[#1E6B4A] border-[#1E6B4A] text-white"
                            : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
                        }`}
                      >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredListings.length === 0 ? (
                  /* ALL LISTINGS EMPTY STATE (Change 4) */
                  <div className="text-center py-16 px-4 bg-white border border-stone-200/80 rounded-2xl shadow-xs" id="empty-listings-state">
                    <span className="text-5xl block mb-3">🏠</span>
                    <h3 className="text-base font-bold text-stone-900">No listings yet</h3>
                    <p className="text-stone-500 text-xs mt-1 max-w-sm mx-auto leading-relaxed">
                      Listings will appear here after landlords post and pay their listing fee.
                    </p>
                    
                    {/* Gold Hint Box */}
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-6 text-left max-w-md mx-auto">
                      <p className="text-xs text-amber-800 leading-relaxed font-semibold">
                        💡 Listing fees: From KES 100 for Single Room to KES 1,500 for 5+ Bedroom
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white border border-stone-200/80 rounded-2xl shadow-sm overflow-hidden" id="all-listings-table-container">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs sm:text-sm">
                        <thead className="bg-stone-50 text-stone-400 font-bold uppercase border-b border-stone-200">
                          <tr>
                            <th className="p-4">Thumbnail & Title</th>
                            <th className="p-4">Type & Location</th>
                            <th className="p-4 text-right">Price</th>
                            <th className="p-4">Landlord</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-150 text-stone-700 font-medium">
                          {filteredListings.map((property) => {
                            const statDetails = getPropertyStatusDetails(property);
                            const hasThumbnail = property.images && property.images.length > 0;
                            return (
                              <tr key={property.id} className="hover:bg-stone-50/40">
                                {/* Thumbnail & Title */}
                                <td className="p-4">
                                  <div className="flex items-center gap-3">
                                    {hasThumbnail ? (
                                      <img 
                                        src={property.images[0]} 
                                        alt={property.title} 
                                        className="h-12 w-12 rounded-lg object-cover border border-stone-200"
                                        referrerPolicy="no-referrer"
                                      />
                                    ) : (
                                      <div className="h-12 w-12 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-100 flex items-center justify-center text-xl shrink-0">
                                        🏠
                                      </div>
                                    )}
                                    <div className="min-w-0">
                                      <p className="font-bold text-stone-900 truncate max-w-[180px]" title={property.title}>
                                        {property.title}
                                      </p>
                                      <span className="block text-[10px] text-stone-400 font-mono mt-0.5">
                                        ID: {property.id.slice(0, 8)}
                                      </span>
                                    </div>
                                  </div>
                                </td>

                                {/* Type & Location */}
                                <td className="p-4">
                                  <p className="capitalize text-stone-800">{property.type?.replace('_', ' ') || 'Unit'}</p>
                                  <span className="block text-[10px] text-stone-400 line-clamp-1">{property.location || 'N/A'}</span>
                                </td>

                                {/* Price */}
                                <td className="p-4 text-right font-mono font-bold text-emerald-800">
                                  KSh {(parseFloat(property.price) || 0).toLocaleString()}
                                </td>

                                {/* Landlord Details */}
                                <td className="p-4">
                                  <p className="font-bold text-stone-900 text-xs">{property.profiles?.full_name || 'N/A'}</p>
                                  <span className="block text-[10px] text-stone-400 font-mono">{property.profiles?.phone || 'N/A'}</span>
                                </td>

                                {/* Status Badge */}
                                <td className="p-4">
                                  <span className={`inline-block text-[9.5px] font-black uppercase px-2.5 py-0.5 rounded-full border ${statDetails.bg}`}>
                                    {statDetails.label}
                                  </span>
                                </td>

                                {/* Actions (Suspend / Restore) */}
                                <td className="p-4 text-right">
                                  <button
                                    onClick={() => handleToggleListingActive(property)}
                                    disabled={listingActionLoading === property.id}
                                    className={`inline-flex items-center gap-1 font-semibold text-xs py-1.5 px-3 rounded-full border transition cursor-pointer active:scale-95 disabled:opacity-50 ${
                                      property.is_active
                                        ? "bg-rose-50 hover:bg-rose-100 border-rose-200/40 text-rose-700"
                                        : "bg-emerald-50 hover:bg-emerald-100 border-emerald-200/40 text-emerald-800"
                                    }`}
                                  >
                                    {listingActionLoading === property.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                                    ) : (
                                      <Power className="h-3 w-3 shrink-0" />
                                    )}
                                    <span>{property.is_active ? "Suspend" : "Restore"}</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ==================== TAB 3: ALL USERS ==================== */}
            {activeTab === "users" && (
              <div className="animate-fade-in" id="all-users-tab">
                
                {/* Search Bar & Export Row (Change 7) */}
                <div className="bg-white border border-[#E2EAE6] rounded-2xl p-4 mb-4 shadow-sm space-y-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input 
                      type="text"
                      placeholder="🔍 Search by name, email or phone..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      style={{ border: '1.5px solid #E2EAE6' }}
                      className="w-full p-2.5 px-3.5 rounded-xl text-sm focus:border-[#1E6B4A] focus:ring-1 focus:ring-[#1E6B4A] outline-none transition"
                    />
                    
                    <button
                      onClick={handleExportUsers}
                      className="flex items-center justify-center gap-1.5 border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 hover:text-stone-900 font-semibold text-xs py-2.5 px-4 rounded-xl transition active:scale-95 cursor-pointer shrink-0"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Export Users CSV</span>
                    </button>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex flex-wrap gap-2 pt-1 border-t border-stone-100">
                    {["all", "landlords", "caretakers", "agents", "tenants", "admins"].map((role) => (
                      <button
                        key={role}
                        onClick={() => setUserRoleFilter(role)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition font-bold cursor-pointer ${
                          userRoleFilter === role
                            ? "bg-[#1E6B4A] border-[#1E6B4A] text-white"
                            : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
                        }`}
                      >
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-3 flex justify-between items-center text-xs text-stone-400 font-bold uppercase tracking-wider px-1">
                  <span>{filteredUsers.length} users registered</span>
                </div>

                {filteredUsers.length === 0 ? (
                  /* ALL USERS EMPTY STATE (Change 4) */
                  <div className="text-center py-16 px-4 bg-white border border-stone-200/80 rounded-2xl shadow-xs" id="empty-users-state">
                    <span className="text-5xl block mb-3">👥</span>
                    <h3 className="text-base font-bold text-stone-900">No users registered yet</h3>
                    <p className="text-stone-500 text-xs mt-1 max-w-sm mx-auto leading-relaxed">
                      Share your platform to get landlords signing up
                    </p>
                  </div>
                ) : (
                  <div className="bg-white border border-stone-200/80 rounded-2xl shadow-sm overflow-hidden" id="all-users-table-container">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs sm:text-sm">
                        <thead className="bg-stone-50 text-stone-400 font-bold uppercase border-b border-stone-200">
                          <tr>
                            <th className="p-4">User</th>
                            <th className="p-4 hidden xs:table-cell">Contact & Email</th>
                            <th className="p-4">Role</th>
                            <th className="p-4 text-center">Listings</th>
                            <th className="p-4">Joined Date</th>
                            <th className="p-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-150 text-stone-700 font-medium">
                          {filteredUsers.map((user) => {
                            const initial = user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U';
                            const listingCount = allListings.filter(p => p.landlord_id === user.id).length;

                            // Dynamic Role-based styling
                            let roleStyles = { bg: "bg-blue-100 text-blue-700 border-blue-200" };
                            const rLower = user.role?.toLowerCase() || 'tenant';
                            if (rLower === "landlord") roleStyles = { bg: "bg-green-100 text-green-700 border-green-200" };
                            else if (rLower === "caretaker") roleStyles = { bg: "bg-yellow-100 text-yellow-700 border-yellow-200" };
                            else if (rLower === "agent") roleStyles = { bg: "bg-purple-100 text-purple-700 border-purple-200" };
                            else if (rLower === "admin" || rLower === "superadmin") roleStyles = { bg: "bg-red-100 text-red-700 border-red-200" };

                            return (
                              <tr key={user.id} className={`hover:bg-stone-50/40 ${!user.is_active ? "opacity-60 bg-stone-50/30" : ""}`}>
                                {/* Avatar & Name */}
                                <td className="p-4">
                                  <div className="flex items-center gap-3">
                                    {user.avatar_url ? (
                                      <img 
                                        src={user.avatar_url} 
                                        alt={user.full_name || "Profile"} 
                                        className="h-10 w-10 rounded-full object-cover shrink-0 border border-stone-200"
                                        referrerPolicy="no-referrer"
                                      />
                                    ) : (
                                      <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold border shrink-0 ${roleStyles.bg}`}>
                                        {initial}
                                      </div>
                                    )}
                                    <div className="min-w-0">
                                      <p className="font-bold text-stone-900 truncate max-w-[150px]">
                                        {user.full_name || "NestList User"}
                                      </p>
                                      {/* Mobile-only view for email/phone */}
                                      <div className="xs:hidden space-y-0.5 mt-0.5">
                                        <p className="text-[10px] text-stone-500 truncate">{user.email || 'N/A'}</p>
                                        <p className="text-[10px] text-stone-500 font-mono">{user.phone || 'N/A'}</p>
                                      </div>
                                      {!user.is_active && (
                                        <span className="inline-block text-[9px] bg-red-100 text-red-800 font-black px-1.5 py-0.2 rounded-full mt-1">
                                          SUSPENDED
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </td>

                                {/* Contact & Email (hidden on screens < 380px) */}
                                <td className="p-4 hidden xs:table-cell">
                                  <div className="space-y-0.5">
                                    <p className="text-xs font-semibold text-stone-700 truncate max-w-[180px]" title={user.email}>{user.email || 'N/A'}</p>
                                    <p className="text-[11px] text-stone-400 font-mono">{user.phone || 'N/A'}</p>
                                  </div>
                                </td>

                                {/* Role Badge */}
                                <td className="p-4">
                                  <span className={`inline-block text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${roleStyles.bg}`}>
                                    {user.role || 'tenant'}
                                  </span>
                                </td>

                                {/* Listings count */}
                                <td className="p-4 text-center font-bold text-stone-800">
                                  {listingCount > 0 ? (
                                    <span className="bg-emerald-50 text-emerald-800 px-2 py-1 rounded-md border border-emerald-100 font-mono text-xs">
                                      {listingCount} listings
                                    </span>
                                  ) : (
                                    <span className="text-stone-300 font-normal">—</span>
                                  )}
                                </td>

                                {/* Joined Date */}
                                <td className="p-4 text-xs font-mono text-stone-400">
                                  {user.created_at ? new Date(user.created_at).toLocaleDateString("en-KE", { dateStyle: "medium" }) : 'N/A'}
                                </td>

                                {/* Actions (Suspend / Restore User) */}
                                <td className="p-4 text-right">
                                  <button
                                    onClick={() => handleToggleUserActive(user)}
                                    disabled={userActionLoading === user.id}
                                    className={`inline-flex items-center gap-1 font-semibold text-xs py-1.5 px-3 rounded-full border transition cursor-pointer active:scale-95 disabled:opacity-50 ${
                                      user.is_active
                                        ? "bg-rose-50 hover:bg-rose-100 border-rose-200/40 text-rose-700"
                                        : "bg-emerald-50 hover:bg-emerald-100 border-emerald-200/40 text-emerald-800"
                                    }`}
                                  >
                                    {userActionLoading === user.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                                    ) : (
                                      <Power className="h-3 w-3 shrink-0" />
                                    )}
                                    <span>{user.is_active ? "Suspend" : "Restore"}</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </div>

      {/* ==================== VERIFY CONFIRMATION DIALOG MODAL ==================== */}
      {verifyingPayment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl animate-fade-in border border-stone-200">
            <div className="flex items-center gap-2.5 text-emerald-700 mb-4">
              <CheckCircle2 className="h-6 w-6" />
              <h3 className="text-lg font-bold">Verify Payment</h3>
            </div>
            
            <p className="text-sm text-stone-600 mb-6 leading-relaxed">
              Confirm verification of M-Pesa code <strong className="font-mono text-stone-950 text-base">{verifyingPayment.mpesa_code}</strong> for <strong className="text-emerald-800 font-extrabold text-base">KES {(verifyingPayment.amount || verifyingPayment.amount_paid || 0).toLocaleString()}</strong>?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setVerifyingPayment(null)}
                className="flex-1 py-2.5 border border-stone-200 text-stone-600 font-semibold text-sm rounded-xl hover:bg-stone-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleApprovePaymentSubmit}
                disabled={verifyingLoading}
                className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {verifyingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                <span>Yes, Verify and Go Live</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== REJECT COMPLAINT MODAL ==================== */}
      {rejectingPayment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl animate-fade-in border border-stone-200">
            <div className="flex items-center gap-2.5 text-rose-700 mb-4">
              <AlertCircle className="h-6 w-6" />
              <h3 className="text-lg font-bold">Reject Payment Submission</h3>
            </div>
            
            <p className="text-sm text-stone-600 mb-4 leading-relaxed">
              Provide a reason for rejecting the M-Pesa code <strong className="font-mono text-stone-900">{rejectingPayment.mpesa_code}</strong>.
            </p>

            {/* Quick reasons (clickable chips) */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-stone-400 uppercase mb-2">Quick Reasons</label>
              <div className="flex flex-wrap gap-2">
                {[
                  "Code not found",
                  "Wrong amount paid",
                  "Duplicate code",
                  "Payment too old"
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setRejectionReason(reason)}
                    className={`text-xs py-1.5 px-3 rounded-lg border transition-all cursor-pointer ${
                      rejectionReason === reason
                        ? "bg-rose-50 border-rose-300 text-rose-800 font-bold"
                        : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Reason for rejection (required)"
              className="w-full h-24 p-3 border border-stone-200 rounded-xl text-sm focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none resize-none mb-6 font-sans"
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setRejectingPayment(null);
                  setRejectionReason("");
                }}
                className="flex-1 py-2.5 border border-stone-200 text-stone-600 font-semibold text-sm rounded-xl hover:bg-stone-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectPaymentSubmit}
                disabled={rejectingLoading || !rejectionReason.trim()}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {rejectingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                <span>Reject Payment</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
