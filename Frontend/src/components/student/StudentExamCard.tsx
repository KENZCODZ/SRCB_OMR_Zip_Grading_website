import React from "react";
import { CheckCircle2, XCircle, ChevronDown, ChevronUp, Clock } from "lucide-react";
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
  const isPublished = submission.status === "published" || submission.is_published === true;
  const answerEntries = Object.entries(submission.answers || {});

  return (
    <div
      style={{
        background: "#ffffff",
        border: isSelected
          ? "2px solid var(--primary, #28166f)"
          : isPublished
          ? "1px solid #e2e8f0"
          : "1px solid #fde68a",
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
          background: isSelected ? "#f8fbff" : !isPublished ? "#fffdf7" : "#ffffff",
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
                  background: "var(--primary-light-surface, #f5f3ff)",
                  color: "var(--primary, #28166f)",
                  padding: "0.15rem 0.5rem",
                  borderRadius: "5px",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  border: "1px solid var(--primary-light-border, #ddd6fe)",
                }}
              >
                {exam.course_code}
              </span>
            )}

            {isPublished ? (
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
            ) : (
              <span
                style={{
                  background: "#fffbeb",
                  color: "#b45309",
                  padding: "0.15rem 0.6rem",
                  borderRadius: "5px",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  border: "1px solid #fde68a",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Clock size={12} /> Pending Teacher Publication
              </span>
            )}
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
          {isPublished ? (
            <>
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
                    color: "var(--primary, #28166f)",
                  }}
                >
                  {transmuted.grade}
                </div>
                <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                  {transmuted.remarks}
                </div>
              </div>
            </>
          ) : (
            <div style={{ textAlign: "right", minWidth: "140px" }}>
              <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                Gradebook Status
              </div>
              <div
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 800,
                  color: "#b45309",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: "5px",
                }}
              >
                <Clock size={16} /> Pending
              </div>
              <div style={{ fontSize: "0.74rem", color: "#b45309", fontWeight: 600 }}>
                Awaiting teacher publish
              </div>
            </div>
          )}

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
                <ChevronUp size={14} style={{ marginRight: "4px" }} /> Close Details
              </>
            ) : isPublished ? (
              <>
                <ChevronDown size={14} style={{ marginRight: "4px" }} /> View Answers
              </>
            ) : (
              <>
                <ChevronDown size={14} style={{ marginRight: "4px" }} /> View Status
              </>
            )}
          </button>
        </div>
      </div>

      {/* When Pending: Sealed notice */}
      {isSelected && !isPublished && (
        <div
          style={{
            padding: "1.5rem",
            borderTop: "1px solid #fde68a",
            background: "#fffdfa",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
              padding: "1rem 1.25rem",
              background: "#fffbeb",
              border: "1px solid #fde68a",
              borderRadius: "10px",
            }}
          >
            <Clock size={22} color="#b45309" style={{ flexShrink: 0, marginTop: "2px" }} />
            <div>
              <div style={{ fontWeight: 800, color: "#92400e", fontSize: "0.95rem" }}>
                Examination Score Pending Publication
              </div>
              <p style={{ margin: "4px 0 0 0", fontSize: "0.82rem", color: "#b45309", lineHeight: 1.5 }}>
                Your answer sheet for <strong>{exam.name}</strong> was scanned and recorded in the instructor's gradebook on{" "}
                {formatDate(submission.created_at)}. 
                Official grades, score transmutations, and question-by-question bubble review are currently sealed until your instructor verifies and publishes the results.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Question-by-Question Correct / Incorrect Breakdown (Only when published) */}
      {isSelected && isPublished && (
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
                gridTemplateColumns: "repeat(auto-fill, minmax(75px, 1fr))",
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
