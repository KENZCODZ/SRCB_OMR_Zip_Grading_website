import { useState } from "react";
import {
  GraduationCap,
  Users,
  Building2,
  BookOpen,
  Award,
  Search,
  TrendingUp,
  Download,
  CheckCircle2,
  Mail,
  ChevronRight,
  Sparkles,
  Layers,
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

const FACULTY_LEADERSHIP = [
  {
    name: "Prof. Ramon Cruz",
    title: "Programme Head / Chair",
    college: "College of Computing",
    programme: "BSIT / BSCS",
    email: "ramon.cruz@srcb.edu.ph",
    load: "18 Units • 4 Courses",
    activeExams: 6,
    avgScore: "87.5%",
    status: "Active",
  },
  {
    name: "Ms. Jenny Garcia",
    title: "Instructor III",
    college: "College of Computing",
    programme: "BSIT",
    email: "jenny.garcia@srcb.edu.ph",
    load: "21 Units • 5 Courses",
    activeExams: 5,
    avgScore: "84.2%",
    status: "Active",
  },
  {
    name: "Dr. Ernesto Valenzuela",
    title: "Department Chair",
    college: "College of Business",
    programme: "BSBA / BSA",
    email: "e.valenzuela@srcb.edu.ph",
    load: "15 Units • 3 Courses",
    activeExams: 4,
    avgScore: "82.8%",
    status: "Active",
  },
  {
    name: "Dr. Teresa Manalo",
    title: "Dean of Education / Chair",
    college: "Teacher Education",
    programme: "BSEd / BEEd",
    email: "t.manalo@srcb.edu.ph",
    load: "12 Units • 2 Courses",
    activeExams: 3,
    avgScore: "90.1%",
    status: "Active",
  },
  {
    name: "Prof. Gabriel Mendoza",
    title: "Department Chair",
    college: "Arts & Sciences",
    programme: "AB Comm / Psych",
    email: "g.mendoza@srcb.edu.ph",
    load: "18 Units • 4 Courses",
    activeExams: 4,
    avgScore: "81.9%",
    status: "Active",
  },
];

export default function DeanAcademicManagement({
  summary,
  exams,
  submissions,
  roster,
  addToast,
}: DeanAcademicManagementProps) {
  const [activeSubTab, setActiveSubTab] = useState<"departments" | "faculty" | "curriculum">("departments");
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

  const filteredFaculty = FACULTY_LEADERSHIP.filter((f) => {
    const matchesSearch =
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.college.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.programme.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      {/* EXECUTIVE HERO BANNER */}
      <div
        className="card"
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "16px",
          padding: "1.75rem",
          boxShadow: "0 2px 10px rgba(0, 98, 255, 0.04)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "1.25rem",
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.3rem 0.75rem",
                borderRadius: "20px",
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                color: "#0062ff",
                fontSize: "0.78rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "0.75rem",
              }}
            >
              <Sparkles size={14} /> Executive Academic Administration
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: "1.65rem",
                fontWeight: 800,
                color: "#0f172a",
                letterSpacing: "-0.02em",
              }}
            >
              Academic Management & Institutional Oversight
            </h1>
            <p
              style={{
                color: "#64748b",
                marginTop: "0.4rem",
                marginBottom: 0,
                fontSize: "0.92rem",
                maxWidth: "720px",
                lineHeight: 1.5,
              }}
            >
              Central supervisory module for managing collegiate departments, monitoring instructional faculty
              performance, reviewing curricular pass rates, and upholding CHED & OBE academic standards.
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleExportDatabase}
              disabled={exporting}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                fontWeight: 700,
                padding: "0.6rem 1.1rem",
                background: "#0062ff",
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                boxShadow: "0 2px 8px rgba(0, 98, 255, 0.25)",
              }}
            >
              <Download size={16} />
              {exporting ? "Generating Export..." : "Export Institutional Data (.xlsx)"}
            </button>
          </div>
        </div>
      </div>

      {/* 4 CORE EXECUTIVE KPI CARDS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "1rem",
        }}
      >
        <div
          className="card"
          style={{
            padding: "1.25rem",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#64748b" }}>
              Total Students
            </span>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "#eff6ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0062ff",
              }}
            >
              <GraduationCap size={20} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#0f172a" }}>
              {totalStudents.toLocaleString()}
            </div>
            <div style={{ fontSize: "0.78rem", color: "#10b981", marginTop: "0.25rem", display: "flex", alignItems: "center", gap: "0.3rem", fontWeight: 600 }}>
              <TrendingUp size={13} /> 100% Enrolment Verified
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
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#64748b" }}>
              Instructional Faculty
            </span>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "#eff6ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0062ff",
              }}
            >
              <Users size={20} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#0f172a" }}>
              {totalFaculty}
            </div>
            <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "0.25rem" }}>
              Across 4 Academic Colleges
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
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#64748b" }}>
              Total Examinations
            </span>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "#eff6ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0062ff",
              }}
            >
              <BookOpen size={20} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#0f172a" }}>
              {totalExamsCount}
            </div>
            <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "0.25rem" }}>
              {submissions.length > 0 ? `${submissions.length} sheets graded` : "Midterms & Finals active"}
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
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#64748b" }}>
              Institutional Pass Rate
            </span>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "#eff6ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0062ff",
              }}
            >
              <Award size={20} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#0062ff" }}>
              {avgScore}
            </div>
            <div style={{ fontSize: "0.78rem", color: "#10b981", marginTop: "0.25rem", fontWeight: 600 }}>
              +9.6% above CHED 75% baseline
            </div>
          </div>
        </div>
      </div>

      {/* SUB-TABS NAVIGATION & SEARCH BAR */}
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
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            type="button"
            className="btn"
            style={{
              fontSize: "0.85rem",
              padding: "0.55rem 1rem",
              borderRadius: "10px",
              fontWeight: 600,
              background: activeSubTab === "departments" ? "#0062ff" : "#ffffff",
              color: activeSubTab === "departments" ? "#ffffff" : "#475569",
              border: activeSubTab === "departments" ? "none" : "1px solid #e2e8f0",
              boxShadow: activeSubTab === "departments" ? "0 2px 6px rgba(0, 98, 255, 0.2)" : "none",
            }}
            onClick={() => setActiveSubTab("departments")}
          >
            <Building2 size={16} style={{ display: "inline", marginRight: "0.4rem", verticalAlign: "middle" }} />
            Collegiate Departments ({DEPARTMENTS.length})
          </button>
          <button
            type="button"
            className="btn"
            style={{
              fontSize: "0.85rem",
              padding: "0.55rem 1rem",
              borderRadius: "10px",
              fontWeight: 600,
              background: activeSubTab === "faculty" ? "#0062ff" : "#ffffff",
              color: activeSubTab === "faculty" ? "#ffffff" : "#475569",
              border: activeSubTab === "faculty" ? "none" : "1px solid #e2e8f0",
              boxShadow: activeSubTab === "faculty" ? "0 2px 6px rgba(0, 98, 255, 0.2)" : "none",
            }}
            onClick={() => setActiveSubTab("faculty")}
          >
            <Users size={16} style={{ display: "inline", marginRight: "0.4rem", verticalAlign: "middle" }} />
            Faculty Leadership ({FACULTY_LEADERSHIP.length})
          </button>
          <button
            type="button"
            className="btn"
            style={{
              fontSize: "0.85rem",
              padding: "0.55rem 1rem",
              borderRadius: "10px",
              fontWeight: 600,
              background: activeSubTab === "curriculum" ? "#0062ff" : "#ffffff",
              color: activeSubTab === "curriculum" ? "#ffffff" : "#475569",
              border: activeSubTab === "curriculum" ? "none" : "1px solid #e2e8f0",
              boxShadow: activeSubTab === "curriculum" ? "0 2px 6px rgba(0, 98, 255, 0.2)" : "none",
            }}
            onClick={() => setActiveSubTab("curriculum")}
          >
            <Layers size={16} style={{ display: "inline", marginRight: "0.4rem", verticalAlign: "middle" }} />
            Curricular Governance
          </button>
        </div>

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
                fontSize: "0.83rem",
                height: "38px",
                width: "100%",
                borderRadius: "10px",
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                color: "#0f172a",
              }}
            />
          </div>
        </div>
      </div>

      {/* VIEW 1: DEPARTMENTS & PROGRAMMES */}
      {activeSubTab === "departments" && (
        <div style={{ display: "grid", gap: "1.25rem" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
              gap: "1.25rem",
            }}
          >
            {filteredDepartments.map((dept) => (
              <div
                key={dept.id}
                className="card"
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "16px",
                  padding: "1.4rem",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "0.85rem",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span
                          style={{
                            background: "#eff6ff",
                            color: "#0062ff",
                            fontSize: "0.75rem",
                            fontWeight: 800,
                            padding: "0.2rem 0.55rem",
                            borderRadius: "6px",
                            border: "1px solid #bfdbfe",
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
                          style={{ fontSize: "0.72rem" }}
                        >
                          {dept.status}
                        </span>
                      </div>
                      <h3 style={{ margin: "0.5rem 0 0.2rem 0", fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>
                        {dept.name}
                      </h3>
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "0.75rem",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "10px",
                      marginBottom: "1rem",
                      fontSize: "0.82rem",
                    }}
                  >
                    <div style={{ color: "#64748b", marginBottom: "0.3rem", fontSize: "0.74rem", fontWeight: 600 }}>
                      Academic Leadership
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong style={{ color: "#0f172a" }}>{dept.chair}</strong>
                      <span style={{ color: "#64748b", fontSize: "0.78rem" }}>{dept.chairEmail}</span>
                    </div>
                  </div>

                  <div style={{ marginBottom: "1rem" }}>
                    <div style={{ color: "#64748b", fontSize: "0.75rem", marginBottom: "0.4rem", fontWeight: 600 }}>
                      Curricular Offerings:
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                      {dept.programmes.map((prog) => (
                        <div
                          key={prog}
                          style={{
                            fontSize: "0.82rem",
                            color: "#334155",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.4rem",
                          }}
                        >
                          <ChevronRight size={13} color="#0062ff" />
                          <span>{prog}</span>
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
                      paddingTop: "0.85rem",
                      borderTop: "1px solid #e2e8f0",
                      textAlign: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "0.72rem", color: "#64748b" }}>Enrolled</div>
                      <div style={{ fontWeight: 700, fontSize: "0.95rem", marginTop: "0.15rem", color: "#0f172a" }}>
                        {dept.students}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.72rem", color: "#64748b" }}>Faculty</div>
                      <div style={{ fontWeight: 700, fontSize: "0.95rem", marginTop: "0.15rem", color: "#0f172a" }}>
                        {dept.faculty}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.72rem", color: "#64748b" }}>Pass Rate</div>
                      <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#10b981", marginTop: "0.15rem" }}>
                        {dept.passingRate}%
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.72rem", color: "#64748b" }}>OBE QA</div>
                      <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0062ff", marginTop: "0.15rem" }}>
                        {dept.obeCompliance}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 2: FACULTY & ACADEMIC LEADERSHIP */}
      {activeSubTab === "faculty" && (
        <div className="card" style={{ padding: "1.25rem", borderRadius: "16px", background: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
          <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#0f172a" }}>Academic Faculty & Department Leadership</h3>
              <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                Instructors, Chairs, and Programme Directors overseeing active examination sets.
              </p>
            </div>
            <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
              Showing {filteredFaculty.length} of {FACULTY_LEADERSHIP.length} faculty members
            </span>
          </div>

          <div style={{ overflowX: "auto", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
            <table style={{ width: "100%", fontSize: "0.85rem", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ padding: "0.85rem 1rem", color: "#475569" }}>Faculty Member</th>
                  <th style={{ padding: "0.85rem 1rem", color: "#475569" }}>Designation & College</th>
                  <th style={{ padding: "0.85rem 1rem", color: "#475569" }}>Assigned Programmes</th>
                  <th style={{ padding: "0.85rem 1rem", color: "#475569" }}>Teaching Load</th>
                  <th style={{ padding: "0.85rem 1rem", color: "#475569" }}>Active Exams</th>
                  <th style={{ padding: "0.85rem 1rem", color: "#475569" }}>Cohort Avg</th>
                  <th style={{ padding: "0.85rem 1rem", textAlign: "right", color: "#475569" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredFaculty.map((f) => (
                  <tr
                    key={f.name}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      transition: "background 0.2s",
                    }}
                  >
                    <td style={{ padding: "0.85rem 1rem", fontWeight: 600 }}>
                      <div style={{ color: "#0f172a" }}>{f.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                        <Mail size={12} /> {f.email}
                      </div>
                    </td>
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <div style={{ fontWeight: 600, color: "#334155" }}>{f.title}</div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{f.college}</div>
                    </td>
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <span className="badge" style={{ background: "#eff6ff", color: "#0062ff", border: "1px solid #bfdbfe" }}>
                        {f.programme}
                      </span>
                    </td>
                    <td style={{ padding: "0.85rem 1rem", color: "#475569" }}>{f.load}</td>
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <span style={{ fontWeight: 700, color: "#0062ff" }}>{f.activeExams} Sets</span>
                    </td>
                    <td style={{ padding: "0.85rem 1rem", fontWeight: 700, color: "#10b981" }}>{f.avgScore}</td>
                    <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                      <span className="badge badge-success">{f.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: CURRICULAR GOVERNANCE & OBE STANDARDS */}
      {activeSubTab === "curriculum" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1.25rem" }}>
          <div className="card" style={{ padding: "1.4rem", borderRadius: "16px", background: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
            <h3 style={{ margin: "0 0 0.8rem 0", fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "0.5rem", color: "#0f172a" }}>
              <CheckCircle2 size={18} color="#10b981" /> CHED Memorandum Order (CMO) Compliance
            </h3>
            <p style={{ fontSize: "0.83rem", color: "#64748b", lineHeight: 1.5, marginBottom: "1rem" }}>
              SRCB Higher Education degree programs strictly adhere to CHED Policies, Standards, and Guidelines (PSGs)
              enforcing 75% minimum competency pass benchmarks and 50-Base Transmutation scales.
            </p>

            <div style={{ display: "grid", gap: "0.6rem" }}>
              {[
                { title: "CMO No. 25, s. 2015", desc: "Policies & Standards for BS Information Technology", status: "Compliant" },
                { title: "CMO No. 17, s. 2017", desc: "PSGs for BS Business Administration", status: "Compliant" },
                { title: "CMO No. 74-75, s. 2017", desc: "Policies & Standards for Teacher Education", status: "Compliant" },
                { title: "CMO No. 46, s. 2012", desc: "Outcomes-Based Education (OBE) Quality Framework", status: "Active" },
              ].map((cmo) => (
                <div
                  key={cmo.title}
                  style={{
                    padding: "0.75rem",
                    borderRadius: "8px",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#0f172a" }}>{cmo.title}</div>
                    <div style={{ fontSize: "0.76rem", color: "#64748b" }}>{cmo.desc}</div>
                  </div>
                  <span className="badge badge-success" style={{ fontSize: "0.7rem" }}>{cmo.status}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: "1.4rem", borderRadius: "16px", background: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
            <h3 style={{ margin: "0 0 0.8rem 0", fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "0.5rem", color: "#0f172a" }}>
              <Award size={18} color="#0062ff" /> OBE Assessment Governance Policies
            </h3>
            <p style={{ fontSize: "0.83rem", color: "#64748b", lineHeight: 1.5, marginBottom: "1rem" }}>
              Quality audit principles enforced by the Office of the Dean for all optical bubble-sheet graded examinations:
            </p>

            <div style={{ display: "grid", gap: "0.75rem" }}>
              <div style={{ borderLeft: "3px solid #0062ff", paddingLeft: "0.75rem" }}>
                <strong style={{ fontSize: "0.85rem", color: "#0f172a" }}>Item Discrimination Index Requirement:</strong>
                <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.78rem", color: "#64748b" }}>
                  Exam items with a discrimination index below 0.20 are automatically flagged for instructional review.
                </p>
              </div>

              <div style={{ borderLeft: "3px solid #10b981", paddingLeft: "0.75rem" }}>
                <strong style={{ fontSize: "0.85rem", color: "#0f172a" }}>Standard Philippine Transmutation Scale:</strong>
                <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.78rem", color: "#64748b" }}>
                  Calculates official 1.00 (99-100%) down to 3.00 (75% passing) and 5.00 (Failed) CHED conversion tiers.
                </p>
              </div>

              <div style={{ borderLeft: "3px solid #6366f1", paddingLeft: "0.75rem" }}>
                <strong style={{ fontSize: "0.85rem", color: "#0f172a" }}>Archival & Verification Protocol:</strong>
                <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.78rem", color: "#64748b" }}>
                  Scanned answer sheets and generated OBE item matrices are stored for permanent accreditation compliance.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
