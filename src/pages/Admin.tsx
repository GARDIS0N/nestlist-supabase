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
  // Admin email is standard thesilentwhisper.ke@gmail.com
  const authorized = profile?.id === "admin-1" || profile?.id === "landlord-1" || profile?.full_name === "Peter Kamau";

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // 1. Fetch payments
      const { data: payData } = await supabase
        .from("listing_payments")
        .select("*, landlord:profiles!listing_payments_landlord_id_fkey(full_name, phone), property:properties(title)")
        .order("created_at", { ascending: false });
      setPayments(payData || []);

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

  const handleApprovePayment = async (paymentId: string, propertyId: string) => {
    try {
      // Simulate Service Role updates to payment row
      // Confirms payment and triggers activation via database functions
      const mpesaCode = `ADM${Math.random().toString(36).substr(2, 7).toUpperCase()}`;
      
      const { error } = await supabase
        .from("listing_payments")
        .update({
          status: "confirmed",
          mpesa_code: mpesaCode,
          amount_paid: 200, // mock amount
          confirmed_at: new Date().toISOString()
        })
        .eq("id", paymentId);

      if (error) throw error;

      // Force listing activation as well
      await supabase
        .from("properties")
        .update({ is_active: true, expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() })
        .eq("id", propertyId);

      // Reload
      fetchAdminData();
    } catch (err: any) {
      alert(`Approval failed: ${err.message}`);
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
                    <td colSpan={6} className="p-8 text-center text-stone-400 font-medium">No transactions registered yet.</td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id} className="hover:bg-stone-50/50">
                      <td className="p-4">
                        <p className="font-bold text-stone-900">{p.landlord?.full_name}</p>
                        <p className="text-stone-400 text-[10px]">{p.landlord?.phone}</p>
                      </td>
                      <td className="p-4 max-w-xs truncate font-medium text-stone-700">
                        {p.property?.title || "Property Listing"}
                      </td>
                      <td className="p-4 font-mono font-bold">KSh {parseFloat(p.amount).toLocaleString()}</td>
                      <td className="p-4">
                        <p className="font-mono text-xs font-bold text-stone-850">{p.mpesa_code || "N/A"}</p>
                        <p className="text-[10px] text-stone-400 font-mono truncate max-w-[150px]">{p.mpesa_checkout_request_id}</p>
                      </td>
                      <td className="p-4">
                        <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                          p.status === "confirmed"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : p.status === "pending"
                            ? "bg-amber-50 text-amber-700 border border-amber-100"
                            : "bg-red-50 text-red-700 border border-red-100"
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {p.status === "pending" && (
                          <button
                            onClick={() => handleApprovePayment(p.id, p.property_id)}
                            className="py-1 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition"
                          >
                            Force Confirm
                          </button>
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
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-150">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-stone-50/50">
                    <td className="p-4 font-bold text-stone-900">{u.full_name}</td>
                    <td className="p-4 font-mono">{u.phone || "No phone connected"}</td>
                    <td className="p-4">
                      <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                        u.role === "landlord"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-stone-100 text-stone-700"
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4 text-stone-400 text-xs">{new Date(u.created_at).toLocaleString()}</td>
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
