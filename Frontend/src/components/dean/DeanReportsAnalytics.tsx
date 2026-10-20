import { useState, useMemo } from "react";
import {
  TrendingUp,
  Download,
  FileSpreadsheet,
  Award,
  ShieldCheck,
} from "lucide-react";
import type { AuthUser, Exam, Submission, StudentRosterEntry } from "../../types";
import { exportCompleteDatabaseExcel, exportExamBatchExcel } from "../../utils/excelUtils";

interface DeanReportsAnalyticsProps {
  currentUser: AuthUser;
  exams: Exam[];
  submissions: Submission[];
  roster: StudentRosterEntry[];
  summary?: {
    total_accounts: number;
    total_students: number;
    total_teachers: number;
    total_exams: number;
    average_score: number;
    total_submissions: number;
  };
  addToast: (type: "success" | "error" | "info", message: string) => void;
}

export default function DeanReportsAnalytics({
  currentUser,
  exams,
  submissions,
  roster,
  summary,
  addToast,
}: DeanReportsAnalyticsProps) {
  const [downloading, setDownloading] = useState(false);

  const isProgrammeHead = currentUser?.role === "programme-head";
  const userProgCode = (currentUser?.programme || "BSIT").trim().toUpperCase();

  const OFFICIAL_PROGRAMS_METADATA = useMemo(() => [
    {
      code: "BSIT",
      name: "Bachelor of Science in Information Technology",
      dept: "College of Computing Studies",
    },
    {
      code: "BSCRIM",
      name: "Bachelor of Science in Criminology",
      dept: "College of Criminal Justice Education",
    },
    {
      code: "BSHM",
      name: "Bachelor of Science in Hotel Management",
      dept: "College of Hospitality Management",
    },
    {
      code: "BSBA",
      name: "Bachelor of Science in Business Administration",
      dept: "College of Business Administration",
    },
    {
      code: "TEP",
      name: "Teacher Education Program",
      dept: "College of Teacher Education",
    },
  ], []);

  // Find all programs that CURRENTLY EXIST / ARE REGISTERED in the system:
  // For Dean & Administrator, all 5 official institutional degree programmes are always presented,
  // even if there is no data yet. For Programme Head, strictly scope to their assigned programme.
  const activeRegisteredPrograms = useMemo(() => {
    if (isProgrammeHead) {
      const cleanUserProg = userProgCode === "IT" ? "BSIT" : userProgCode;
      return OFFICIAL_PROGRAMS_METADATA.filter((p) => p.code === cleanUserProg);
    }
    return OFFICIAL_PROGRAMS_METADATA;
  }, [isProgrammeHead, userProgCode, OFFICIAL_PROGRAMS_METADATA]);

  // Overall metrics computed directly from real database submissions
  const overallMetrics = useMemo(() => {
    const totalSheets = submissions.length;
    let scoreSum = 0;
    let totalPossible = 0;
    let passCount = 0;

    submissions.forEach((s) => {
      const exam = exams.find((e) => e.id === s.exam_id);
      const totalItems = exam ? Object.keys(exam.answer_key || {}).length || 50 : 50;
      const passScore = exam?.passing_score ?? Math.ceil(totalItems * 0.6);
      if (s.score >= passScore) passCount++;
      scoreSum += s.score;
      totalPossible += totalItems;
    });

    const meanScore =
      summary?.average_score !== undefined && summary.total_submissions > 0 && !isProgrammeHead
        ? summary.average_score
        : totalPossible > 0
        ? parseFloat(((scoreSum / totalPossible) * 100).toFixed(1))
        : null;

    const passRate = totalSheets > 0 ? Math.round((passCount / totalSheets) * 100) : null;

    return {
      meanScore,
      passRate,
      totalSheets,
    };
  }, [exams, submissions, summary, isProgrammeHead]);

  // Real departmental breakdown dynamically aggregated strictly from current & existed registered programs
  const departmentMetrics = useMemo(() => {
    return activeRegisteredPrograms.map((program) => {
      const programExams = exams.filter((e) => {
        const prog = (e.program || "").toUpperCase();
        return prog === program.code || (program.code === "BSIT" && (prog === "IT" || prog.includes("COMPUTING")));
      });

      const examIds = new Set(programExams.map((e) => e.id));
      const programSubs = submissions.filter((s) => examIds.has(s.exam_id));

      const examCount = programExams.length;
      const sheetCount = programSubs.length;

      let scoreSum = 0;
      let totalPossible = 0;
      let passCount = 0;

      programSubs.forEach((s) => {
        const exam = programExams.find((e) => e.id === s.exam_id);
        const totalItems = exam ? Object.keys(exam.answer_key || {}).length || 50 : 50;
        const passScore = exam?.passing_score ?? Math.ceil(totalItems * 0.6);
        if (s.score >= passScore) passCount++;
        scoreSum += s.score;
        totalPossible += totalItems;
      });

      const meanScore = totalPossible > 0 ? parseFloat(((scoreSum / totalPossible) * 100).toFixed(1)) : null;
      const passRate = sheetCount > 0 ? Math.round((passCount / sheetCount) * 100) : null;

      const obeStatus =
        passRate === null
          ? "Pending Data"
          : passRate >= 90
          ? "Exemplary"
          : passRate >= 75
          ? "Compliant"
          : "Needs Review";

      return {
        name: program.name,
        code: program.code,
        accreditation: "Candidate Status / Level I",
        exams: examCount,
        sheets: sheetCount,
        meanScore,
        passRate,
        obeStatus,
      };
    });
  }, [activeRegisteredPrograms, exams, submissions]);

  const handleExportCompleteDb = () => {
    setDownloading(true);
    try {
      exportCompleteDatabaseExcel(exams, submissions, roster);
      addToast("success", "Institutional Examination Masterfile exported (.xlsx).");
    } catch {
      addToast("error", "Failed to export Excel file.");
    } finally {
      setDownloading(false);
    }
  };

  const handleExportBatchExams = () => {
    if (exams.length === 0) {
      addToast("error", "No examinations available to export.");
      return;
    }
    try {
      exportExamBatchExcel(exams[0], submissions, roster);
      addToast("success", "Examination Report batch exported (.xlsx).");
    } catch {
      addToast("error", "Failed to generate batch report.");
    }
  };

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      {/* 3 HIGH-LEVEL KPI METRICS CARDS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
          gap: "1.25rem",
        }}
      >
        <div
          style={{
            padding: "1.25rem",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "16px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #10b981, #059669)" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {isProgrammeHead ? `${userProgCode} Passing Rate` : "Institutional Passing Rate"}
            </span>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981" }}>
              <TrendingUp size={16} />
            </div>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: overallMetrics.passRate !== null ? "#0f172a" : "#64748b" }}>
            {overallMetrics.passRate !== null ? `${overallMetrics.passRate}%` : "—"}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.2rem" }}>
            {overallMetrics.totalSheets > 0
              ? `Derived from ${overallMetrics.totalSheets.toLocaleString()} graded student sheets`
              : "Awaiting student examination submissions"}
          </div>
        </div>

        <div
          style={{
            padding: "1.25rem",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "16px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #6366f1, #8b5cf6)" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {isProgrammeHead ? `${userProgCode} Mean Score` : "Collegiate Mean Score"}
            </span>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "var(--primary-light-surface, #f5f3ff)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary, #28166f)" }}>
              <Award size={16} />
            </div>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: overallMetrics.meanScore !== null ? "#10b981" : "#64748b" }}>
            {overallMetrics.meanScore !== null ? `${overallMetrics.meanScore}%` : "—"}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.2rem" }}>
            CHED Passing Threshold: 75.0%
          </div>
        </div>

        <div
          style={{
            padding: "1.25rem",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "16px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #3b82f6, #06b6d4)" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              OBE Quality Rating
            </span>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#f0f9ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#0284c7" }}>
              <ShieldCheck size={16} />
            </div>
          </div>
          <div
            style={{
              fontSize: "1.75rem",
              fontWeight: 800,
              color:
                overallMetrics.passRate === null
                  ? "#64748b"
                  : overallMetrics.passRate >= 85
                  ? "#10b981"
                  : overallMetrics.passRate >= 75
                  ? "var(--primary, #28166f)"
                  : "#d97706",
            }}
          >
            {overallMetrics.passRate === null
              ? "Pending Data"
              : overallMetrics.passRate >= 85
              ? "High Caliber"
              : overallMetrics.passRate >= 75
              ? "Standard QA"
              : "Review Advised"}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.2rem" }}>
            {overallMetrics.totalSheets > 0
              ? `Institutional QA benchmark based on real scores`
              : "Requires graded student answer sheets"}
          </div>
        </div>
      </div>

      {/* BENCHMARK MATRIX (ONLY CURRENT AND EXISTED DATA) */}
      <div
        className="card"
        style={{
          padding: "1.25rem",
          borderRadius: "16px",
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
        }}
      >
        <div
          style={{
            marginBottom: "1rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
            <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#0f172a" }}>
              {isProgrammeHead
                ? `${userProgCode} Academic Performance & Benchmark Matrix`
                : "Collegiate Academic Benchmark Matrix"}
            </h3>
            <p style={{ margin: 0, fontSize: "0.82rem", color: "#64748b" }}>
              {isProgrammeHead
                ? `Live performance indicators dynamically calculated for the ${userProgCode} program at SRCB.`
                : "Live performance indicators dynamically calculated across currently registered academic programs at SRCB."}
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleExportBatchExams}
              title="Export CHED Batch Summary (.xlsx)"
              aria-label="Export CHED Batch Summary (.xlsx)"
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
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(0, 0, 0, 0.03)",
                transition: "all 0.2s ease",
                flexShrink: 0,
              }}
            >
              <FileSpreadsheet size={17} />
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleExportCompleteDb}
              disabled={downloading}
              title={downloading ? "Exporting Master Database..." : "Export Master Database (.xlsx)"}
              aria-label="Export Master Database (.xlsx)"
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
                cursor: downloading ? "not-allowed" : "pointer",
                boxShadow: "0 1px 2px rgba(0, 0, 0, 0.03)",
                transition: "all 0.2s ease",
                flexShrink: 0,
              }}
            >
              <Download size={17} />
            </button>
          </div>
        </div>

        {departmentMetrics.length === 0 ? (
          <div
            style={{
              padding: "1rem 1.25rem",
              background: "#f8fafc",
              border: "1px dashed #cbd5e1",
              borderRadius: "10px",
              marginBottom: "1rem",
              fontSize: "0.82rem",
              color: "#64748b",
              textAlign: "center",
            }}
          >
            No registered degree programs found in the database.
          </div>
        ) : (
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
            <table style={{ width: "100%", minWidth: "680px", fontSize: "0.85rem", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ padding: "0.85rem 1rem", color: "#475569" }}>College / Degree Program</th>
                  <th style={{ padding: "0.85rem 1rem", color: "#475569" }}>Exam Sets</th>
                  <th style={{ padding: "0.85rem 1rem", color: "#475569" }}>Graded Sheets</th>
                  <th style={{ padding: "0.85rem 1rem", color: "#475569" }}>Mean Score</th>
                  <th style={{ padding: "0.85rem 1rem", color: "#475569" }}>Passing Rate</th>
                  <th style={{ padding: "0.85rem 1rem", color: "#475569" }}>OBE Quality Rating</th>
                  <th style={{ padding: "0.85rem 1rem", textAlign: "right", color: "#475569" }}>Accreditation Status</th>
                </tr>
              </thead>
              <tbody>
                {departmentMetrics.map((d) => (
                  <tr
                    key={d.code}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      transition: "background 0.2s",
                    }}
                  >
                    <td style={{ padding: "0.85rem 1rem", fontWeight: 600 }}>
                      <div style={{ color: "#0f172a" }}>{d.name}</div>
                      <div style={{ fontSize: "0.74rem", color: "var(--primary, #28166f)", fontWeight: 700 }}>Program Code: {d.code}</div>
                    </td>
                    <td style={{ padding: "0.85rem 1rem", color: "#475569" }}>{d.exams} Sets</td>
                    <td style={{ padding: "0.85rem 1rem", color: "#475569" }}>{d.sheets.toLocaleString()} Sheets</td>
                    <td style={{ padding: "0.85rem 1rem", fontWeight: 700, color: d.meanScore !== null ? "#10b981" : "#94a3b8" }}>
                      {d.meanScore !== null ? `${d.meanScore}%` : "—"}
                    </td>
                    <td style={{ padding: "0.85rem 1rem", fontWeight: 700, color: d.passRate !== null ? "var(--primary, #28166f)" : "#94a3b8" }}>
                      {d.passRate !== null ? `${d.passRate}%` : "—"}
                    </td>
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          padding: "0.2rem 0.55rem",
                          borderRadius: "6px",
                          background:
                            d.obeStatus === "Exemplary"
                              ? "#ecfdf5"
                              : d.obeStatus === "Compliant"
                              ? "#eff6ff"
                              : d.obeStatus === "Needs Review"
                              ? "#fef2f2"
                              : "#f8fafc",
                          color:
                            d.obeStatus === "Exemplary"
                              ? "#059669"
                              : d.obeStatus === "Compliant"
                              ? "#2563eb"
                              : d.obeStatus === "Needs Review"
                              ? "#dc2626"
                              : "#64748b",
                          border: `1px solid ${
                            d.obeStatus === "Exemplary"
                              ? "#a7f3d0"
                              : d.obeStatus === "Compliant"
                              ? "#bfdbfe"
                              : d.obeStatus === "Needs Review"
                              ? "#fecaca"
                              : "#e2e8f0"
                          }`,
                        }}
                      >
                        {d.obeStatus}
                      </span>
                    </td>
                    <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                      <span className="badge badge-info" style={{ fontSize: "0.72rem" }}>
                        {d.accreditation}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
