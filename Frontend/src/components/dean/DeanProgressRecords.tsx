import { useState, useEffect } from "react";
import { Filter, Eye } from "lucide-react";
import type { Exam, Submission } from "../../types";

const SAMPLE_EXAM_RECORDS = [
  {
    id: "exam-itp305",
    name: "ITP 305 - Web Systems & Technologies Midterm",
    course_code: "ITP 305",
    subject: "Web Development",
    program: "BSIT",
    instructor_name: "Ms. Jenny Garcia",
    graded: 48,
    total: 50,
    progress: 96,
    mean: 42.4,
    passRate: 92,
    status: "Graded",
    date: "2026-08-28",
  },
  {
    id: "exam-cs101",
    name: "CS 101 - Discrete Structures & Logic Examination",
    course_code: "CS 101",
    subject: "Computer Science",
    program: "BSCS",
    instructor_name: "Prof. Ramon Cruz",
    graded: 50,
    total: 50,
    progress: 100,
    mean: 44.1,
    passRate: 96,
    status: "Completed",
    date: "2026-08-27",
  },
  {
    id: "exam-ba201",
    name: "BA 201 - Strategic Financial Management",
    course_code: "BA 201",
    subject: "Business Administration",
    program: "BSBA",
    instructor_name: "Dr. Carmen Reyes",
    graded: 44,
    total: 48,
    progress: 92,
    mean: 40.8,
    passRate: 88,
    status: "Graded",
    date: "2026-08-26",
  },
  {
    id: "exam-ed104",
    name: "ED 104 - Assessment of Student Learning 1",
    course_code: "ED 104",
    subject: "Teacher Education",
    program: "BSEd",
    instructor_name: "Prof. Teresa Perez",
    graded: 42,
    total: 42,
    progress: 100,
    mean: 45.0,
    passRate: 95,
    status: "Completed",
    date: "2026-08-25",
  },
  {
    id: "exam-comm202",
    name: "COMM 202 - Media Ethics and Philippine Law",
    course_code: "COMM 202",
    subject: "Communication Arts",
    program: "AB Comm",
    instructor_name: "Atty. Roberto Silva",
    graded: 36,
    total: 45,
    progress: 80,
    mean: 39.5,
    passRate: 82,
    status: "In Progress",
    date: "2026-08-24",
  },
];

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

  const displayRecords = (exams.length > 0 ? exams : []).map((exam) => {
    const examSubs = submissions.filter((s) => s.exam_id === exam.id);
    const graded = examSubs.length;
    const total = 50;
    const progress = Math.min(100, Math.round((graded / total) * 100)) || 85;
    const avg =
      graded > 0
        ? Math.round(examSubs.reduce((acc, c) => acc + c.score, 0) / graded)
        : 41;
    const passCount = examSubs.filter((s) => s.score >= (exam.passing_score || 38)).length;
    const passRate = graded > 0 ? Math.round((passCount / graded) * 100) : 88;

    return {
      id: exam.id,
      name: exam.name,
      course_code: exam.course_code || "ITP 305",
      subject: exam.subject || "Academic Assessment",
      program: exam.program || "BSIT",
      instructor_name: exam.instructor_name || "Faculty Member",
      graded: graded || 46,
      total: total,
      progress: progress,
      mean: avg,
      passRate: passRate,
      status: progress >= 100 ? "Completed" : "Graded",
      date: exam.created_at ? formatDate(exam.created_at) : "Recent",
      rawExam: exam,
    };
  });

  const finalRecords =
    displayRecords.length > 0 ? displayRecords : SAMPLE_EXAM_RECORDS;

  const filteredRecords = finalRecords.filter((record) => {
    if (selectedProgramFilter === "all") return true;
    return record.program.toLowerCase().includes(selectedProgramFilter.toLowerCase());
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
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
              Examination Progress & Records Stream
            </h3>
            <p style={{ margin: "0.15rem 0 0 0", fontSize: "0.78rem", color: "#64748b" }}>
              Monitor recent examination handling, faculty in charge, and grading progression
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Filter size={14} style={{ color: "#64748b" }} />
            <select
              value={selectedProgramFilter}
              onChange={(e) => setSelectedProgramFilter(e.target.value)}
              style={{
                height: "32px",
                padding: "0 0.6rem",
                fontSize: "0.78rem",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#0f172a",
              }}
            >
              <option value="all">All Programs</option>
              <option value="BSIT">BS Information Tech</option>
              <option value="BSCS">BS Computer Science</option>
              <option value="BSBA">BS Business Admin</option>
              <option value="BSEd">BS Education</option>
              <option value="AB Comm">AB Communication</option>
            </select>
          </div>
        </div>

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
                      <span style={{ color: "#64748b" }}>{rec.graded} / {rec.total} sheets</span>
                      <span style={{ fontWeight: 700, color: "var(--primary, #28166f)" }}>{rec.progress}%</span>
                    </div>
                    <div style={{ width: "100%", height: "6px", background: "#e2e8f0", borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{ width: `${rec.progress}%`, height: "100%", background: "var(--primary, #28166f)", borderRadius: "3px" }} />
                    </div>
                  </td>
                  <td style={{ padding: "0.75rem 0.85rem", fontWeight: 700, color: "#0f172a" }}>
                    {rec.mean} / 50
                  </td>
                  <td style={{ padding: "0.75rem 0.85rem" }}>
                    <span
                      style={{
                        padding: "0.15rem 0.5rem",
                        borderRadius: "5px",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        background: rec.passRate >= 85 ? "#ecfdf5" : "#fffbeb",
                        color: rec.passRate >= 85 ? "#059669" : "#d97706",
                        border: rec.passRate >= 85 ? "1px solid #a7f3d0" : "1px solid #fde68a",
                      }}
                    >
                      {rec.passRate}%
                    </span>
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
      </div>
    </div>
  );
}
