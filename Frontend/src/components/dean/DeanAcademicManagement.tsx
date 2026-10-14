import { useState } from "react";
import {
  GraduationCap,
  Users,
  BookOpen,
  Search,
  TrendingUp,
  ChevronRight,
  X,
  FileSpreadsheet,
} from "lucide-react";
import type { AuthUser, Exam, Submission, StudentRosterEntry } from "../../types";
import { exportCompleteDatabaseExcel } from "../../utils/excelUtils";

interface DeanAcademicManagementProps {
  currentUser: AuthUser;
  summary?: {
    total_accounts: number;
    total_students: number;
    total_teachers: number;
    total_exams: number;
    average_score: number;
    total_submissions: number;
  };
  exams: Exam[];
  submissions: Submission[];
  roster: StudentRosterEntry[];
  onInspectExam?: (exam: Exam) => void;
  addToast: (type: "success" | "error" | "info", message: string) => void;
}

interface DepartmentData {
  id: string;
  name: string;
  code: string;
  chair: string;
  chairEmail: string;
  programmes: string[];
  students: number;
  faculty: number;
  activeExams: number;
  passingRate: number;
  obeCompliance: number;
  status: "Exemplary" | "Compliant" | "Review Required";
}

const DEPARTMENTS: DepartmentData[] = [
  {
    id: "dept-cc",
    name: "College of Computing & Information Studies",
    code: "CCIS",
    chair: "Prof. Ramon Cruz",
    chairEmail: "ramon.cruz@srcb.edu.ph",
    programmes: ["BS in Information Technology (BSIT)", "BS in Computer Science (BSCS)"],
    students: 620,
    faculty: 24,
    activeExams: 38,
    passingRate: 88.4,
    obeCompliance: 96,
    status: "Exemplary",
  },
  {
    id: "dept-cba",
    name: "College of Business & Accountancy",
    code: "CBA",
    chair: "Dr. Ernesto Valenzuela",
    chairEmail: "e.valenzuela@srcb.edu.ph",
    programmes: ["BS in Business Administration (BSBA)", "BS in Accountancy (BSA)"],
    students: 780,
    faculty: 32,
    activeExams: 44,
    passingRate: 83.2,
    obeCompliance: 92,
    status: "Compliant",
  },
  {
    id: "dept-cte",
    name: "College of Teacher Education",
    code: "CTE",
    chair: "Dr. Teresa Manalo",
    chairEmail: "t.manalo@srcb.edu.ph",
    programmes: ["Bachelor of Secondary Education (BSEd)", "Bachelor of Elementary Education (BEEd)"],
    students: 510,
    faculty: 22,
    activeExams: 28,
    passingRate: 89.1,
    obeCompliance: 94,
    status: "Exemplary",
  },
  {
    id: "dept-cas",
    name: "College of Arts & Sciences",
    code: "CAS",
    chair: "Prof. Gabriel Mendoza",
    chairEmail: "g.mendoza@srcb.edu.ph",
    programmes: ["AB in Communication", "BS in Applied Psychology"],
    students: 274,
    faculty: 18,
    activeExams: 18,
    passingRate: 81.5,
    obeCompliance: 88,
    status: "Compliant",
  },
];

