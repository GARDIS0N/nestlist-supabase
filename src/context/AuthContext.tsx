import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

interface Profile {
  id: string;
  full_name: string;
  phone: string;
  role: "landlord" | "tenant" | "user" | "admin";
  avatar_url: string | null;
  created_at: string;
}

interface AuthContextType {
  session: any;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, phone: string, role: "landlord" | "tenant" | "user" | "admin") => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signInWithGoogle: () => Promise<any>;
  signOut: () => Promise<any>;
  resetPassword: (email: string) => Promise<any>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Load profile details based on uid
  const loadProfile = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .maybeSingle();

      if (error) {
        console.error("Error loading user profile:", error);
        setProfile(null);
      } else if (data) {
        setProfile(data as Profile);
      } else {
        setProfile(null);
      }
    } catch (err) {
      console.error("Exception loading profile:", err);
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    if (session?.user?.id) {
      await loadProfile(session.user.id);
    }
  };

  useEffect(() => {
    let active = true;

    // 1. Get initial session and load matching profiles row first
    const checkSession = async () => {
      setLoading(true);
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (active) {
          setSession(initialSession);
          if (initialSession?.user?.id) {
            // Load profile synchronously inside the initial setup phase
            const { data, error } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", initialSession.user.id)
              .maybeSingle();
            
            if (active) {
              if (error) {
                console.error("Error loading user profile on init:", error);
                setProfile(null);
              } else {
                setProfile(data as Profile || null);
              }
            }
          } else {
            if (active) setProfile(null);
          }
        }
      } catch (err) {
        console.error("Error during initial session check:", err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    checkSession();

    // 2. Setup auth listener to keep session and profile in sync
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!active) return;

      if (event === "SIGNED_OUT") {
        setSession(null);
        setProfile(null);
        setLoading(false);
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        setLoading(true);
        setSession(newSession);
        if (newSession?.user?.id) {
          const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", newSession.user.id)
            .maybeSingle();
          
          if (active) {
            if (error) {
              console.error("Error loading profile on auth state change:", error);
              setProfile(null);
            } else {
              setProfile(data as Profile || null);
            }
          }
        } else {
          if (active) setProfile(null);
        }
        if (active) setLoading(false);
      } else {
        setSession(newSession);
      }
    });

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  // SIGN UP
  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    phone: string,
    role: "landlord" | "tenant" | "user" | "admin"
  ) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone,
            role: role,
          },
        },
      });

      if (error) throw error;

      // Ensure profiles insert succeeds (handled automatically inside mock, but explicit for real Supabase)
      if (data?.user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .insert({
            id: data.user.id,
            full_name: fullName,
            phone: phone,
            role: role,
          });
        
        if (profileError && profileError.message && !profileError.message.includes("already exists")) {
          console.error("Error inserting profile row:", profileError);
        }
        await loadProfile(data.user.id);
      }

      return { data, error: null };
    } catch (error: any) {
      console.error("Signup failed:", error);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  // SIGN IN
  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data?.user) {
        await loadProfile(data.user.id);
      }

      return { data, error: null };
    } catch (error: any) {
      console.error("Signin failed:", error);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  // GOOGLE SIGN IN
  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      console.error("Google login failed:", error);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  // SIGN OUT
  const signOut = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setProfile(null);
      setSession(null);
      return { error: null };
    } catch (error: any) {
      console.error("Logout failed:", error);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  // RESET PASSWORD
  const resetPassword = async (email: string) => {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      console.error("Reset password failed:", error);
      return { data: null, error };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        resetPassword,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
