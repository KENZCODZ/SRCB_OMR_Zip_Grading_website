import React, { useState, useEffect } from "react";
import {
  UserPlus,
  ShieldCheck,
  GraduationCap,
  Users,
  Search,
  CheckCircle2,
  Trash2,
  Lock,
  Mail,
  Award,
  KeyRound,
  Eye,
  EyeOff,
  RefreshCw,
} from "lucide-react";
import type { AuthUser, PendingUser } from "../types";
import { fetchAllUsers, adminCreateUser, deleteUser } from "../api";

interface AdminUserManagementProps {
  currentUser?: AuthUser;
  addToast: (type: "success" | "error" | "info", message: string) => void;
  formatDate?: (iso: string) => string;
}

export default function AdminUserManagement({
  addToast,
}: AdminUserManagementProps) {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "teacher" | "student">("all");
  const [targetRole, setTargetRole] = useState<"teacher" | "student">("teacher");

  // Name Parts Form State
  const [honorific, setHonorific] = useState("Prof.");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [suffix, setSuffix] = useState("");

  // Account Credentials State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [programme, setProgramme] = useState("BSIT");
  const [department, setDepartment] = useState("Computing Studies");
  const [idSuffix, setIdSuffix] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const getFullName = () => {
    const parts: string[] = [];
    if (targetRole === "teacher" && honorific && honorific !== "None") {
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

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await fetchAllUsers();
      if (data && Array.isArray(data)) {
        setUsers(data);
      }
    } catch (err: any) {
      addToast("error", err.message || "Failed to fetch user directory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleRoleSwitch = (newRole: "teacher" | "student") => {
    setTargetRole(newRole);
    if (newRole === "teacher") {
      setDepartment("Computing Studies");
      setProgramme("BSIT");
    } else {
      setDepartment("Computing Studies");
      setProgramme("BSIT");
    }
  };

  const handleGeneratePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let gen = "";
    for (let i = 0; i < 10; i++) {
      gen += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(gen);
    setShowPassword(true);
    addToast("info", "Generated secure password for new account.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanFirst = firstName.trim();
    const cleanLast = lastName.trim();
    const cleanFullName = getFullName();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();
    const finalId = getFormattedId();

    if (!cleanFirst || !cleanLast) {
      addToast("error", "Please provide both First Name and Last Name.");
      return;
    }

    if (!cleanEmail || !cleanPass) {
      addToast("error", "Please fill in email and password fields.");
      return;
    }

    if (!cleanEmail.includes("@")) {
      addToast("error", "Please provide a valid institutional email.");
      return;
    }

    if (cleanPass.length < 6) {
      addToast("error", "Password must be at least 6 characters.");
      return;
    }

    if (targetRole === "student" && !finalId) {
      addToast("error", "Please provide the Student ID number (e.g. 2024-00123).");
      return;
    }

    setSubmitting(true);
    try {
      const res = await adminCreateUser({
        name: cleanFullName,
        email: cleanEmail,
        password: cleanPass,
        role: targetRole,
        programme,
        department,
        student_id: targetRole === "student" ? finalId : (finalId || undefined),
      });

      addToast("success", res.message || `Successfully created ${targetRole} account for ${cleanFullName}.`);

      // Reset form
      setFirstName("");
      setMiddleName("");
      setLastName("");
      setSuffix("");
      setEmail("");
      setPassword("");
      setIdSuffix("");

      // Reload list
      loadUsers();
    } catch (err: any) {
      addToast("error", err.message || "Failed to create account.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Are you sure you want to delete the account for "${userName}"?`)) {
      return;
    }

    setDeletingId(userId);
    try {
      await deleteUser(userId);
      addToast("success", `Account for ${userName} has been removed.`);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err: any) {
      addToast("error", err.message || "Failed to delete user account.");
    } finally {
      setDeletingId(null);
    }
  };

  // Stats calculation
  const totalTeachers = users.filter((u) => u.role === "teacher").length;
  const totalStudents = users.filter((u) => u.role === "student").length;
  const totalUsers = users.length;

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== "all" && u.role !== roleFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (u.name || "").toLowerCase().includes(q);
      const matchEmail = (u.email || "").toLowerCase().includes(q);
      const matchDept = (u.department || "").toLowerCase().includes(q);
      const matchProg = (u.programme || "").toLowerCase().includes(q);
      const matchId = (u.student_id || "").toLowerCase().includes(q);
      return matchName || matchEmail || matchDept || matchProg || matchId;
    }
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* ── TOP STATS BAR ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
        }}
      >
        <div className="card" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
                Total Accounts
              </div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#ffffff", marginTop: "0.2rem" }}>
                {totalUsers}
              </div>
            </div>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "rgba(59, 130, 246, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#60a5fa",
              }}
            >
              <Users size={22} />
            </div>
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "0.4rem" }}>
            Active system users directory
          </div>
        </div>

        <div className="card" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
                Teachers / Faculty
              </div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#93c5fd", marginTop: "0.2rem" }}>
                {totalTeachers}
              </div>
            </div>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "rgba(37, 99, 235, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#93c5fd",
              }}
            >
              <ShieldCheck size={22} />
            </div>
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "0.4rem" }}>
            Authorized exam creators & graders
          </div>
        </div>

        <div className="card" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
                Students Enrolled
              </div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--srcb-gold-accent)", marginTop: "0.2rem" }}>
                {totalStudents}
              </div>
            </div>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "rgba(245, 158, 11, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--srcb-gold-accent)",
              }}
            >
              <GraduationCap size={22} />
            </div>
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "0.4rem" }}>
            Enrolled student examinees
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT TWO-COLUMN GRID ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
          gap: "1.5rem",
          alignItems: "start",
        }}
      >
        {/* LEFT COLUMN: ACCOUNT CREATOR FORM */}
        <div className="card" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #a855f7, #6366f1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
              }}
            >
              <UserPlus size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>
                Create Institutional Account
              </h3>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                Directly provision active faculty and student login credentials
              </p>
            </div>
          </div>

          {/* Role Selection Tabs */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.5rem",
              marginBottom: "1.25rem",
              background: "rgba(15, 23, 42, 0.6)",
              padding: "4px",
              borderRadius: "10px",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <button
              type="button"
              onClick={() => handleRoleSwitch("teacher")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.4rem",
                padding: "0.6rem 0.8rem",
                borderRadius: "8px",
                border: "none",
                fontWeight: 700,
                fontSize: "0.85rem",
                cursor: "pointer",
                transition: "all 0.2s ease",
                background: targetRole === "teacher" ? "var(--primary)" : "transparent",
                color: targetRole === "teacher" ? "#ffffff" : "var(--text-secondary)",
                boxShadow: targetRole === "teacher" ? "0 2px 8px rgba(37, 99, 235, 0.4)" : "none",
              }}
            >
              <ShieldCheck size={16} /> Teacher / Faculty
            </button>

            <button
              type="button"
              onClick={() => handleRoleSwitch("student")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.4rem",
                padding: "0.6rem 0.8rem",
                borderRadius: "8px",
                border: "none",
                fontWeight: 700,
                fontSize: "0.85rem",
                cursor: "pointer",
                transition: "all 0.2s ease",
                background: targetRole === "student" ? "var(--srcb-gold-accent)" : "transparent",
                color: targetRole === "student" ? "#000000" : "var(--text-secondary)",
                boxShadow: targetRole === "student" ? "0 2px 8px rgba(245, 158, 11, 0.4)" : "none",
              }}
            >
              <GraduationCap size={16} /> Student
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* NAME PARTS SECTION */}
            <div>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.45rem", color: "var(--text-secondary)" }}>
                Name Information <span style={{ color: "var(--danger)" }}>*</span>
              </label>

              {/* Row 1: Honorific (if Teacher), First Name, Middle Name/Initial */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: targetRole === "teacher" ? "100px 1fr 1fr" : "1fr 1fr",
                  gap: "0.5rem",
                  marginBottom: "0.5rem",
                }}
              >
                {targetRole === "teacher" && (
                  <div>
                    <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>
                      Title
                    </label>
                    <select
                      className="input"
                      style={{ width: "100%", padding: "0.55rem 0.5rem", fontSize: "0.82rem" }}
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

                <div>
                  <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>
                    First Name <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="input"
                    style={{ width: "100%", fontSize: "0.85rem" }}
                    placeholder="e.g. Juan"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>
                    Middle Initial / Name
                  </label>
                  <input
                    type="text"
                    className="input"
                    style={{ width: "100%", fontSize: "0.85rem" }}
                    placeholder="e.g. M."
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                  />
                </div>
              </div>

              {/* Row 2: Last Name and Suffix */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 110px",
                  gap: "0.5rem",
                }}
              >
                <div>
                  <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>
                    Last Name <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="input"
                    style={{ width: "100%", fontSize: "0.85rem" }}
                    placeholder="e.g. Dela Cruz"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>
                    Suffix
                  </label>
                  <select
                    className="input"
                    style={{ width: "100%", padding: "0.55rem 0.5rem", fontSize: "0.82rem" }}
                    value={suffix}
                    onChange={(e) => setSuffix(e.target.value)}
                  >
                    <option value="">None</option>
                    <option value="Jr.">Jr.</option>
                    <option value="Sr.">Sr.</option>
                    <option value="II">II</option>
                    <option value="III">III</option>
                    <option value="IV">IV</option>
                  </select>
                </div>
              </div>

              {/* Live Formatted Name Preview */}
              {(firstName.trim() || lastName.trim()) && (
                <div
                  style={{
                    marginTop: "0.45rem",
                    padding: "0.35rem 0.65rem",
                    borderRadius: "6px",
                    background: "rgba(37, 99, 235, 0.1)",
                    border: "1px solid rgba(37, 99, 235, 0.25)",
                    fontSize: "0.76rem",
                    color: "#93c5fd",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                  }}
                >
                  <span style={{ color: "var(--text-muted)" }}>Full Name:</span>
                  <strong>{getFullName()}</strong>
                </div>
              )}
            </div>

            {/* ID NUMBER WITH LOCKED 'C' PREFIX */}
            <div>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.35rem", color: "var(--text-secondary)" }}>
                {targetRole === "student" ? "Student ID Number" : "Faculty / Employee ID"}{" "}
                {targetRole === "student" && <span style={{ color: "var(--danger)" }}>*</span>}
              </label>

              <div style={{ display: "flex", alignItems: "stretch" }}>
                {/* Locked C Badge Prefix */}
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 0.9rem",
                    background: targetRole === "student" ? "rgba(245, 158, 11, 0.18)" : "rgba(37, 99, 235, 0.18)",
                    border: `1px solid ${targetRole === "student" ? "rgba(245, 158, 11, 0.4)" : "rgba(37, 99, 235, 0.4)"}`,
                    borderRight: "none",
                    borderRadius: "var(--radius-md) 0 0 var(--radius-md)",
                    color: targetRole === "student" ? "var(--srcb-gold-accent)" : "#93c5fd",
                    fontWeight: 800,
                    fontSize: "0.95rem",
                    letterSpacing: "0.05em",
                    userSelect: "none",
                  }}
                  title="Institutional ID prefix (C)"
                >
                  C
                </div>

                <div style={{ position: "relative", flex: 1 }}>
                  <input
                    type="text"
                    className="input"
                    style={{
                      width: "100%",
                      borderRadius: "0 var(--radius-md) var(--radius-md) 0",
                      fontSize: "0.85rem",
                    }}
                    placeholder={targetRole === "student" ? "2024-00142" : "2024-001"}
                    value={idSuffix}
                    onChange={(e) => {
                      const val = e.target.value;
                      // If user pastes/types starting with C, keep clean rest
                      const cleaned = val.replace(/^C[-_]?/i, "");
                      setIdSuffix(cleaned);
                    }}
                    required={targetRole === "student"}
                  />
                </div>
              </div>

              {idSuffix.trim() && (
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                  Assigned Institutional ID: <strong style={{ color: "var(--srcb-gold-accent)" }}>{getFormattedId()}</strong>
                </div>
              )}
            </div>

            {/* Email Address */}
            <div>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.35rem", color: "var(--text-secondary)" }}>
                School Email <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="email"
                  className="input"
                  style={{ width: "100%", paddingLeft: "2.2rem" }}
                  placeholder={targetRole === "teacher" ? "e.g. j.delacruz@srcb.edu.ph" : "e.g. m.santos@srcb.edu.ph"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Mail size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              </div>
            </div>

            {/* Password with Generate Option */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                  Password <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--srcb-gold-accent)",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem",
                  }}
                >
                  <KeyRound size={12} /> Auto-Generate
                </button>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  className="input"
                  style={{ width: "100%", paddingLeft: "2.2rem", paddingRight: "2.2rem" }}
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Lock size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "0.75rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Academic Department & Programme */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.35rem", color: "var(--text-secondary)" }}>
                  Department
                </label>
                <select
                  className="input"
                  style={{ width: "100%" }}
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                >
                  <option value="Computing Studies">Computing Studies</option>
                  <option value="Business Administration">Business Admin</option>
                  <option value="Teacher Education">Teacher Education</option>
                  <option value="Hospitality Management">Hospitality Mgmt</option>
                  <option value="Arts & Sciences">Arts & Sciences</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.35rem", color: "var(--text-secondary)" }}>
                  Programme
                </label>
                <select
                  className="input"
                  style={{ width: "100%" }}
                  value={programme}
                  onChange={(e) => setProgramme(e.target.value)}
                >
                  <option value="BSIT">BSIT (Info Tech)</option>
                  <option value="BSCS">BSCS (Comp Sci)</option>
                  <option value="BSBA">BSBA (Business)</option>
                  <option value="BSED">BSED (Sec Educ)</option>
                  <option value="BEED">BEED (Elem Educ)</option>
                  <option value="BSHM">BSHM (Hospitality)</option>
                </select>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{
                marginTop: "0.5rem",
                width: "100%",
                padding: "0.75rem",
                fontWeight: 700,
                fontSize: "0.95rem",
                background:
                  targetRole === "teacher"
                    ? "linear-gradient(135deg, #2563eb, #1d4ed8)"
                    : "linear-gradient(135deg, #d97706, #b45309)",
                borderColor: targetRole === "teacher" ? "#3b82f6" : "#f59e0b",
                color: "#ffffff",
                boxShadow:
                  targetRole === "teacher"
                    ? "0 4px 14px rgba(37, 99, 235, 0.4)"
                    : "0 4px 14px rgba(217, 119, 6, 0.4)",
              }}
            >
              {submitting ? (
                <>
                  <RefreshCw size={18} className="spin" style={{ marginRight: "0.5rem" }} /> Creating Account...
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} style={{ marginRight: "0.5rem" }} /> Create & Activate {targetRole === "teacher" ? "Teacher" : "Student"} Account
                </>
              )}
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: DIRECTORY & ROSTER VIEW */}
        <div className="card" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>
                User Accounts Directory
              </h3>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                Active institutional users list ({filteredUsers.length} accounts found)
              </p>
            </div>
            <button
              className="btn btn-outline"
              onClick={loadUsers}
              disabled={loading}
              title="Refresh users list"
              style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}
            >
              <RefreshCw size={14} className={loading ? "spin" : ""} style={{ marginRight: "0.3rem" }} /> Refresh
            </button>
          </div>

          {/* Search and Filters */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1rem" }}>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                className="input"
                style={{ width: "100%", paddingLeft: "2.2rem", fontSize: "0.85rem" }}
                placeholder="Search by name, email, department, or student ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            </div>

            {/* Filter Pills */}
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
              <button
                type="button"
                className={`btn btn-sm ${roleFilter === "all" ? "btn-primary" : "btn-outline"}`}
                style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem" }}
                onClick={() => setRoleFilter("all")}
              >
                All ({users.length})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${roleFilter === "teacher" ? "btn-primary" : "btn-outline"}`}
                style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem" }}
                onClick={() => setRoleFilter("teacher")}
              >
                Teachers ({totalTeachers})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${roleFilter === "student" ? "btn-primary" : "btn-outline"}`}
                style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem" }}
                onClick={() => setRoleFilter("student")}
              >
                Students ({totalStudents})
              </button>
            </div>
          </div>

          {/* User Table List */}
          <div
            style={{
              maxHeight: "440px",
              overflowY: "auto",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "8px",
              background: "rgba(8, 17, 32, 0.6)",
            }}
          >
            {loading ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                <RefreshCw size={24} className="spin" style={{ margin: "0 auto 0.5rem" }} />
                <p>Loading accounts directory...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                <Users size={32} style={{ margin: "0 auto 0.5rem", opacity: 0.4 }} />
                <p>No user accounts matched your search.</p>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)", background: "rgba(15, 23, 42, 0.8)", textAlign: "left" }}>
                    <th style={{ padding: "0.6rem 0.75rem" }}>User</th>
                    <th style={{ padding: "0.6rem 0.75rem" }}>Role</th>
                    <th style={{ padding: "0.6rem 0.75rem" }}>Programme</th>
                    <th style={{ padding: "0.6rem 0.75rem" }}>Status</th>
                    <th style={{ padding: "0.6rem 0.75rem", textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => {
                    const isTeacher = u.role === "teacher";
                    const isStudent = u.role === "student";
                    const isAdmin = u.role === "admin";

                    return (
                      <tr
                        key={u.id}
                        style={{
                          borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                          transition: "background 0.15s ease",
                        }}
                      >
                        <td style={{ padding: "0.65rem 0.75rem" }}>
                          <div style={{ fontWeight: 600, color: "#ffffff" }}>{u.name}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{u.email}</div>
                          {u.student_id && (
                            <div style={{ fontSize: "0.7rem", color: "var(--srcb-gold-accent)" }}>
                              ID: {u.student_id}
                            </div>
                          )}
                        </td>

                        <td style={{ padding: "0.65rem 0.75rem" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.3rem",
                              padding: "0.2rem 0.5rem",
                              borderRadius: "4px",
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              background: isTeacher
                                ? "rgba(37, 99, 235, 0.2)"
                                : isStudent
                                ? "rgba(245, 158, 11, 0.2)"
                                : isAdmin
                                ? "rgba(168, 85, 247, 0.2)"
                                : "rgba(239, 68, 68, 0.2)",
                              color: isTeacher
                                ? "#93c5fd"
                                : isStudent
                                ? "var(--srcb-gold-light)"
                                : isAdmin
                                ? "#d8b4fe"
                                : "#fca5a5",
                              border: `1px solid ${
                                isTeacher
                                  ? "rgba(37, 99, 235, 0.4)"
                                  : isStudent
                                  ? "rgba(245, 158, 11, 0.4)"
                                  : isAdmin
                                  ? "rgba(168, 85, 247, 0.4)"
                                  : "rgba(239, 68, 68, 0.4)"
                              }`,
                            }}
                          >
                            {isTeacher ? (
                              <ShieldCheck size={12} />
                            ) : isStudent ? (
                              <GraduationCap size={12} />
                            ) : (
                              <Award size={12} />
                            )}
                            {u.role.toUpperCase()}
                          </span>
                        </td>

                        <td style={{ padding: "0.65rem 0.75rem", color: "var(--text-secondary)" }}>
                          <div>{u.programme || "BSIT"}</div>
                          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                            {u.department || "Computing"}
                          </div>
                        </td>

                        <td style={{ padding: "0.65rem 0.75rem" }}>
                          <span
                            style={{
                              padding: "0.15rem 0.45rem",
                              borderRadius: "4px",
                              fontSize: "0.7rem",
                              fontWeight: 600,
                              background: u.status === "active" ? "rgba(34, 197, 94, 0.15)" : "rgba(245, 158, 11, 0.15)",
                              color: u.status === "active" ? "#4ade80" : "#fcd34d",
                              border: `1px solid ${u.status === "active" ? "rgba(34, 197, 94, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
                            }}
                          >
                            {u.status || "active"}
                          </span>
                        </td>

                        <td style={{ padding: "0.65rem 0.75rem", textAlign: "right" }}>
                          {!isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u.id, u.name)}
                              disabled={deletingId === u.id}
                              title="Delete account"
                              style={{
                                background: "rgba(239, 68, 68, 0.1)",
                                border: "1px solid rgba(239, 68, 68, 0.3)",
                                color: "#f87171",
                                padding: "0.3rem 0.5rem",
                                borderRadius: "6px",
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
