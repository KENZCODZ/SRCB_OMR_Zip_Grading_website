import React, { useState, useMemo } from "react";
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";
import type { AuthUser, Exam, Submission, StudentRosterEntry } from "../types";
import { calculateTransmutedGrade } from "../utils/excelUtils";

interface StudentPortalViewProps {
  currentUser: AuthUser;
  exams: Exam[];
  submissions: Submission[];
  roster?: StudentRosterEntry[];
  formatDate: (iso: string) => string;
}

export const StudentPortalView: React.FC<StudentPortalViewProps> = ({
  currentUser,
  exams,
  submissions,
  roster,
  formatDate,
}) => {
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<"all" | "passed" | "failed">("all");

  // Filter submissions strictly to the logged-in student (Access only their personal examination records)
  const personalSubmissions = useMemo(() => {
    const rawStudentId = (currentUser.studentId || (currentUser as any).student_id || "").trim();
    const studentName = (currentUser.name || "").trim().toLowerCase();
    const studentEmail = (currentUser.email || "").trim().toLowerCase();

    // Roster lookup if studentId is not explicitly configured on the user record
    let resolvedId = rawStudentId;
    if (!resolvedId && roster && roster.length > 0) {
      const rosterEntry = roster.find(
        (r) =>
          (r.email && r.email.toLowerCase() === studentEmail) ||
          (r.name && r.name.toLowerCase() === studentName)
      );
      if (rosterEntry?.student_id) {
        resolvedId = rosterEntry.student_id.trim();
      }
    }

    // If still no student ID is found, fallback to checking if currentUser.id is a student ID
    if (!resolvedId && currentUser.id && !currentUser.id.includes("-")) {
      resolvedId = currentUser.id.trim();
    }

    if (!resolvedId) {
      return [];
    }

    const norm = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, "");
    const cleanId = norm(resolvedId);

    return submissions.filter((s) => {
      if (!s.student_id) return false;
      const subId = (s.student_id || "").trim();
      const cleanSubId = norm(subId);

      // 1. Exact string match (e.g. "12345" === "12345" or "2023-00142" === "2023-00142")
      if (subId.toLowerCase() === resolvedId.toLowerCase()) return true;

      // 2. Clean alphanumeric match (ignoring dashes, slashes, spaces)
      if (cleanSubId === cleanId) return true;

      // 3. Suffix match (e.g. student ID is "2023-00142" and sheet grid only bubble-coded "00142" or "142")
      if (cleanId.length >= 4 && cleanSubId.length >= 3) {
        if (cleanId.endsWith(cleanSubId) || cleanSubId.endsWith(cleanId)) return true;
      }

      return false;
    });
  }, [submissions, currentUser, roster]);

  // Combined examination data with student personal score
  const studentExamRecords = useMemo(() => {
    return personalSubmissions.map((submission) => {
      const exam = exams.find((e) => e.id === submission.exam_id) || {
        id: submission.exam_id,
        name: "General Examination Assessment",
        subject: "Information Technology",
        course_code: "ITP 305",
        answer_key: {},
        created_at: submission.created_at,
        num_items: submission.total_questions || 50,
      };

      const totalQuestions = submission.total_questions || exam.num_items || 50;
      const percentage = Math.round((submission.score / totalQuestions) * 100);
      const transmuted = calculateTransmutedGrade(submission.score, totalQuestions);

      return {
        submission,
        exam,
        totalQuestions,
        percentage,
        transmuted,
      };
    });
  }, [personalSubmissions, exams]);

  // Overall personal metrics
  const totalExamsTaken = studentExamRecords.length;
  const avgPercentage =
    totalExamsTaken > 0
      ? Math.round(
          studentExamRecords.reduce((acc, curr) => acc + curr.percentage, 0) /
            totalExamsTaken
        )
      : 0;

  const passedCount = studentExamRecords.filter(
    (r) => r.transmuted.status === "Passed"
  ).length;

  const filteredRecords = studentExamRecords.filter((record) => {
    if (filterStatus === "passed" && record.transmuted.status !== "Passed") return false;
    if (filterStatus === "failed" && record.transmuted.status !== "Failed") return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = record.exam.name.toLowerCase().includes(q);
      const matchSubject = (record.exam.subject || "").toLowerCase().includes(q);
      const matchCode = (record.exam.course_code || "").toLowerCase().includes(q);
      return matchName || matchSubject || matchCode;
    }
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Header Bar */}
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
          <h2 style={{ fontSize: "1.4rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
            My Examination Records
          </h2>
          <p style={{ fontSize: "0.82rem", color: "#64748b", margin: "0.2rem 0 0 0" }}>
            Student ID: <strong>{currentUser.studentId || (currentUser as any).student_id || "Unassigned"}</strong> • {currentUser.name}
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <span
            style={{
              padding: "0.3rem 0.75rem",
              background: "#eff6ff",
              color: "#0062ff",
              border: "1px solid #bfdbfe",
              borderRadius: "20px",
              fontSize: "0.78rem",
              fontWeight: 700,
            }}
          >
            Personal Portal (Encrypted)
          </span>
        </div>
      </div>

      {/* KPI Metric Cards */}
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
              Exams Completed
            </div>
            <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>
              {totalExamsTaken}
            </div>
          </div>
          <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#0062ff" }}>
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
              Average Score
            </div>
            <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>
              {avgPercentage}%
            </div>
          </div>
          <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#0062ff" }}>
            <TrendingUp size={18} />
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
              Passing Record
            </div>
            <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#059669", lineHeight: 1.1 }}>
              {passedCount} / {totalExamsTaken}
            </div>
          </div>
          <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", color: "#059669" }}>
            <CheckCircle2 size={18} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          padding: "0.85rem 1.15rem",
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        <div style={{ position: "relative", minWidth: "240px", flex: 1, maxWidth: "400px" }}>
          <Search size={15} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input
            type="text"
            className="input"
            placeholder="Search by exam name or course code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: "100%", paddingLeft: "2.2rem", height: "36px", fontSize: "0.82rem" }}
          />
        </div>

        <div style={{ display: "flex", gap: "0.4rem" }}>
          <button
            type="button"
            className={`btn btn-sm ${filterStatus === "all" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setFilterStatus("all")}
            style={{ fontSize: "0.78rem", borderRadius: "20px" }}
          >
            All Exams ({studentExamRecords.length})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${filterStatus === "passed" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setFilterStatus("passed")}
            style={{ fontSize: "0.78rem", borderRadius: "20px" }}
          >
            Passed ({passedCount})
          </button>
        </div>
      </div>

      {/* Personal Examination Records List */}
      {filteredRecords.length === 0 ? (
        <div
          style={{
            padding: "3rem 1.5rem",
            background: "#ffffff",
            border: "1px dashed #cbd5e1",
            borderRadius: "12px",
            textAlign: "center",
          }}
        >
          <BookOpen size={36} style={{ color: "#94a3b8", marginBottom: "0.75rem" }} />
          <h3 style={{ margin: 0, fontSize: "1.05rem", color: "#0f172a" }}>No Examination Records Found</h3>
          <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.82rem", color: "#64748b" }}>
            Only your personal examination submissions will appear here once graded and released by your instructor.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {filteredRecords.map(({ submission, exam, totalQuestions, percentage, transmuted }) => {
            const isSelected = selectedExamId === exam.id;
            const answerEntries = Object.entries(submission.answers || {});

            return (
              <div
                key={submission.id}
                style={{
                  background: "#ffffff",
                  border: isSelected ? "2px solid #0062ff" : "1px solid #e2e8f0",
                  borderRadius: "12px",
                  overflow: "hidden",
                  transition: "all 0.2s ease",
                }}
              >
                {/* Exam Summary Header */}
                <div
                  style={{
                    padding: "1.25rem 1.5rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "1rem",
                    background: isSelected ? "#f8fbff" : "#ffffff",
                    cursor: "pointer",
                  }}
                  onClick={() => setSelectedExamId(isSelected ? null : exam.id)}
                >
                  <div style={{ flex: "1 1 320px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
                      {exam.course_code && (
                        <span
                          style={{
                            background: "#eff6ff",
                            color: "#0062ff",
                            padding: "0.15rem 0.5rem",
                            borderRadius: "5px",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            border: "1px solid #bfdbfe",
                          }}
                        >
                          {exam.course_code}
                        </span>
                      )}
                      <span
                        style={{
                          background: transmuted.status === "Passed" ? "#ecfdf5" : "#fef2f2",
                          color: transmuted.status === "Passed" ? "#059669" : "#dc2626",
                          padding: "0.15rem 0.5rem",
                          borderRadius: "5px",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          border: transmuted.status === "Passed" ? "1px solid #a7f3d0" : "1px solid #fecaca",
                        }}
                      >
                        {transmuted.status}
                      </span>
                    </div>

                    <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#0f172a" }}>
                      {exam.name}
                    </h3>
                    <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "0.25rem" }}>
                      Subject: {exam.subject || "General Subject"} • Instructor: {exam.instructor_name || "Faculty Member"} • Date: {formatDate(submission.created_at)}
                    </div>
                  </div>

                  {/* Score & Transmuted Grade Badges */}
                  <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap" }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "0.72rem", color: "#64748b" }}>Raw Score</div>
                      <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a" }}>
                        {submission.score} / {totalQuestions}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: percentage >= 75 ? "#059669" : "#dc2626", fontWeight: 700 }}>
                        {percentage}%
                      </div>
                    </div>

                    <div style={{ textAlign: "right", minWidth: "90px" }}>
                      <div style={{ fontSize: "0.72rem", color: "#64748b" }}>CHED Grade</div>
                      <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0062ff" }}>
                        {transmuted.grade}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                        {transmuted.remarks}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedExamId(isSelected ? null : exam.id);
                      }}
                      style={{ fontSize: "0.78rem", padding: "0.4rem 0.75rem", borderRadius: "8px" }}
                    >
                      {isSelected ? (
                        <>
                          <ChevronUp size={14} style={{ marginRight: "4px" }} /> Hide Answers
                        </>
                      ) : (
                        <>
                          <ChevronDown size={14} style={{ marginRight: "4px" }} /> View Answers
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Question-by-Question Correct / Incorrect Breakdown */}
                {isSelected && (
                  <div style={{ padding: "1.25rem 1.5rem", borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#0f172a" }}>
                          Question Breakdown & Answer Key Comparison
                        </h4>
                        <p style={{ margin: "0.15rem 0 0 0", fontSize: "0.78rem", color: "#64748b" }}>
                          Review which questions were answered correctly or incorrectly.
                        </p>
                      </div>

                      <div style={{ display: "flex", gap: "1rem", fontSize: "0.78rem" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#059669", fontWeight: 600 }}>
                          <CheckCircle2 size={14} /> Correct
                        </span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#dc2626", fontWeight: 600 }}>
                          <XCircle size={14} /> Incorrect
                        </span>
                      </div>
                    </div>

                    {answerEntries.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "1rem", color: "#64748b", fontSize: "0.82rem" }}>
                        Detailed question item responses are being processed.
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
                          gap: "0.5rem",
                        }}
                      >
                        {answerEntries.map(([qNum, detail]) => {
                          const correctKey = (exam.answer_key || {})[qNum];
                          const isCorrect = correctKey && detail.selected === correctKey;
                          const isBlank = detail.is_empty || !detail.selected;

                          return (
                            <div
                              key={qNum}
                              style={{
                                padding: "0.5rem",
                                background: "#ffffff",
                                borderRadius: "8px",
                                border: isCorrect
                                  ? "1px solid #a7f3d0"
                                  : isBlank
                                    ? "1px solid #e2e8f0"
                                    : "1px solid #fecaca",
                                textAlign: "center",
                              }}
                            >
                              <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700, marginBottom: "2px" }}>
                                Q{qNum}
                              </div>

                              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "4px", fontSize: "0.85rem", fontWeight: 800 }}>
                                <span style={{ color: isCorrect ? "#059669" : "#dc2626" }}>
                                  {detail.selected || "—"}
                                </span>
                                {!isCorrect && correctKey && (
                                  <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 500 }}>
                                    ({correctKey})
                                  </span>
                                )}
                              </div>

                              <div style={{ marginTop: "3px" }}>
                                {isCorrect ? (
                                  <span style={{ fontSize: "0.68rem", color: "#059669", fontWeight: 700 }}>
                                    Correct
                                  </span>
                                ) : isBlank ? (
                                  <span style={{ fontSize: "0.68rem", color: "#94a3b8", fontWeight: 600 }}>
                                    Blank
                                  </span>
                                ) : (
                                  <span style={{ fontSize: "0.68rem", color: "#dc2626", fontWeight: 700 }}>
                                    Incorrect
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
