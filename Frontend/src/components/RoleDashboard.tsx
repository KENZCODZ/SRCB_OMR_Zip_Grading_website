import { useState, useEffect } from "react";
import {
  Award,
  BarChart3,
  BookOpen,
  GraduationCap,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCircle2,
  UserCheck,
  UserX,
  Clock,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  UserPlus,
  Mail,
} from "lucide-react";
import type { AuthUser, PendingUser, Exam, Submission, StudentRosterEntry } from "../types";
import { fetchPendingUsers, approveUser, rejectUser } from "../api";
import TeacherExamCompiler from "./TeacherExamCompiler";

interface RoleDashboardProps {
  user: AuthUser;
  summary?: {
    total_students: number;
    total_exams: number;
    average_score: number;
    total_submissions: number;
  };
  exams?: Exam[];
  submissions?: Submission[];
  roster?: StudentRosterEntry[];
  onSelectSubmission?: (submission: Submission) => void;
  onInspectExam?: (exam: Exam) => void;
  addToast?: (type: "success" | "error" | "info", message: string) => void;
  formatDate?: (iso: string) => string;
}

const roleTitles: Record<AuthUser["role"], string> = {
  dean: "Dean Dashboard",
  "programme-head": "Programme Head Dashboard",
  teacher: "Teacher Dashboard",
  student: "Student Dashboard",
};

const roleDescriptions: Record<AuthUser["role"], string> = {
  dean: "Institution-wide oversight, performance trends, and executive reporting.",
  "programme-head":
    "Programme-specific analytics, student progress, and faculty insights.",
  teacher:
    "Examinations, grading workflows, item analysis, and feedback tracking.",
  student:
    "Personal results, question review, feedback, and learning progress.",
};

const dashboardCards = (
  user: AuthUser,
  summary?: {
    total_students: number;
    total_exams: number;
    average_score: number;
    total_submissions: number;
  },
  pendingCount: number = 0,
) => {
  if (user.role === "dean") {
    return [
      {
        title: "Total Students",
        value: summary ? summary.total_students.toLocaleString() : "2,184",
        subtitle: "Across all active programmes",
        icon: GraduationCap,
      },
      {
        title: "Total Teachers",
        value: "96",
        subtitle: "Faculty currently linked to departments",
        icon: ShieldCheck,
      },
      {
        title: "Pending Approvals",
        value: pendingCount.toString(),
        subtitle: "Registration requests awaiting confirmation",
        icon: UserPlus,
      },
      {
        title: "Total Examinations",
        value: summary ? summary.total_exams.toString() : "128",
        subtitle: "Including quizzes, midterms, and finals",
        icon: BarChart3,
      },
      {
        title: "Average Score",
        value: summary ? `${summary.average_score}%` : "84.6%",
        subtitle: "Current institutional academic standing",
        icon: TrendingUp,
      },
      {
        title: "Passing Rate",
        value: "89%",
        subtitle: "Across all recent examinations",
        icon: Award,
      },
    ];
  }

  if (user.role === "programme-head") {
    const passRate =
      summary && summary.total_submissions > 0
        ? `${Math.max(60, Math.min(98, Math.round(summary.average_score)))}%`
        : "89%";

    return [
      {
        title: "Programme Students",
        value: summary ? summary.total_students.toLocaleString() : "184",
        subtitle: `Tracked within ${user.programme || "BSIT"} only`,
        icon: GraduationCap,
      },
      {
        title: "Pending Registrations",
        value: pendingCount.toString(),
        subtitle: "Awaiting your confirmation",
        icon: UserPlus,
      },
      {
        title: "Recent Exams",
        value: summary ? summary.total_exams.toString() : "12",
        subtitle: "Published for the assigned programme",
        icon: BookOpen,
      },
      {
        title: "Pass Rate",
        value: passRate,
        subtitle: "Current programme performance",
        icon: TrendingUp,
      },
    ];
  }

  if (user.role === "teacher") {
    return [
      {
        title: "Active Exams",
        value: summary ? summary.total_exams.toString() : "6",
        subtitle: "Created and published this term",
        icon: BookOpen,
      },
      {
        title: "Scanned Sheets",
        value: summary ? summary.total_submissions.toString() : "324",
        subtitle: "Processed through ZipGrade workflows",
        icon: Sparkles,
      },
      {
        title: "Item Analysis",
        value: "Ready",
        subtitle: "Auto-generated after every scan",
        icon: BarChart3,
      },
      {
        title: "Feedback Posts",
        value: "18",
        subtitle: "Explanations attached to review items",
        icon: Award,
      },
    ];
  }

  return [
    {
      title: "Exams Taken",
      value: summary ? summary.total_submissions.toString() : "9",
      subtitle: "Including the latest results",
      icon: BookOpen,
    },
    {
      title: "Active Programme",
      value: user.programme ?? "General",
      subtitle: "Enrolled curriculum",
      icon: GraduationCap,
    },
    {
      title: "Graded Submissions",
      value: summary ? summary.total_submissions.toString() : "0",
      subtitle: "Completed answer sheets",
      icon: Sparkles,
    },
    {
      title: "Average Score",
      value: summary ? `${summary.average_score}%` : "—",
      subtitle: "Your cumulative performance",
      icon: TrendingUp,
    },
  ];
};

