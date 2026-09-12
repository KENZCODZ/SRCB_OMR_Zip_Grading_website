import React, { useState } from "react";
import {
  BookOpen,
  Search,
  Eye,
  Download,
  FileSpreadsheet,
  Sparkles,
  Award,
  Users,
  ChevronDown,
} from "lucide-react";
import type { AuthUser, Exam, Submission, StudentRosterEntry } from "../../types";
import { exportExamBatchExcel, exportCompleteDatabaseExcel } from "../../utils/excelUtils";

interface DeanExaminationsProps {
  currentUser: AuthUser;
  exams: Exam[];
  submissions: Submission[];
  roster: StudentRosterEntry[];
  onInspectExam?: (exam: Exam) => void;
  addToast: (type: "success" | "error" | "info", message: string) => void;
  formatDate?: (iso: string) => string;
}

export default function DeanExaminations({
  exams,
  submissions,
  roster,
  onInspectExam,
  addToast,
  formatDate = (iso) => new Date(iso).toLocaleDateString(),
}: DeanExaminationsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [programmeFilter, setProgrammeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [exportingExamId, setExportingExamId] = useState<string | null>(null);

  // Derive active exam statistics
  const totalExams = exams.length;
  const totalSubmissions = submissions.length;
  const gradedExamsCount = exams.filter((e) =>
    submissions.some((s) => s.exam_id === e.id)
  ).length;

  const handleExportSingleExam = async (exam: Exam, e: React.MouseEvent) => {
    e.stopPropagation();
    setExportingExamId(exam.id);
    try {
      exportExamBatchExcel(exam, submissions, roster);
      addToast("success", `CHED Grade Sheet & OBE Analysis exported for "${exam.name}" (.xlsx)`);
    } catch {
      addToast("error", "Failed to export examination file.");
    } finally {
      setExportingExamId(null);
    }
  };

  const handleBatchExport = () => {
    try {
      exportCompleteDatabaseExcel(exams, submissions, roster);
      addToast("success", "Institutional Examination Performance Masterfile exported (.xlsx)");
    } catch {
      addToast("error", "Failed to export batch examination file.");
    }
  };

  const filteredExams = exams.filter((exam) => {
    const examName = exam.name || "";
    const examCode = exam.course_code || exam.subject || "";
    const examProg = exam.program || "";
    const examInst = exam.instructor_name || "";

    const matchesSearch =
      examName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      examCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      examProg.toLowerCase().includes(searchQuery.toLowerCase()) ||
      examInst.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesProgramme =
      programmeFilter === "all" ||
      examProg.toLowerCase() === programmeFilter.toLowerCase();

    const isGraded = submissions.some((s) => s.exam_id === exam.id);
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "graded" && isGraded) ||
      (statusFilter === "published" && !isGraded);

    return matchesSearch && matchesProgramme && matchesStatus;
  });

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      {/* HEADER BAR */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          padding: "1.25rem 1.5rem",
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "1.4rem",
              fontWeight: 800,
              color: "#0f172a",
              letterSpacing: "-0.02em",
            }}
          >
            Examinations
          </h1>
          <p
            style={{
              color: "#64748b",
              marginTop: "0.2rem",
              marginBottom: 0,
              fontSize: "0.82rem",
            }}
          >
            Collegiate assessments, answer keys, and standardized grade records
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={handleBatchExport}
          style={{
            fontSize: "0.82rem",
            padding: "0.45rem 1rem",
          }}
        >
          <FileSpreadsheet size={15} /> Batch Export (.xlsx)
        </button>
      </div>

      {/* 4 STAT TILES */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "0.85rem",
        }}
      >
        <div
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
            <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#64748b", marginBottom: "0.25rem" }}>
              Total Exams
            </div>
            <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>
              {totalExams}
            </div>
          </div>
          <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "var(--primary-light-surface, #f5f3ff)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary, #28166f)", flexShrink: 0 }}>
            <BookOpen size={18} />
          </div>
        </div>

        <div
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
            <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#64748b", marginBottom: "0.25rem" }}>
              Submissions
            </div>
            <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>
              {totalSubmissions}
            </div>
          </div>
          <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "var(--primary-light-surface, #f5f3ff)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary, #28166f)", flexShrink: 0 }}>
            <Sparkles size={18} />
          </div>
        </div>

        <div
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
            <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#64748b", marginBottom: "0.25rem" }}>
              Graded Exams
            </div>
            <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>
              {gradedExamsCount} / {totalExams}
            </div>
          </div>
          <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "var(--primary-light-surface, #f5f3ff)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary, #28166f)", flexShrink: 0 }}>
            <Users size={18} />
          </div>
        </div>

        <div
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
            <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#64748b", marginBottom: "0.25rem" }}>
              OBE Audit
            </div>
            <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#059669", lineHeight: 1.1 }}>
              Verified
            </div>
          </div>
          <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "var(--primary-light-surface, #f5f3ff)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary, #28166f)", flexShrink: 0 }}>
            <Award size={18} />
          </div>
        </div>
      </div>

      {/* FILTER CONTROLS BAR */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          padding: "1.25rem 1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.1rem",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.02)",
        }}
      >
        {/* Header Row: Title & Subtitle + Search & Count Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "var(--primary-light-surface, #f5f3ff)",
                color: "var(--primary, #28166f)",
                border: "1px solid var(--primary-light-border, #ddd6fe)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <BookOpen size={17} />
            </div>
            <div>
              <h3
                style={{
                  fontSize: "1.05rem",
                  fontWeight: 800,
                  color: "#0f172a",
                  margin: 0,
                  letterSpacing: "-0.01em",
                }}
              >
                Dean's Examination Directory
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.78rem",
                  color: "#64748b",
                  fontWeight: 500,
                }}
              >
                Monitor academic assessments, faculty submission coverage, and syllabus exams
              </p>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              flexWrap: "wrap",
              flex: "1 1 360px",
              justifyContent: "flex-end",
            }}
          >
            <div style={{ position: "relative", minWidth: "250px", flex: "1 1 250px" }}>
              <Search
                size={16}
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#64748b",
                }}
              />
              <input
                type="text"
                placeholder="Search exam title, course code, instructor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  height: "38px",
                  paddingLeft: "36px",
                  paddingRight: "12px",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  color: "#0f172a",
                  outline: "none",
                  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.03)",
                }}
              />
            </div>

            <span
              className="badge"
              style={{
                background: "var(--primary-light-surface, #f5f3ff)",
                color: "var(--primary, #28166f)",
                border: "1px solid var(--primary-light-border, #ddd6fe)",
                fontSize: "0.78rem",
                fontWeight: 700,
                padding: "0.45rem 0.75rem",
                borderRadius: "8px",
                height: "38px",
                display: "inline-flex",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              Showing {filteredExams.length} of {exams.length} Examinations
            </span>
          </div>
        </div>

        {/* Filter Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            gap: "0.85rem",
          }}
        >
          <div>
            <label
              style={{
                fontSize: "0.72rem",
                color: "#334155",
                fontWeight: 700,
                display: "block",
                marginBottom: "4px",
                textTransform: "uppercase",
                letterSpacing: "0.03em",
              }}
            >
              Program / Department
            </label>
            <div className="academic-select-wrapper">
              <select
                value={programmeFilter}
                onChange={(e) => setProgrammeFilter(e.target.value)}
                className="academic-select"
              >
                <option value="all">All Programmes</option>
                <option value="BSIT">BSIT - Information Tech</option>
                <option value="BSCS">BSCS - Computer Science</option>
                <option value="BSBA">BSBA - Business Admin</option>
                <option value="BSEd">BSEd - Secondary Ed</option>
              </select>
              <ChevronDown size={14} className="academic-select-arrow" />
            </div>
          </div>

          <div>
            <label
              style={{
                fontSize: "0.72rem",
                color: "#334155",
                fontWeight: 700,
                display: "block",
                marginBottom: "4px",
                textTransform: "uppercase",
                letterSpacing: "0.03em",
              }}
            >
              Grading Status
            </label>
            <div className="academic-select-wrapper">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="academic-select"
              >
                <option value="all">All Status</option>
                <option value="graded">Has Graded Sheets</option>
                <option value="published">Published / Ready</option>
              </select>
              <ChevronDown size={14} className="academic-select-arrow" />
            </div>
          </div>
        </div>
      </div>

      {/* EXAMS LIST TABLE & CARDS */}
      {filteredExams.length === 0 ? (
        <div
          className="card"
          style={{
            padding: "3rem 1.5rem",
            textAlign: "center",
            borderRadius: "16px",
            background: "#ffffff",
            border: "1px dashed #cbd5e1",
          }}
        >
          <BookOpen size={40} style={{ color: "#94a3b8", marginBottom: "0.75rem" }} />
          <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#0f172a" }}>No Examination Records Match Criteria</h3>
          <p style={{ margin: "0.35rem 0 0 0", fontSize: "0.85rem", color: "#64748b" }}>
            Try adjusting your search query or programme filter.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1rem" }}>
          {filteredExams.map((exam) => {
            const examSubs = submissions.filter((s) => s.exam_id === exam.id);
            const isProcessing = exportingExamId === exam.id;
            const totalItems = exam.num_items || Object.keys(exam.answer_key || {}).length || 50;

            const avgScore =
              examSubs.length > 0
                ? Math.round(
                    (examSubs.reduce((acc, curr) => acc + (curr.score / totalItems) * 100, 0) /
                      examSubs.length) *
                      10
                  ) / 10
                : null;

            return (
              <div
                key={exam.id}
                className="card"
                style={{
                  padding: "1.25rem 1.5rem",
                  borderRadius: "14px",
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "1rem",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
                  transition: "transform 0.15s, box-shadow 0.15s",
                }}
              >
                <div style={{ flex: 1, minWidth: "280px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                    <span
                      style={{
                        background: "var(--primary-light-surface, #f5f3ff)",
                        color: "var(--primary, #28166f)",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        padding: "0.15rem 0.5rem",
                        borderRadius: "5px",
                        border: "1px solid var(--primary-light-border, #ddd6fe)",
                      }}
                    >
                      {exam.program || "BSIT"}
                    </span>
                    {exam.course_code && (
                      <span
                        style={{
                          background: "#f1f5f9",
                          color: "#334155",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          padding: "0.15rem 0.5rem",
                          borderRadius: "5px",
                        }}
                      >
                        {exam.course_code}
                      </span>
                    )}
                    <span className="badge badge-success" style={{ fontSize: "0.7rem" }}>
                      OBE Verified
                    </span>
                  </div>

                  <h3 style={{ margin: "0.2rem 0 0.4rem 0", fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>
                    {exam.name}
                  </h3>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1.25rem",
                      fontSize: "0.78rem",
                      color: "#64748b",
                      flexWrap: "wrap",
                    }}
                  >
                    <span>
                      Faculty: <strong style={{ color: "#334155" }}>{exam.instructor_name || "Faculty"}</strong>
                    </span>
                    <span>
                      Items: <strong style={{ color: "#334155" }}>{totalItems} Questions</strong>
                    </span>
                    <span>
                      Date: <strong style={{ color: "#334155" }}>{formatDate(exam.created_at || new Date().toISOString())}</strong>
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
                  <div style={{ textAlign: "right", minWidth: "120px" }}>
                    <div style={{ fontSize: "0.74rem", color: "#64748b" }}>Graded Test Sheets</div>
                    <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a" }}>
                      {examSubs.length} <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Sheets</span>
                    </div>
                    {avgScore !== null && (
                      <div style={{ fontSize: "0.75rem", color: avgScore >= 75 ? "#10b981" : "#ef4444", fontWeight: 700 }}>
                        Mean: {avgScore}%
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    {onInspectExam && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => onInspectExam(exam)}
                        style={{
                          fontSize: "0.8rem",
                          padding: "0.45rem 0.85rem",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.4rem",
                          borderRadius: "8px",
                          background: "var(--primary, #28166f)",
                          color: "#ffffff",
                          border: "none",
                        }}
                      >
                        <Eye size={15} /> Inspect OBE Analysis
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={(e) => handleExportSingleExam(exam, e)}
                      disabled={isProcessing}
                      title="Export official CHED Grade Sheet in Excel"
                      style={{
                        fontSize: "0.8rem",
                        padding: "0.45rem 0.8rem",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        borderRadius: "8px",
                        background: "#ffffff",
                        color: "#0f172a",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <Download size={15} />
                      {isProcessing ? "Exporting..." : "CHED (.xlsx)"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
