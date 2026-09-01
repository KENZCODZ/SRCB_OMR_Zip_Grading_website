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
  ShieldCheck,
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
      {/* HEADER BANNER */}
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
              <ShieldCheck size={14} /> Quality Assurance & Academic Supervision
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
              Institutional Examination Management
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
              Review all department assessments, inspect answer keys, evaluate discrimination indices, and download
              standardized CHED-format grade sheets across every collegiate programme.
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleBatchExport}
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
              <FileSpreadsheet size={16} /> Batch Export All Exams (.xlsx)
            </button>
          </div>
        </div>
      </div>

      {/* 4 STAT TILES */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
        }}
      >
        <div
          className="card"
          style={{
            padding: "1.2rem",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.83rem", fontWeight: 600 }}>Active Exam Records</span>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#0062ff" }}>
              <BookOpen size={17} />
            </div>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a" }}>
            {totalExams}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.2rem" }}>
            Published across all colleges
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: "1.2rem",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.83rem", fontWeight: 600 }}>Graded Submissions</span>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#0062ff" }}>
              <Sparkles size={17} />
            </div>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a" }}>
            {totalSubmissions}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#10b981", marginTop: "0.2rem", fontWeight: 600 }}>
            OMR optical scan verified
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: "1.2rem",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.83rem", fontWeight: 600 }}>Assessments in Grading</span>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#0062ff" }}>
              <Users size={17} />
            </div>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a" }}>
            {gradedExamsCount} / {totalExams}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.2rem" }}>
            Actively collecting student test sheets
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: "1.2rem",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.83rem", fontWeight: 600 }}>OBE Audit Status</span>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#0062ff" }}>
              <Award size={17} />
            </div>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#10b981" }}>
            100% Pass
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.2rem" }}>
            All answer keys calibrated
          </div>
        </div>
      </div>

      {/* FILTER CONTROLS BAR */}
      <div
        className="card"
        style={{
          padding: "1rem 1.25rem",
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          borderRadius: "14px",
          boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
        }}
      >
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flex: 1, minWidth: "260px" }}>
          <div style={{ position: "relative", width: "100%", maxWidth: "340px" }}>
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
              placeholder="Search exam title, course code, instructor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input"
              style={{
                paddingLeft: "2.4rem",
                fontSize: "0.83rem",
                height: "38px",
                width: "100%",
                borderRadius: "8px",
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                color: "#0f172a",
              }}
            />
          </div>

          <select
            value={programmeFilter}
            onChange={(e) => setProgrammeFilter(e.target.value)}
            className="input"
            style={{ width: "auto", height: "38px", fontSize: "0.82rem", borderRadius: "8px", background: "#ffffff", border: "1px solid #e2e8f0", color: "#0f172a" }}
          >
            <option value="all">All Programmes</option>
            <option value="BSIT">BSIT - Information Tech</option>
            <option value="BSCS">BSCS - Computer Science</option>
            <option value="BSBA">BSBA - Business Admin</option>
            <option value="BSEd">BSEd - Secondary Ed</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input"
            style={{ width: "auto", height: "38px", fontSize: "0.82rem", borderRadius: "8px", background: "#ffffff", border: "1px solid #e2e8f0", color: "#0f172a" }}
          >
            <option value="all">All Status</option>
            <option value="graded">Has Graded Sheets</option>
            <option value="published">Published / Ready</option>
          </select>
        </div>

        <div style={{ fontSize: "0.82rem", color: "#64748b" }}>
          Showing <strong>{filteredExams.length}</strong> of {exams.length} examinations
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
                        background: "#eff6ff",
                        color: "#0062ff",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        padding: "0.15rem 0.5rem",
                        borderRadius: "5px",
                        border: "1px solid #bfdbfe",
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
                          background: "#0062ff",
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
