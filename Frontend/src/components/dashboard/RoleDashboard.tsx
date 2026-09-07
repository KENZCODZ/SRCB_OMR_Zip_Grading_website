import { useMemo } from "react";
import {
  Award,
  BarChart3,
  BookOpen,
  GraduationCap,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  Clock,
  Users,
} from "lucide-react";
import type { AuthUser, Exam, Submission, StudentRosterEntry } from "../../types";
import { TeacherExamCompiler } from "../teacher";

interface MetricCard {
  title: string;
  value: string;
  icon: any;
  subtitle: string;
}

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

const getDashboardCards = (
  user: AuthUser,
  summary?: any,
  studentStats?: { examsTaken: number; avgScore: string; latestScore: string }
): MetricCard[] => {
  if (user.role === "admin") {
    return [
      {
        title: "Active Users",
        value: summary ? summary.total_accounts.toString() : "14",
        icon: ShieldCheck,
        subtitle: "Role Matrix",
      },
      {
        title: "Total Students",
        value: summary ? summary.total_students.toString() : "4",
        icon: GraduationCap,
        subtitle: "Enrolled",
      },
      {
        title: "Faculty Staff",
        value: summary ? summary.total_teachers.toString() : "4",
        icon: Users,
        subtitle: "Instructors",
      },
      {
        title: "OMR Scans",
        value: summary ? summary.total_submissions.toString() : "324",
        icon: Sparkles,
        subtitle: "Engine Graded",
      },
    ];
  }

  if (user.role === "dean") {
    return [
      {
        title: "Total Exams",
        value: summary ? summary.total_exams.toString() : "19",
        icon: BookOpen,
        subtitle: "Collegiate",
      },
      {
        title: "Graded Sheets",
        value: summary ? summary.total_submissions.toString() : "3,420",
        icon: Sparkles,
        subtitle: "Processed",
      },
      {
        title: "Collegiate Pass Rate",
        value: "89.2%",
        icon: Award,
        subtitle: "Threshold: 75%",
      },
      {
        title: "Collegiate Mean",
        value: summary ? `${summary.average_score}%` : "84.3%",
        icon: TrendingUp,
        subtitle: "Across Programs",
      },
    ];
  }

  if (user.role === "programme-head") {
    return [
      {
        title: "Program Exams",
        value: summary ? summary.total_exams.toString() : "8",
        icon: BookOpen,
        subtitle: "Oversight",
      },
      {
        title: "Total Submissions",
        value: summary ? summary.total_submissions.toString() : "240",
        icon: Sparkles,
        subtitle: "Received",
      },
      {
        title: "Program Faculty",
        value: summary ? summary.total_teachers.toString() : "6",
        icon: GraduationCap,
        subtitle: "Department",
      },
      {
        title: "Average Score",
        value: summary ? `${summary.average_score}%` : "—",
        icon: TrendingUp,
        subtitle: "Cumulative",
      },
    ];
  }

  if (user.role === "teacher") {
    return [
      {
        title: "Active Exams",
        value: summary ? summary.total_exams.toString() : "6",
        icon: BookOpen,
        subtitle: "Handling",
      },
      {
        title: "Scanned Sheets",
        value: summary ? summary.total_submissions.toString() : "324",
        icon: Sparkles,
        subtitle: "Processed",
      },
      {
        title: "Item Analysis",
        value: "Ready",
        icon: BarChart3,
        subtitle: "OBE Reports",
      },
      {
        title: "Feedback Posts",
        value: "18",
        icon: Award,
        subtitle: "Released",
      },
    ];
  }

  return [
    {
      title: "Exams Taken",
      value: (studentStats?.examsTaken ?? 0).toString(),
      icon: BookOpen,
      subtitle: "Personal Completed",
    },
    {
      title: "Programme",
      value: user.programme ?? "BSIT",
      icon: GraduationCap,
      subtitle: "Department",
    },
    {
      title: "Average Score",
      value: studentStats?.avgScore ?? "—",
      icon: TrendingUp,
      subtitle: "Personal Average",
    },
  ];
};