export default function DeanAcademicManagement({
  summary,
  exams,
  submissions,
  roster,
  addToast,
}: DeanAcademicManagementProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [exporting, setExporting] = useState(false);

  const totalStudents = summary?.total_students || 2184;
  const totalFaculty = summary?.total_teachers || 96;
  const totalExamsCount = summary?.total_exams || exams.length || 128;
  const avgScore = summary?.average_score ? `${summary.average_score}%` : "84.6%";

  const handleExportDatabase = async () => {
    setExporting(true);
    try {
      exportCompleteDatabaseExcel(exams, submissions, roster);
      addToast("success", "Institutional Academic Directory successfully exported (.xlsx).");
    } catch {
      addToast("error", "Failed to generate Excel export.");
    } finally {
      setExporting(false);
    }
  };

  const filteredDepartments = DEPARTMENTS.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.chair.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      {/* 4 CORE EXECUTIVE KPI CARDS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "1rem",
        }}
      >
        <div
          style={{
            padding: "1.15rem 1.25rem",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #6366f1, #a855f7)" }} />
          <div>
            <div style={{ fontSize: "0.76rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.25rem" }}>
              Total Students
            </div>
            <div style={{ fontSize: "1.55rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {totalStudents.toLocaleString()}
            </div>
            <div style={{ fontSize: "0.74rem", color: "#64748b", marginTop: "0.3rem" }}>
              Across 4 Academic Divisions
            </div>
          </div>
          <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "var(--primary-light-surface, #f5f3ff)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary, #28166f)", flexShrink: 0 }}>
            <GraduationCap size={20} />
          </div>
        </div>

        <div
          style={{
            padding: "1.15rem 1.25rem",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #3b82f6, #06b6d4)" }} />
          <div>
            <div style={{ fontSize: "0.76rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.25rem" }}>
              Faculty Members
            </div>
            <div style={{ fontSize: "1.55rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {totalFaculty}
            </div>
            <div style={{ fontSize: "0.74rem", color: "#64748b", marginTop: "0.3rem" }}>
              Instructors & Department Chairs
            </div>
          </div>
          <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", color: "#16a34a", flexShrink: 0 }}>
            <Users size={20} />
          </div>
        </div>

        <div
          style={{
            padding: "1.15rem 1.25rem",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #f59e0b, #ef4444)" }} />
          <div>
            <div style={{ fontSize: "0.76rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.25rem" }}>
              Collegiate Exams
            </div>
            <div style={{ fontSize: "1.55rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {totalExamsCount}
            </div>
            <div style={{ fontSize: "0.74rem", color: "#64748b", marginTop: "0.3rem" }}>
              Active Graded Batches
            </div>
          </div>
          <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", color: "#d97706", flexShrink: 0 }}>
            <BookOpen size={20} />
          </div>
        </div>

        <div
          style={{
            padding: "1.15rem 1.25rem",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #10b981, #059669)" }} />
          <div>
            <div style={{ fontSize: "0.76rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.25rem" }}>
              Institutional Mean
            </div>
            <div style={{ fontSize: "1.55rem", fontWeight: 800, color: "#10b981", lineHeight: 1.1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {avgScore}
            </div>
            <div style={{ fontSize: "0.74rem", color: "#64748b", marginTop: "0.3rem" }}>
              CHED Passing Benchmark: 75.0%
            </div>
          </div>
          <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981", flexShrink: 0 }}>
            <TrendingUp size={20} />
          </div>
        </div>
      </div>

      {/* SEARCH BAR & ACTIONS */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          borderBottom: "1px solid #e2e8f0",
          paddingBottom: "1rem",
        }}
      >
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <div style={{ position: "relative", minWidth: "260px" }}>
            <Search
              size={15}
              style={{
                position: "absolute",
                left: "0.85rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#94a3b8",
              }}
            />
            <input
              type="text"
              placeholder="Search department, faculty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input"
              style={{
                paddingLeft: "2.4rem",
                paddingRight: searchQuery ? "2rem" : "0.85rem",
                fontSize: "0.83rem",
                height: "38px",
                width: "100%",
                borderRadius: "10px",
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                color: "#0f172a",
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: "0.65rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  color: "#94a3b8",
                  display: "flex",
                  alignItems: "center",
                }}
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportDatabase}
            disabled={exporting}
            title={exporting ? "Exporting Directory..." : "Export Academic Directory (.xlsx)"}
            aria-label="Export Academic Directory (.xlsx)"
            style={{
              width: "38px",
              height: "38px",
              padding: 0,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "10px",
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              color: "var(--primary, #28166f)",
              cursor: exporting ? "not-allowed" : "pointer",
              boxShadow: "0 1px 2px rgba(0, 0, 0, 0.03)",
              transition: "all 0.2s ease",
              flexShrink: "0",

            }}
          >
            <FileSpreadsheet size={17} />
          </button>
        </div>
      </div>

      {/* COLLEGIATE DEPARTMENTS GRID */}
      <div style={{ display: "grid", gap: "1.25rem" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(440px, 1fr))",
              gap: "1.25rem",
            }}
          >
            {filteredDepartments.map((dept) => {
              const collegeAccent =
                dept.code === "CCIS"
                  ? { bar: "linear-gradient(90deg, #6366f1, #818cf8)", border: "#c7d2fe", bg: "#eef2ff", text: "#4338ca" }
                  : dept.code === "CBA"
                  ? { bar: "linear-gradient(90deg, #10b981, #34d399)", border: "#a7f3d0", bg: "#ecfdf5", text: "#065f46" }
                  : dept.code === "CTE"
                  ? { bar: "linear-gradient(90deg, #f59e0b, #fbbf24)", border: "#fde68a", bg: "#fffbeb", text: "#92400e" }
                  : { bar: "linear-gradient(90deg, #0284c7, #38bdf8)", border: "#bae6fd", bg: "#f0f9ff", text: "#0369a1" };

              const chairInitials = dept.chair
                .replace(/^(Dr\.|Prof\.|Ms\.|Mr\.)\s+/i, "")
                .split(/\s+/)
                .slice(0, 2)
                .map((n) => n[0])
                .join("")
                .toUpperCase();

              return (
                <div
                  key={dept.id}
                  className="card"
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "16px",
                    padding: "1.5rem",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
                    position: "relative",
                    overflow: "hidden",
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  }}
                >
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "4px", background: collegeAccent.bar }} />

                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: "1rem",
                        gap: "0.75rem",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.35rem" }}>
                          <span
                            style={{
                              background: collegeAccent.bg,
                              color: collegeAccent.text,
                              fontSize: "0.74rem",
                              fontWeight: 800,
                              padding: "0.2rem 0.6rem",
                              borderRadius: "6px",
                              border: `1px solid ${collegeAccent.border}`,
                              letterSpacing: "0.03em",
                            }}
                          >
                            {dept.code}
                          </span>
                          <span
                            className={`badge ${
                              dept.status === "Exemplary"
                                ? "badge-success"
                                : dept.status === "Compliant"
                                ? "badge-info"
                                : "badge-warning"
                            }`}
                            style={{
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.3rem",
                            }}
                          >
                            <span
                              style={{
                                width: "6px",
                                height: "6px",
                                borderRadius: "50%",
                                background: dept.status === "Exemplary" ? "#10b981" : dept.status === "Compliant" ? "#0284c7" : "#f59e0b",
                              }}
                            />
                            {dept.status}
                          </span>
                        </div>
                        <h3
                          style={{
                            margin: 0,
                            fontSize: "1.15rem",
                            fontWeight: 800,
                            color: "#0f172a",
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                            letterSpacing: "-0.01em",
                            lineHeight: 1.3,
                          }}
                        >
                          {dept.name}
                        </h3>
                      </div>
                    </div>

                    <div
                      style={{
                        padding: "0.85rem 1rem",
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "12px",
                        marginBottom: "1rem",
                        fontSize: "0.82rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.85rem",
                      }}
                    >
                      <div
                        style={{
                          width: "38px",
                          height: "38px",
                          borderRadius: "50%",
                          background: "var(--primary-light-surface, #f5f3ff)",
                          color: "var(--primary, #28166f)",
                          border: "1px solid var(--primary-light-border, #ddd6fe)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 800,
                          fontSize: "0.82rem",
                          flexShrink: 0,
                        }}
                      >
                        {chairInitials}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: "#64748b", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                          Academic Leadership & Chair
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.25rem", marginTop: "0.15rem" }}>
                          <strong style={{ color: "#0f172a", fontSize: "0.88rem" }}>{dept.chair}</strong>
                          <span style={{ color: "#64748b", fontSize: "0.76rem" }}>{dept.chairEmail}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ marginBottom: "1.1rem" }}>
                      <div style={{ color: "#64748b", fontSize: "0.74rem", marginBottom: "0.45rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                        Degree Programmes Under College:
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                        {dept.programmes.map((prog) => (
                          <div
                            key={prog}
                            style={{
                              fontSize: "0.82rem",
                              color: "#334155",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.45rem",
                              background: "#ffffff",
                              padding: "0.35rem 0.6rem",
                              borderRadius: "8px",
                              border: "1px solid #f1f5f9",
                            }}
                          >
                            <ChevronRight size={13} color="var(--primary, #28166f)" style={{ flexShrink: 0 }} />
                            <span style={{ fontWeight: 500 }}>{prog}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(4, 1fr)",
                        gap: "0.5rem",
                        paddingTop: "0.95rem",
                        borderTop: "1px solid #e2e8f0",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ padding: "0.45rem 0.25rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid #f1f5f9" }}>
                        <div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600 }}>Students</div>
                        <div style={{ fontWeight: 800, fontSize: "1rem", marginTop: "0.15rem", color: "#0f172a", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          {dept.students}
                        </div>
                      </div>
                      <div style={{ padding: "0.45rem 0.25rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid #f1f5f9" }}>
                        <div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600 }}>Faculty</div>
                        <div style={{ fontWeight: 800, fontSize: "1rem", marginTop: "0.15rem", color: "#0f172a", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          {dept.faculty}
                        </div>
                      </div>
                      <div style={{ padding: "0.45rem 0.25rem", background: "#ecfdf5", borderRadius: "8px", border: "1px solid #a7f3d0" }}>
                        <div style={{ fontSize: "0.7rem", color: "#065f46", fontWeight: 700 }}>Pass Rate</div>
                        <div style={{ fontWeight: 800, fontSize: "1rem", color: "#059669", marginTop: "0.15rem", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          {dept.passingRate}%
                        </div>
                      </div>
                      <div style={{ padding: "0.45rem 0.25rem", background: "var(--primary-light-surface, #f5f3ff)", borderRadius: "8px", border: "1px solid var(--primary-light-border, #ddd6fe)" }}>
                        <div style={{ fontSize: "0.7rem", color: "var(--primary, #28166f)", fontWeight: 700 }}>OBE QA</div>
                        <div style={{ fontWeight: 800, fontSize: "1rem", color: "var(--primary, #28166f)", marginTop: "0.15rem", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          {dept.obeCompliance}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
    </div>
  );
}
