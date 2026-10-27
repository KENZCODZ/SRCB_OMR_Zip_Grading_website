import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  GraduationCap,
  Award,
  BookOpen,
  UserCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  KeyRound,
  X,
  Copy,
  Check,
  ExternalLink,
  Building2,
  Clock,
  HelpCircle,
  Send,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import type { AuthUser } from "../../types";
import { requestPasswordReset } from "../../api";
import "./LoginPage.css";

interface LoginPageProps {
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  loginError: string;
  onSubmit: (e: React.FormEvent) => void;
  onSelectMockUser: (userId: string) => void;
  mockUsers: AuthUser[];
  selectedAuthUserId: string;
  addToast?: (type: "success" | "error" | "info" | "warning", message: string) => void;
}

export default function LoginPage({
  email,
  setEmail,
  password,
  setPassword,
  loginError,
  onSubmit,
  onSelectMockUser,
  mockUsers,
  selectedAuthUserId,
  addToast,
}: LoginPageProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // In-app Forgot Password assistance form state
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotName, setForgotName] = useState("");
  const [forgotStudentId, setForgotStudentId] = useState("");
  const [forgotNote, setForgotNote] = useState("I forgot my password, please help me recover my account credentials.");
  const [isSubmittingForgot, setIsSubmittingForgot] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isForgotPasswordOpen) {
        setIsForgotPasswordOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isForgotPasswordOpen]);

  const handleCopyEmail = (emailToCopy: string) => {
    navigator.clipboard.writeText(emailToCopy);
    setCopiedEmail(true);
    if (addToast) {
      addToast("success", `Administrator email copied to clipboard: ${emailToCopy}`);
    }
    setTimeout(() => setCopiedEmail(false), 2200);
  };

  const handleOpenForgotPassword = () => {
    setIsForgotPasswordOpen(true);
    setForgotEmail(email.trim() || "");
    setForgotSuccess(null);
    setForgotError(null);
    if (addToast) {
      addToast("info", "Please contact the System Administrator or submit a request for password assistance.");
    }
  };

  const handleSendForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setForgotError("Please enter your registered institutional email address.");
      return;
    }
    setIsSubmittingForgot(true);
    setForgotError(null);
    setForgotSuccess(null);
    try {
      const res = await requestPasswordReset({
        email: forgotEmail.trim(),
        name: forgotName.trim() || undefined,
        student_id: forgotStudentId.trim() || undefined,
        message: forgotNote.trim() || undefined,
      });
      setForgotSuccess(
        res?.message || "Your password assistance request has been received by the System Administrator!"
      );
      if (addToast) {
        addToast("success", "Password assistance request delivered to Administrator!");
      }
    } catch (err: any) {
      setForgotError(
        err?.message || "Failed to submit request. Please try contacting the admin directly via email or office visit."
      );
      if (addToast) {
        addToast("error", err?.message || "Failed to submit assistance request.");
      }
    } finally {
      setIsSubmittingForgot(false);
    }
  };

  const getRoleDetails = (role: string) => {
    switch (role) {
      case "admin":
        return {
          label: "System Admin",
          color: "#8b5cf6",
          bg: "rgba(139, 92, 246, 0.1)",
          icon: <ShieldCheck size={15} color="#8b5cf6" />,
        };
      case "dean":
        return {
          label: "Dean of Education",
          color: "#d97706",
          bg: "rgba(217, 119, 6, 0.1)",
          icon: <Award size={15} color="#d97706" />,
        };
      case "programme-head":
        return {
          label: "Programme Head",
          color: "#0284c7",
          bg: "rgba(2, 132, 199, 0.1)",
          icon: <BookOpen size={15} color="#0284c7" />,
        };
      case "teacher":
        return {
          label: "Faculty Teacher",
          color: "#059669",
          bg: "rgba(5, 150, 105, 0.1)",
          icon: <UserCheck size={15} color="#059669" />,
        };
      default:
        return {
          label: "Student Examinee",
          color: "#4f46e5",
          bg: "rgba(79, 70, 229, 0.1)",
          icon: <GraduationCap size={15} color="#4f46e5" />,
        };
    }
  };

  const handlePersonaClick = (user: AuthUser) => {
    onSelectMockUser(user.id);
  };

  return (
    <div className="login-sync-root">
      {/* Subtle, stationary, institutional ambient illumination */}
      <div className="login-sync-ambient" />

      {/* Top Institutional Header Bar */}
      <header className="login-sync-topbar">
        <div className="login-sync-topbar-inner">
          <div className="login-sync-brand">
            <img
              src="/srcb-logo.png"
              alt="St. Rita's College of Balingasag Official Seal"
              className="login-sync-crest"
            />
            <div className="login-sync-brand-text">
              <span className="login-sync-school-name">
                St. Rita's College of Balingasag
              </span>
              <span className="login-sync-portal-label">
                Institutional Examination & Assessment Portal
              </span>
            </div>
          </div>

          <div className="login-sync-topbar-actions">
            <span className="login-sync-year-badge">A.Y. 2025–2026</span>
          </div>
        </div>
      </header>

      {/* Main Centered Content */}
      <main className="login-sync-body">
        <div className="login-sync-card-container">
          <div className="login-sync-card">
            {/* Card Header */}
            <div className="login-card-header">
              <div className="login-card-seal-ring">
                <img
                  src="/srcb-logo.png"
                  alt="SRCB Seal"
                  className="login-card-seal-img"
                />
              </div>
              <h1 className="login-card-title">Sign In to EduAssess</h1>
              <p className="login-card-subtitle">
                Enter your institutional account to access your examination portal
              </p>
            </div>

            {/* Authentication Form */}
            <form onSubmit={onSubmit} className="login-form">
              <div className="login-field-group">
                <label className="login-field-label">Institutional Email</label>
                <div className="login-input-container">
                  <Mail className="login-input-icon" />
                  <input
                    type="email"
                    className="login-input"
                    placeholder="username@srcb.edu.ph"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </div>

              <div className="login-field-group">
                <div className="login-password-header">
                  <label className="login-field-label">Password</label>
                  <button
                    type="button"
                    className="login-forgot-link"
                    onClick={handleOpenForgotPassword}
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="login-input-container">
                  <Lock className="login-input-icon" />
                  <input
                    type={showPassword ? "text" : "password"}
                    className="login-input has-toggle"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="login-toggle-visibility-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? "Hide password" : "Show password"}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {loginError && (
                <div className="login-error-banner" role="alert">
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{loginError}</span>
                </div>
              )}

              <button type="submit" className="login-submit-btn">
                <span>Sign In to Portal</span>
                <ArrowRight size={16} />
              </button>
            </form>

            {/* Integrated Quick Persona Access */}
            {mockUsers && mockUsers.length > 0 && (
              <>
                <div className="login-divider">
                  <span>Quick Demo Access</span>
                </div>

                <div className="login-personas-grid">
                  {mockUsers.map((user, idx) => {
                    const details = getRoleDetails(user.role);
                    const isSelected = selectedAuthUserId === user.id;
                    const isFifth = idx === 4;

                    return (
                      <button
                        key={user.id}
                        type="button"
                        className={`login-persona-btn ${isSelected ? "selected" : ""} ${
                          isFifth ? "full-width" : ""
                        }`}
                        onClick={() => handlePersonaClick(user)}
                        title={`1-Click Sign In as ${user.name} (${details.label})`}
                      >
                        <div
                          className="login-persona-icon-frame"
                          style={{ backgroundColor: details.bg }}
                        >
                          {details.icon}
                        </div>
                        <div className="login-persona-meta">
                          <span className="login-persona-role">
                            {details.label}
                          </span>
                          <span className="login-persona-name">
                            {user.name}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Institutional Trust & Security Tag */}
          <footer className="login-trust-footer">
            <div className="login-trust-pill">
              <ShieldCheck size={14} color="#28166f" />
              <span>256-Bit Encrypted Academic Session · CHED Standard Aligned</span>
            </div>
            <div className="login-trust-subtext">
              St. Rita's College of Balingasag · Office of Academic Affairs
            </div>
          </footer>
        </div>
      </main>
      {/* ========================================================= */}
      {/* FORGOT PASSWORD / ACCOUNT RECOVERY MODAL DIALOG            */}
      {/* ========================================================= */}
      {isForgotPasswordOpen && (
        <div
          className="forgot-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsForgotPasswordOpen(false);
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="forgot-password-modal-title"
        >
          <div className="forgot-modal-card">
            {/* Modal Header */}
            <div className="forgot-modal-header">
              <div className="forgot-modal-header-info">
                <div className="forgot-modal-icon-badge">
                  <KeyRound size={22} color="var(--primary, #28166f)" />
                </div>
                <div>
                  <div className="forgot-modal-policy-pill">
                    <ShieldCheck size={12} color="#059669" />
                    <span>Institutional Security Policy</span>
                  </div>
                  <h3 id="forgot-password-modal-title" className="forgot-modal-title">
                    Password Reset & Account Access
                  </h3>
                </div>
              </div>
              <button
                type="button"
                className="forgot-modal-close-btn"
                onClick={() => setIsForgotPasswordOpen(false)}
                title="Close dialog"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="forgot-modal-body">
              {/* Notice Banner */}
              <div className="forgot-modal-alert">
                <AlertCircle size={18} className="forgot-modal-alert-icon" />
                <div className="forgot-modal-alert-content">
                  <strong>Online self-service password reset is restricted.</strong>
                  <p>
                    For institutional security and exam record integrity, password resets and account re-activations must be authorized by the <strong>System Administrator</strong> or handled in person at the institutional administration office.
                  </p>
                </div>
              </div>

              {/* Action Channels Grid */}
              <div className="forgot-modal-channels-grid">
                {/* Method 1: In-Person Office Visit */}
                <div className="forgot-channel-card">
                  <div className="forgot-channel-top">
                    <div className="forgot-channel-icon-wrap in-person">
                      <Building2 size={18} />
                    </div>
                    <div className="forgot-channel-heading">
                      <span className="forgot-channel-tag">In-Person Assistance</span>
                      <h4>Visit Administrator Office</h4>
                    </div>
                  </div>
                  <p className="forgot-channel-desc">
                    Visit the campus technical department for identity verification and instant password reset.
                  </p>
                  <div className="forgot-channel-details">
                    <div className="forgot-channel-item">
                      <span className="forgot-channel-item-label">Office:</span>
                      <span className="forgot-channel-item-val">IT Systems &amp; Administration Office</span>
                    </div>
                    <div className="forgot-channel-item">
                      <span className="forgot-channel-item-label">Location:</span>
                      <span className="forgot-channel-item-val">Saint. Nino Building, GroundFloor</span>
                    </div>
                    <div className="forgot-channel-item">
                      <span className="forgot-channel-item-label">Office Hours:</span>
                      <span className="forgot-channel-item-val">
                        <Clock size={12} /> Mon – Fri: 8:00 AM – 5:00 PM (PHT)
                      </span>
                    </div>
                  </div>
                  <div className="forgot-channel-notice">
                    📌 <em>Please bring your physical SRCB Student ID or Faculty Employee Card.</em>
                  </div>
                </div>

                {/* Method 2: Contact System Administrator Directly */}
                <div className="forgot-channel-card">
                  <div className="forgot-channel-top">
                    <div className="forgot-channel-icon-wrap email">
                      <Mail size={18} />
                    </div>
                    <div className="forgot-channel-heading">
                      <span className="forgot-channel-tag online">Direct Message</span>
                      <h4>Contact Administrator</h4>
                    </div>
                  </div>
                  <p className="forgot-channel-desc">
                    Email the administrator directly to request a temporary password or account unlock.
                  </p>
                  <div className="forgot-channel-details">
                    <div className="forgot-channel-item">
                      <span className="forgot-channel-item-label">Recipient:</span>
                      <span className="forgot-channel-item-val">System Administrator</span>
                    </div>
                    <div className="forgot-channel-item">
                      <span className="forgot-channel-item-label">Email:</span>
                      <span className="forgot-channel-item-val code">admin@srcb.edu.ph</span>
                    </div>
                    <div className="forgot-channel-item">
                      <span className="forgot-channel-item-label">Helpdesk:</span>
                      <span className="forgot-channel-item-val code">helpdesk@srcb.edu.ph</span>
                    </div>
                  </div>

                  <div className="forgot-channel-btn-row">
                    <button
                      type="button"
                      className="forgot-action-btn secondary"
                      onClick={() => handleCopyEmail("admin@srcb.edu.ph")}
                      title="Copy administrator email to clipboard"
                    >
                      {copiedEmail ? (
                        <>
                          <Check size={14} color="#059669" />
                          <span>Copied Email</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          <span>Copy Email</span>
                        </>
                      )}
                    </button>
                    <a
                      href="mailto:admin@srcb.edu.ph?subject=Password%20Reset%20Request%20-%20SRCB%20EduAssess&body=Good%20day%20System%20Administrator,%0A%0AI%20would%20like%20to%20request%20assistance%20with%20my%20SRCB%20EduAssess%20account%20password.%0A%0AFull%20Name:%20%0AStudent%20/%20Employee%20ID:%20%0ADepartment%20/%20Program:%20%0ARegistered%20Email:%20%0A%0AThank%20you."
                      className="forgot-action-btn primary"
                      title="Open default email application"
                    >
                      <ExternalLink size={14} />
                      <span>Email Admin</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Direct Request Ticket Dispatch Form */}
              <div
                style={{
                  background: "#ffffff",
                  border: "1.5px solid #e0e7ff",
                  borderRadius: "14px",
                  padding: "1.15rem 1.25rem",
                  boxShadow: "0 4px 16px -2px rgba(99, 102, 241, 0.08)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.85rem" }}>
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      background: "rgba(40, 22, 111, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--primary, #28166f)",
                      flexShrink: 0,
                    }}
                  >
                    <Send size={16} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800, color: "#0f172a" }}>
                      Send Password Assistance Request to Admin
                    </h4>
                    <p style={{ margin: 0, fontSize: "0.74rem", color: "#64748b" }}>
                      Submit your credentials directly. The Administrator receives your ticket in their User Directory.
                    </p>
                  </div>
                </div>

                {forgotSuccess ? (
                  <div
                    style={{
                      background: "#ecfdf5",
                      border: "1px solid #a7f3d0",
                      borderRadius: "10px",
                      padding: "0.95rem 1rem",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.75rem",
                      animation: "forgotModalFadeIn 0.3s ease",
                    }}
                  >
                    <CheckCircle2 size={20} color="#059669" style={{ flexShrink: 0, marginTop: "2px" }} />
                    <div style={{ fontSize: "0.8rem", color: "#065f46", lineHeight: 1.5 }}>
                      <strong style={{ fontSize: "0.85rem", display: "block", marginBottom: "0.2rem" }}>
                        Request Delivered Successfully!
                      </strong>
                      {forgotSuccess}
                      <div style={{ marginTop: "0.45rem", fontSize: "0.75rem", color: "#047857" }}>
                        📌 Office Location: <strong>Saint. Nino Building, GroundFloor</strong>. You can also visit in person during office hours.
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setForgotSuccess(null);
                          setForgotError(null);
                        }}
                        style={{
                          marginTop: "0.6rem",
                          background: "#059669",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "6px",
                          padding: "0.3rem 0.65rem",
                          fontSize: "0.74rem",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Submit Another Request
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSendForgotRequest} style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                    {forgotError && (
                      <div
                        style={{
                          background: "#fef2f2",
                          border: "1px solid #fecaca",
                          borderRadius: "8px",
                          padding: "0.55rem 0.75rem",
                          color: "#b91c1c",
                          fontSize: "0.76rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <AlertCircle size={14} style={{ flexShrink: 0 }} />
                        <span>{forgotError}</span>
                      </div>
                    )}

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.65rem" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 700, color: "#334155", marginBottom: "0.25rem" }}>
                          Registered School Email <span style={{ color: "#ef4444" }}>*</span>
                        </label>
                        <input
                          type="email"
                          className="input"
                          style={{ width: "100%", fontSize: "0.8rem", padding: "0.45rem 0.65rem" }}
                          placeholder="e.g. yourname@srcb.edu.ph"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          required
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 700, color: "#334155", marginBottom: "0.25rem" }}>
                          Student / Faculty ID Number
                        </label>
                        <input
                          type="text"
                          className="input"
                          style={{ width: "100%", fontSize: "0.8rem", padding: "0.45rem 0.65rem" }}
                          placeholder="e.g. 2023-0001 or FAC-1002"
                          value={forgotStudentId}
                          onChange={(e) => setForgotStudentId(e.target.value)}
                        />
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.65rem" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 700, color: "#334155", marginBottom: "0.25rem" }}>
                          Full Name
                        </label>
                        <input
                          type="text"
                          className="input"
                          style={{ width: "100%", fontSize: "0.8rem", padding: "0.45rem 0.65rem" }}
                          placeholder="e.g. Juan Dela Cruz"
                          value={forgotName}
                          onChange={(e) => setForgotName(e.target.value)}
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 700, color: "#334155", marginBottom: "0.25rem" }}>
                          Assistance Details / Note
                        </label>
                        <input
                          type="text"
                          className="input"
                          style={{ width: "100%", fontSize: "0.8rem", padding: "0.45rem 0.65rem" }}
                          placeholder="Brief message for administrator"
                          value={forgotNote}
                          onChange={(e) => setForgotNote(e.target.value)}
                        />
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.35rem" }}>
                      <button
                        type="submit"
                        disabled={isSubmittingForgot}
                        style={{
                          background: "var(--primary, #28166f)",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "8px",
                          padding: "0.55rem 1.15rem",
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          cursor: isSubmittingForgot ? "not-allowed" : "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          opacity: isSubmittingForgot ? 0.7 : 1,
                          boxShadow: "0 3px 10px rgba(40, 22, 111, 0.25)",
                        }}
                      >
                        {isSubmittingForgot ? (
                          <>
                            <Loader2 size={14} className="spin" />
                            <span>Submitting to Admin...</span>
                          </>
                        ) : (
                          <>
                            <Send size={14} />
                            <span>Send Request to Administrator</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Helpful Tips Card */}
              <div className="forgot-modal-tips">
                <HelpCircle size={16} color="#4338ca" style={{ flexShrink: 0, marginTop: "2px" }} />
                <div style={{ fontSize: "0.78rem", color: "#3730a3", lineHeight: 1.45 }}>
                  <strong>Information to include:</strong> To expedite verification, please state your <strong>Full Name</strong>, <strong>Student / Employee ID number</strong>, and <strong>Academic Programme</strong> (e.g., BSIT, BSED, etc.) in your request.
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="forgot-modal-footer">
              <button
                type="button"
                className="forgot-footer-btn"
                onClick={() => setIsForgotPasswordOpen(false)}
              >
                <span>Return to Sign In</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
