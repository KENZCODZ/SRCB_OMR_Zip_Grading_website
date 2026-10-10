import { useState, useEffect, useMemo } from "react";
import { Eye, ChevronDown, BookOpen, GraduationCap } from "lucide-react";
import type { Exam, Submission } from "../../types";

interface DeanProgressRecordsProps {
  exams: Exam[];
  submissions: Submission[];
  onInspectExam?: (exam: Exam) => void;
  formatDate?: (iso: string) => string;
  programFilter?: string;
}

export default function DeanProgressRecords({
  exams = [],
  submissions = [],
  onInspectExam,
  formatDate = (iso) => new Date(iso).toLocaleDateString(),
  programFilter = "all",
}: DeanProgressRecordsProps) {
  const [selectedProgramFilter, setSelectedProgramFilter] = useState<string>(programFilter);

  // Sync internal state with external prop if it changes
  useEffect(() => {
    setSelectedProgramFilter(programFilter);
  }, [programFilter]);

  // Dynamically compute progress records from real database exams & submissions
  const displayRecords = useMemo(() => {
    return exams.map((exam) => {
      const examSubs = submissions.filter((s) => s.exam_id === exam.id);
      const graded = examSubs.length;
      const totalItems = Object.keys(exam.answer_key || {}).length || exam.num_items || 50;

      const avg =
        graded > 0
          ? (examSubs.reduce((acc, c) => acc + c.score, 0) / graded).toFixed(1)
          : "—";

      const passScore = exam.passing_score ?? Math.ceil(totalItems * 0.6);
      const passCount = examSubs.filter((s) => s.score >= passScore).length;
      const passRate = graded > 0 ? Math.round((passCount / graded) * 100) : null;

      return {
        id: exam.id,
        name: exam.name,
        course_code: exam.course_code || exam.subject || "Exam",
        subject: exam.subject || "Academic Assessment",
        program: exam.program || "General",
        instructor_name: exam.instructor_name || "Faculty Member",
        graded,
        totalItems,
        mean: avg,
        passRate,
        status: graded > 0 ? "Graded" : "Pending Sheets",
        date: exam.created_at ? formatDate(exam.created_at) : "Recent",
        rawExam: exam,
      };
    });
  }, [exams, submissions, formatDate]);

  const availablePrograms = useMemo(() => {
    const progSet = new Set<string>();
    exams.forEach((e) => {
      if (e.program && e.program.trim()) progSet.add(e.program.trim());
    });
    return Array.from(progSet).sort();
  }, [exams]);

  const filteredRecords = useMemo(() => {
    if (selectedProgramFilter === "all") return displayRecords;
    return displayRecords.filter((record) =>
      record.program.toLowerCase().includes(selectedProgramFilter.toLowerCase())
    );
  }, [displayRecords, selectedProgramFilter]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
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
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
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
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.01em" }}>
                Examination Progress & Records Stream
              </h3>
              <p style={{ margin: 0, fontSize: "0.78rem", color: "#64748b", fontWeight: 500 }}>
                Real-time tracking of examination handling, faculty in charge, and grading progression
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <div className="unified-filter-toolbar-item" style={{ minWidth: "220px" }} title="Filter by Academic Program">
              <GraduationCap size={14} className="unified-filter-toolbar-icon" />
              <select
                value={selectedProgramFilter}
                onChange={(e) => setSelectedProgramFilter(e.target.value)}
                className="unified-filter-toolbar-select"
                aria-label="Filter by academic program"
              >
                <option value="all">All Academic Programs</option>
                {availablePrograms.length > 0 ? (
                  availablePrograms.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="BSIT">BS Information Tech (BSIT)</option>
                    <option value="BSCS">BS Computer Science (BSCS)</option>
                    <option value="BSBA">BS Business Admin (BSBA)</option>
                    <option value="TEP">Teacher Education (TEP)</option>
                    <option value="BSHM">Hospitality Management (BSHM)</option>
                    <option value="BSCRIM">Criminology (BSCRIM)</option>
                  </>
                )}
              </select>
              <ChevronDown size={14} className="academic-select-arrow" />
            </div>
          </div>
        </div>

        {filteredRecords.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "2.5rem 1rem",
              color: "#64748b",
              background: "#f8fafc",
              borderRadius: "12px",
              border: "1px dashed #cbd5e1",
            }}
          >
            <BookOpen size={30} style={{ color: "#94a3b8", marginBottom: "0.5rem" }} />
            <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#1e293b" }}>
              {exams.length === 0
                ? "No Examination Records Found"
                : `No examinations found for "${selectedProgramFilter}"`}
            </div>
            <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.82rem", color: "#64748b" }}>
              {exams.length === 0
                ? "There are currently no active exams in the database. When instructors create examinations and process OMR sheets, live records will stream here."
                : "Try selecting another academic program or view all programs."}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
                  <th style={{ padding: "0.65rem 0.85rem", fontWeight: 700, color: "#475569" }}>Course & Examination</th>
                  <th style={{ padding: "0.65rem 0.85rem", fontWeight: 700, color: "#475569" }}>Handling Teacher</th>
                  <th style={{ padding: "0.65rem 0.85rem", fontWeight: 700, color: "#475569" }}>Program</th>
                  <th style={{ padding: "0.65rem 0.85rem", fontWeight: 700, color: "#475569" }}>Grading Progress</th>
                  <th style={{ padding: "0.65rem 0.85rem", fontWeight: 700, color: "#475569" }}>Mean Score</th>
                  <th style={{ padding: "0.65rem 0.85rem", fontWeight: 700, color: "#475569" }}>Pass Rate</th>
                  <th style={{ padding: "0.65rem 0.85rem", fontWeight: 700, color: "#475569", textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((rec) => (
                  <tr
                    key={rec.id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      transition: "background 0.15s ease",
                    }}
                  >
                    <td style={{ padding: "0.75rem 0.85rem" }}>
                      <div style={{ fontWeight: 700, color: "#0f172a" }}>{rec.name}</div>
                      <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                        {rec.course_code} • {rec.date}
                      </div>
                    </td>
                    <td style={{ padding: "0.75rem 0.85rem", color: "#334155", fontWeight: 600 }}>
                      {rec.instructor_name}
                    </td>
                    <td style={{ padding: "0.75rem 0.85rem" }}>
                      <span
                        style={{
                          background: "var(--primary-light-surface, #f5f3ff)",
                          color: "var(--primary, #28166f)",
                          padding: "0.15rem 0.5rem",
                          borderRadius: "5px",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          border: "1px solid var(--primary-light-border, #ddd6fe)",
                        }}
                      >
                        {rec.program}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem 0.85rem", minWidth: "140px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", marginBottom: "2px" }}>
                        <span style={{ color: "#64748b" }}>{rec.graded} sheet{rec.graded === 1 ? "" : "s"}</span>
                        <span
                          style={{
                            fontWeight: 700,
                            color: rec.graded > 0 ? "var(--primary, #28166f)" : "#94a3b8",
                          }}
                        >
                          {rec.status}
                        </span>
                      </div>
                      <div style={{ width: "100%", height: "6px", background: "#e2e8f0", borderRadius: "3px", overflow: "hidden" }}>
                        <div
                          style={{
                            width: rec.graded > 0 ? "100%" : "0%",
                            height: "100%",
                            background: rec.graded > 0 ? "var(--primary, #28166f)" : "#cbd5e1",
                            borderRadius: "3px",
                          }}
                        />
                      </div>
                    </td>
                    <td style={{ padding: "0.75rem 0.85rem", fontWeight: 700, color: "#0f172a" }}>
                      {rec.mean !== "—" ? `${rec.mean} / ${rec.totalItems}` : "—"}
                    </td>
                    <td style={{ padding: "0.75rem 0.85rem" }}>
                      {rec.passRate !== null ? (
                        <span
                          style={{
                            padding: "0.15rem 0.5rem",
                            borderRadius: "5px",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            background: rec.passRate >= 75 ? "#ecfdf5" : "#fffbeb",
                            color: rec.passRate >= 75 ? "#059669" : "#d97706",
                            border: rec.passRate >= 75 ? "1px solid #a7f3d0" : "1px solid #fde68a",
                          }}
                        >
                          {rec.passRate}%
                        </span>
                      ) : (
                        <span style={{ color: "#94a3b8", fontSize: "0.75rem" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "0.75rem 0.85rem", textAlign: "right" }}>
                      {onInspectExam && (rec as any).rawExam && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => onInspectExam((rec as any).rawExam)}
                          style={{ fontSize: "0.72rem", padding: "0.3rem 0.6rem", borderRadius: "6px" }}
                        >
                          <Eye size={12} style={{ marginRight: "3px" }} /> Inspect
                        </button>
                      )}
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
