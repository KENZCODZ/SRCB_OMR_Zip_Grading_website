import React, { useState, useMemo } from "react";
import { BookOpen, Search } from "lucide-react";
import type { AuthUser, Exam, Submission, StudentRosterEntry } from "../../types";
import { calculateTransmutedGrade } from "../../utils/excelUtils";
import { StudentStatsHeader } from "./StudentStatsHeader";
import { StudentExamCard } from "./StudentExamCard";

export interface StudentPortalViewProps {
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
    const rawStudentId = (
      currentUser.studentId ||
      (currentUser as any).student_id ||
      ""
    ).trim();
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

    // Fallback: check if currentUser.id is a student ID (alphanumeric without hyphens)
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

      // 1. Exact string match
      if (subId.toLowerCase() === resolvedId.toLowerCase()) return true;

      // 2. Clean alphanumeric match
      if (cleanSubId === cleanId) return true;

      // 3. Suffix match
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
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.02)",
        }}
      >
        <div>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
            My Examination Records
          </h2>
          <p style={{ fontSize: "0.82rem", color: "#64748b", margin: "0.2rem 0 0 0" }}>
            Student ID:{" "}
            <strong>
              {currentUser.studentId || (currentUser as any).student_id || "Unassigned"}
            </strong>{" "}
            • {currentUser.name}
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <span
            style={{
              padding: "0.3rem 0.75rem",
              background: "var(--primary-light-surface, #f5f3ff)",
              color: "var(--primary, #28166f)",
              border: "1px solid var(--primary-light-border, #ddd6fe)",
              borderRadius: "20px",
              fontSize: "0.78rem",
              fontWeight: 700,
            }}
          >
            Personal Student Workspace
          </span>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <StudentStatsHeader
        totalExamsTaken={totalExamsTaken}
        avgPercentage={avgPercentage}
        passedCount={passedCount}
      />

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
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.02)",
        }}
      >
        <div style={{ position: "relative", minWidth: "240px", flex: 1, maxWidth: "400px" }}>
          <Search
            size={15}
            style={{
              position: "absolute",
              left: "0.75rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#94a3b8",
            }}
          />
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
          <h3 style={{ margin: 0, fontSize: "1.05rem", color: "#0f172a" }}>
            No Examination Records Found
          </h3>
          <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.82rem", color: "#64748b" }}>
            Only your personal examination submissions will appear here once graded and released by your instructor.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {filteredRecords.map(
            ({ submission, exam, totalQuestions, percentage, transmuted }) => (
              <StudentExamCard
                key={submission.id}
                submission={submission}
                exam={exam}
                totalQuestions={totalQuestions}
                percentage={percentage}
                transmuted={transmuted}
                isSelected={selectedExamId === exam.id}
                onToggleSelect={() =>
                  setSelectedExamId(selectedExamId === exam.id ? null : exam.id)
                }
                formatDate={formatDate}
              />
            )
          )}
        </div>
      )}
    </div>
  );
};

export default StudentPortalView;
