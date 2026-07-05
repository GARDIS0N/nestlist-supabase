import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { Eye, EyeOff } from "lucide-react";

export const Signup: React.FC = () => {
  const navigate = useNavigate();

  const [role, setRole] = useState<"tenant" | "landlord">("tenant");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Live password strength calculation
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { label: "", color: "transparent", width: "0%" };
    if (pwd.length < 5) return { label: "Weak", color: "#DC2626", width: "25%" };
    if (pwd.length < 8) return { label: "Fair", color: "#C9913A", width: "50%" };
    const hasNumbers = /\d/.test(pwd);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);
    if (hasNumbers && hasSpecial) return { label: "Strong", color: "#1E6B4A", width: "100%" };
    return { label: "Good", color: "#1E6B4A", width: "75%" };
  };

  const strength = getPasswordStrength(password);

  const isFormValid =
    fullName.trim() !== "" &&
    phone.trim() !== "" &&
    email.trim() !== "" &&
    password.length >= 8;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      if (password.length < 8) {
        setError("Password must be at least 8 characters long.");
      } else {
        setError("Please fill in all fields.");
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
        options: {
          data: {
            full_name: fullName,
            phone: phone,
            role: role,
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          full_name: fullName,
          phone: phone,
          email: email.trim().toLowerCase(),
          role: role || 'tenant',
          is_active: true,
        });
        navigate('/onboarding');
      } else {
        setIsSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || "Sign up failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Styles based on requested design rules
  const containerStyle: React.CSSProperties = {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F2F4F0",
    fontFamily: "system-ui, -apple-system, sans-serif",
    padding: "24px",
    boxSizing: "border-box",
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: "#FFFFFF",
    borderRadius: "20px",
    border: "1px solid #E2E5DF",
    padding: "40px",
    width: "100%",
    maxWidth: "520px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.03)",
    textAlign: "center",
    boxSizing: "border-box",
  };

  const logoStyle: React.CSSProperties = {
    fontSize: "36px",
    fontWeight: "800",
    color: "#1E6B4A",
    marginBottom: "12px",
    letterSpacing: "-0.04em",
    textDecoration: "none",
    display: "inline-block",
  };

  const headingStyle: React.CSSProperties = {
    fontSize: "24px",
    fontWeight: "700",
    color: "#1F2937",
    margin: "0 0 6px 0",
    letterSpacing: "-0.02em",
  };

  const loginLinkStyle: React.CSSProperties = {
    color: "#C9913A",
    fontSize: "14px",
    fontWeight: "600",
    textDecoration: "none",
  };

  const roleCardStyle = (selected: boolean): React.CSSProperties => ({
    border: selected ? "2px solid #1E6B4A" : "2px solid #E2E5DF",
    backgroundColor: selected ? "#F2F4F0" : "#FFFFFF",
    borderRadius: "12px",
    padding: "12px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    transition: "all 0.2s ease",
    flex: 1,
    outline: "none",
    fontWeight: "700",
    fontSize: "14px",
    color: "#1F2937",
    boxSizing: "border-box",
  });

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "13px",
    fontWeight: "600",
    color: "#4B5563",
    marginBottom: "6px",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    border: "1px solid #E2E5DF",
    borderRadius: "10px",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  const buttonStyle: React.CSSProperties = {
    backgroundColor: isFormValid ? "#1E6B4A" : "#D1D5DB",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "10px",
    padding: "14px 20px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: !isFormValid || loading ? "not-allowed" : "pointer",
    width: "100%",
    marginTop: "16px",
    opacity: loading ? 0.7 : 1,
    transition: "all 0.2s",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "inherit",
  };

  if (isSuccess) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={logoStyle}>Nestlist</div>
          <h1 style={{ ...headingStyle, color: "#1E6B4A", marginBottom: "16px" }}>Account created!</h1>
          <p style={{ fontSize: "15px", color: "#4B5563", lineHeight: "1.6", marginBottom: "32px" }}>
            We sent a confirmation to <strong style={{ color: "#1F2937" }}>{email}</strong>. <br />
            Click the link in the email to verify your account.
          </p>
          <Link to="/login" style={buttonStyle}>
            Already confirmed? Sign in →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <Link to="/" style={logoStyle}>Nestlist</Link>
        <h1 style={headingStyle}>Create account</h1>
        <div style={{ marginBottom: "24px" }}>
          <span style={{ fontSize: "14px", color: "#6B7280" }}>Already have one? </span>
          <Link to="/login" style={loginLinkStyle}>Sign in →</Link>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: "#FEF2F2",
              color: "#DC2626",
              border: "1px solid #FEE2E2",
              borderRadius: "10px",
              padding: "12px 14px",
              fontSize: "14px",
              marginBottom: "20px",
              textAlign: "left",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ textAlign: "left" }}>
          {/* Role selector */}
          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>Who are you?</label>
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                type="button"
                onClick={() => setRole("tenant")}
                style={roleCardStyle(role === "tenant")}
              >
                <span>Tenant 🔍</span>
              </button>
              <button
                type="button"
                onClick={() => setRole("landlord")}
                style={roleCardStyle(role === "landlord")}
              >
                <span>Landlord 🏠</span>
              </button>
            </div>
          </div>

          {/* Name and Phone side-by-side */}
          <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Peter Kamau"
                required
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="0712345678"
                required
                style={inputStyle}
              />
            </div>
          </div>

          {/* Email input */}
          <div style={{ marginBottom: "16px" }}>
            <label style={labelStyle}>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
              placeholder="you@example.com"
              required
              style={inputStyle}
            />
          </div>

          {/* Password input with toggle and strength indicator */}
          <div style={{ marginBottom: "24px" }}>
            <label style={labelStyle}>Password (min 8 chars)</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="••••••••"
                required
                style={{ ...inputStyle, paddingRight: "44px" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#9CA3AF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Password strength meter */}
            {password && (
              <div style={{ marginTop: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <span style={{ fontSize: "11px", fontWeight: "600", color: "#6B7280" }}>Password Strength:</span>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: strength.color }}>{strength.label}</span>
                </div>
                <div style={{ width: "100%", height: "5px", backgroundColor: "#E5E7EB", borderRadius: "5px", overflow: "hidden" }}>
                  <div style={{ width: strength.width, height: "100%", backgroundColor: strength.color, transition: "width 0.3s ease" }} />
                </div>
                {password.length < 8 && (
                  <span style={{ fontSize: "11px", color: "#DC2626", marginTop: "4px", display: "block" }}>
                    Password is too short (needs at least 8 characters)
                  </span>
                )}
              </div>
            )}
          </div>

          <button type="submit" disabled={!isFormValid || loading} style={buttonStyle}>
            {loading ? "Creating..." : `Create ${role === "tenant" ? "Tenant" : "Landlord"} account →`}
          </button>
        </form>

        <div style={{ marginTop: "24px", textAlign: "center", fontSize: "12px", color: "#6B7280", lineHeight: "1.5" }}>
          By creating an account you agree to our{" "}
          <Link to="#" style={{ color: "#4B5563", fontWeight: "600", textDecoration: "underline" }}>
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link to="/privacy" style={{ color: "#1E6B4A", fontWeight: "700", textDecoration: "underline" }}>
            Privacy Policy
          </Link>.
        </div>
      </div>
    </div>
  );
};
