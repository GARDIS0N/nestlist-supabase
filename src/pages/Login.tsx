import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Eye, EyeOff } from "lucide-react";

export const Login: React.FC = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError(null);

    const { error: err } = await signIn(email, password);
    setLoading(false);

    if (err) {
      setError(err);
    } else {
      const destination = location.state?.from?.pathname || "/";
      navigate(destination, { replace: true });
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
    maxWidth: "420px",
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

  const signupLinkStyle: React.CSSProperties = {
    color: "#C9913A",
    fontSize: "14px",
    fontWeight: "600",
    textDecoration: "none",
  };

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
    backgroundColor: "#1E6B4A",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "10px",
    padding: "14px 20px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: loading ? "not-allowed" : "pointer",
    width: "100%",
    marginTop: "16px",
    opacity: loading ? 0.7 : 1,
    transition: "background-color 0.2s",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "inherit",
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <Link to="/" style={logoStyle}>Nestlist</Link>
        <h1 style={headingStyle}>Welcome back</h1>
        <div style={{ marginBottom: "30px" }}>
          <span style={{ fontSize: "14px", color: "#6B7280" }}>No account? </span>
          <Link to="/signup" style={signupLinkStyle}>Create one free →</Link>
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

          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>Password</label>
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
          </div>

          <button type="submit" disabled={loading} style={buttonStyle}>
            {loading ? "Signing in..." : "Sign in →"}
          </button>
        </form>

        <div style={{ marginTop: "24px" }}>
          <Link to="/signup" style={{ fontSize: "13px", color: "#6B7280", textDecoration: "none" }}>
            Forgot password?
          </Link>
        </div>
      </div>
    </div>
  );
};
