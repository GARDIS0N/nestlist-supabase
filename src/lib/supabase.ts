import { createClient } from "@supabase/supabase-js";

// Allow dynamic overrides via localStorage for easy UI configuration
const getStoredConfig = () => {
  if (typeof window === "undefined") return { url: "", key: "" };
  try {
    return {
      url: localStorage.getItem("NESTLIST_SUPABASE_URL") || "",
      key: localStorage.getItem("NESTLIST_SUPABASE_ANON_KEY") || ""
    };
  } catch (e) {
    return { url: "", key: "" };
  }
};

const storedConfig = getStoredConfig();

const supabaseUrl = storedConfig.url || (import.meta as any).env?.VITE_SUPABASE_URL || "";
const supabaseAnonKey = storedConfig.key || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || "";

const isPlaceholder = (val: string) => {
  return !val || val.includes("MY_SUPABASE") || val.includes("placeholder") || val.includes("YOUR_") || val === "";
};

const useRealSupabase = !isPlaceholder(supabaseUrl) && !isPlaceholder(supabaseAnonKey);

// =====================================================================
// DUMMY PROPERTIES SEED DATA (REPRESENTING KENYA LOCATIONS)
// =====================================================================
const INITIAL_PROPERTIES = [
  {
    id: "prop-1",
    landlord_id: "landlord-1",
    title: "Charming Bedsitter in Roysambu",
    description: "Located near Thika Road Mall (TRM). Features continuous water supply, secure gate, tiled floors, instant hot shower installed, and highly accessible by public transport.",
    location: "Roysambu, off TRM Drive",
    county: "Nairobi",
    price: 13000,
    type: "bedsitter",
    amenities: ["Water 24/7", "Borehole", "Security Guard", "CCTV", "WiFi Ready", "Tiled Floors", "Near Shopping Centre"],
    images: [
      "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80"
    ],
    status: "available",
    is_active: true,
    expires_at: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(), // active
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "prop-2",
    landlord_id: "landlord-2",
    title: "Spacious 2 Bedroom Apartment in Ruiru",
    description: "Modern apartments with high-quality finishes. Close to Spur Mall. Master en-suite, spacious balcony, secure parking, backup generator for common areas, and high speed elevator.",
    location: "Ruiru, Bypass",
    county: "Kiambu",
    price: 28000,
    type: "2br",
    amenities: ["Water 24/7", "Parking", "Security Guard", "CCTV", "Electric Fence", "Backup Generator", "WiFi Ready", "Balcony", "Near Shopping Centre"],
    images: [
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=800&q=80"
    ],
    status: "available",
    is_active: true,
    expires_at: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "prop-3",
    landlord_id: "landlord-1",
    title: "Cozy 1 Bedroom near Daystar University",
    description: "Perfect for students or young professionals. Fast fiber internet, serene study garden, electric fencing, laundry area, and tiled bathrooms.",
    location: "Kikuyu Town",
    county: "Kiambu",
    price: 16500,
    type: "1br",
    amenities: ["Water 24/7", "Borehole", "Parking", "Electric Fence", "WiFi Ready", "Tiled Floors", "Garden", "Near School"],
    images: [
      "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80"
    ],
    status: "available",
    is_active: true,
    expires_at: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "prop-4",
    landlord_id: "landlord-3",
    title: "Executive 3 Bedroom in Nyali",
    description: "Luxury beachfront apartment in Nyali. Fully air-conditioned, swimming pool access, ocean breeze balcony, modern kitchen setup, DSTV ready, and tight 24-hour security.",
    location: "Nyali, Links Road",
    county: "Mombasa",
    price: 65000,
    type: "3br",
    amenities: ["Water 24/7", "Parking", "Security Guard", "CCTV", "Backup Generator", "WiFi Ready", "DSTV Ready", "Balcony", "Near Tarmac", "Near Shopping Centre"],
    images: [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80"
    ],
    status: "available",
    is_active: true,
    expires_at: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "prop-5",
    landlord_id: "landlord-4",
    title: "Affordable Single Room in Madaraka",
    description: "Close proximity to Strathmore University. Comes with shared cooking area, clean bathrooms, laundry yard, security lock, and token electricity meters.",
    location: "Madaraka Estate",
    county: "Nairobi",
    price: 8000,
    type: "single_room",
    amenities: ["Water 24/7", "Borehole", "Security Guard", "WiFi Ready", "Tiled Floors", "Near School", "Near Shopping Centre"],
    images: [
      "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80"
    ],
    status: "available",
    is_active: true,
    expires_at: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "prop-6",
    landlord_id: "landlord-2",
    title: "Studio Apartment in Kilimani",
    description: "Fully loaded studio apartment with high-end fixtures. Ideal for single professionals. Secure residential complex, fitted oven, high speed elevators, gym, and borehole water.",
    location: "Kilimani, Rose Avenue",
    county: "Nairobi",
    price: 25000,
    type: "studio",
    amenities: ["Water 24/7", "Borehole", "Parking", "Security Guard", "CCTV", "Electric Fence", "Backup Generator", "WiFi Ready", "Tiled Floors", "Balcony", "Near Tarmac"],
    images: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80"
    ],
    status: "available",
    is_active: true,
    expires_at: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// =====================================================================
// HIGH-FIDELITY SUPABASE CLIENT SIMULATOR
// =====================================================================
class SupabaseSimulator {
  // Local storage keys
  private STORAGE_KEYS = {
    AUTH_USER: "nestlist_mock_user",
    PROFILES: "nestlist_mock_profiles",
    PROPERTIES: "nestlist_mock_properties",
    PAYMENTS: "nestlist_mock_payments",
    INQUIRIES: "nestlist_mock_inquiries",
    MESSAGES: "nestlist_mock_messages",
    SAVED: "nestlist_mock_saved",
    ALERTS: "nestlist_mock_alerts",
    SMS_LOGS: "nestlist_mock_sms_logs"
  };

  private authChangeCallbacks: Array<(event: string, session: any) => void> = [];
  private realtimeListeners: Record<string, Array<(payload: any) => void>> = {};

  constructor() {
    this.initializeLocalStorage();
  }

  private initializeLocalStorage() {
    if (!localStorage.getItem(this.STORAGE_KEYS.PROPERTIES)) {
      localStorage.setItem(this.STORAGE_KEYS.PROPERTIES, JSON.stringify(INITIAL_PROPERTIES));
    }
    if (!localStorage.getItem(this.STORAGE_KEYS.PROFILES)) {
      const mockProfiles = [
        { id: "landlord-1", full_name: "Peter Kamau", phone: "0712345678", role: "landlord", avatar_url: "" },
        { id: "landlord-2", full_name: "Grace Mutua", phone: "0722987654", role: "landlord", avatar_url: "" },
        { id: "landlord-3", full_name: "Ahmed Omar", phone: "0733111222", role: "landlord", avatar_url: "" },
        { id: "landlord-4", full_name: "Sarah Wanjiku", phone: "0755444333", role: "landlord", avatar_url: "" },
        { id: "tenant-1", full_name: "Brian Otieno", phone: "0799888777", role: "tenant", avatar_url: "" }
      ];
      localStorage.setItem(this.STORAGE_KEYS.PROFILES, JSON.stringify(mockProfiles));
    }
    if (!localStorage.getItem(this.STORAGE_KEYS.PAYMENTS)) {
      localStorage.setItem(this.STORAGE_KEYS.PAYMENTS, JSON.stringify([]));
    }
    if (!localStorage.getItem(this.STORAGE_KEYS.INQUIRIES)) {
      localStorage.setItem(this.STORAGE_KEYS.INQUIRIES, JSON.stringify([]));
    }
    if (!localStorage.getItem(this.STORAGE_KEYS.MESSAGES)) {
      localStorage.setItem(this.STORAGE_KEYS.MESSAGES, JSON.stringify([]));
    }
    if (!localStorage.getItem(this.STORAGE_KEYS.SAVED)) {
      localStorage.setItem(this.STORAGE_KEYS.SAVED, JSON.stringify([]));
    }
    if (!localStorage.getItem(this.STORAGE_KEYS.ALERTS)) {
      localStorage.setItem(this.STORAGE_KEYS.ALERTS, JSON.stringify([]));
    }
    if (!localStorage.getItem(this.STORAGE_KEYS.SMS_LOGS)) {
      localStorage.setItem(this.STORAGE_KEYS.SMS_LOGS, JSON.stringify([]));
    }
  }

  // Helper getters
  private getList(key: string): any[] {
    return JSON.parse(localStorage.getItem(key) || "[]");
  }

  private saveList(key: string, data: any[]) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  // Trigger realtime callback
  private triggerRealtimeUpdate(channel: string, payload: any) {
    if (this.realtimeListeners[channel]) {
      this.realtimeListeners[channel].forEach(callback => callback(payload));
    }
  }

  // SMS Logging Helper
  private logSMS(type: string, phone: string, text: string) {
    const logs = this.getList(this.STORAGE_KEYS.SMS_LOGS);
    logs.unshift({
      id: `sms-${Date.now()}`,
      type,
      recipient_phone: phone,
      message: text,
      status: "sent",
      message_id: `at_msg_${Math.random().toString(36).substr(2, 9)}`,
      cost: "KSh 0.80",
      created_at: new Date().toISOString()
    });
    this.saveList(this.STORAGE_KEYS.SMS_LOGS, logs);
  }

  // AUTH API
  auth = {
    signUp: async ({ email, password, options }: { email: string; password: string; options?: any }) => {
      const users = JSON.parse(localStorage.getItem("nestlist_mock_users") || "[]");
      if (users.some((u: any) => u.email === email)) {
        return { data: { user: null }, error: new Error("User already exists") };
      }

      const uid = `user-${Date.now()}`;
      const newUser = { id: uid, email, role: options?.data?.role || "tenant" };
      users.push({ ...newUser, password });
      localStorage.setItem("nestlist_mock_users", JSON.stringify(users));

      // Auto create profile
      const profiles = this.getList(this.STORAGE_KEYS.PROFILES);
      const newProfile = {
        id: uid,
        full_name: options?.data?.full_name || email.split("@")[0],
        phone: options?.data?.phone || "",
        role: options?.data?.role || "tenant",
        avatar_url: "",
        created_at: new Date().toISOString()
      };
      profiles.push(newProfile);
      this.saveList(this.STORAGE_KEYS.PROFILES, profiles);

      // Trigger Welcome SMS
      const welcomeText = newProfile.role === "landlord"
        ? `Karibu Nestlist, ${newProfile.full_name}! List your rooms, bedsitters, and apartments, pay the listing fee easily via M-Pesa, and start receiving inquiries instantly via SMS.`
        : `Karibu Nestlist, ${newProfile.full_name}! Search and filter rentals across Kenya, save favorites, and subscribe to search alerts. We notify you via SMS when matching rentals are listed!`;
      this.logSMS(`welcome_${newProfile.role}`, newProfile.phone || "N/A", welcomeText);

      const session = { access_token: "mock-token", user: newUser };
      localStorage.setItem(this.STORAGE_KEYS.AUTH_USER, JSON.stringify(session));
      this.notifyAuthChange("SIGNED_IN", session);

      return { data: { user: newUser, session }, error: null };
    },

    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      const users = JSON.parse(localStorage.getItem("nestlist_mock_users") || "[]");
      // Add default seeds if not existing
      if (users.length === 0) {
        users.push(
          { id: "landlord-1", email: "landlord1@nestlist.co.ke", password: "password", role: "landlord" },
          { id: "landlord-2", email: "landlord2@nestlist.co.ke", password: "password", role: "landlord" },
          { id: "tenant-1", email: "tenant1@nestlist.co.ke", password: "password", role: "tenant" },
          { id: "admin-1", email: "thesilentwhisper.ke@gmail.com", password: "password", role: "landlord" } // Admin check
        );
        localStorage.setItem("nestlist_mock_users", JSON.stringify(users));
      }

      const user = users.find((u: any) => u.email === email && u.password === password);
      if (!user) {
        return { data: { user: null, session: null }, error: new Error("Invalid login credentials") };
      }

      const session = { access_token: "mock-token", user };
      localStorage.setItem(this.STORAGE_KEYS.AUTH_USER, JSON.stringify(session));
      this.notifyAuthChange("SIGNED_IN", session);

      return { data: { user, session }, error: null };
    },

    signInWithOAuth: async ({ provider, options }: { provider: string; options?: any }) => {
      // Simulate Google OAuth
      const mockOAuthUser = {
        id: `google-user-${Date.now()}`,
        email: "googleuser@gmail.com",
        role: "tenant" // Will redirect to onboarding
      };
      
      const session = { access_token: "google-token", user: mockOAuthUser };
      localStorage.setItem(this.STORAGE_KEYS.AUTH_USER, JSON.stringify(session));
      this.notifyAuthChange("SIGNED_IN", session);

      return { data: { provider, url: options?.redirectTo || "/" }, error: null };
    },

    signOut: async () => {
      localStorage.removeItem(this.STORAGE_KEYS.AUTH_USER);
      this.notifyAuthChange("SIGNED_OUT", null);
      return { error: null };
    },

    resetPasswordForEmail: async (email: string) => {
      return { data: {}, error: null };
    },

    onAuthStateChange: (callback: (event: string, session: any) => void) => {
      this.authChangeCallbacks.push(callback);
      // Fire initial state
      const savedUser = localStorage.getItem(this.STORAGE_KEYS.AUTH_USER);
      if (savedUser) {
        callback("SIGNED_IN", JSON.parse(savedUser));
      } else {
        callback("SIGNED_OUT", null);
      }
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              this.authChangeCallbacks = this.authChangeCallbacks.filter(c => c !== callback);
            }
          }
        }
      };
    },

    getUser: async () => {
      const savedUser = localStorage.getItem(this.STORAGE_KEYS.AUTH_USER);
      return { data: { user: savedUser ? JSON.parse(savedUser).user : null }, error: null };
    },

    getSession: async () => {
      const savedUser = localStorage.getItem(this.STORAGE_KEYS.AUTH_USER);
      return { data: { session: savedUser ? JSON.parse(savedUser) : null }, error: null };
    }
  };

  private notifyAuthChange(event: string, session: any) {
    this.authChangeCallbacks.forEach(cb => cb(event, session));
  }

  // STORAGE API
  storage = {
    from: (bucket: string) => ({
      upload: async (path: string, file: File) => {
        // Return dummy URL path
        const fileUrl = URL.createObjectURL(file);
        return { data: { path }, error: null };
      },
      getPublicUrl: (path: string) => {
        // Fallback to random high-quality images for property uploading
        const imagesList = [
          "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=800&q=80"
        ];
        // Distribute based on path length to make them consistent
        const index = path.length % imagesList.length;
        return { data: { publicUrl: imagesList[index] } };
      }
    })
  };

  // FUNCTIONS API
  functions = {
    invoke: async (name: string, { body }: { body: any }) => {
      if (name === "mpesa-stk-push") {
        const { propertyId, landlordId, phone, amount, propertyType } = body;
        
        // Setup pending payment
        const payments = this.getList(this.STORAGE_KEYS.PAYMENTS);
        const checkoutId = `ws_CO_${Date.now()}`;
        const newPayment = {
          id: `pay-${Date.now()}`,
          property_id: propertyId,
          landlord_id: landlordId,
          amount,
          property_type: propertyType,
          mpesa_checkout_request_id: checkoutId,
          payer_phone: phone,
          status: "pending",
          created_at: new Date().toISOString()
        };
        payments.push(newPayment);
        this.saveList(this.STORAGE_KEYS.PAYMENTS, payments);

        // STIMULATE DELAYED AUTO-CONFIRMATION (Simulation of PIN Entry!)
        setTimeout(() => {
          const currentPayments = this.getList(this.STORAGE_KEYS.PAYMENTS);
          const payIdx = currentPayments.findIndex(p => p.id === newPayment.id);
          if (payIdx !== -1 && currentPayments[payIdx].status === "pending") {
            const mpesaCode = `MPX${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
            currentPayments[payIdx].status = "confirmed";
            currentPayments[payIdx].mpesa_code = mpesaCode;
            currentPayments[payIdx].amount_paid = amount;
            currentPayments[payIdx].confirmed_at = new Date().toISOString();
            this.saveList(this.STORAGE_KEYS.PAYMENTS, currentPayments);

            // Trigger property activation
            const properties = this.getList(this.STORAGE_KEYS.PROPERTIES);
            const propIdx = properties.findIndex(p => p.id === propertyId);
            if (propIdx !== -1) {
              properties[propIdx].is_active = true;
              properties[propIdx].expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
              this.saveList(this.STORAGE_KEYS.PROPERTIES, properties);

              // Find landlord profile
              const profiles = this.getList(this.STORAGE_KEYS.PROFILES);
              const landlord = profiles.find(p => p.id === landlordId);

              // 1. Send SMS: Payment Confirmed
              this.logSMS(
                "payment_confirmed",
                phone,
                `Habari ${landlord?.full_name || "Landlord"}, payment of KSh ${amount} (Ref: ${mpesaCode}) received. Your listing "${properties[propIdx].title}" is now ACTIVE for 30 days. Log in to track views!`
              );

              // 2. Trigger Search Alerts
              const alerts = this.getList(this.STORAGE_KEYS.ALERTS);
              alerts.forEach(alert => {
                if (
                  alert.is_active &&
                  (!alert.county || alert.county === properties[propIdx].county) &&
                  (!alert.type || alert.type === properties[propIdx].type) &&
                  (!alert.min_price || properties[propIdx].price >= alert.min_price) &&
                  (!alert.max_price || properties[propIdx].price <= alert.max_price)
                ) {
                  const tenantProfile = profiles.find(p => p.id === alert.tenant_id);
                  if (tenantProfile?.phone) {
                    this.logSMS(
                      "search_alert",
                      tenantProfile.phone,
                      `Jambo ${tenantProfile.full_name}, a new property matching your alert "${alert.name}" is available! "${properties[propIdx].title}" in ${properties[propIdx].location} at KSh ${properties[propIdx].price}/mo. View details on Nestlist: /property/${properties[propIdx].id}`
                    );
                  }
                }
              });
            }

            // Fire realtime update event
            this.triggerRealtimeUpdate(`payment-${newPayment.id}`, {
              new: currentPayments[payIdx]
            });
          }
        }, 4000); // Wait 4 seconds to simulate user entering M-Pesa PIN

        return { data: { success: true, payment_id: newPayment.id, checkout_request_id: checkoutId }, error: null };
      }

      if (name === "send-sms") {
        const { type, phone, data } = body;
        this.logSMS(type, phone, `[Direct SMS API Command] Content Data: ${JSON.stringify(data)}`);
        return { data: { success: true, message: "SMS Simulated successfully" }, error: null };
      }

      return { data: {}, error: null };
    }
  };

  // SUBSCRIPTION & CHANNEL API
  channel(name: string) {
    return {
      on: (event: string, filter: any, callback: (payload: any) => void) => {
        // Register standard listener key
        const subscriptionKey = `${filter.table || name}`;
        if (!this.realtimeListeners[subscriptionKey]) {
          this.realtimeListeners[subscriptionKey] = [];
        }
        this.realtimeListeners[subscriptionKey].push(callback);
        return {
          subscribe: () => {
            console.log(`Subscribed to Realtime channel: ${subscriptionKey}`);
            return {
              unsubscribe: () => {
                this.realtimeListeners[subscriptionKey] = this.realtimeListeners[subscriptionKey].filter(
                  cb => cb !== callback
                );
              }
            };
          }
        };
      },
      subscribe: () => {
        const subscriptionKey = name;
        return {
          unsubscribe: () => {
            delete this.realtimeListeners[subscriptionKey];
          }
        };
      }
    };
  }

  // TABLE QUERY CHAIN BUILDER
  from(table: string) {
    const listKey = this.STORAGE_KEYS[table.toUpperCase() as keyof typeof this.STORAGE_KEYS] || `nestlist_mock_${table}`;
    let items = this.getList(listKey);

    return {
      select: (columns: string = "*") => {
        // Return a mock promise proxy with filtering methods
        const builder = {
          data: items,
          error: null as any,
          then: function(resolve: any) {
            resolve({ data: this.data, error: this.error });
            return Promise.resolve({ data: this.data, error: this.error });
          },
          eq: function(col: string, val: any) {
            this.data = this.data.filter((item: any) => String(item[col]) === String(val));
            return this;
          },
          neq: function(col: string, val: any) {
            this.data = this.data.filter((item: any) => String(item[col]) !== String(val));
            return this;
          },
          in: function(col: string, values: any[]) {
            this.data = this.data.filter((item: any) => values.includes(item[col]));
            return this;
          },
          order: function(col: string, { ascending = true } = {}) {
            this.data = [...this.data].sort((a, b) => {
              if (a[col] < b[col]) return ascending ? -1 : 1;
              if (a[col] > b[col]) return ascending ? 1 : -1;
              return 0;
            });
            return this;
          },
          range: function(from: number, to: number) {
            this.data = this.data.slice(from, to + 1);
            return this;
          },
          single: function() {
            return {
              data: this.data[0] || null,
              error: this.data[0] ? null : new Error("No record found"),
              then: (resolve: any) => resolve({ data: this.data[0] || null, error: this.data[0] ? null : new Error("No record found") })
            };
          },
          maybeSingle: function() {
            return {
              data: this.data[0] || null,
              error: null,
              then: (resolve: any) => resolve({ data: this.data[0] || null, error: null })
            };
          }
        };
        return builder;
      },

      insert: (data: any) => {
        const rowsToInsert = Array.isArray(data) ? data : [data];
        const insertedRows = rowsToInsert.map(row => {
          const newRow = {
            id: row.id || `${table.substring(0, 4)}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            created_at: new Date().toISOString(),
            ...row
          };
          items.push(newRow);
          return newRow;
        });

        this.saveList(listKey, items);

        // Auto trigger side effects based on inserts
        if (table === "inquiries") {
          insertedRows.forEach(inquiry => {
            const profilesList = this.getList(this.STORAGE_KEYS.PROFILES);
            const tenant = profilesList.find(p => p.id === inquiry.tenant_id);
            const landlord = profilesList.find(p => p.id === inquiry.landlord_id);
            const propertiesList = this.getList(this.STORAGE_KEYS.PROPERTIES);
            const property = propertiesList.find(p => p.id === inquiry.property_id);

            // Notify Landlord
            this.logSMS(
              "inquiry_received",
              landlord?.phone || "N/A",
              `Jambo ${landlord?.full_name || "Landlord"}, you have a new inquiry from ${tenant?.full_name || "a tenant"} (${tenant?.phone}) regarding your listing "${property?.title}": "${inquiry.message}". Reply via Nestlist!`
            );

            // Confirm to Tenant
            this.logSMS(
              "inquiry_sent",
              tenant?.phone || "N/A",
              `Jambo ${tenant?.full_name || "Tenant"}, your inquiry for "${property?.title}" has been sent to the landlord. Their phone is ${landlord?.phone || "N/A"}. Thank you for choosing Nestlist!`
            );
          });
        }

        return {
          data: Array.isArray(data) ? insertedRows : insertedRows[0],
          error: null,
          select: function() {
            return {
              single: () => ({
                data: insertedRows[0],
                error: null,
                then: (resolve: any) => resolve({ data: insertedRows[0], error: null })
              }),
              then: (resolve: any) => resolve({ data: insertedRows, error: null })
            };
          },
          then: (resolve: any) => resolve({ data: Array.isArray(data) ? insertedRows : insertedRows[0], error: null })
        };
      },

      update: (data: any) => {
        return {
          eq: (col: string, val: any) => {
            let matched = false;
            const originalItems = [...items];
            const updatedItems = items.map(item => {
              if (String(item[col]) === String(val)) {
                matched = true;
                return { ...item, ...data };
              }
              return item;
            });

            this.saveList(listKey, updatedItems);
            const updatedRows = updatedItems.filter(item => String(item[col]) === String(val));

            // Triggers for payments status updates
            if (table === "listing_payments" && data.status === "confirmed") {
              updatedRows.forEach(payment => {
                // Activate listing trigger simulation
                const props = this.getList(this.STORAGE_KEYS.PROPERTIES);
                const pIdx = props.findIndex(p => p.id === payment.property_id);
                if (pIdx !== -1) {
                  props[pIdx].is_active = true;
                  props[pIdx].expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
                  this.saveList(this.STORAGE_KEYS.PROPERTIES, props);
                }
              });
            }

            return {
              data: updatedRows,
              error: null,
              then: (resolve: any) => resolve({ data: updatedRows, error: null })
            };
          }
        };
      },

      delete: () => {
        return {
          eq: (col: string, val: any) => {
            const originalLength = items.length;
            const remaining = items.filter(item => String(item[col]) !== String(val));
            this.saveList(listKey, remaining);

            return {
              data: null,
              error: null,
              then: (resolve: any) => resolve({ data: null, error: null })
            };
          }
        };
      }
    };
  }
}

// Export either standard Supabase client or high-fidelity simulator
export const supabase = useRealSupabase
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (new SupabaseSimulator() as unknown as ReturnType<typeof createClient>);

export const IS_MOCK_SUPABASE = !useRealSupabase;

export const getSupabaseConfig = () => {
  return {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
    isMock: !useRealSupabase,
    isUsingStored: typeof window !== "undefined" && !!localStorage.getItem("NESTLIST_SUPABASE_URL")
  };
};

export const setSupabaseConfig = (url: string, key: string) => {
  if (typeof window === "undefined") return;
  if (!url || !key) {
    localStorage.removeItem("NESTLIST_SUPABASE_URL");
    localStorage.removeItem("NESTLIST_SUPABASE_ANON_KEY");
  } else {
    localStorage.setItem("NESTLIST_SUPABASE_URL", url.trim());
    localStorage.setItem("NESTLIST_SUPABASE_ANON_KEY", key.trim());
  }
};
