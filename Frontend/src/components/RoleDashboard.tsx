import {
  Award,
  BarChart3,
  BookOpen,
  GraduationCap,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCircle2,
} from "lucide-react";
import type { AuthUser, Exam, Submission, StudentRosterEntry } from "../types";
import TeacherExamCompiler from "./TeacherExamCompiler";

interface RoleDashboardProps {
  user: AuthUser;
  summary?: {
    total_accounts: number;
    total_students: number;
    total_teachers: number;
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
  admin: "System Administrator Dashboard",
  dean: "Dean Dashboard",
  "programme-head": "Programme Head Dashboard",
  teacher: "Teacher Dashboard",
  student: "Student Dashboard",
};

const roleDescriptions: Record<AuthUser["role"], string> = {
  admin: "Comprehensive system administration, user management, exam monitoring, and institutional analytics.",
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
    total_accounts: number;
    total_students: number;
    total_teachers: number;
    total_exams: number;
    average_score: number;
    total_submissions: number;
  },
) => {
  if (user.role === "admin" || user.role === "dean") {
    return [
      {
        title: "Total Students",
        value: summary ? summary.total_students.toLocaleString() : "2,184",
        subtitle: "Across all active programmes",
        icon: GraduationCap,
      },
      {
        title: "Total Teachers",
        value: summary ? summary.total_teachers.toLocaleString() : "0",
        subtitle: "Faculty currently linked to departments",
        icon: ShieldCheck,
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
  const cards = dashboardCards(user, summary);

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <div
        className="card"
        style={{
          padding: "1.5rem 1.75rem",
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "16px",
          boxShadow: "0 2px 10px rgba(0, 98, 255, 0.04)",
        }}
      >
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
                fontSize: "0.78rem",
                color: "#0062ff",
                padding: "0.25rem 0.65rem",
                borderRadius: "20px",
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                marginBottom: "0.5rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontWeight: 700,
              }}
            >
              <UserCircle2 size={15} />
              {roleTitles[user.role]}
            </div>
            <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800, color: "#0f172a" }}>Welcome, {user.name}</h2>
            <p
              style={{
                color: "#64748b",
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
              padding: "0.5rem 0.95rem",
              borderRadius: "10px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              fontSize: "0.82rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              color: "#0f172a",
              boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
            }}
          >
            <ShieldCheck size={16} color="#0062ff" />
            <span>
              Role: <strong style={{ color: "#0062ff" }}>{user.role.replace("-", " ").toUpperCase()}</strong>
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
                padding: "1.2rem",
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "14px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  color: "#64748b",
                  marginBottom: "0.6rem",
                }}
              >
                <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                  {card.title}
                </span>
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    background: "#eff6ff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#0062ff",
                  }}
                >
                  <Icon size={17} />
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: "1.65rem",
                    fontWeight: 800,
                    color: "#0f172a",
                  }}
                >
                  {card.value}
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#64748b",
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

      {user.role === "programme-head" && (
        <div style={{ display: "grid", gap: "1rem" }}>
          <div
            className="card"
            style={{
              padding: "1.25rem",
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "14px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
            }}
          >
            <h3 style={{ marginBottom: "0.75rem", fontSize: "1.05rem", color: "#0f172a" }}>Programme Focus</h3>
            <div
              style={{
                display: "grid",
                gap: "0.6rem",
                color: "#475569",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Assigned programme:</span>
                <strong style={{ color: "#0f172a" }}>{user.programme || "BSIT"}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Active examinations:</span>
                <strong style={{ color: "#0062ff" }}>{summary?.total_exams ?? 0}</strong>
              </div>
            </div>
          </div>

          <div
            className="card"
            style={{
              padding: "1.25rem",
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "14px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
            }}
          >
            <h3 style={{ marginBottom: "0.75rem", fontSize: "1.05rem", color: "#0f172a" }}>Programme Head Governance</h3>
            <div
              style={{
                display: "grid",
                gap: "0.6rem",
                color: "#475569",
                fontSize: "0.88rem",
              }}
            >
              <div
                style={{
                  borderLeft: "3px solid #10b981",
                  paddingLeft: "0.75rem",
                }}
              >
                Check exam completion, average scores, and intervention flags across your department.
              </div>
              <div
                style={{
                  borderLeft: "3px solid #0062ff",
                  paddingLeft: "0.75rem",
                }}
              >
                Oversee academic performance metrics and examinee trends across programme cohorts.
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
            style={{ padding: "1rem", background: "#ffffff", border: "1px solid #e2e8f0" }}
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
            style={{ padding: "1rem", background: "#ffffff", border: "1px solid #e2e8f0" }}
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
                  borderLeft: "3px solid #0062ff",
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
        style={{ padding: "1rem", background: "#ffffff", border: "1px solid #e2e8f0" }}
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
