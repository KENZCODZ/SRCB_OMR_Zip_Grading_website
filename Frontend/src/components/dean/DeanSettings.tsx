import React, { useState } from "react";
import {
  ShieldCheck,
  Award,
  Sliders,
  Bell,
  Lock,
  Save,
  RotateCcw,
} from "lucide-react";
import type { AuthUser } from "../../types";

interface DeanSettingsProps {
  currentUser?: AuthUser;
  addToast: (type: "success" | "error" | "info", message: string) => void;
}

export default function DeanSettings({
  addToast,
}: DeanSettingsProps) {
  // Academic Term & Policies State
  const [academicYear, setAcademicYear] = useState("2025-2026");
  const [semester, setSemester] = useState("1st-semester");
  const [passingThreshold, setPassingThreshold] = useState("75");
  const [gradingScale, setGradingScale] = useState("50-base-transmuted");

  // OBE Quality Thresholds
  const [minDiscriminationIndex, setMinDiscriminationIndex] = useState("0.20");
  const [requireProgrammeHeadApproval, setRequireProgrammeHeadApproval] = useState(true);
  const [autoLockAnswerKeys, setAutoLockAnswerKeys] = useState(true);

  // Security & Compliance
  const [watermarkExports, setWatermarkExports] = useState(true);
  const [autoAuditLogs, setAutoAuditLogs] = useState(true);
  const [lowPassAlerts, setLowPassAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(true);

  const [saving, setSaving] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      addToast("success", "Institutional Academic Settings & Governance Policies saved successfully.");
    }, 400);
  };

  const handleResetDefaults = () => {
    setAcademicYear("2025-2026");
    setSemester("1st-semester");
    setPassingThreshold("75");
    setGradingScale("50-base-transmuted");
    setMinDiscriminationIndex("0.20");
    setRequireProgrammeHeadApproval(true);
    setAutoLockAnswerKeys(true);
    setWatermarkExports(true);
    setAutoAuditLogs(true);
    setLowPassAlerts(true);
    setWeeklyDigest(true);
    addToast("info", "Settings restored to CHED & SRCB Institutional defaults.");
  };

  return (
    <form onSubmit={handleSaveSettings} style={{ display: "grid", gap: "1.5rem" }}>
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
              <ShieldCheck size={14} /> Institutional Governance & Quality Assurance
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
              Dean Governance & System Settings
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
              Configure institutional grading transmutation scales, set OBE quality audit thresholds, customize
              compliance export watermarks, and manage automated academic alert notifications.
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn"
              onClick={handleResetDefaults}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                fontSize: "0.85rem",
                padding: "0.55rem 1rem",
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                color: "#0f172a",
                borderRadius: "10px",
              }}
            >
              <RotateCcw size={15} /> Reset Defaults
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                fontWeight: 700,
                fontSize: "0.85rem",
                padding: "0.55rem 1.25rem",
                background: "#0062ff",
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                boxShadow: "0 2px 8px rgba(0, 98, 255, 0.25)",
              }}
            >
              <Save size={16} /> {saving ? "Saving Changes..." : "Save Policies"}
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: "1.25rem" }}>
        {/* SECTION 1: ACADEMIC CALENDAR & GRADING FORMULA */}
        <div className="card" style={{ padding: "1.5rem", borderRadius: "16px", background: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.25rem" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "#eff6ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0062ff",
              }}
            >
              <Sliders size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.05rem", color: "#0f172a" }}>Academic Term & Grading Scale</h3>
              <p style={{ margin: 0, fontSize: "0.76rem", color: "#64748b" }}>
                Active semester parameters and grade conversion formulas
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.35rem", color: "#334155" }}>
                Active Academic Year
              </label>
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="input"
                style={{ width: "100%", height: "40px", fontSize: "0.85rem", borderRadius: "8px", background: "#ffffff", border: "1px solid #e2e8f0", color: "#0f172a" }}
              >
                <option value="2025-2026">AY 2025–2026 (Current)</option>
                <option value="2024-2025">AY 2024–2025 (Archived)</option>
                <option value="2026-2027">AY 2026–2027 (Upcoming)</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.35rem", color: "#334155" }}>
                Active Semester / Term
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="input"
                style={{ width: "100%", height: "40px", fontSize: "0.85rem", borderRadius: "8px", background: "#ffffff", border: "1px solid #e2e8f0", color: "#0f172a" }}
              >
                <option value="1st-semester">First Semester (Prelims & Midterms)</option>
                <option value="2nd-semester">Second Semester (Semi-Finals & Finals)</option>
                <option value="summer">Summer / Mid-Year Intersession</option>
              </select>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#334155" }}>CHED Minimum Passing Benchmark (%)</label>
                <strong style={{ color: "#0062ff", fontSize: "0.85rem" }}>{passingThreshold}%</strong>
              </div>
              <input
                type="range"
                min="50"
                max="85"
                step="1"
                value={passingThreshold}
                onChange={(e) => setPassingThreshold(e.target.value)}
                style={{ width: "100%", accentColor: "#0062ff" }}
              />
              <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
                CHED CMO Standard: 75% minimum passing grade equivalent to 3.00.
              </span>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.35rem", color: "#334155" }}>
                Transmutation Scale Formula
              </label>
              <select
                value={gradingScale}
                onChange={(e) => setGradingScale(e.target.value)}
                className="input"
                style={{ width: "100%", height: "40px", fontSize: "0.85rem", borderRadius: "8px", background: "#ffffff", border: "1px solid #e2e8f0", color: "#0f172a" }}
              >
                <option value="50-base-transmuted">Standard Philippine 50-Base Transmutation (1.00 – 5.00)</option>
                <option value="zero-base-raw">Raw Percentage Linear Scale (0 – 100%)</option>
                <option value="custom-ched">CHED Memorandum Order Custom Conversion Table</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 2: OBE QUALITY ASSURANCE BENCHMARKS */}
        <div className="card" style={{ padding: "1.5rem", borderRadius: "16px", background: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.25rem" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "#eff6ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0062ff",
              }}
            >
              <Award size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.05rem", color: "#0f172a" }}>OBE Quality Assurance Benchmarks</h3>
              <p style={{ margin: 0, fontSize: "0.76rem", color: "#64748b" }}>
                Psychometric indices and assessment quality control
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.35rem", color: "#334155" }}>
                Minimum Item Discrimination Index Alert
              </label>
              <select
                value={minDiscriminationIndex}
                onChange={(e) => setMinDiscriminationIndex(e.target.value)}
                className="input"
                style={{ width: "100%", height: "40px", fontSize: "0.85rem", borderRadius: "8px", background: "#ffffff", border: "1px solid #e2e8f0", color: "#0f172a" }}
              >
                <option value="0.20">0.20 - Standard Benchmark (Recommended)</option>
                <option value="0.30">0.30 - High Discrimination Benchmark</option>
                <option value="0.15">0.15 - Lenient Benchmark</option>
              </select>
              <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
                Questions with an index below this threshold will be flagged for instructional revision.
              </span>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0.75rem",
                borderRadius: "8px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
              }}
            >
              <div>
                <strong style={{ fontSize: "0.85rem", color: "#0f172a" }}>Lock Answer Keys During Grading</strong>
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  Prevents answer key alterations once the first student sheet has been scanned.
                </div>
              </div>
              <input
                type="checkbox"
                checked={autoLockAnswerKeys}
                onChange={(e) => setAutoLockAnswerKeys(e.target.checked)}
                style={{ width: "18px", height: "18px", accentColor: "#0062ff" }}
              />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0.75rem",
                borderRadius: "8px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
              }}
            >
              <div>
                <strong style={{ fontSize: "0.85rem", color: "#0f172a" }}>Programme Head Quality Verification</strong>
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  Requires Programme Head audit before final exam grade publication.
                </div>
              </div>
              <input
                type="checkbox"
                checked={requireProgrammeHeadApproval}
                onChange={(e) => setRequireProgrammeHeadApproval(e.target.checked)}
                style={{ width: "18px", height: "18px", accentColor: "#0062ff" }}
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: COMPLIANCE & EXPORT SECURITY */}
        <div className="card" style={{ padding: "1.5rem", borderRadius: "16px", background: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.25rem" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "#eff6ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0062ff",
              }}
            >
              <Lock size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.05rem", color: "#0f172a" }}>Export Security & Audit Protocols</h3>
              <p style={{ margin: 0, fontSize: "0.76rem", color: "#64748b" }}>
                Institutional security and permanent archival controls
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gap: "0.85rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0.75rem",
                borderRadius: "8px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
              }}
            >
              <div>
                <strong style={{ fontSize: "0.85rem", color: "#0f172a" }}>SRCB Institutional Watermark</strong>
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  Appends official College seal and Dean verification timestamp on generated Excel sheets.
                </div>
              </div>
              <input
                type="checkbox"
                checked={watermarkExports}
                onChange={(e) => setWatermarkExports(e.target.checked)}
                style={{ width: "18px", height: "18px", accentColor: "#0062ff" }}
              />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0.75rem",
                borderRadius: "8px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
              }}
            >
              <div>
                <strong style={{ fontSize: "0.85rem", color: "#0f172a" }}>Automated PACUCOA Archival Log</strong>
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  Logs every exam creation, key modification, and grading scan for accreditation reviews.
                </div>
              </div>
              <input
                type="checkbox"
                checked={autoAuditLogs}
                onChange={(e) => setAutoAuditLogs(e.target.checked)}
                style={{ width: "18px", height: "18px", accentColor: "#0062ff" }}
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: DEAN NOTIFICATIONS & ALERTS */}
        <div className="card" style={{ padding: "1.5rem", borderRadius: "16px", background: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.25rem" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "#eff6ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0062ff",
              }}
            >
              <Bell size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.05rem", color: "#0f172a" }}>Executive Alerts & Notification Feeds</h3>
              <p style={{ margin: 0, fontSize: "0.76rem", color: "#64748b" }}>
                Automated intervention triggers and performance digests
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gap: "0.85rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0.75rem",
                borderRadius: "8px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
              }}
            >
              <div>
                <strong style={{ fontSize: "0.85rem", color: "#0f172a" }}>Low Passing Rate Warning Alerts</strong>
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  Immediately notify Dean if any course section achieves a passing rate below 70%.
                </div>
              </div>
              <input
                type="checkbox"
                checked={lowPassAlerts}
                onChange={(e) => setLowPassAlerts(e.target.checked)}
                style={{ width: "18px", height: "18px", accentColor: "#0062ff" }}
              />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0.75rem",
                borderRadius: "8px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
              }}
            >
              <div>
                <strong style={{ fontSize: "0.85rem", color: "#0f172a" }}>Weekly Executive Performance Digest</strong>
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  Receive an automated summary email with collegiate pass rates every Monday morning.
                </div>
              </div>
              <input
                type="checkbox"
                checked={weeklyDigest}
                onChange={(e) => setWeeklyDigest(e.target.checked)}
                style={{ width: "18px", height: "18px", accentColor: "#0062ff" }}
              />
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