export default function RoleDashboard({
  user,
  summary,
  exams = [],
  submissions = [],
  roster = [],
  onSelectSubmission,
  onInspectExam,
  addToast,
  formatDate = (iso) => new Date(iso).toLocaleDateString(),
}: RoleDashboardProps) {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const canManageRegistrations = user.role === "programme-head" || user.role === "dean";

  const loadPendingList = async () => {
    if (!canManageRegistrations) return;
    setLoadingPending(true);
    try {
      const data = await fetchPendingUsers(user.role === "programme-head" ? user.programme : undefined);
      setPendingUsers(data || []);
    } catch {
      // Fallback
    } finally {
      setLoadingPending(false);
    }
  };

  useEffect(() => {
    loadPendingList();
  }, [user.id, user.role, user.programme]);

  const handleApproveUser = async (pendingUser: PendingUser) => {
    setActionLoadingId(pendingUser.id);
    setActionNotice(null);
    try {
      await approveUser(pendingUser.id);
      setPendingUsers((prev) => prev.filter((u) => u.id !== pendingUser.id));
      setActionNotice({
        type: "success",
        text: `Successfully approved ${pendingUser.name} (${pendingUser.role}). Their account is now active.`,
      });
    } catch (err: any) {
      setActionNotice({
        type: "error",
        text: err.message || "Failed to approve registration.",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectUser = async (pendingUser: PendingUser) => {
    if (!window.confirm(`Are you sure you want to reject the registration request from ${pendingUser.name}?`)) {
      return;
    }
    setActionLoadingId(pendingUser.id);
    setActionNotice(null);
    try {
      await rejectUser(pendingUser.id);
      setPendingUsers((prev) => prev.filter((u) => u.id !== pendingUser.id));
      setActionNotice({
        type: "success",
        text: `Rejected registration for ${pendingUser.name}.`,
      });
    } catch (err: any) {
      setActionNotice({
        type: "error",
        text: err.message || "Failed to reject registration.",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const cards = dashboardCards(user, summary, pendingUsers.length);

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <div className="card" style={{ padding: "1.25rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.85rem",
                color: "var(--srcb-gold-light)",
                marginBottom: "0.35rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontWeight: 700,
              }}
            >
              <UserCircle2 size={16} />
              {roleTitles[user.role]}
            </div>
            <h2 style={{ margin: 0 }}>Welcome, {user.name}</h2>
            <p
              style={{
                color: "var(--text-secondary)",
                marginTop: "0.35rem",
                marginBottom: 0,
                fontSize: "0.9rem",
              }}
            >
              {roleDescriptions[user.role]}
            </p>
          </div>

          <div
            style={{
              padding: "0.5rem 0.9rem",
              borderRadius: "var(--radius-md)",
              background: "rgba(15, 23, 42, 0.7)",
              border: "1px solid var(--border)",
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <ShieldCheck size={16} className="text-gold" />
            <span>
              Role: <strong>{user.role.replace("-", " ").toUpperCase()}</strong>
            </span>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
        }}
      >
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="card"
              style={{
                padding: "1rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  color: "var(--text-secondary)",
                  marginBottom: "0.6rem",
                }}
              >
                <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                  {card.title}
                </span>
                <Icon size={18} className="text-primary" />
              </div>
              <div>
                <div
                  style={{
                    fontSize: "1.6rem",
                    fontWeight: 800,
                    color: "var(--text-primary)",
                  }}
                >
                  {card.value}
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    marginTop: "0.2rem",
                  }}
                >
                  {card.subtitle}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* PENDING REGISTRATIONS APPROVAL PANEL (Programme Head & Dean) */}
      {canManageRegistrations && (
        <div
          className="card"
          style={{
            border: "1px solid rgba(245, 158, 11, 0.3)",
            background: "linear-gradient(180deg, rgba(15, 23, 42, 0.9) 0%, rgba(8, 17, 32, 0.95) 100%)",
            padding: "1.25rem",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "var(--radius-md)",
                  background: "rgba(245, 158, 11, 0.15)",
                  color: "var(--srcb-gold-accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <UserPlus size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.05rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  Pending User Registrations
                  {pendingUsers.length > 0 && (
                    <span
                      style={{
                        background: "var(--srcb-gold-accent)",
                        color: "#000000",
                        fontSize: "0.75rem",
                        fontWeight: 800,
                        padding: "0.15rem 0.5rem",
                        borderRadius: "10px",
                      }}
                    >
                      {pendingUsers.length} Action Needed
                    </span>
                  )}
                </h3>
                <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  Review and authorize newly registered faculty instructors and students before granting system access.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: "0.8rem", padding: "0.4rem 0.8rem", display: "flex", alignItems: "center", gap: "0.4rem" }}
              onClick={loadPendingList}
              disabled={loadingPending}
            >
              <RefreshCw size={14} className={loadingPending ? "spin" : ""} /> Refresh List
            </button>
          </div>

          {actionNotice && (
            <div
              style={{
                padding: "0.7rem 0.9rem",
                borderRadius: "var(--radius-md)",
                background: actionNotice.type === "success" ? "rgba(16, 185, 129, 0.15)" : "rgba(244, 63, 94, 0.15)",
                border: `1px solid ${actionNotice.type === "success" ? "rgba(16, 185, 129, 0.35)" : "rgba(244, 63, 94, 0.35)"}`,
                color: actionNotice.type === "success" ? "#6ee7b7" : "#fda4af",
                fontSize: "0.83rem",
                marginBottom: "1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              {actionNotice.type === "success" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              <span>{actionNotice.text}</span>
            </div>
          )}

          {pendingUsers.length === 0 ? (
            <div
              style={{
                padding: "2rem 1rem",
                textAlign: "center",
                background: "rgba(15, 23, 42, 0.4)",
                borderRadius: "var(--radius-md)",
                border: "1px dashed var(--border)",
              }}
            >
              <CheckCircle2 size={32} style={{ color: "#10b981", marginBottom: "0.5rem" }} />
              <h4 style={{ margin: 0, fontSize: "0.95rem" }}>All Caught Up!</h4>
              <p style={{ margin: "0.35rem 0 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                There are no pending user registrations requiring approval at this time.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: "auto", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
              <table style={{ width: "100%", fontSize: "0.84rem", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "rgba(15, 23, 42, 0.9)", borderBottom: "1px solid var(--border)" }}>
                    <th style={{ padding: "0.75rem 1rem" }}>Applicant Name</th>
                    <th style={{ padding: "0.75rem 1rem" }}>School Email</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Role Requested</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Programme / Dept</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Applied Date</th>
                    <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingUsers.map((pUser) => {
                    const isProcessing = actionLoadingId === pUser.id;
                    return (
                      <tr
                        key={pUser.id}
                        style={{
                          borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                          transition: "background 0.2s",
                        }}
                      >
                        <td style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <div
                              style={{
                                width: "28px",
                                height: "28px",
                                borderRadius: "50%",
                                background: pUser.role === "teacher" ? "rgba(37, 99, 235, 0.2)" : "rgba(245, 158, 11, 0.2)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: pUser.role === "teacher" ? "var(--primary)" : "var(--srcb-gold-accent)",
                              }}
                            >
                              {pUser.role === "teacher" ? <ShieldCheck size={15} /> : <GraduationCap size={15} />}
                            </div>
                            <span>{pUser.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <Mail size={13} className="text-muted" />
                            <span>{pUser.email}</span>
                          </div>
                        </td>
                        <td style={{ padding: "0.75rem 1rem" }}>
                          <span
                            className="badge"
                            style={{
                              background: pUser.role === "teacher" ? "rgba(37, 99, 235, 0.2)" : "rgba(245, 158, 11, 0.2)",
                              color: pUser.role === "teacher" ? "#93c5fd" : "var(--srcb-gold-light)",
                              border: `1px solid ${pUser.role === "teacher" ? "rgba(37, 99, 235, 0.4)" : "rgba(245, 158, 11, 0.4)"}`,
                              textTransform: "capitalize",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              padding: "0.2rem 0.5rem",
                            }}
                          >
                            {pUser.role}
                          </span>
                        </td>
                        <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)" }}>
                          <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{pUser.programme || "BSIT"}</div>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{pUser.department || "Computing Studies"}</div>
                        </td>
                        <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontSize: "0.78rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                            <Clock size={12} />
                            <span>{new Date(pUser.created_at).toLocaleDateString()}</span>
                          </div>
                        </td>
                        <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: "0.4rem" }}>
                            <button
                              type="button"
                              className="btn btn-success"
                              style={{
                                padding: "0.35rem 0.75rem",
                                fontSize: "0.78rem",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.3rem",
                              }}
                              disabled={isProcessing}
                              onClick={() => handleApproveUser(pUser)}
                              title="Approve registration and activate account"
                            >
                              <UserCheck size={14} />
                              {isProcessing ? "Processing..." : "Approve"}
                            </button>

                            <button
                              type="button"
                              className="btn btn-danger"
                              style={{
                                padding: "0.35rem 0.65rem",
                                fontSize: "0.78rem",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.3rem",
                              }}
                              disabled={isProcessing}
                              onClick={() => handleRejectUser(pUser)}
                              title="Reject registration request"
                            >
                              <UserX size={14} /> Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {user.role === "programme-head" && (
        <div style={{ display: "grid", gap: "1rem" }}>
          <div
            className="card"
            style={{ padding: "1rem", background: "rgba(8, 17, 32, 0.8)" }}
          >
            <h3 style={{ marginBottom: "0.75rem" }}>Programme focus</h3>
            <div
              style={{
                display: "grid",
                gap: "0.6rem",
                color: "var(--text-secondary)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Assigned programme</span>
                <strong style={{ color: "var(--text-primary)" }}>{user.programme || "BSIT"}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Pending authorizations</span>
                <strong style={{ color: pendingUsers.length > 0 ? "var(--srcb-gold-accent)" : "var(--text-primary)" }}>
                  {pendingUsers.length}
                </strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Active examinations</span>
                <strong style={{ color: "var(--text-primary)" }}>{summary?.total_exams ?? 0}</strong>
              </div>
            </div>
          </div>

          <div
            className="card"
            style={{ padding: "1rem", background: "rgba(8, 17, 32, 0.8)" }}
          >
            <h3 style={{ marginBottom: "0.75rem" }}>Programme Head Governance</h3>
            <div
              style={{
                display: "grid",
                gap: "0.5rem",
                color: "var(--text-secondary)",
              }}
            >
              <div
                style={{
                  borderLeft: "3px solid var(--srcb-gold-accent)",
                  paddingLeft: "0.6rem",
                }}
              >
                Review newly registered faculty and students in your programme above to authorize their account access.
              </div>
              <div
                style={{
                  borderLeft: "3px solid var(--success)",
                  paddingLeft: "0.6rem",
                }}
              >
                Check exam completion, average scores, and intervention flags across your department.
              </div>
            </div>
          </div>
        </div>
      )}

      {user.role === "teacher" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", marginTop: "0.5rem" }}>
          <TeacherExamCompiler
            exams={exams}
            submissions={submissions}
            roster={roster}
            currentUser={user}
            onSelectSubmission={onSelectSubmission}
            onInspectExam={onInspectExam}
            addToast={addToast}
            formatDate={formatDate}
          />
        </div>
      )}

      {user.role === "student" && (
        <div style={{ display: "grid", gap: "1rem" }}>
          <div
            className="card"
            style={{ padding: "1rem", background: "rgba(8, 17, 32, 0.8)" }}
          >
            <h3 style={{ marginBottom: "0.75rem" }}>My progress</h3>
            <div
              style={{
                display: "grid",
                gap: "0.6rem",
                color: "var(--text-secondary)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Latest score</span>
                <strong style={{ color: "var(--text-primary)" }}>
                  {summary ? `${summary.average_score}%` : "—"}
                </strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Exams viewed</span>
                <strong style={{ color: "var(--text-primary)" }}>
                  {summary?.total_submissions ?? 0}
                </strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Feedback available</span>
                <strong style={{ color: "var(--text-primary)" }}>2</strong>
              </div>
            </div>
          </div>

          <div
            className="card"
            style={{ padding: "1rem", background: "rgba(8, 17, 32, 0.8)" }}
          >
            <h3 style={{ marginBottom: "0.75rem" }}>Next steps</h3>
            <div
              style={{
                display: "grid",
                gap: "0.5rem",
                color: "var(--text-secondary)",
              }}
            >
              <div
                style={{
                  borderLeft: "3px solid var(--accent)",
                  paddingLeft: "0.6rem",
                }}
              >
                Review your latest grade and feedback.
              </div>
              <div
                style={{
                  borderLeft: "3px solid var(--srcb-gold-accent)",
                  paddingLeft: "0.6rem",
                }}
              >
                Ask your teacher for clarification on weak items.
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        className="card"
        style={{ padding: "1rem", background: "rgba(8, 17, 32, 0.8)" }}
      >
        <h3 style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>
          Access details
        </h3>
        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: "0.9rem",
            marginBottom: "0.75rem",
          }}
        >
          {user.scope}
        </p>
        <ul
          style={{
            paddingLeft: "1rem",
            color: "var(--text-secondary)",
            display: "grid",
            gap: "0.35rem",
          }}
        >
          {user.permissions.map((permission) => (
            <li key={permission}>{permission}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
