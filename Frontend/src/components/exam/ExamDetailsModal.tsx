import React from "react";
import {
  X,
  BookOpen,
  Calendar,
  User,
  Layers,
  FileText,
  Hash,
  GraduationCap,
  Clock,
  Award,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import type { Exam } from "../../types";

interface ExamDetailsModalProps {
  exam: Exam | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (examId: string) => void;
  onEdit?: (exam: Exam) => void;
  formatDate: (iso: string) => string;
}

const ExamDetailsModal: React.FC<ExamDetailsModalProps> = ({
  exam,
  isOpen,
  onClose,
  onDelete,
  onEdit,
  formatDate,
}) => {
  if (!isOpen || !exam) return null;

  const safeExamType = exam.exam_type || "Midterm";
  const questionCount =
    exam.num_items || Object.keys(exam.answer_key || {}).length || 0;
  const configuredAnswers = Object.values(exam.answer_key || {}).filter(
    Boolean,
  ).length;

  const handleDelete = () => {
    if (onDelete) {
      onDelete(exam.id);
      onClose();
    }
  };

  const keyEntries = Object.entries(exam.answer_key || {}).sort(
    (a, b) => parseInt(a[0]) - parseInt(b[0]),
  );

  const columns: Array<Array<{ q: string; ans: string }>> = [];
  const itemsPerCol = 10;
  for (let i = 0; i < keyEntries.length; i += itemsPerCol) {
    columns.push(
      keyEntries.slice(i, i + itemsPerCol).map(([q, ans]) => ({ q, ans })),
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1100,
        padding: "1.5rem",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "860px",
          maxHeight: "90vh",
          overflowY: "auto",
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "18px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
          display: "flex",
          flexDirection: "column",
          padding: 0,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#ffffff",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              flex: 1,
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0062ff",
                flexShrink: 0,
              }}
            >
              <BookOpen size={22} />
            </div>
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  flexWrap: "wrap",
                  marginBottom: "3px",
                }}
              >
                <span
                  style={{
                    background: "#eff6ff",
                    color: "#0062ff",
                    border: "1px solid #bfdbfe",
                    fontSize: "0.7rem",
                    padding: "0.15rem 0.5rem",
                    borderRadius: "4px",
                    fontWeight: 800,
                  }}
                >
                  {safeExamType}
                </span>
                {exam.course_code && (
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: "#0062ff",
                    }}
                  >
                    [{exam.course_code}]
                  </span>
                )}
                {exam.section && (
                  <span
                    style={{ fontSize: "0.75rem", color: "#64748b" }}
                  >
                    • {exam.section}
                  </span>
                )}
              </div>
              <h2
                style={{
                  fontSize: "1.15rem",
                  fontWeight: 800,
                  margin: 0,
                  color: "#0f172a",
                }}
              >
                {exam.name}
              </h2>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {onEdit && (
              <button
                className="btn btn-secondary"
                style={{
                  padding: "0.45rem 1rem",
                  fontSize: "0.82rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  color: "#0f172a",
                  borderRadius: "8px",
                  fontWeight: 600,
                }}
                onClick={() => onEdit(exam)}
              >
                <BookOpen size={15} /> Edit Exam
              </button>
            )}
            {onDelete && (
              <button
                className="btn btn-danger"
                style={{
                  padding: "0.45rem 1rem",
                  fontSize: "0.82rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#ef4444",
                  borderRadius: "8px",
                  fontWeight: 700,
                }}
                onClick={handleDelete}
              >
                <Trash2 size={15} /> Delete Exam
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary btn-icon-only"
              onClick={onClose}
              title="Close"
              style={{
                background: "#f8fafc",
                border: "1px solid #cbd5e1",
                color: "#64748b",
                borderRadius: "8px",
                padding: "0.4rem",
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "1.5rem", display: "grid", gap: "1.5rem" }}>
          {/* Section 1: Academic & Exam Info */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "1.25rem",
            }}
          >
            <h3
              style={{
                fontSize: "0.95rem",
                fontWeight: 800,
                color: "#0f172a",
                marginBottom: "1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <FileText size={16} color="#0062ff" /> Examination Identity & Academic Context
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: "0.85rem",
              }}
            >
              {(
                [
                  {
                    icon: GraduationCap,
                    label: "Subject / Course",
                    value: exam.subject,
                  },
                  { icon: Hash, label: "Course Code", value: exam.course_code },
                  { icon: User, label: "Section", value: exam.section },
                  {
                    icon: BookOpen,
                    label: "Program / Dept.",
                    value: exam.program,
                  },
                  {
                    icon: User,
                    label: "Instructor",
                    value: exam.instructor_name,
                  },
                  {
                    icon: Calendar,
                    label: "Academic Year",
                    value: exam.academic_year,
                  },
                  { icon: Clock, label: "Semester", value: exam.semester },
                  {
                    icon: Calendar,
                    label: "Exam Date",
                    value: exam.exam_date
                      ? new Date(exam.exam_date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "—",
                  },
                  {
                    icon: Layers,
                    label: "Total Items",
                    value: questionCount ? `${questionCount} items` : "—",
                  },
                  {
                    icon: Award,
                    label: "Passing Score",
                    value: exam.passing_score
                      ? `${exam.passing_score} pts`
                      : "—",
                  },
                ] as const
              ).map(({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    padding: "0.65rem 0.85rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      marginBottom: "4px",
                    }}
                  >
                    <Icon size={12} color="#0062ff" />
                    <span
                      style={{
                        fontSize: "0.68rem",
                        color: "#64748b",
                        textTransform: "uppercase" as const,
                        letterSpacing: "0.05em",
                        fontWeight: 700,
                      }}
                    >
                      {label}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: "0.88rem",
                      fontWeight: 700,
                      color:
                        value && value !== "—"
                          ? "#0f172a"
                          : "#94a3b8",
                    }}
                  >
                    {value || "—"}
                  </div>
                </div>
              ))}
            </div>

            {exam.instructions && (
              <div
                style={{
                  marginTop: "1rem",
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "0.75rem 1rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    marginBottom: "6px",
                  }}
                >
                  <FileText size={12} color="#0062ff" />
                  <span
                    style={{
                      fontSize: "0.68rem",
                      color: "#64748b",
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.05em",
                      fontWeight: 700,
                    }}
                  >
                    Exam Instructions
                  </span>
                </div>
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "#475569",
                    margin: 0,
                    lineHeight: 1.6,
                  }}
                >
                  {exam.instructions}
                </p>
              </div>
            )}
          </div>

          {/* Section 2: Answer Key */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "1.25rem",
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
              <h3
                style={{
                  fontSize: "0.95rem",
                  fontWeight: 800,
                  color: "#0f172a",
                  margin: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <CheckCircle2 size={16} color="#0062ff" /> Configured Answer Key
              </h3>
              <div>
                {configuredAnswers === questionCount && questionCount > 0 ? (
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "0.78rem",
                      color: "#059669",
                      fontWeight: 700,
                      background: "#ecfdf5",
                      border: "1px solid #a7f3d0",
                      padding: "0.2rem 0.6rem",
                      borderRadius: "6px",
                    }}
                  >
                    <CheckCircle2 size={14} /> Complete ({configuredAnswers}/
                    {questionCount})
                  </span>
                ) : (
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "0.78rem",
                      color: "#dc2626",
                      fontWeight: 700,
                      background: "#fef2f2",
                      border: "1px solid #fecaca",
                      padding: "0.2rem 0.6rem",
                      borderRadius: "6px",
                    }}
                  >
                    <AlertCircle size={14} /> {configuredAnswers}/
                    {questionCount} configured
                  </span>
                )}
              </div>
            </div>

            {keyEntries.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  color: "#64748b",
                  fontSize: "0.85rem",
                  padding: "1.5rem",
                }}
              >
                No answer key configured for this examination.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${Math.min(columns.length, 5)}, 1fr)`,
                  gap: "0.5rem",
                }}
              >
                {columns.map((col, colIdx) => (
                  <div key={colIdx}>
                    {col.map(({ q, ans }) => (
                      <div
                        key={q}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          padding: "0.3rem 0.5rem",
                          borderRadius: "6px",
                          marginBottom: "3px",
                          background: "#ffffff",
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.75rem",
                            color: "#0f172a",
                            fontWeight: 700,
                            minWidth: "22px",
                            textAlign: "right",
                          }}
                        >
                          {q}.
                        </span>
                        <span
                          style={{
                            width: "24px",
                            height: "24px",
                            borderRadius: "50%",
                            background: "#eff6ff",
                            border: "1.5px solid #0062ff",
                            color: "#0062ff",
                            fontSize: "0.75rem",
                            fontWeight: 800,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {ans}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.5rem",
              paddingTop: "1rem",
              borderTop: "1px solid #f1f5f9",
            }}
          >
            <span
              style={{
                fontSize: "0.75rem",
                color: "#64748b",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontWeight: 600,
              }}
            >
              <Calendar size={12} color="#0062ff" />
              Created: {formatDate(exam.created_at)}
            </span>
            <button
              className="btn btn-secondary"
              onClick={onClose}
              style={{
                padding: "0.5rem 1.25rem",
                fontSize: "0.85rem",
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                color: "#0f172a",
                fontWeight: 600,
                borderRadius: "8px",
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamDetailsModal;
