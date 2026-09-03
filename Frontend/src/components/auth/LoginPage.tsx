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
  Terminal,
  ChevronRight,
  X,
  CheckCircle2,
  Cpu,
  Sparkles,
} from "lucide-react";
import type { AuthUser } from "../../types";

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
  const [isDevToolOpen, setIsDevToolOpen] = useState(false);
  const [instantLogin, setInstantLogin] = useState(true);

  // Keyboard shortcut (Alt + D) to toggle devtools
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "d" || e.key === "D")) {
        setIsDevToolOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return { label: "System Admin", color: "#8b5cf6", bg: "rgba(139, 92, 246, 0.1)" };
      case "dean":
        return { label: "Dean of Education", color: "#d97706", bg: "rgba(217, 119, 6, 0.1)" };
      case "programme-head":
        return { label: "Programme Head", color: "#0284c7", bg: "rgba(2, 132, 199, 0.1)" };
      case "teacher":
        return { label: "Faculty Teacher", color: "#059669", bg: "rgba(5, 150, 105, 0.1)" };
      default:
        return { label: "Student Examinee", color: "#4f46e5", bg: "rgba(79, 70, 229, 0.1)" };
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <ShieldCheck size={16} color="#8b5cf6" />;
      case "dean":
        return <Award size={16} color="#d97706" />;
      case "programme-head":
        return <BookOpen size={16} color="#0284c7" />;
      case "teacher":
        return <UserCheck size={16} color="#059669" />;
      default:
        return <GraduationCap size={16} color="#4f46e5" />;
    }
  };

  const handleDevRoleClick = (user: AuthUser) => {
    if (instantLogin) {
      onSelectMockUser(user.id);
    } else {
      let pass = "Admin@2025";
      if (user.role === "dean") pass = "Dean@2025";
      if (user.role === "programme-head") pass = "Ph@2025";
      if (user.role === "teacher") pass = "Teacher@2025";
      if (user.role === "student") pass = "Student@2025";

      setEmail(user.email);
      setPassword(pass);
    }
  };

  return (
    <div className="login-minimal-wrapper">
      {/* Background Animated Stripes & Ambient Aesthetics */}
      <div className="login-animated-stripes" />
      <div className="login-ambient-glow" />
      <div className="login-ambient-mesh" />

      {/* Main Dual-Panel Institutional Container */}
      <div className="login-dual-container">
        {/* Left Visual Showcase Panel featuring SRCB 125th Building Image */}
        <div className="login-hero-showcase">
          <div className="login-hero-image-frame">
            <img
              src="/srcb-building-125.png"
              alt="St. Rita's College of Balingasag 125 Years of TIME"
              className="login-hero-bg-img"
            />
            <div className="login-hero-overlay" />
          </div>

          <div className="login-hero-content">
            <div className="login-hero-badge">
              <Sparkles size={14} color="#f59e0b" />
              <span>125th Jubilee Academic Assessment Portal</span>
            </div>

            <h2 className="login-hero-title">
              St. Rita's College of Balingasag
            </h2>
            <p className="login-hero-motto">
              "Rooted in Faith, Driven in Excellence, Reaching out in Humble Service"
            </p>

            <div className="login-hero-features">
              <div className="login-feature-item">
                <CheckCircle2 size={15} className="feature-icon" />
                <span>ZipGrade 50-Item Automated Camera & OMR Grading</span>
              </div>
              <div className="login-feature-item">
                <CheckCircle2 size={15} className="feature-icon" />
                <span>Outcomes-Based Education (OBE) Item Analysis</span>
              </div>
              <div className="login-feature-item">
                <CheckCircle2 size={15} className="feature-icon" />
                <span>Institutional Dean, Faculty & Student Records</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Authentication Form Panel */}
        <div className="login-minimal-card">
          {/* Brand Header */}
          <div className="login-minimal-brand">
            <div className="login-brand-logo-ring">
              <img src="/srcb-logo.png" alt="SRCB Logo" className="login-logo-img" />
            </div>
            <h1 className="login-app-title">SRCB EduAssess</h1>
            <p className="login-app-subtitle">
              Sign in to your institutional faculty, dean, or student portal
            </p>
          </div>

          {/* Minimalist Login Form */}
          <form onSubmit={onSubmit} className="login-minimal-form">
            <div className="form-group">
              <label className="login-field-label">Institutional Email</label>
              <div className="login-input-wrapper">
                <Mail size={18} className="login-input-icon" />
                <input
                  type="email"
                  className="login-minimal-input"
                  placeholder="username@srcb.edu.ph"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="form-group">
              <div className="login-password-header">
                <label className="login-field-label">Password</label>
                <span className="login-forgot-link">Forgot Password?</span>
              </div>
              <div className="login-input-wrapper">
                <Lock size={18} className="login-input-icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  className="login-minimal-input with-toggle"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? "Hide password" : "Show password"}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="login-error-pill">
                <span>{loginError}</span>
              </div>
            )}

            <button type="submit" className="login-primary-submit-btn">
              <span>Sign In to Portal</span>
              <ChevronRight size={17} />
            </button>
          </form>

          {/* Minimal Institutional Footer */}
          <div className="login-minimal-footer">
            <div className="login-security-tag">
              <ShieldCheck size={14} color="#0062ff" />
              <span>256-Bit Encrypted Academic Session</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Developer Sandbox Widget / DevTool */}
      <div className="devtool-floating-container">
        {!isDevToolOpen ? (
          <button
            type="button"
            className="devtool-launcher-btn"
            onClick={() => setIsDevToolOpen(true)}
            title="Open Developer Testing Sandbox (Alt + D)"
          >
            <Terminal size={14} />
            <span>DevTools</span>
            <span className="devtool-status-dot" />
          </button>
        ) : (
          <div className="devtool-drawer-card">
            <div className="devtool-header">
              <div className="devtool-header-left">
                <Cpu size={15} color="#0062ff" />
                <span className="devtool-title">DevTools & Role Switcher</span>
              </div>
              <button
                type="button"
                className="devtool-close-btn"
                onClick={() => setIsDevToolOpen(false)}
                title="Close DevTools"
              >
                <X size={14} />
              </button>
            </div>

            <div className="devtool-body">
              <div className="devtool-api-status">
                <span className="devtool-api-label">Backend API:</span>
                <span className="devtool-api-badge">
                  <CheckCircle2 size={12} color="#10b981" /> Online (Port 8000)
                </span>
              </div>

              <div className="devtool-toggle-row">
                <label className="devtool-toggle-label">
                  <input
                    type="checkbox"
                    checked={instantLogin}
                    onChange={(e) => setInstantLogin(e.target.checked)}
                  />
                  <span>Instant 1-Click Login</span>
                </label>
                <span className="devtool-hint">Alt+D to toggle</span>
              </div>

              <div className="devtool-roles-list">
                <div className="devtool-section-title">Select Test Persona:</div>
                {mockUsers.map((user) => {
                  const badge = getRoleBadge(user.role);
                  const isSelected = selectedAuthUserId === user.id;

                  return (
                    <button
                      key={user.id}
                      type="button"
                      className={`devtool-role-card ${isSelected ? "selected" : ""}`}
                      onClick={() => handleDevRoleClick(user)}
                    >
                      <div className="devtool-role-avatar">
                        {getRoleIcon(user.role)}
                      </div>
                      <div className="devtool-role-info">
                        <div className="devtool-role-name">{user.name}</div>
                        <div className="devtool-role-email">{user.email}</div>
                      </div>
                      <span
                        className="devtool-role-tag"
                        style={{ color: badge.color, backgroundColor: badge.bg }}
                      >
                        {badge.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
