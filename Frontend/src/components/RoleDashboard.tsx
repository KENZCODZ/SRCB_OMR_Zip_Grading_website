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
import type { AuthUser } from "../types";

interface RoleDashboardProps {
  user: AuthUser;
  summary?: {
    total_students: number;
    total_exams: number;
    average_score: number;
    total_submissions: number;
  };
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
        title: "Total Programmes",
        value: "12",
        subtitle: "Under the institution-wide dashboard",
        icon: BookOpen,
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
        subtitle: "Tracked within BSIT only",
        icon: GraduationCap,
      },
      {
        title: "Pass Rate",
        value: passRate,
        subtitle: "Current programme performance",
        icon: TrendingUp,
      },
      {
        title: "Recent Exams",
        value: summary ? summary.total_exams.toString() : "12",
        subtitle: "Published for the assigned programme",
        icon: BookOpen,
      },
      {
        title: "Faculty Insights",
        value: "4",
        subtitle: "Teachers with recent exam activity",
        icon: Sparkles,
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
      title: "Average Score",
      value: summary ? `${summary.average_score}%` : "49/50",
      subtitle: "Current performance snapshot",
      icon: TrendingUp,
    },
    {
      title: "Weak Areas",
      value: "3 topics",
      subtitle: "Topics needing reinforcement",
      icon: ShieldCheck,
    },
    {
      title: "Feedback Received",
      value: summary ? summary.total_submissions.toString() : "7",
      subtitle: "Teacher notes and clarifications",
      icon: Award,
    },
  ];
};

export default function RoleDashboard({ user, summary }: RoleDashboardProps) {
  const cards = dashboardCards(user, summary);

  return (
    <div
      className="card"
      style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "1rem",
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.35rem",
            }}
          >
            <UserCircle2 size={18} color="var(--srcb-gold-accent)" />
            <span
              className="badge"
              style={{
                background: "rgba(245, 158, 11, 0.15)",
                color: "var(--srcb-gold-light)",
              }}
            >
              {user.role.replace("-", " ")}
            </span>
          </div>
          <h2 style={{ fontSize: "1.35rem", marginBottom: "0.25rem" }}>
            {roleTitles[user.role]}
          </h2>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.9rem",
              maxWidth: "720px",
            }}
          >
            {roleDescriptions[user.role]}
          </p>
        </div>
      </div>

      <div className="stats-grid">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="metric-card">
              <div className="metric-header">
                <span className="metric-title">{card.title}</span>
                <div className="metric-icon-wrapper">
                  <Icon size={18} color="var(--srcb-gold-accent)" />
                </div>
              </div>
              <div className="metric-value">{card.value}</div>
              <div className="metric-subtitle">{card.subtitle}</div>
            </div>
          );
        })}
      </div>

      {user.role === "dean" && (
        <div style={{ display: "grid", gap: "1rem" }}>
          <div
            className="card"
            style={{ padding: "1rem", background: "rgba(8, 17, 32, 0.8)" }}
          >
            <h3 style={{ marginBottom: "0.75rem" }}>Executive overview</h3>
            <div
              style={{
                display: "grid",
                gap: "0.6rem",
                color: "var(--text-secondary)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Current semester</span>
                <strong style={{ color: "var(--text-primary)" }}>
                  Second Term
                </strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Pending reviews</span>
                <strong style={{ color: "var(--text-primary)" }}>14</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Published reports</span>
                <strong style={{ color: "var(--text-primary)" }}>38</strong>
              </div>
            </div>
          </div>

          <div
            className="card"
            style={{ padding: "1rem", background: "rgba(8, 17, 32, 0.8)" }}
          >
            <h3 style={{ marginBottom: "0.75rem" }}>Priority modules</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {[
                "Academic Management",
                "Examinations",
                "Reports & Analytics",
                "Settings",
              ].map((item) => (
                <span
                  key={item}
                  className="badge"
                  style={{
                    background: "rgba(59, 130, 246, 0.14)",
                    color: "var(--accent)",
                  }}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
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
                <strong style={{ color: "var(--text-primary)" }}>BSIT</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Active reviews</span>
                <strong style={{ color: "var(--text-primary)" }}>7</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Faculty updates</span>
                <strong style={{ color: "var(--text-primary)" }}>4</strong>
              </div>
            </div>
          </div>

          <div
            className="card"
            style={{ padding: "1rem", background: "rgba(8, 17, 32, 0.8)" }}
          >
            <h3 style={{ marginBottom: "0.75rem" }}>Monitoring needs</h3>
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
                Review student performance trends for the current term.
              </div>
              <div
                style={{
                  borderLeft: "3px solid var(--success)",
                  paddingLeft: "0.6rem",
                }}
              >
                Check exam completion and intervention flags weekly.
              </div>
            </div>
          </div>
        </div>
      )}

      {user.role === "teacher" && (
        <div style={{ display: "grid", gap: "1rem" }}>
          <div
            className="card"
            style={{ padding: "1rem", background: "rgba(8, 17, 32, 0.8)" }}
          >
            <h3 style={{ marginBottom: "0.75rem" }}>Daily workflow</h3>
            <div
              style={{
                display: "grid",
                gap: "0.6rem",
                color: "var(--text-secondary)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Created exams</span>
                <strong style={{ color: "var(--text-primary)" }}>
                  {summary?.total_exams ?? 0}
                </strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Graded sheets</span>
                <strong style={{ color: "var(--text-primary)" }}>
                  {summary?.total_submissions ?? 0}
                </strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Ready for review</span>
                <strong style={{ color: "var(--text-primary)" }}>3</strong>
              </div>
            </div>
          </div>

          <div
            className="card"
            style={{ padding: "1rem", background: "rgba(8, 17, 32, 0.8)" }}
          >
            <h3 style={{ marginBottom: "0.75rem" }}>Teaching tools</h3>
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
                Create an exam and upload an answer key quickly.
              </div>
              <div
                style={{
                  borderLeft: "3px solid var(--success)",
                  paddingLeft: "0.6rem",
                }}
              >
                Grade student sheets and export result reports.
              </div>
            </div>
          </div>
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
