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
  viewMode?: "all" | "create" | "directory";
}

export default function AdminUserManagement({
  addToast,
  viewMode = "all",
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
      {/* â”€â”€ MAIN CONTENT CONTAINER (VIEW MODE SENSITIVE) â”€â”€ */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            viewMode === "all"
              ? "repeat(auto-fit, minmax(380px, 1fr))"
              : "1fr",
          gap: "1.5rem",
          alignItems: "start",
          maxWidth: viewMode === "create" ? "820px" : "100%",
          width: "100%",
        }}
      >
        {/* ACCOUNT CREATOR FORM */}
        {(viewMode === "all" || viewMode === "create") && (
        <div
          className="card"
          style={{
            padding: "1.5rem",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.25rem" }}>
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "10px",
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0062ff",
              }}
            >
              <UserPlus size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "#0f172a" }}>
                Create Institutional Account
              </h3>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b" }}>
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
              background: "#f8fafc",
              padding: "4px",
              borderRadius: "10px",
              border: "1px solid #e2e8f0",
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
                background: targetRole === "teacher" ? "#0062ff" : "transparent",
                color: targetRole === "teacher" ? "#ffffff" : "#64748b",
                boxShadow: targetRole === "teacher" ? "0 2px 6px rgba(0, 98, 255, 0.25)" : "none",
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
                background: targetRole === "student" ? "#0062ff" : "transparent",
                color: targetRole === "student" ? "#ffffff" : "#64748b",
                boxShadow: targetRole === "student" ? "0 2px 6px rgba(0, 98, 255, 0.25)" : "none",
              }}
            >
              <GraduationCap size={16} /> Student
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Split Name Fields */}
            <div>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.35rem", color: "#475569" }}>
                Full Legal Name <span style={{ color: "#ef4444" }}>*</span>
              </label>

              <div style={{ display: "grid", gridTemplateColumns: targetRole === "teacher" ? "80px 1fr 1fr 1fr 70px" : "1fr 1fr 1fr 70px", gap: "0.4rem" }}>
                {targetRole === "teacher" && (
                  <select
                    className="input"
                    value={honorific}
                    onChange={(e) => setHonorific(e.target.value)}
                    style={{ fontSize: "0.8rem", padding: "0.4rem 0.2rem" }}
                  >
                    <option value="Prof.">Prof.</option>
                    <option value="Dr.">Dr.</option>
                    <option value="Engr.">Engr.</option>
                    <option value="Mr.">Mr.</option>
                    <option value="Ms.">Ms.</option>
                    <option value="Mrs.">Mrs.</option>
                    <option value="None">None</option>
                  </select>
                )}

                <input
                  type="text"
                  className="input"
                  placeholder="First Name *"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />

                <input
                  type="text"
                  className="input"
                  placeholder="Middle (Opt)"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                />

                <input
                  type="text"
                  className="input"
                  placeholder="Last Name *"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />

                <select
                  className="input"
                  value={suffix}
                  onChange={(e) => setSuffix(e.target.value)}
                  style={{ fontSize: "0.8rem", padding: "0.4rem 0.2rem" }}
                >
                  <option value="">Suffix</option>
                  <option value="Jr.">Jr.</option>
                  <option value="Sr.">Sr.</option>
                  <option value="II">II</option>
                  <option value="III">III</option>
                  <option value="IV">IV</option>
                  <option value="None">None</option>
                </select>
              </div>

              {(firstName.trim() || lastName.trim()) && (
                <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.3rem" }}>
                  Display Name: <strong style={{ color: "#0062ff" }}>{getFullName()}</strong>
                </div>
              )}
            </div>

            {/* Student ID or Employee ID */}
            <div>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.35rem", color: "#475569" }}>
                {targetRole === "student" ? "Institutional Student ID Number" : "Employee ID Number"} {targetRole === "student" && <span style={{ color: "#ef4444" }}>*</span>}
              </label>

              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span
                  style={{
                    background: "#eff6ff",
                    border: "1px solid #bfdbfe",
                    color: "#0062ff",
                    fontWeight: 800,
                    padding: "0.55rem 0.8rem",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                  }}
                >
                  C
                </span>
                <div style={{ flex: 1 }}>
                  <input
                    type="text"
                    className="input"
                    placeholder={targetRole === "student" ? "e.g. 2024-00123" : "e.g. 10045 (optional)"}
                    value={idSuffix}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/^C[-_]?/i, "");
                      setIdSuffix(cleaned);
                    }}
                    required={targetRole === "student"}
                  />
                </div>
              </div>

              {idSuffix.trim() && (
                <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "0.25rem" }}>
                  Assigned Institutional ID: <strong style={{ color: "#0062ff" }}>{getFormattedId()}</strong>
                </div>
              )}
            </div>

            {/* Email Address */}
            <div>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.35rem", color: "#475569" }}>
                School Email <span style={{ color: "#ef4444" }}>*</span>
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
                <Mail size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              </div>
            </div>

            {/* Password with Generate Option */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#475569" }}>
                  Password <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#0062ff",
                    fontSize: "0.75rem",
                    fontWeight: 700,
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
                <Lock size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
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
                    color: "#94a3b8",
                    cursor: "pointer",
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Department and Programme Dropdowns */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.35rem", color: "#475569" }}>
                  Collegiate Department
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
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.35rem", color: "#475569" }}>
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
                background: "#0062ff",
                color: "#ffffff",
                borderRadius: "10px",
                border: "none",
                boxShadow: "0 4px 12px rgba(0, 98, 255, 0.25)",
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
        )}

        {/* DIRECTORY & ROSTER VIEW */}
        {(viewMode === "all" || viewMode === "directory") && (
        <div
          className="card"
          style={{
            padding: "1.5rem",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.02)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "#0f172a" }}>
                User Accounts Directory
              </h3>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b" }}>
                Active institutional users list ({filteredUsers.length} accounts found)
              </p>
            </div>
            <button
              className="btn btn-secondary"
              onClick={loadUsers}
              disabled={loading}
              title="Refresh users list"
              style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}
            >
              <RefreshCw size={14} className={loading ? "spin" : ""} style={{ marginRight: "0.3rem" }} /> Refresh
            </button>
          </div>

          {/* Search and Filters */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem" }}>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                className="input"
                style={{ width: "100%", paddingLeft: "2.2rem", fontSize: "0.85rem", height: "38px" }}
                placeholder="Search by name, email, department, or student ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            </div>

            {/* Filter Pills */}
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
              <button
                type="button"
                className={`btn btn-sm ${roleFilter === "all" ? "btn-primary" : "btn-secondary"}`}
                style={{ fontSize: "0.78rem", padding: "0.3rem 0.7rem", borderRadius: "20px" }}
                onClick={() => setRoleFilter("all")}
              >
                All ({users.length})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${roleFilter === "teacher" ? "btn-primary" : "btn-secondary"}`}
                style={{ fontSize: "0.78rem", padding: "0.3rem 0.7rem", borderRadius: "20px" }}
                onClick={() => setRoleFilter("teacher")}
              >
                Teachers ({totalTeachers})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${roleFilter === "student" ? "btn-primary" : "btn-secondary"}`}
                style={{ fontSize: "0.78rem", padding: "0.3rem 0.7rem", borderRadius: "20px" }}
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
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              background: "#ffffff",
            }}
          >
            {loading ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>
                <RefreshCw size={24} className="spin" style={{ margin: "0 auto 0.5rem", color: "#0062ff" }} />
                <p>Loading accounts directory...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>
                <Users size={32} style={{ margin: "0 auto 0.5rem", color: "#94a3b8" }} />
                <p>No user accounts matched your search.</p>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #e2e8f0", background: "#f8fafc", textAlign: "left" }}>
                    <th style={{ padding: "0.6rem 0.75rem", color: "#475569" }}>User</th>
                    <th style={{ padding: "0.6rem 0.75rem", color: "#475569" }}>Role</th>
                    <th style={{ padding: "0.6rem 0.75rem", color: "#475569" }}>Programme</th>
                    <th style={{ padding: "0.6rem 0.75rem", color: "#475569" }}>Status</th>
                    <th style={{ padding: "0.6rem 0.75rem", textAlign: "right", color: "#475569" }}>Action</th>
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
                          borderBottom: "1px solid #f1f5f9",
                          transition: "background 0.15s ease",
                        }}
                      >
                        <td style={{ padding: "0.65rem 0.75rem" }}>
                          <div style={{ fontWeight: 700, color: "#0f172a" }}>{u.name}</div>
                          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{u.email}</div>
                          {u.student_id && (
                            <div style={{ fontSize: "0.72rem", color: "#0062ff", fontWeight: 700 }}>
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
                              borderRadius: "6px",
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              background: isTeacher
                                ? "#eff6ff"
                                : isStudent
                                ? "#eff6ff"
                                : isAdmin
                                ? "#f5f3ff"
                                : "#fef2f2",
                              color: isTeacher
                                ? "#0062ff"
                                : isStudent
                                ? "#0062ff"
                                : isAdmin
                                ? "#7c3aed"
                                : "#dc2626",
                              border: `1px solid ${
                                isTeacher
                                  ? "#bfdbfe"
                                  : isStudent
                                  ? "#bfdbfe"
                                  : isAdmin
                                  ? "#ddd6fe"
                                  : "#fecaca"
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

                        <td style={{ padding: "0.65rem 0.75rem", color: "#0f172a" }}>
                          <div style={{ fontWeight: 600 }}>{u.programme || "BSIT"}</div>
                          <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                            {u.department || "Computing"}
                          </div>
                        </td>

                        <td style={{ padding: "0.65rem 0.75rem" }}>
                          <span
                            style={{
                              padding: "0.15rem 0.45rem",
                              borderRadius: "6px",
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              background: u.status === "active" ? "#ecfdf5" : "#fffbeb",
                              color: u.status === "active" ? "#059669" : "#b45309",
                              border: `1px solid ${u.status === "active" ? "#a7f3d0" : "#fde68a"}`,
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
                                background: "#fef2f2",
                                border: "1px solid #fecaca",
                                color: "#ef4444",
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
        )}
      </div>
    </div>
  );
}
