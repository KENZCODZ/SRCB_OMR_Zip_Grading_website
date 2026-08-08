import React from "react";
import {
  BookOpen,
  Calendar,
  Trash2,
  ChevronRight,
  User,
  Layers,
  Eye,
} from "lucide-react";
import type { Exam } from "../types";

export interface ExamCardProps {
  exam: Exam;
  isSelected?: boolean;
  onSelect: (examId: string) => void;
  onDelete?: (examId: string) => void;
  onInspect?: (exam: Exam) => void;
  formatDate: (iso: string) => string;
}

export const ExamCard: React.FC<ExamCardProps> = ({
  exam,
  isSelected = false,
  onSelect,
  onDelete,
  onInspect,
  formatDate,
}) => {
  const {
    id,
    name,
    answer_key,
    created_at,
    subject,
    course_code,
    section,
    academic_year,
    semester,
    instructor_name,
    num_items,
  } = exam;

  const safeExamType = exam.exam_type || "Midterm";
  const questionCount = num_items || Object.keys(answer_key || {}).length || 50;

  const getExamTypeBadgeStyle = (type?: string | null) => {
    const normalized = (type || "Midterm").toLowerCase();
    switch (normalized) {
      case "preliminary":
      case "prelim":
        return {
          background: "rgba(59, 130, 246, 0.15)",
          color: "#60a5fa",
          border: "1px solid rgba(59, 130, 246, 0.3)",
        };
      case "midterm":
        return {
          background: "rgba(245, 158, 11, 0.15)",
          color: "var(--srcb-gold-light)",
          border: "1px solid rgba(245, 158, 11, 0.3)",
        };
      case "pre-final":
      case "prefinal":
        return {
          background: "rgba(168, 85, 247, 0.15)",
          color: "#c084fc",
          border: "1px solid rgba(168, 85, 247, 0.3)",
        };
      case "final":
        return {
          background: "rgba(16, 185, 129, 0.15)",
          color: "#34d399",
          border: "1px solid rgba(16, 185, 129, 0.3)",
        };
      default:
        return {
          background: "rgba(148, 163, 184, 0.15)",
          color: "#cbd5e1",
          border: "1px solid rgba(148, 163, 184, 0.3)",
        };
    }
  };

  return (
    <div
      className={`card exam-item-card ${isSelected ? "exam-card-selected" : ""}`}
      onClick={() => onSelect(id)}
      style={{
        cursor: "pointer",
        position: "relative",
        transition: "all 0.2s ease",
        border: isSelected
          ? "1px solid var(--srcb-gold-accent)"
          : "1px solid var(--border)",
        background: isSelected
          ? "rgba(15, 23, 42, 0.95)"
          : "rgba(15, 23, 42, 0.6)",
        padding: "1rem",
      }}
    >
      <div
        className="flex-justify-between"
        style={{ alignItems: "flex-start" }}
      >
        <div style={{ display: "flex", gap: "12px", flex: 1 }}>
          <div
            className="icon-avatar"
            style={{
              background: isSelected
                ? "rgba(245, 158, 11, 0.2)"
                : "rgba(255, 255, 255, 0.05)",
              color: isSelected
                ? "var(--srcb-gold-accent)"
                : "var(--text-secondary)",
              minWidth: "40px",
              height: "40px",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BookOpen size={20} />
          </div>

          <div style={{ flex: 1 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                flexWrap: "wrap",
                marginBottom: "4px",
              }}
            >
              <span
                className="badge"
                style={{
                  ...getExamTypeBadgeStyle(safeExamType),
                  fontSize: "0.72rem",
                  padding: "0.2rem 0.5rem",
                  borderRadius: "4px",
                  fontWeight: 700,
                }}
              >
                {safeExamType}
              </span>

              {course_code && (
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: "var(--primary)",
                  }}
                >
                  [{course_code}]
                </span>
              )}

              {section && (
                <span
                  style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}
                >
                  • {section}
                </span>
              )}
            </div>

            <h4
              style={{
                margin: "0 0 6px 0",
                fontSize: "1.02rem",
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              {name}
            </h4>

            {subject && subject !== name && (
              <div
                style={{
                  fontSize: "0.82rem",
                  color: "var(--text-secondary)",
                  marginBottom: "6px",
                }}
              >
                {subject}
              </div>
            )}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                flexWrap: "wrap",
                fontSize: "0.78rem",
                color: "var(--text-muted)",
              }}
            >
              <span
                style={{ display: "flex", alignItems: "center", gap: "4px" }}
              >
                <Layers size={13} color="var(--srcb-gold-light)" />
                <strong>{questionCount}</strong> items
              </span>

              {instructor_name && (
                <span
                  style={{ display: "flex", alignItems: "center", gap: "4px" }}
                >
                  <User size={13} />
                  {instructor_name}
                </span>
              )}

              {academic_year && (
                <span>
                  AY {academic_year} {semester ? `(${semester})` : ""}
                </span>
              )}

              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  marginLeft: "auto",
                }}
              >
                <Calendar size={13} />
                {formatDate(created_at)}
              </span>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            marginLeft: "12px",
            position: "relative",
            zIndex: 2,
          }}
        >
          {onInspect && (
            <button
              className="btn btn-secondary btn-icon-only"
              title="View Exam Details"
              onClick={(e) => {
                e.stopPropagation();
                onInspect(exam);
              }}
              style={{
                width: "32px",
                height: "32px",
                padding: 0,
                background: "rgba(8, 17, 32, 0.95)",
                border: "1px solid rgba(245, 158, 11, 0.35)",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.25)",
                opacity: 1,
                color: "var(--text-primary)",
              }}
            >
              <Eye size={14} />
            </button>
          )}
          {onDelete && (
            <button
              className="btn btn-secondary btn-icon-only"
              title="Delete Exam"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(id);
              }}
              style={{
                width: "32px",
                height: "32px",
                padding: 0,
                background: "rgba(8, 17, 32, 0.95)",
                border: "1px solid rgba(244, 63, 94, 0.35)",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.25)",
                opacity: 1,
              }}
            >
              <Trash2 size={14} style={{ color: "var(--error)" }} />
            </button>
          )}
          <ChevronRight size={18} className="text-muted" />
        </div>
      </div>
    </div>
  );
};

export default ExamCard;
