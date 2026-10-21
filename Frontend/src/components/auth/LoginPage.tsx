import React, { useState } from "react";
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
} from "lucide-react";
import type { AuthUser } from "../../types";
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
}: LoginPageProps) {
  const [showPassword, setShowPassword] = useState(false);

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
                    onClick={() =>
                      alert(
                        "For account recovery or password resets, please contact the SRCB ICT & Academic Affairs Helpdesk (helpdesk@srcb.edu.ph)."
                      )
                    }
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
    </div>
  );
}
