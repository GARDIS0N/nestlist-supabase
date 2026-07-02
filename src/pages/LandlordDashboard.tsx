import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { LayoutDashboard, Plus, MessageSquare, Building2, BellRing, Eye, Check, X, Loader2, Landmark, CheckCircle, Clock, AlertTriangle, Send } from "lucide-react";

export const LandlordDashboard: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"listings" | "inquiries">("listings");
  const [properties, setProperties] = useState<any[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Stats
  const [stats, setStats] = useState({
    activeCount: 0,
    totalProperties: 0,
    inquiryCount: 0,
  });

  // Selected Inquiry Chat State
  const [selectedInquiryId, setSelectedInquiryId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessageText, setNewMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  const fetchDashboardData = async () => {
    if (!profile) return;
    setLoading(true);

    try {
      // 1. Fetch properties
      const { data: propsData, error: propsError } = await supabase
        .from("properties")
        .select("*")
        .eq("landlord_id", profile.id)
        .order("created_at", { ascending: false });

      if (propsError) throw propsError;
      const listingsList = propsData || [];
      setProperties(listingsList);

      // 2. Fetch inquiries
      const { data: inquiriesData, error: inqError } = await supabase
        .from("inquiries")
        .select("*, tenant:profiles!inquiries_tenant_id_fkey(full_name, phone), property:properties(title)")
        .eq("landlord_id", profile.id)
        .order("created_at", { ascending: false });

      if (inqError) throw inqError;
      const inqList = inquiriesData || [];
      setInquiries(inqList);

      // 3. Calculate Stats
      const activeCount = listingsList.filter(p => p.is_active).length;
      setStats({
        activeCount,
        totalProperties: listingsList.length,
        inquiryCount: inqList.length
      });

    } catch (err) {
      console.error("Error fetching landlord dashboard details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [profile]);

  // Load chat messages when inquiry is selected
  const fetchChatMessages = async (inquiryId: string) => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("inquiry_id", inquiryId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setChatMessages(data || []);
    } catch (err) {
      console.error("Failed to load chat messages:", err);
    }
  };

  useEffect(() => {
    if (!selectedInquiryId) return;

    fetchChatMessages(selectedInquiryId);

    // Setup realtime subscription for this inquiry's messages
    const channel = supabase
      .channel(`inquiry-messages-${selectedInquiryId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `inquiry_id=eq.${selectedInquiryId}`,
        },
        (payload) => {
          const newMessage = payload.new;
          setChatMessages((prev) => {
            if (prev.some((msg) => msg.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedInquiryId]);

  const handleUpdateInquiryStatus = async (inquiryId: string, nextStatus: "responded" | "closed") => {
    try {
      const { error } = await supabase
        .from("inquiries")
        .update({ status: nextStatus })
        .eq("id", inquiryId);

      if (error) throw error;

      setInquiries(prev =>
        prev.map(item => (item.id === inquiryId ? { ...item, status: nextStatus } : item))
      );
    } catch (err) {
      console.error("Failed to update inquiry status:", err);
    }
  };

  const handleSendChatReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedInquiryId || !newMessageText.trim()) return;

    setSendingMessage(true);

    try {
      // 1. Insert chat message
      const { data: msgRow, error: msgError } = await supabase
        .from("messages")
        .insert({
          inquiry_id: selectedInquiryId,
          sender_id: profile.id,
          content: newMessageText,
        })
        .select()
        .single();

      if (msgError) throw msgError;

      // Append locally
      setChatMessages(prev => [...prev, msgRow]);

      // 2. Fetch the inquiry and tenant profile to send SMS
      const selectedInquiry = inquiries.find(i => i.id === selectedInquiryId);
      if (selectedInquiry?.tenant?.phone) {
        // Send SMS to tenant notifying them of the landlord's response
        await supabase.functions.invoke("send-sms", {
          body: {
            type: "inquiry_sent", // reuse template to send message alert
            phone: selectedInquiry.tenant.phone,
            data: {
              tenant_name: selectedInquiry.tenant.full_name,
              property_title: selectedInquiry.property?.title || "Property",
              landlord_phone: profile.phone,
              message: `Reply: ${newMessageText.substring(0, 80)}`
            }
          }
        });
      }

      // 3. Mark inquiry as responded
      await handleUpdateInquiryStatus(selectedInquiryId, "responded");

      setNewMessageText("");
    } catch (err: any) {
      console.error("Failed to send reply message:", err);
      alert(`Reply failed: ${err.message}`);
    } finally {
      setSendingMessage(false);
    }
  };

  const deleteProperty = async (propertyId: string) => {
    if (!confirm("Are you sure you want to delete this listing? This action cannot be undone.")) return;

    try {
      const { error } = await supabase
        .from("properties")
        .delete()
        .eq("id", propertyId);

      if (error) throw error;

      setProperties(prev => prev.filter(p => p.id !== propertyId));
      setStats(prev => ({ ...prev, totalProperties: prev.totalProperties - 1 }));
    } catch (err: any) {
      alert(`Deletion failed: ${err.message}`);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Upper Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-stone-950 font-sans flex items-center space-x-2">
            <LayoutDashboard className="h-6 w-6 text-amber-600" />
            <span>Landlord Management Hub</span>
          </h1>
          <p className="text-stone-500 text-xs sm:text-sm font-medium">
            Track inquiries, update availability, and list properties with instant M-Pesa activation.
          </p>
        </div>

        <Link
          to="/list-property"
          className="inline-flex items-center space-x-1.5 py-3 px-5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold shadow-md shadow-amber-600/10 transition self-start"
        >
          <Plus className="h-5 w-5" />
          <span>List New Property</span>
        </Link>
      </div>

      {/* Stats Counter Rows */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-stone-400 text-xs font-bold uppercase tracking-wider">Total Listings</p>
            <p className="text-2xl font-black text-stone-950">{stats.totalProperties}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-stone-400 text-xs font-bold uppercase tracking-wider">Active Listings</p>
            <p className="text-2xl font-black text-emerald-600">{stats.activeCount}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
            <MessageSquare className="h-6 w-6" />
          </div>
          <div>
            <p className="text-stone-400 text-xs font-bold uppercase tracking-wider">Tenant Inquiries</p>
            <p className="text-2xl font-black text-stone-950">{stats.inquiryCount}</p>
          </div>
        </div>
      </div>

      {/* Tab Selectors */}
      <div className="border-b border-stone-200">
        <div className="flex space-x-6">
          <button
            onClick={() => setActiveTab("listings")}
            className={`py-3 text-sm font-bold border-b-2 transition ${
              activeTab === "listings"
                ? "border-amber-600 text-amber-900"
                : "border-transparent text-stone-500 hover:text-stone-900"
            }`}
          >
            My Properties ({properties.length})
          </button>
          <button
            onClick={() => setActiveTab("inquiries")}
            className={`py-3 text-sm font-bold border-b-2 transition ${
              activeTab === "inquiries"
                ? "border-amber-600 text-amber-900"
                : "border-transparent text-stone-500 hover:text-stone-900"
            }`}
          >
            Inquiries Received ({inquiries.length})
          </button>
        </div>
      </div>

      {/* Main Tab Contents */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="flex flex-col items-center space-y-2 animate-pulse">
            <Loader2 className="h-8 w-8 text-amber-600 animate-spin" />
            <p className="text-stone-400 text-xs">Loading data...</p>
          </div>
        </div>
      ) : activeTab === "listings" ? (
        /* MY PROPERTIES TAB */
        properties.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 py-16 px-4 text-center max-w-lg mx-auto shadow-sm">
            <div className="text-4xl mb-3">📋</div>
            <h3 className="font-bold text-lg text-stone-900">No properties listed yet</h3>
            <p className="text-stone-500 text-sm mt-1 max-w-xs mx-auto leading-relaxed">
              List your rental house, pay the small Safaricom fee, and start receiving leads instantly!
            </p>
            <Link
              to="/list-property"
              className="mt-6 inline-flex items-center space-x-1 py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
            >
              <span>List Your First Rental</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property) => (
              <div
                key={property.id}
                className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="relative aspect-video w-full bg-stone-100">
                    <img
                      src={property.images?.[0] || "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=600&q=80"}
                      alt={property.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=600&q=80";
                      }}
                    />

                    {/* Active Status Badge */}
                    {property.is_active ? (
                      <span className="absolute top-3 left-3 bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow flex items-center space-x-1">
                        <Check className="h-3 w-3 stroke-[3]" />
                        <span>Active</span>
                      </span>
                    ) : (
                      <span className="absolute top-3 left-3 bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>Pending Payment</span>
                      </span>
                    )}

                    <span className="absolute bottom-3 right-3 bg-stone-900/80 backdrop-blur-sm text-white text-xs font-bold px-2 py-0.5 rounded">
                      KSh {parseFloat(property.price).toLocaleString()}/mo
                    </span>
                  </div>

                  <div className="p-5 space-y-2">
                    <h3 className="font-sans font-bold text-stone-900 text-base leading-snug line-clamp-1">
                      {property.title}
                    </h3>
                    <p className="text-xs text-stone-400 font-semibold">{property.location}, {property.county}</p>

                    {property.is_active && property.expires_at && (
                      <p className="text-[10px] text-stone-500 bg-stone-50 p-2 rounded-lg border border-stone-150 flex items-center space-x-1 font-semibold">
                        <span>📅 Expires: {new Date(property.expires_at).toLocaleDateString()}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-5 pt-0 border-t border-stone-100 bg-stone-50/50 flex items-center justify-between gap-2">
                  <button
                    onClick={() => deleteProperty(property.id)}
                    className="py-1.5 px-3 rounded-lg text-xs font-bold text-stone-400 hover:text-red-600 transition"
                  >
                    Delete
                  </button>

                  <div className="flex items-center space-x-2">
                    <Link
                      to={`/property/${property.id}`}
                      className="p-2 border border-stone-200 bg-white text-stone-600 hover:text-stone-900 rounded-lg text-xs font-bold transition"
                      title="Preview Listing"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>

                    {!property.is_active && (
                      <Link
                        to={`/list-property?resume_pay=true&property_id=${property.id}&type=${property.type}`}
                        className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-sm"
                      >
                        Activate Now
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* INQUIRIES RECEIVED TAB */
        inquiries.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 py-16 px-4 text-center max-w-lg mx-auto shadow-sm">
            <div className="text-4xl mb-3">💬</div>
            <h3 className="font-bold text-lg text-stone-900">No inquiries yet</h3>
            <p className="text-stone-500 text-sm mt-1 max-w-xs mx-auto leading-relaxed">
              When house hunters view your active listings, their message inquiries will appear here, and you'll receive SMS notifications instantly.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* Inquiry Leads List */}
            <div className="lg:col-span-1 border border-stone-200 rounded-2xl overflow-hidden bg-white shadow-sm divide-y divide-stone-150 max-h-[600px] overflow-y-auto">
              {inquiries.map((inquiry) => {
                const isSelected = selectedInquiryId === inquiry.id;
                return (
                  <button
                    key={inquiry.id}
                    onClick={() => setSelectedInquiryId(inquiry.id)}
                    className={`w-full text-left p-4.5 transition flex flex-col space-y-2 focus:outline-none ${
                      isSelected ? "bg-amber-50/50 border-r-4 border-amber-600" : "hover:bg-stone-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-800 truncate">
                        {inquiry.tenant?.full_name}
                      </span>
                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        inquiry.status === "pending"
                          ? "bg-amber-100 text-amber-800"
                          : inquiry.status === "responded"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-stone-200 text-stone-600"
                      }`}>
                        {inquiry.status}
                      </span>
                    </div>

                    <p className="text-xs font-bold text-stone-500 truncate">
                      {inquiry.property?.title}
                    </p>

                    <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed italic">
                      "{inquiry.message}"
                    </p>

                    <span className="text-[9px] text-stone-400 font-bold">
                      {new Date(inquiry.created_at).toLocaleString()}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Live Chat & Message Console */}
            <div className="lg:col-span-2 border border-stone-200 rounded-2xl overflow-hidden bg-white shadow-sm flex flex-col h-[500px]">
              {selectedInquiryId ? (
                (() => {
                  const inquiry = inquiries.find(i => i.id === selectedInquiryId);
                  return (
                    <>
                      {/* Chat Header */}
                      <div className="bg-stone-900 text-white p-4 flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-sm leading-tight">{inquiry?.tenant?.full_name}</h4>
                          <p className="text-[10px] text-stone-400 font-semibold">{inquiry?.property?.title}</p>
                        </div>
                        <div className="flex space-x-2">
                          {inquiry?.status !== "closed" && (
                            <button
                              onClick={() => handleUpdateInquiryStatus(selectedInquiryId, "closed")}
                              className="text-[10px] font-bold bg-stone-800 hover:bg-stone-700 text-stone-300 py-1 px-2 rounded-md border border-stone-700"
                            >
                              Close Lead
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Chat Message Logs */}
                      <div className="flex-1 p-4.5 overflow-y-auto space-y-4.5 bg-stone-50">
                        {/* Initial Inquiry Box */}
                        <div className="flex flex-col space-y-1 max-w-[85%]">
                          <span className="text-[10px] text-stone-400 font-bold uppercase pl-1">
                            {inquiry?.tenant?.full_name} ({inquiry?.tenant?.phone})
                          </span>
                          <div className="bg-white border border-stone-200 p-3 rounded-xl rounded-tl-none shadow-sm text-xs sm:text-sm text-stone-800">
                            {inquiry?.message}
                          </div>
                        </div>

                        {/* Additional chat rows */}
                        {chatMessages.map((msg) => {
                          const isMe = msg.sender_id === profile.id;
                          return (
                            <div
                              key={msg.id}
                              className={`flex flex-col space-y-1 max-w-[85%] ${
                                isMe ? "ml-auto items-end" : ""
                              }`}
                            >
                              <span className="text-[10px] text-stone-400 font-bold uppercase pr-1">
                                {isMe ? "You" : inquiry?.tenant?.full_name}
                              </span>
                              <div
                                className={`p-3 rounded-xl shadow-sm text-xs sm:text-sm ${
                                  isMe
                                    ? "bg-stone-900 text-white rounded-tr-none"
                                    : "bg-white border border-stone-200 text-stone-800 rounded-tl-none"
                                }`}
                              >
                                {msg.content}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Reply Input Console */}
                      {inquiry?.status === "closed" ? (
                        <div className="p-4 bg-stone-100 text-center text-xs text-stone-500 font-semibold">
                          This inquiry is marked as CLOSED. Reopen by sending a reply below.
                        </div>
                      ) : null}

                      <form onSubmit={handleSendChatReply} className="border-t border-stone-200 p-3 flex gap-2">
                        <input
                          type="text"
                          placeholder={`SMS reply to ${inquiry?.tenant?.full_name}...`}
                          value={newMessageText}
                          onChange={(e) => setNewMessageText(e.target.value)}
                          className="flex-1 border border-stone-300 rounded-xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                          required
                        />
                        <button
                          type="submit"
                          disabled={sendingMessage}
                          className="py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1 shadow transition disabled:opacity-50"
                        >
                          {sendingMessage ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Send className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Send SMS</span>
                            </>
                          )}
                        </button>
                      </form>
                    </>
                  );
                })()
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-stone-400">
                  <MessageSquare className="h-10 w-10 text-stone-300 mb-2" />
                  <p className="text-xs font-semibold uppercase tracking-wider">Select an inquiry</p>
                  <p className="text-[11px] max-w-xs mt-1">
                    Select a conversation lead from the sidebar to view full message details and chat back via SMS.
                  </p>
                </div>
              )}
            </div>

          </div>
        )
      )}

    </div>
  );
};
