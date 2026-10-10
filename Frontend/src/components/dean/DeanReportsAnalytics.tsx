import { useState, useMemo } from "react";
import {
  TrendingUp,
  Download,
  FileSpreadsheet,
  Award,
  ShieldCheck,
} from "lucide-react";
import type { AuthUser, Exam, Submission, StudentRosterEntry } from "../../types";
import { exportCompleteDatabaseExcel } from "../../utils/excelUtils";

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

const INSTITUTIONAL_COLLEGES = [
  {
    name: "College of Computing Studies",
    code: "CCS",
    programs: ["BSIT", "BSCS", "IT", "Computing Studies"],
    accreditation: "Candidate Status / Level I",
  },
  {
    name: "College of Business Administration",
    code: "CBA",
    programs: ["BSBA", "Business Administration"],
    accreditation: "Candidate Status / Level I",
  },
  {
    name: "College of Teacher Education",
    code: "CTE",
    programs: ["TEP", "BEED", "BSED", "Teacher Education"],
    accreditation: "Candidate Status / Level I",
  },
  {
    name: "College of Hospitality Management",
    code: "CHM",
    programs: ["BSHM", "Hospitality Management"],
    accreditation: "Candidate Status / Level I",
  },
  {
    name: "College of Criminal Justice Education",
    code: "CCJE",
    programs: ["BSCRIM", "Criminology"],
    accreditation: "Candidate Status / Level I",
  },
  {
    name: "College of Arts & Sciences",
    code: "CAS",
    programs: ["Arts & Sciences", "AB Comm", "General"],
    accreditation: "Candidate Status / Level I",
  },
];

export default function DeanReportsAnalytics({
  exams,
  submissions,
  roster,
  summary,
  addToast,
}: DeanReportsAnalyticsProps) {
  const [downloading, setDownloading] = useState(false);

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
      summary?.average_score !== undefined && summary.total_submissions > 0
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
  }, [exams, submissions, summary]);

  // Real departmental breakdown dynamically aggregated from database exams & submissions
  const departmentMetrics = useMemo(() => {
    return INSTITUTIONAL_COLLEGES.map((college) => {
      const collegeExams = exams.filter((e) => {
        const prog = (e.program || "").toLowerCase();
        return college.programs.some((p) => prog.includes(p.toLowerCase()));
      });

      const examIds = new Set(collegeExams.map((e) => e.id));
      const collegeSubs = submissions.filter((s) => examIds.has(s.exam_id));

      const examCount = collegeExams.length;
      const sheetCount = collegeSubs.length;

      let scoreSum = 0;
      let totalPossible = 0;
      let passCount = 0;

      collegeSubs.forEach((s) => {
        const exam = collegeExams.find((e) => e.id === s.exam_id);
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
        ...college,
        exams: examCount,
        sheets: sheetCount,
        meanScore,
        passRate,
        obeStatus,
      };
    });
  }, [exams, submissions]);

  const handleExportCompleteDb = () => {
    setDownloading(true);
    try {
      exportCompleteDatabaseExcel(exams, submissions, roster);
      addToast("success", "Complete Institutional Accreditation Master Database exported (.xlsx)");
    } catch {
      addToast("error", "Failed to export complete database.");
    } finally {
      setDownloading(false);
    }
  };

  const handleExportBatchExams = () => {
    try {
      exportCompleteDatabaseExcel(exams, submissions, roster, { groupBy: "exam_type" });
      addToast("success", "CHED Curricular Batch Summary exported (.xlsx)");
    } catch {
      addToast("error", "Failed to export batch exams.");
    }
  };

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      {/* 3 STAT TILES */}
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
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Overall Mean Score</span>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "var(--primary-light-surface, #f5f3ff)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--primary, #28166f)",
              }}
            >
              <TrendingUp size={17} />
            </div>
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#0f172a" }}>
            {overallMetrics.meanScore !== null ? `${overallMetrics.meanScore}%` : "—"}
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              color: overallMetrics.meanScore !== null ? (overallMetrics.meanScore >= 75 ? "#10b981" : "#d97706") : "#64748b",
              marginTop: "0.2rem",
              fontWeight: 600,
            }}
          >
            {overallMetrics.meanScore !== null
              ? `${overallMetrics.meanScore >= 75 ? `+${(overallMetrics.meanScore - 75).toFixed(1)}% above` : `${(75 - overallMetrics.meanScore).toFixed(1)}% below`} CHED 75% baseline requirement`
              : "No student submissions recorded yet"}
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
          <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Collegiate Passing Rate</span>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "var(--primary-light-surface, #f5f3ff)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--primary, #28166f)",
              }}
            >
              <Award size={17} />
            </div>
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--primary, #28166f)" }}>
            {overallMetrics.passRate !== null ? `${overallMetrics.passRate}%` : "—"}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.2rem" }}>
            {overallMetrics.totalSheets > 0
              ? `Cumulative passing across ${overallMetrics.totalSheets.toLocaleString()} sheet(s)`
              : "Awaiting examination submissions"}
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
          <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>OBE QA Quality Rating</span>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "var(--primary-light-surface, #f5f3ff)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--primary, #28166f)",
              }}
            >
              <ShieldCheck size={17} />
            </div>
          </div>
          <div
            style={{
              fontSize: "1.8rem",
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

      {/* COLLEGIATE BENCHMARK MATRIX */}
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
            <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#0f172a" }}>Cross-Collegiate Academic Benchmark Matrix</h3>
            <p style={{ margin: 0, fontSize: "0.82rem", color: "#64748b" }}>
              Live performance indicators dynamically calculated across academic colleges at SRCB.
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

        {exams.length === 0 && (
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
            No active examinations found in the database. When instructors create exams and grade OMR answer sheets, real departmental passing rates and mean scores will appear below.
          </div>
        )}

        <div style={{ overflowX: "auto", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
          <table style={{ width: "100%", fontSize: "0.85rem", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: "0.85rem 1rem", color: "#475569" }}>College / Department</th>
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
                    <div style={{ fontSize: "0.74rem", color: "var(--primary, #28166f)", fontWeight: 700 }}>Code: {d.code}</div>
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
      </div>
    </div>
  );
}