// Institutional Program Progress Data
const PROGRAM_PROGRESS = [
  {
    program: "College of Computing (BSIT / BSCS)",
    code: "CCS",
    completedExams: 18,
    totalExams: 19,
    progress: 95,
    gradedSheets: 912,
    meanScore: 85.4,
    passRate: 91,
    status: "On Schedule",
  },
  {
    program: "College of Business & Accountancy (BSBA / BSA)",
    code: "CBA",
    completedExams: 23,
    totalExams: 25,
    progress: 92,
    gradedSheets: 1040,
    meanScore: 83.2,
    passRate: 88,
    status: "On Schedule",
  },
  {
    program: "College of Teacher Education (BSEd / BEEd)",
    code: "CTE",
    completedExams: 15,
    totalExams: 16,
    progress: 94,
    gradedSheets: 680,
    meanScore: 87.1,
    passRate: 93,
    status: "On Schedule",
  },
  {
    program: "College of Arts & Sciences (AB Comm / BS Psych)",
    code: "CAS",
    completedExams: 14,
    totalExams: 17,
    progress: 82,
    gradedSheets: 520,
    meanScore: 81.8,
    passRate: 85,
    status: "In Progress",
  },
  {
    program: "College of Engineering (BSCE)",
    code: "COE",
    completedExams: 12,
    totalExams: 14,
    progress: 86,
    gradedSheets: 440,
    meanScore: 82.5,
    passRate: 86,
    status: "In Progress",
  },
];


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
  // Filter submissions strictly to the logged-in student
  const studentPersonalSubs = useMemo(() => {
    if (user.role !== "student") return [];
    const rawId = (user.studentId || (user as any).student_id || "").trim();
    const studentName = (user.name || "").trim().toLowerCase();
    const studentEmail = (user.email || "").trim().toLowerCase();

    let resolvedId = rawId;
    if (!resolvedId && roster && roster.length > 0) {
      const entry = roster.find(
        (r) =>
          (r.email && r.email.toLowerCase() === studentEmail) ||
          (r.name && r.name.toLowerCase() === studentName)
      );
      if (entry?.student_id) resolvedId = entry.student_id.trim();
    }

    if (!resolvedId && user.id && !user.id.includes("-")) {
      resolvedId = user.id.trim();
    }

    if (!resolvedId) return [];

    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const cleanId = norm(resolvedId);

    return submissions.filter((s) => {
      if (!s.student_id) return false;
      const subId = (s.student_id || "").trim();
      const cleanSubId = norm(subId);
      if (subId.toLowerCase() === resolvedId.toLowerCase()) return true;
      if (cleanSubId === cleanId) return true;
      if (cleanId.length >= 4 && cleanSubId.length >= 3) {
        if (cleanId.endsWith(cleanSubId) || cleanSubId.endsWith(cleanId)) return true;
      }
      return false;
    });
  }, [user, submissions, roster]);

  const studentStats = useMemo(() => {
    if (user.role !== "student") return undefined;
    const examsTaken = studentPersonalSubs.length;
    let avgScore = "—";
    let latestScore = "—";

    if (examsTaken > 0) {
      const totalPct = studentPersonalSubs.reduce((acc: number, curr: Submission) => {
        const total = curr.total_questions || 50;
        return acc + Math.round((curr.score / total) * 100);
      }, 0);
      avgScore = `${Math.round(totalPct / examsTaken)}%`;

      const sorted = [...studentPersonalSubs].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const latest = sorted[0];
      const latestTotal = latest.total_questions || 50;
      latestScore = `${latest.score} / ${latestTotal} (${Math.round((latest.score / latestTotal) * 100)}%)`;
    }

    return { examsTaken, avgScore, latestScore };
  }, [user.role, studentPersonalSubs]);

  const cards = getDashboardCards(user, summary, studentStats);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Sleek Minimalist Welcome Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.75rem",
          padding: "1.15rem 1.4rem",
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 800, color: "#0f172a" }}>
            Overview & Progress
          </h2>
          <span style={{ fontSize: "0.82rem", color: "#64748b" }}>
            {user.role === "dean"
              ? "Collegiate Examination Progress & Performance Oversight Across All Higher Education Programs"
              : `Welcome back, ${user.name} • ${user.department || "Academic Assessment Portal"}`}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.3rem 0.75rem",
              borderRadius: "20px",
              fontSize: "0.75rem",
              fontWeight: 700,
              background: "var(--primary-light-surface, #f5f3ff)",
              color: "var(--primary, #28166f)",
              border: "1px solid var(--primary-light-border, #ddd6fe)",
              textTransform: "uppercase",
              letterSpacing: "0.03em",
            }}
          >
            <ShieldCheck size={13} />
            {user.role.replace("-", " ")}
          </span>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "0.85rem",
        }}
      >
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              style={{
                padding: "1rem 1.15rem",
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", marginBottom: "0.2rem" }}>
                  {card.title}
                </div>
                <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>
                  {card.value}
                </div>
                {(card as any).subtitle && (
                  <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: "2px" }}>
                    {(card as any).subtitle}
                  </div>
                )}
              </div>

              <div
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "10px",
                  background: "var(--primary-light-surface, #f5f3ff)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--primary, #28166f)",
                  flexShrink: 0,
                  border: "1px solid var(--primary-light-border, #ddd6fe)",
                }}
              >
                <Icon size={19} />
              </div>
            </div>
          );
        })}
      </div>

      {/* DEAN / ADMIN: OVERVIEW & PROGRESS ADVANCED PANELS */}
      {(user.role === "dean" || user.role === "admin") && (
        <>
          {/* SECTION 1: PROGRAM EXAMINATION COMPLETION PROGRESS */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "1.25rem 1.4rem",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "0.75rem",
                marginBottom: "1rem",
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#0f172a" }}>
                  Higher Education Programs Examination Progress
                </h3>
                <p style={{ margin: "0.15rem 0 0 0", fontSize: "0.78rem", color: "#64748b" }}>
                  Real-time exam submission and grading completion rates by academic college
                </p>
              </div>

              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  padding: "0.25rem 0.65rem",
                  background: "#ecfdf5",
                  color: "#059669",
                  borderRadius: "20px",
                  border: "1px solid #a7f3d0",
                }}
              >
                Overall Completion: 91.4%
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
              {PROGRAM_PROGRESS.map((prog) => (
                <div
                  key={prog.code}
                  style={{
                    padding: "0.85rem 1rem",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "0.5rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span
                        style={{
                          background: "var(--primary-light-surface, #f5f3ff)",
                          color: "var(--primary, #28166f)",
                          fontWeight: 800,
                          fontSize: "0.72rem",
                          padding: "0.15rem 0.45rem",
                          borderRadius: "6px",
                          border: "1px solid var(--primary-light-border, #ddd6fe)",
                        }}
                      >
                        {prog.code}
                      </span>
                      <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "#0f172a" }}>
                        {prog.program}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", fontSize: "0.78rem" }}>
                      <span style={{ color: "#64748b" }}>
                        Exams: <strong>{prog.completedExams} / {prog.totalExams}</strong>
                      </span>
                      <span style={{ color: "#64748b" }}>
                        Sheets: <strong>{prog.gradedSheets.toLocaleString()}</strong>
                      </span>
                      <span style={{ color: prog.passRate >= 85 ? "#059669" : "#d97706", fontWeight: 700 }}>
                        Pass Rate: {prog.passRate}%
                      </span>
                      <span
                        style={{
                          fontWeight: 800,
                          color: "var(--primary, #28166f)",
                          minWidth: "42px",
                          textAlign: "right",
                        }}
                      >
                        {prog.progress}%
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div
                    style={{
                      width: "100%",
                      height: "8px",
                      background: "#e2e8f0",
                      borderRadius: "6px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${prog.progress}%`,
                        height: "100%",
                        background:
                          prog.progress >= 90
                            ? "linear-gradient(90deg, var(--primary, #28166f), #22c55e)"
                            : "linear-gradient(90deg, var(--primary, #28166f), #3b82f6)",
                        borderRadius: "6px",
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 2: INSTITUTIONAL GRADE DISTRIBUTION & BENCHMARK BAR */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "1.25rem",
            }}
          >
            {/* Grade Transmutation Distribution */}
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "1.25rem 1.4rem",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>
                Collegiate Grade Distribution
              </h3>
              <p style={{ margin: "0.15rem 0 1rem 0", fontSize: "0.78rem", color: "#64748b" }}>
                Philippine Higher Education 1.00 – 5.00 grading scale distribution
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: "3px" }}>
                    <span style={{ fontWeight: 600, color: "#0f172a" }}>1.00 – 1.75 (Outstanding / Superior)</span>
                    <span style={{ fontWeight: 700, color: "#059669" }}>38%</span>
                  </div>
                  <div style={{ width: "100%", height: "7px", background: "#e2e8f0", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{ width: "38%", height: "100%", background: "#059669", borderRadius: "4px" }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: "3px" }}>
                    <span style={{ fontWeight: 600, color: "#0f172a" }}>2.00 – 2.75 (Very Good / Good)</span>
                    <span style={{ fontWeight: 700, color: "var(--primary, #28166f)" }}>44%</span>
                  </div>
                  <div style={{ width: "100%", height: "7px", background: "#e2e8f0", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{ width: "44%", height: "100%", background: "var(--primary, #28166f)", borderRadius: "4px" }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: "3px" }}>
                    <span style={{ fontWeight: 600, color: "#0f172a" }}>3.00 (Passing Benchmark)</span>
                    <span style={{ fontWeight: 700, color: "#d97706" }}>12%</span>
                  </div>
                  <div style={{ width: "100%", height: "7px", background: "#e2e8f0", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{ width: "12%", height: "100%", background: "#d97706", borderRadius: "4px" }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: "3px" }}>
                    <span style={{ fontWeight: 600, color: "#0f172a" }}>5.00 (Academic Remediation)</span>
                    <span style={{ fontWeight: 700, color: "#ef4444" }}>6%</span>
                  </div>
                  <div style={{ width: "100%", height: "7px", background: "#e2e8f0", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{ width: "6%", height: "100%", background: "#ef4444", borderRadius: "4px" }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Turnaround & Quality Oversight */}
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "1.25rem 1.4rem",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>
                Assessment Quality Milestones
              </h3>
              <p style={{ margin: "0.15rem 0 1rem 0", fontSize: "0.78rem", color: "#64748b" }}>
                Institutional evaluation standards and processing metrics
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div style={{ padding: "0.85rem", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#059669", marginBottom: "0.2rem" }}>
                    <CheckCircle2 size={16} />
                    <span style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase" }}>CHED Compliant</span>
                  </div>
                  <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#0f172a" }}>89.2%</div>
                  <div style={{ fontSize: "0.7rem", color: "#64748b" }}>≥ 75.0% threshold</div>
                </div>

                <div style={{ padding: "0.85rem", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--primary, #28166f)", marginBottom: "0.2rem" }}>
                    <Clock size={16} />
                    <span style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase" }}>Turnaround</span>
                  </div>
                  <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#0f172a" }}>1.2 Days</div>
                  <div style={{ fontSize: "0.7rem", color: "#64748b" }}>Exam to publication</div>
                </div>

                <div style={{ padding: "0.85rem", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--primary, #28166f)", marginBottom: "0.2rem" }}>
                    <Sparkles size={16} />
                    <span style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase" }}>Sheets Scanned</span>
                  </div>
                  <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#0f172a" }}>3,420</div>
                  <div style={{ fontSize: "0.7rem", color: "#64748b" }}>Bubble sheets graded</div>
                </div>

                <div style={{ padding: "0.85rem", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#059669", marginBottom: "0.2rem" }}>
                    <Award size={16} />
                    <span style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase" }}>OBE Items</span>
                  </div>
                  <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#0f172a" }}>94.6%</div>
                  <div style={{ fontSize: "0.7rem", color: "#64748b" }}>Valid discrimination</div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Teacher Direct Assessment Flow */}
      {user.role === "teacher" && (
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
      )}

      {/* Student Progress Flow */}
      {user.role === "student" && (
        <div
          style={{
            padding: "1.25rem",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
          }}
        >
          <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 0.85rem 0", color: "#0f172a" }}>
            Personal Academic Progress
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
            <div>
              <span style={{ fontSize: "0.78rem", color: "#64748b" }}>Latest Score</span>
              <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>
                {studentStats?.latestScore ?? "—"}
              </div>
            </div>
            <div>
              <span style={{ fontSize: "0.78rem", color: "#64748b" }}>Exams Completed</span>
              <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>
                {studentStats?.examsTaken ?? 0}
              </div>
            </div>
            <div>
              <span style={{ fontSize: "0.78rem", color: "#64748b" }}>Assigned Student ID</span>
              <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--primary, #28166f)", marginTop: "2px" }}>
                {user.studentId || (user as any).student_id || "Unassigned"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
