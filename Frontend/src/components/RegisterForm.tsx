import React, { useState } from "react";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  UserPlus,
  Sparkles,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { registerUser } from "../api";

interface RegisterFormProps {
  onSwitchToLogin: () => void;
  onRegisteredSuccess?: (msg: string) => void;
}

export default function RegisterForm({ onSwitchToLogin, onRegisteredSuccess }: RegisterFormProps) {
  const [honorific, setHonorific] = useState("Prof.");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [suffix, setSuffix] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"teacher" | "student">("teacher");
  const [programme, setProgramme] = useState("BSIT");
  const [department, setDepartment] = useState("Computing Studies");
  const [idSuffix, setIdSuffix] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const getFullName = () => {
    const parts: string[] = [];
    if (role === "teacher" && honorific && honorific !== "None") {
      parts.push(honorific);
    }
    if (firstName.trim()) parts.push(firstName.trim());
    if (middleName.trim()) {
      const mid = middleName.trim();
      parts.push(mid.length === 1 ? `${mid}.` : mid);
    }
    if (lastName.trim()) parts.push(lastName.trim());
    if (suffix.trim() && suffix !== "None") parts.push(suffix.trim());
    return parts.join(" ");
  };

  const getFormattedId = () => {
    const raw = idSuffix.trim();
    if (!raw) return "";
    const clean = raw.replace(/^C[-_]?/i, "");
    return `C${clean}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!firstName.trim() || !lastName.trim()) {
      setErrorMessage("Please enter both your First Name and Last Name.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please double-check.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    if (!email.toLowerCase().endsWith("@srcb.edu.ph") && !email.toLowerCase().endsWith("@gmail.com") && !email.includes("@")) {
      setErrorMessage("Please enter a valid institutional school email.");
      return;
    }

    const finalId = getFormattedId();
    if (role === "student" && !finalId) {
      setErrorMessage("Please enter your Student ID number.");
      return;
    }

    setLoading(true);
    try {
      const fullName = getFullName();
      const res = await registerUser({
        name: fullName,
        email,
        password,
        role,
        programme,
        department,
        student_id: role === "student" ? finalId : undefined,
      });

      setSuccessMessage(
        res.message || "Registration submitted successfully! Your account is pending confirmation by the Programme Head."
      );
      if (onRegisteredSuccess) {
        onRegisteredSuccess(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-form-container">
      {successMessage ? (
        <div
          style={{
            padding: "1.5rem 1.25rem",
            background: "rgba(16, 185, 129, 0.12)",
            border: "1px solid rgba(16, 185, 129, 0.35)",
            borderRadius: "var(--radius-lg)",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.85rem",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "rgba(16, 185, 129, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#10b981",
            }}
          >
            <CheckCircle2 size={28} />
          </div>

          <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#6ee7b7", fontWeight: 700 }}>
            Registration Submitted!
          </h3>

          <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
            {successMessage}
          </p>

          <div
            style={{
              padding: "0.75rem 1rem",
              background: "rgba(15, 23, 42, 0.6)",
              borderRadius: "var(--radius-md)",
              border: "1px solid rgba(255,255,255,0.06)",
              width: "100%",
              fontSize: "0.78rem",
              color: "var(--text-muted)",
              textAlign: "left",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--srcb-gold-light)", fontWeight: 600, marginBottom: "4px" }}>
              <Sparkles size={13} /> Next Steps:
            </div>
            <span>1. The Programme Head (BSIT) will review your credentials.</span><br />
            <span>2. Once approved, sign in with your email (<strong>{email}</strong>).</span>
          </div>

          <button
            type="button"
            className="login-submit-btn"
            style={{ marginTop: "0.5rem", width: "100%" }}
            onClick={onSwitchToLogin}
          >
            Return to Sign In <ArrowRight size={16} />
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1rem" }}>
          {/* Role Selection Tabs */}
          <div className="form-group">
            <label className="form-label" style={{ fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.4rem" }}>
              Register As:
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
              <button
                type="button"
                className={`role-pill-btn ${role === "teacher" ? "active" : ""}`}
                style={{
                  padding: "0.55rem 0.75rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.4rem",
                  borderRadius: "var(--radius-md)",
                  cursor: "pointer",
                }}
                onClick={() => setRole("teacher")}
              >
                <ShieldCheck size={16} style={{ color: role === "teacher" ? "#ffffff" : "var(--primary)" }} />
                <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>Faculty / Teacher</span>
              </button>

              <button
                type="button"
                className={`role-pill-btn ${role === "student" ? "active" : ""}`}
                style={{
                  padding: "0.55rem 0.75rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.4rem",
                  borderRadius: "var(--radius-md)",
                  cursor: "pointer",
                }}
                onClick={() => setRole("student")}
              >
                <GraduationCap size={16} style={{ color: role === "student" ? "#ffffff" : "var(--srcb-gold-accent)" }} />
                <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>Student</span>
              </button>
            </div>
          </div>

          {/* NAME PARTS */}
          <div className="form-group">
            <label className="form-label" style={{ fontSize: "0.82rem", fontWeight: 600 }}>
              Name Information <span style={{ color: "var(--danger)" }}>*</span>
            </label>

            {/* Row 1: Title (if Teacher), First Name, Middle Name */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: role === "teacher" ? "90px 1fr 1fr" : "1fr 1fr",
                gap: "0.5rem",
                marginBottom: "0.5rem",
              }}
            >
              {role === "teacher" && (
                <div>
                  <select
                    className="form-input"
                    style={{ appearance: "auto", padding: "0.55rem 0.4rem", fontSize: "0.82rem" }}
                    value={honorific}
                    onChange={(e) => setHonorific(e.target.value)}
                  >
                    <option value="Prof.">Prof.</option>
                    <option value="Dr.">Dr.</option>
                    <option value="Engr.">Engr.</option>
                    <option value="Mr.">Mr.</option>
                    <option value="Ms.">Ms.</option>
                    <option value="None">None</option>
                  </select>
                </div>
              )}

              <input
                type="text"
                className="form-input"
                placeholder="First Name *"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />

              <input
                type="text"
                className="form-input"
                placeholder="Middle Name / M.I."
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
              />
            </div>

            {/* Row 2: Last Name and Suffix */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 95px",
                gap: "0.5rem",
              }}
            >
              <input
                type="text"
                className="form-input"
                placeholder="Last Name *"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />

              <select
                className="form-input"
                style={{ appearance: "auto", padding: "0.55rem 0.4rem", fontSize: "0.82rem" }}
                value={suffix}
                onChange={(e) => setSuffix(e.target.value)}
              >
                <option value="">Suffix</option>
                <option value="Jr.">Jr.</option>
                <option value="Sr.">Sr.</option>
                <option value="II">II</option>
                <option value="III">III</option>
                <option value="IV">IV</option>
              </select>
            </div>

            {/* Live Name Preview */}
            {(firstName.trim() || lastName.trim()) && (
              <div
                style={{
                  marginTop: "0.35rem",
                  padding: "0.25rem 0.5rem",
                  borderRadius: "4px",
                  background: "rgba(37, 99, 235, 0.1)",
                  fontSize: "0.75rem",
                  color: "#93c5fd",
                }}
              >
                Formatted: <strong>{getFullName()}</strong>
              </div>
            )}
          </div>

          {/* Student ID (If Student) with locked C prefix */}
          {role === "student" && (
            <div className="form-group">
              <label className="form-label" style={{ fontSize: "0.82rem", fontWeight: 600 }}>
                Student ID Number <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <div style={{ display: "flex", alignItems: "stretch" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 0.85rem",
                    background: "rgba(245, 158, 11, 0.18)",
                    border: "1px solid rgba(245, 158, 11, 0.35)",
                    borderRight: "none",
                    borderRadius: "var(--radius-md) 0 0 var(--radius-md)",
                    color: "var(--srcb-gold-accent)",
                    fontWeight: 800,
                    fontSize: "0.95rem",
                    userSelect: "none",
                  }}
                >
                  C
                </span>
                <input
                  type="text"
                  className="form-input"
                  style={{
                    borderRadius: "0 var(--radius-md) var(--radius-md) 0",
                    flex: 1,
                  }}
                  placeholder="2024-00123"
                  value={idSuffix}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/^C[-_]?/i, "");
                    setIdSuffix(cleaned);
                  }}
                  required
                />
              </div>
              {idSuffix.trim() && (
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                  Assigned ID: <strong style={{ color: "var(--srcb-gold-accent)" }}>{getFormattedId()}</strong>
                </div>
              )}
            </div>
          )}

          {/* School Email */}
          <div className="form-group">
            <label className="form-label" style={{ fontSize: "0.82rem", fontWeight: 600 }}>
              School Email
            </label>
            <div className="input-icon-group">
              <input
                type="email"
                className="form-input input-with-icon"
                placeholder="username@srcb.edu.ph"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Mail size={17} className="input-icon-left" />
            </div>
          </div>

          {/* Academic Programme & Department */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: "0.82rem", fontWeight: 600 }}>
                Programme
              </label>
              <div className="input-icon-group">
                <select
                  className="form-input input-with-icon"
                  value={programme}
                  onChange={(e) => setProgramme(e.target.value)}
                  style={{ appearance: "auto" }}
                >
                  <option value="BSIT">BSIT</option>
                  <option value="BSCS">BSCS</option>
                  <option value="BSED">BSED</option>
                  <option value="BEED">BEED</option>
                  <option value="BSBA">BSBA</option>
                  <option value="BSCRIM">BSCRIM</option>
                </select>
                <BookOpen size={17} className="input-icon-left" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: "0.82rem", fontWeight: 600 }}>
                Department
              </label>
              <input
                type="text"
                className="form-input"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Computing Studies"
                required
              />
            </div>
          </div>

          {/* Passwords */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: "0.82rem", fontWeight: 600 }}>
                Password
              </label>
              <div className="input-icon-group">
                <input
                  type={showPassword ? "text" : "password"}
                  className="form-input input-with-icon"
                  placeholder="Min 6 chars"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ paddingRight: "2.4rem" }}
                />
                <Lock size={16} className="input-icon-left" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "0.7rem",
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                  }}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: "0.82rem", fontWeight: 600 }}>
                Confirm
              </label>
              <div className="input-icon-group">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className="form-input input-with-icon"
                  placeholder="Repeat password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  style={{ paddingRight: "2.4rem" }}
                />
                <Lock size={16} className="input-icon-left" />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: "absolute",
                    right: "0.7rem",
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                  }}
                  title={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div
              style={{
                padding: "0.75rem 0.9rem",
                borderRadius: "var(--radius-md)",
                background: "rgba(244, 63, 94, 0.14)",
                border: "1px solid rgba(244, 63, 94, 0.3)",
                color: "#fda4af",
                fontSize: "0.83rem",
                lineHeight: 1.4,
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Notice banner about approval */}
          <div
            style={{
              padding: "0.6rem 0.85rem",
              background: "rgba(245, 158, 11, 0.1)",
              border: "1px solid rgba(245, 158, 11, 0.25)",
              borderRadius: "var(--radius-sm)",
              fontSize: "0.76rem",
              color: "var(--srcb-gold-light)",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <ShieldCheck size={15} style={{ flexShrink: 0 }} />
            <span>New accounts require verification by the Programme Head before access is granted.</span>
          </div>

          {/* Submit Button */}
          <button className="login-submit-btn" type="submit" disabled={loading}>
            <UserPlus size={18} />
            {loading ? "Submitting Registration..." : "Submit Registration for Confirmation"}
          </button>
        </form>
      )}
    </div>
  );
}
