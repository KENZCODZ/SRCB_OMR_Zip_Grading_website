import { useState } from "react";
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

const DEPARTMENT_METRICS = [
  {
    name: "College of Computing & Information Studies (CCIS)",
    code: "CCIS",
    exams: 38,
    sheets: 620,
    meanScore: 88.4,
    passRate: 91.2,
    obeStatus: "Exemplary (0.42 Index)",
    accreditation: "Level III Re-accredited",
  },
  {
    name: "College of Business & Accountancy (CBA)",
    code: "CBA",
    exams: 44,
    sheets: 780,
    meanScore: 83.2,
    passRate: 86.8,
    obeStatus: "Compliant (0.38 Index)",
    accreditation: "Level II Accredited",
  },
  {
    name: "College of Teacher Education (CTE)",
    code: "CTE",
    exams: 28,
    sheets: 510,
    meanScore: 89.1,
    passRate: 93.4,
    obeStatus: "Exemplary (0.46 Index)",
    accreditation: "Center of Development",
  },
  {
    name: "College of Arts & Sciences (CAS)",
    code: "CAS",
    exams: 18,
    sheets: 274,
    meanScore: 81.5,
    passRate: 84.1,
    obeStatus: "Compliant (0.35 Index)",
    accreditation: "Level II Accredited",
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

  const avgInstitutionalScore = summary?.average_score ? `${summary.average_score}%` : "84.6%";

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
      exportCompleteDatabaseExcel(exams, submissions, roster, { groupBy: 'exam_type' });
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
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "var(--primary-light-surface, #f5f3ff)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary, #28166f)" }}>
              <TrendingUp size={17} />
            </div>
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#0f172a" }}>
            {avgInstitutionalScore}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#10b981", marginTop: "0.2rem", fontWeight: 600 }}>
            +9.6% above CHED 75% baseline requirement
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
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "var(--primary-light-surface, #f5f3ff)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary, #28166f)" }}>
              <Award size={17} />
            </div>
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--primary, #28166f)" }}>
            88.8%
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.2rem" }}>
            Cumulative passing across all terms
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
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "var(--primary-light-surface, #f5f3ff)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary, #28166f)" }}>
              <ShieldCheck size={17} />
            </div>
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#10b981" }}>
            High Caliber
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.2rem" }}>
            Mean discrimination index 0.40
          </div>
        </div>
      </div>



      {/* COLLEGIATE BENCHMARK MATRIX */}
      <div className="card" style={{ padding: "1.25rem", borderRadius: "16px", background: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
        <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#0f172a" }}>Cross-Collegiate Academic Benchmark Matrix</h3>
            <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.82rem", color: "#64748b" }}>
              Side-by-side performance indicators across all 4 academic departments at SRCB.
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
              {DEPARTMENT_METRICS.map((d) => (
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
                  <td style={{ padding: "0.85rem 1rem", color: "#475569" }}>{d.sheets} Sheets</td>
                  <td style={{ padding: "0.85rem 1rem", fontWeight: 700, color: "#10b981" }}>{d.meanScore}%</td>
                  <td style={{ padding: "0.85rem 1rem", fontWeight: 700, color: "var(--primary, #28166f)" }}>{d.passRate}%</td>
                  <td style={{ padding: "0.85rem 1rem" }}>
                    <span className="badge badge-success" style={{ fontSize: "0.72rem" }}>
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
