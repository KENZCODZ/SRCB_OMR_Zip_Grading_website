import React, { useState } from "react";
import {
  ShieldCheck,
  GraduationCap,
  Award,
  BookOpen,
  UserCheck,
  UserPlus,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  Zap,
  BarChart3,
  CheckCircle2,
  Building2,
} from "lucide-react";
import type { AuthUser } from "../types";
import RegisterForm from "./RegisterForm";

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
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "dean":
        return <Award size={18} className="text-gold" />;
      case "programme-head":
        return <BookOpen size={18} style={{ color: "#38bdf8" }} />;
      default:
        return <GraduationCap size={18} style={{ color: "#a7f3d0" }} />;
    }
  };

  const getRoleTitle = (role: string) => {
    switch (role) {
      case "dean":
        return "Dean of Education";
      case "programme-head":
        return "Programme Head";
      default:
        return "Faculty Instructor";
    }
  };

  return (
    <div className="login-page-wrapper">
      {/* Background Glow Spheres */}
      <div className="login-hero-glow-1" />
      <div className="login-hero-glow-2" />

      {/* Left Column: SRCB Hero Panel */}
      <section className="login-hero-section">
        {/* Brand Header */}
        <div className="login-brand-header">
          <div className="login-brand-logo-frame">
            <img src="/srcb-logo.png" alt="SRCB Logo" />
          </div>
          <div className="login-brand-info">
            <h2>St. Rita's College of Balingasag</h2>
            <p>Higher Education Department • IT Program</p>
          </div>
        </div>

        {/* Main Hero Content */}
        <div className="login-hero-content">
          <div className="login-hero-tag">
            <Sparkles size={15} /> Automated Zip-Grading & Item Analytics
          </div>

          <h1 className="login-hero-title">
            Empowering Excellence in <span>Academic Assessment</span>
          </h1>

          <p className="login-hero-description">
            AeroOMR provides lightning-fast optical mark recognition, CHED-compliant grading sheets, and role-based academic intelligence for SRCB educators.
          </p>

          {/* Key Feature Cards */}
          <div className="login-feature-list">
            <div className="login-feature-item">
              <div className="login-feature-icon-box">
                <Zap size={18} />
              </div>
              <div className="login-feature-text">
                <h4>Instant Bubble Recognition</h4>
                <p>Grade 50-question answer keys with computer vision & sub-pixel alignment.</p>
              </div>
            </div>

            <div className="login-feature-item">
              <div
                className="login-feature-icon-box"
                style={{
                  background: "rgba(245, 158, 11, 0.15)",
                  borderColor: "rgba(245, 158, 11, 0.3)",
                  color: "var(--srcb-gold-accent)",
                }}
              >
                <BarChart3 size={18} />
              </div>
              <div className="login-feature-text">
                <h4>CHED Grade Sheets & Item Analysis</h4>
                <p>Automated export to Excel grade sheets with difficulty & discrimination indices.</p>
              </div>
            </div>

            <div className="login-feature-item">
              <div
                className="login-feature-icon-box"
                style={{
                  background: "rgba(16, 185, 129, 0.15)",
                  borderColor: "rgba(16, 185, 129, 0.3)",
                  color: "#10b981",
                }}
              >
                <ShieldCheck size={18} />
              </div>
              <div className="login-feature-text">
                <h4>Institutional Role Authorization</h4>
                <p>Tailored workflows and analytics for Deans, Programme Heads, and Faculty.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Hero Footer */}
        <div className="login-hero-footer">
          <div>
            <CheckCircle2 size={14} className="text-gold" /> Official Institutional Portal
          </div>
          <div>•</div>
          <div>
            <Building2 size={14} /> St. Rita's College of Balingasag
          </div>
        </div>
      </section>

      {/* Right Column: Authentication Card Panel */}
      <section className="login-form-section">
        <div className="login-glass-card">
          <div className="login-card-header">
            <div className="login-card-badge">
              {authMode === "login" ? <ShieldCheck size={26} /> : <UserPlus size={26} />}
            </div>
            <h3>{authMode === "login" ? "Portal Access" : "Create Account"}</h3>
            <p>
              {authMode === "login"
                ? "Sign in with your official SRCB account"
                : "Register for faculty or student institutional access"}
            </p>
          </div>

          {/* Auth Mode Switcher Tabs */}
          <div
            className="scan-mode-tabs"
            style={{
              display: "flex",
              width: "100%",
              marginBottom: "1.25rem",
              background: "rgba(15, 23, 42, 0.7)",
              padding: "0.25rem",
            }}
          >
            <button
              type="button"
              className={`scan-mode-tab-btn ${authMode === "login" ? "active" : ""}`}
              style={{ flex: 1, justifyContent: "center" }}
              onClick={() => setAuthMode("login")}
            >
              <UserCheck size={16} /> Sign In
            </button>
            <button
              type="button"
              className={`scan-mode-tab-btn ${authMode === "register" ? "active" : ""}`}
              style={{ flex: 1, justifyContent: "center" }}
              onClick={() => setAuthMode("register")}
            >
              <UserPlus size={16} /> Register
            </button>
          </div>

          {authMode === "register" ? (
            <RegisterForm onSwitchToLogin={() => setAuthMode("login")} />
          ) : (
            <>
              <form onSubmit={onSubmit} style={{ display: "grid", gap: "1.1rem" }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: "0.82rem", fontWeight: 600 }}>
                    School Email
                  </label>
                  <div className="input-icon-group">
                    <input
                      type="email"
                      className="form-input input-with-icon"
                      placeholder="name@srcb.edu.ph"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    <Mail size={17} className="input-icon-left" />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: "0.82rem", fontWeight: 600 }}>
                    Password
                  </label>
                  <div className="input-icon-group">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="form-input input-with-icon"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      style={{ paddingRight: "2.8rem" }}
                    />
                    <Lock size={17} className="input-icon-left" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: "absolute",
                        right: "0.9rem",
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
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                {loginError && (
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
                    <span>{loginError}</span>
                  </div>
                )}

                <button className="login-submit-btn" type="submit">
                  <UserCheck size={18} /> Sign In to AeroOMR
                </button>
              </form>

              {/* Quick Demo Access Pills */}
              <div className="login-divider">Demo Quick Sign-In</div>

              <div className="role-pills-container">
                {mockUsers.map((user) => {
                  const isActive = selectedAuthUserId === user.id;
                  return (
                    <button
                      key={user.id}
                      type="button"
                      className={`role-pill-btn ${isActive ? "active" : ""}`}
                      onClick={() => onSelectMockUser(user.id)}
                      title={`Quick sign in as ${user.name}`}
                    >
                      {getRoleIcon(user.role)}
                      <span className="role-pill-name">{user.name.split(" ")[1] || user.name}</span>
                      <span className="role-pill-title">{getRoleTitle(user.role)}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
