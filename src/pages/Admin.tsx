import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { Shield, Users, Landmark, FileText, CheckCircle2, XCircle, ToggleLeft, ToggleRight, Loader2, ArrowLeft, RefreshCw, KeyRound } from "lucide-react";

export const Admin: React.FC = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<"payments" | "properties" | "users" | "sms">("payments");
  const [loading, setLoading] = useState(true);

  // States
  const [payments, setPayments] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [smsLogs, setSmsLogs] = useState<any[]>([]);

  // Checking Admin Authorization
  const authorized = profile?.role === "admin" || profile?.id === "admin-1" || profile?.id === "42eca9a0-c070-4898-b830-46c3247ea71d";

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // 1. Fetch manual payment submissions from listing_payments
      const { data: lpData } = await supabase
        .from("listing_payments")
        .select("*, landlord:profiles(full_name, phone), property:properties(title)")
        .order("created_at", { ascending: false });

      // Map listing_payments data into legacy property shapes for Admin page compatibility
      const mappedPayments = (lpData || []).map((p: any) => ({
        id: p.property_id,
        title: p.property?.title || "Property Listing",
        landlord: p.landlord,
        amount_paid: p.amount_paid || p.amount,
        mpesa_code: p.mpesa_code,
        mpesa_phone: p.payer_phone,
        payment_status: p.status === "confirmed"
          ? "verified"
          : p.status === "pending"
            ? "pending_verification"
            : p.status === "failed"
              ? "rejected"
              : "unpaid",
        rejection_reason: p.failure_reason,
        submitted_at: p.created_at
      }));
      setPayments(mappedPayments);

      // 2. Fetch properties (all)
      const { data: propData } = await supabase
        .from("properties")
        .select("*, landlord:profiles(full_name, phone)")
        .order("created_at", { ascending: false });
      setProperties(propData || []);

      // 3. Fetch users / profiles
      const { data: userData } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      setUsers(userData || []);

      // 4. Fetch SMS logs
      const { data: smsData } = await supabase
        .from("sms_logs")
        .select("*")
        .order("created_at", { ascending: false });
      setSmsLogs(smsData || []);

    } catch (err) {
      console.error("Admin data loading failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authorized) {
      fetchAdminData();
    }
  }, [profile, authorized]);

  const handleApprovePayment = async (propertyId: string) => {
    try {
      // Call backend verification endpoint
      const response = await fetch(`/api/admin/payments/${propertyId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_id: profile?.id || "admin-1" })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || "Failed to approve payment on backend.");
      }

      // Sync frontend database client locally
      const { error: lpErr } = await supabase
        .from("listing_payments")
        .update({
          status: "confirmed",
          confirmed_at: new Date().toISOString()
        })
        .eq("property_id", propertyId);

      if (lpErr) console.error("Client side listing_payments sync failed:", lpErr);

      const { error: propErr } = await supabase
        .from("properties")
        .update({
          is_active: true,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq("id", propertyId);

      if (propErr) console.error("Client side properties sync failed:", propErr);

      alert("Payment verified successfully. Listing is now live!");
      fetchAdminData();
    } catch (err: any) {
      alert(`Approval failed: ${err.message}`);
    }
  };

  const handleRejectPayment = async (propertyId: string) => {
    const reason = prompt("Enter payment rejection reason:", "M-Pesa transaction reference code could not be verified on our statement.");
    if (reason === null) return; // Prompt cancelled

    try {
      // Call backend rejection endpoint
      const response = await fetch(`/api/admin/payments/${propertyId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admin_id: profile?.id || "admin-1",
          reason: reason
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || "Failed to reject payment on backend.");
      }

      // Sync frontend database client locally
      const { error: lpErr } = await supabase
        .from("listing_payments")
        .update({
          status: "failed",
          failure_reason: reason
        })
        .eq("property_id", propertyId);

      if (lpErr) console.error("Client side listing_payments sync failed:", lpErr);

      const { error: propErr } = await supabase
        .from("properties")
        .update({
          is_active: false
        })
        .eq("id", propertyId);

      if (propErr) console.error("Client side properties sync failed:", propErr);

      alert("Payment verification rejected successfully.");
      fetchAdminData();
    } catch (err: any) {
      alert(`Rejection failed: ${err.message}`);
    }
  };

  const handleToggleListingActive = async (propertyId: string, currentActive: boolean) => {
    try {
      // Toggle property state (Service role simulation)
      const { error } = await supabase
        .from("properties")
        .update({
          is_active: !currentActive,
          expires_at: !currentActive ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null
        })
        .eq("id", propertyId);

      if (error) throw error;

      setProperties(prev =>
        prev.map(p => (p.id === propertyId ? { ...p, is_active: !currentActive } : p))
      );
    } catch (err: any) {
      alert(`Toggle failed: ${err.message}`);
    }
  };

  const handleDeleteProperty = async (propertyId: string) => {
    if (!window.confirm("Are you sure you want to delete this listing permanently? This action cannot be undone.")) return;
    try {
      const { error } = await supabase
        .from("properties")
        .delete()
        .eq("id", propertyId);

      if (error) throw error;

      setProperties(prev => prev.filter(p => p.id !== propertyId));
      alert("Listing deleted successfully.");
    } catch (err: any) {
      alert(`Deletion failed: ${err.message}`);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === "admin-1" || userId === profile?.id) {
      alert("You cannot delete yourself or the main system administrator account.");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this user profile permanently? All associated listings and alerts will be removed.")) return;
    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);

      if (error) throw error;

      setUsers(prev => prev.filter(u => u.id !== userId));
      alert("User profile deleted successfully.");
    } catch (err: any) {
      alert(`Deletion failed: ${err.message}`);
    }
  };

  const handleToggleUserRole = async (userId: string, currentRole: string) => {
    if (userId === "admin-1" || userId === profile?.id) {
      alert("You cannot modify your own role or the main system administrator account.");
      return;
    }
    
    // Rotate through roles: tenant -> landlord -> user -> admin
    const nextRole = currentRole === "tenant" 
      ? "landlord" 
      : currentRole === "landlord" 
        ? "user" 
        : currentRole === "user" 
          ? "admin" 
          : "tenant";

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: nextRole })
        .eq("id", userId);

      if (error) throw error;

      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: nextRole } : u));
      alert(`User role updated to "${nextRole}" successfully.`);
    } catch (err: any) {
      alert(`Role change failed: ${err.message}`);
    }
  };

  if (!authorized) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center space-y-6">
        <div className="mx-auto h-12 w-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center">
          <Shield className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold text-stone-900">Admin Area Access Restricted</h2>
        <p className="text-stone-500 text-sm leading-relaxed">
          This portal is protected and only accessible by authorized system administrators (e.g. `thesilentwhisper.ke@gmail.com`).
        </p>
        <div className="pt-2">
          <Link to="/" className="inline-flex items-center space-x-1.5 py-2 px-4 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-sm font-semibold transition">
            <ArrowLeft className="h-4 w-4" />
            <span>Go to Browse</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      
      {/* Admin Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-stone-200">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-stone-950 font-sans flex items-center space-x-2">
            <Shield className="h-6 w-6 text-amber-700" />
            <span>System Administration Portal</span>
          </h1>
          <p className="text-stone-500 text-xs sm:text-sm font-medium">
            Review audit logs, override Safaricom status billing, inspect user logs, and SMS queues.
          </p>
        </div>

        <button
          onClick={fetchAdminData}
          className="inline-flex items-center space-x-1 py-2 px-3 border border-stone-300 hover:bg-stone-50 rounded-lg text-xs font-semibold text-stone-600 transition"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh Console</span>
        </button>
      </div>

      {/* Admin tabs */}
      <div className="flex space-x-4 border-b border-stone-200">
        <button
          onClick={() => setActiveTab("payments")}
          className={`py-2.5 text-sm font-bold border-b-2 transition flex items-center space-x-1.5 ${
            activeTab === "payments" ? "border-amber-600 text-amber-900" : "border-transparent text-stone-500 hover:text-stone-900"
          }`}
        >
          <Landmark className="h-4 w-4" />
          <span>M-Pesa Receipts ({payments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("properties")}
          className={`py-2.5 text-sm font-bold border-b-2 transition flex items-center space-x-1.5 ${
            activeTab === "properties" ? "border-amber-600 text-amber-900" : "border-transparent text-stone-500 hover:text-stone-900"
          }`}
        >
          <Shield className="h-4 w-4" />
          <span>Listing Overrides ({properties.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("users")}
          className={`py-2.5 text-sm font-bold border-b-2 transition flex items-center space-x-1.5 ${
            activeTab === "users" ? "border-amber-600 text-amber-900" : "border-transparent text-stone-500 hover:text-stone-900"
          }`}
        >
          <Users className="h-4 w-4" />
          <span>User Profiles ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("sms")}
          className={`py-2.5 text-sm font-bold border-b-2 transition flex items-center space-x-1.5 ${
            activeTab === "sms" ? "border-amber-600 text-amber-900" : "border-transparent text-stone-500 hover:text-stone-900"
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>SMS delivery queue ({smsLogs.length})</span>
        </button>
      </div>

      {/* Contents */}
      {loading ? (
        <div className="flex justify-center py-20 animate-pulse">
          <Loader2 className="h-8 w-8 text-amber-600 animate-spin" />
        </div>
      ) : activeTab === "payments" ? (
        /* MPESA PAYMENTS VIEW */
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead className="bg-stone-50 text-stone-400 font-bold uppercase border-b border-stone-200">
                <tr>
                  <th className="p-4">Landlord</th>
                  <th className="p-4">Property</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">M-Pesa Info</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-150">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-stone-400 font-medium">No manual payment transactions registered yet.</td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id} className="hover:bg-stone-50/50">
                      <td className="p-4">
                        <p className="font-bold text-stone-900">{p.landlord?.full_name || "Landlord"}</p>
                        <p className="text-stone-400 text-[10px]">{p.landlord?.phone || "N/A"}</p>
                      </td>
                      <td className="p-4 max-w-xs truncate font-medium text-stone-700">
                        {p.title || "Property Listing"}
                      </td>
                      <td className="p-4 font-mono font-bold text-emerald-700">
                        KSh {(parseFloat(p.amount_paid) || 0).toLocaleString()}
                      </td>
                      <td className="p-4">
                        <p className="font-mono text-xs font-bold text-stone-850">{p.mpesa_code || "N/A"}</p>
                        {p.mpesa_phone && (
                          <p className="text-[10px] text-stone-400 font-mono">{p.mpesa_phone}</p>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <span className={`inline-block text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                            p.payment_status === "verified"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : p.payment_status === "pending_verification"
                              ? "bg-amber-50 text-amber-700 border border-amber-100 animate-pulse"
                              : "bg-red-50 text-red-700 border border-red-100"
                          }`}>
                            {p.payment_status === "pending_verification" ? "pending verification" : p.payment_status}
                          </span>
                          {p.rejection_reason && (
                            <p className="text-[10px] text-red-500 max-w-xs truncate" title={p.rejection_reason}>
                              Reason: {p.rejection_reason}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        {p.payment_status === "pending_verification" && (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleApprovePayment(p.id)}
                              className="py-1 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition shadow-sm"
                            >
                              Verify
                            </button>
                            <button
                              onClick={() => handleRejectPayment(p.id)}
                              className="py-1 px-2.5 bg-red-650 hover:bg-red-700 text-white rounded text-xs font-bold transition shadow-sm"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === "properties" ? (
        /* PROPERTIES MANAGEMENT */
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead className="bg-stone-50 text-stone-400 font-bold uppercase border-b border-stone-200">
                <tr>
                  <th className="p-4">Listing Title</th>
                  <th className="p-4">Landlord</th>
                  <th className="p-4">County / Estate</th>
                  <th className="p-4">Rent</th>
                  <th className="p-4">Active State</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-150">
                {properties.map((p) => (
                  <tr key={p.id} className="hover:bg-stone-50/50">
                    <td className="p-4 font-bold text-stone-900 max-w-xs truncate">{p.title}</td>
                    <td className="p-4 text-stone-700">{p.landlord?.full_name || "Unknown"}</td>
                    <td className="p-4 text-stone-600">{p.location}, {p.county}</td>
                    <td className="p-4 font-mono font-bold">KSh {parseFloat(p.price).toLocaleString()}</td>
                    <td className="p-4">
                      <button
                        onClick={() => handleToggleListingActive(p.id, p.is_active)}
                        className="flex items-center text-stone-500 transition focus:outline-none"
                      >
                        {p.is_active ? (
                          <div className="flex items-center space-x-1 text-emerald-600">
                            <ToggleRight className="h-7 w-7" />
                            <span className="text-[10px] font-bold uppercase">Active</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1 text-stone-400">
                            <ToggleLeft className="h-7 w-7" />
                            <span className="text-[10px] font-bold uppercase">Inactive</span>
                          </div>
                        )}
                      </button>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDeleteProperty(p.id)}
                        className="py-1 px-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded text-xs transition shadow-xs"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === "users" ? (
        /* USER PROFILES VIEW */
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead className="bg-stone-50 text-stone-400 font-bold uppercase border-b border-stone-200">
                <tr>
                  <th className="p-4">Profile Name</th>
                  <th className="p-4">Phone Number</th>
                  <th className="p-4">Account Role</th>
                  <th className="p-4">Registered Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-150">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-stone-50/50">
                    <td className="p-4 font-bold text-stone-900">{u.full_name}</td>
                    <td className="p-4 font-mono">{u.phone || "No phone connected"}</td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                          u.role === "admin"
                            ? "bg-purple-100 text-purple-800"
                            : u.role === "landlord"
                              ? "bg-amber-100 text-amber-800"
                              : u.role === "tenant"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-stone-100 text-stone-700"
                        }`}>
                          {u.role}
                        </span>
                        {u.id !== "admin-1" && u.id !== profile?.id && (
                          <button
                            onClick={() => handleToggleUserRole(u.id, u.role)}
                            className="text-[10px] text-amber-600 hover:text-amber-800 underline font-medium focus:outline-none"
                            title="Rotate through roles: tenant -> landlord -> user -> admin"
                          >
                            Change Role
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-stone-400 text-xs">{new Date(u.created_at).toLocaleString()}</td>
                    <td className="p-4 text-right">
                      {u.id !== "admin-1" && u.id !== profile?.id && (
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="py-1 px-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded text-xs transition"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* SMS Logs Queue */
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden space-y-4">
          <div className="p-4 bg-amber-50/50 text-xs sm:text-sm text-stone-700 font-medium border-b border-stone-200 leading-normal">
            Africa's Talking SMS delivery reports pipeline. Logs all outgoing landlord leads, payments, registration welcomes, and matching county search subscriptions.
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead className="bg-stone-50 text-stone-400 font-bold uppercase border-b border-stone-200">
                <tr>
                  <th className="p-4">Recipient</th>
                  <th className="p-4">Log Event</th>
                  <th className="p-4">Message Body</th>
                  <th className="p-4">Rate Cost</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-150">
                {smsLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-stone-400 font-medium">No SMS messages triggered yet in this session.</td>
                  </tr>
                ) : (
                  smsLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-stone-50/50">
                      <td className="p-4 font-mono font-bold text-stone-900">{log.recipient_phone}</td>
                      <td className="p-4 text-stone-400 text-[10px] uppercase font-bold">{log.type.replace("_", " ")}</td>
                      <td className="p-4 text-stone-700 max-w-sm font-medium">{log.message}</td>
                      <td className="p-4 font-mono text-stone-500">{log.cost || "KSh 0.80"}</td>
                      <td className="p-4">
                        <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                          log.status === "sent"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : "bg-red-50 text-red-700 border border-red-100"
                        }`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
