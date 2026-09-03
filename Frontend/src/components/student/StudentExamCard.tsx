import React from "react";
import { CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import type { Exam, Submission, TransmutedGradeResult } from "../../types";

interface StudentExamCardProps {
  submission: Submission;
  exam: Exam;
  totalQuestions: number;
  percentage: number;
  transmuted: TransmutedGradeResult;
  isSelected: boolean;
  onToggleSelect: () => void;
  formatDate: (iso: string) => string;
}

export const StudentExamCard: React.FC<StudentExamCardProps> = ({
  submission,
  exam,
  totalQuestions,
  percentage,
  transmuted,
  isSelected,
  onToggleSelect,
  formatDate,
}) => {
  const answerEntries = Object.entries(submission.answers || {});

  return (
    <div
      style={{
        background: "#ffffff",
        border: isSelected ? "2px solid #0062ff" : "1px solid #e2e8f0",
        borderRadius: "12px",
        overflow: "hidden",
        transition: "all 0.2s ease",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.02)",
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
        onClick={onToggleSelect}
      >
        <div style={{ flex: "1 1 320px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.3rem",
            }}
          >
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
                background:
                  transmuted.status === "Passed" ? "#ecfdf5" : "#fef2f2",
                color:
                  transmuted.status === "Passed" ? "#059669" : "#dc2626",
                padding: "0.15rem 0.5rem",
                borderRadius: "5px",
                fontSize: "0.72rem",
                fontWeight: 700,
                border:
                  transmuted.status === "Passed"
                    ? "1px solid #a7f3d0"
                    : "1px solid #fecaca",
              }}
            >
              {transmuted.status}
            </span>
          </div>

          <h3
            style={{
              margin: 0,
              fontSize: "1.1rem",
              fontWeight: 800,
              color: "#0f172a",
            }}
          >
            {exam.name}
          </h3>
          <div
            style={{
              fontSize: "0.78rem",
              color: "#64748b",
              marginTop: "0.25rem",
            }}
          >
            Subject: {exam.subject || "General Subject"} • Instructor:{" "}
            {exam.instructor_name || "Faculty Member"} • Date:{" "}
            {formatDate(submission.created_at)}
          </div>
        </div>

        {/* Score & Transmuted Grade Badges */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1.25rem",
            flexWrap: "wrap",
          }}
        >
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
              Raw Score
            </div>
            <div
              style={{
                fontSize: "1.25rem",
                fontWeight: 800,
                color: "#0f172a",
              }}
            >
              {submission.score} / {totalQuestions}
            </div>
            <div
              style={{
                fontSize: "0.75rem",
                color: percentage >= 75 ? "#059669" : "#dc2626",
                fontWeight: 700,
              }}
            >
              {percentage}%
            </div>
          </div>

          <div style={{ textAlign: "right", minWidth: "90px" }}>
            <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
              CHED Grade
            </div>
            <div
              style={{
                fontSize: "1.25rem",
                fontWeight: 800,
                color: "#0062ff",
              }}
            >
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
              onToggleSelect();
            }}
            style={{
              fontSize: "0.78rem",
              padding: "0.4rem 0.75rem",
              borderRadius: "8px",
            }}
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
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderTop: "1px solid #e2e8f0",
            background: "#f8fafc",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <div>
              <h4
                style={{
                  margin: 0,
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  color: "#0f172a",
                }}
              >
                Question Breakdown & Answer Key Comparison
              </h4>
              <p
                style={{
                  margin: "0.15rem 0 0 0",
                  fontSize: "0.78rem",
                  color: "#64748b",
                }}
              >
                Review which questions were answered correctly or incorrectly.
              </p>
            </div>

            <div
              style={{
                display: "flex",
                gap: "1rem",
                fontSize: "0.78rem",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  color: "#059669",
                  fontWeight: 600,
                }}
              >
                <CheckCircle2 size={14} /> Correct
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  color: "#dc2626",
                  fontWeight: 600,
                }}
              >
                <XCircle size={14} /> Incorrect
              </span>
            </div>
          </div>

          {answerEntries.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "1rem",
                color: "#64748b",
                fontSize: "0.82rem",
              }}
            >
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
                const isCorrect =
                  correctKey && detail.selected === correctKey;
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
                    <div
                      style={{
                        fontSize: "0.72rem",
                        color: "#64748b",
                        fontWeight: 700,
                        marginBottom: "2px",
                      }}
                    >
                      Q{qNum}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "0.85rem",
                        fontWeight: 800,
                      }}
                    >
                      <span
                        style={{ color: isCorrect ? "#059669" : "#dc2626" }}
                      >
                        {detail.selected || "—"}
                      </span>
                      {!isCorrect && correctKey && (
                        <span
                          style={{
                            fontSize: "0.72rem",
                            color: "#64748b",
                            fontWeight: 500,
                          }}
                        >
                          ({correctKey})
                        </span>
                      )}
                    </div>

                    <div style={{ marginTop: "3px" }}>
                      {isCorrect ? (
                        <span
                          style={{
                            fontSize: "0.68rem",
                            color: "#059669",
                            fontWeight: 700,
                          }}
                        >
                          Correct
                        </span>
                      ) : isBlank ? (
                        <span
                          style={{
                            fontSize: "0.68rem",
                            color: "#94a3b8",
                            fontWeight: 600,
                          }}
                        >
                          Blank
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: "0.68rem",
                            color: "#dc2626",
                            fontWeight: 700,
                          }}
                        >
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
};

export default StudentExamCard;
