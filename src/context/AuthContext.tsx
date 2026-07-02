import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Profile, ProfileRole } from "../types/database";

interface AuthContextType {
  session: any;
  profile: Profile | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    phone: string,
    role: ProfileRole
  ) => Promise<{ data: any; error: any }>;
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signInWithGoogle: () => Promise<{ data: any; error: any }>;
  signOut: () => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ data: any; error: any }>;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<{ data: any; error: any }>;
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
        return null;
      }
      return data as Profile | null;
    } catch (err) {
      console.error("Exception loading profile:", err);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (session?.user?.id) {
      const p = await loadProfile(session.user.id);
      setProfile(p);
    }
  };

  const updateProfile = async (data: Partial<Profile>) => {
    if (!session?.user?.id) return { data: null, error: new Error("No user session found") };
    try {
      const { data: updated, error } = await supabase
        .from("profiles")
        .update(data)
        .eq("id", session.user.id)
        .select()
        .single();

      if (error) throw error;
      setProfile(updated as Profile);
      return { data: updated, error: null };
    } catch (err: any) {
      console.error("Update profile failed:", err);
      return { data: null, error: err };
    }
  };

  useEffect(() => {
    let active = true;

    const checkSession = async () => {
      setLoading(true);
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (active) {
          setSession(initialSession);
          if (initialSession?.user?.id) {
            const p = await loadProfile(initialSession.user.id);
            if (active) setProfile(p);
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!active) return;

      if (event === "SIGNED_OUT") {
        setSession(null);
        setProfile(null);
        setLoading(false);
      } else if (
        event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED" ||
        event === "USER_UPDATED"
      ) {
        setLoading(true);
        setSession(newSession);
        if (newSession?.user?.id) {
          const p = await loadProfile(newSession.user.id);
          if (active) {
            setProfile(p);
            setLoading(false);
          }
        } else {
          if (active) {
            setProfile(null);
            setLoading(false);
          }
        }
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
    role: ProfileRole
  ) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/onboarding`,
          data: {
            full_name: fullName,
            phone: phone,
            role: role,
            email_confirm: false,
          },
        },
      });

      if (error) throw error;

      if (data?.user) {
        // Use upsert to handle database triggers that might auto-create the row
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert({
            id: data.user.id,
            full_name: fullName,
            phone: phone,
            role: role,
            email: email,
            avatar_url: null,
          });

        if (profileError) {
          console.error("Profile upsert failed during registration:", profileError);
        }
        
        const p = await loadProfile(data.user.id);
        setProfile(p);
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
        const p = await loadProfile(data.user.id);
        setProfile(p);
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
          redirectTo: `${window.location.origin}/onboarding`,
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
    setSession(null);
    setProfile(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      console.error("Logout failed:", error);
      return { error };
    }
  };

  // RESET PASSWORD
  const resetPassword = async (email: string) => {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
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
        refreshProfile,
        updateProfile,
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
