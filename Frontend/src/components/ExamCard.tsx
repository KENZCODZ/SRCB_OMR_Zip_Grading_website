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
          background: "var(--info-bg)",
          color: "var(--info-text)",
          border: "1px solid var(--info-border)",
        };
      case "midterm":
        return {
          background: "var(--warning-bg)",
          color: "var(--warning-text)",
          border: "1px solid var(--warning-border)",
        };
      case "pre-final":
      case "prefinal":
        return {
          background: "#f5f3ff",
          color: "#6d28d9",
          border: "1px solid #ddd6fe",
        };
      case "final":
        return {
          background: "var(--success-bg)",
          color: "var(--success-text)",
          border: "1px solid var(--success-border)",
        };
      default:
        return {
          background: "var(--bg-surface-2)",
          color: "var(--text-secondary)",
          border: "1px solid var(--border-md)",
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
        padding: "1rem",
      }}
    >
      <div
        className="flex-justify-between"
        style={{ alignItems: "flex-start" }}
      >
        <div style={{ display: "flex", gap: "12px", flex: 1 }}>
          <div
            style={{
              background: isSelected ? "var(--gold-pale)" : "var(--bg-surface-2)",
              color: isSelected ? "var(--gold-deep)" : "var(--text-secondary)",
              minWidth: "40px",
              height: "40px",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: `1px solid ${isSelected ? "var(--gold-light)" : "var(--border)"}`,
              flexShrink: 0,
            }}
          >
            <BookOpen size={20} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
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
                    color: "var(--navy-light)",
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
                fontSize: "1rem",
                fontWeight: 700,
                color: "var(--text-heading)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
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
                <Layers size={13} color="var(--gold-primary)" />
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
            flexShrink: 0,
          }}
        >
          {onInspect && (
            <button
              className="btn btn-secondary btn-sm"
              title="View Exam Details"
              onClick={(e) => {
                e.stopPropagation();
                onInspect(exam);
              }}
              style={{
                width: "32px",
                height: "32px",
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Eye size={14} />
            </button>
          )}
          {onDelete && (
            <button
              className="btn btn-danger btn-sm"
              title="Delete Exam"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(id);
              }}
              style={{
                width: "32px",
                height: "32px",
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Trash2 size={14} />
            </button>
          )}
          <ChevronRight size={18} style={{ color: "var(--text-muted)" }} />
        </div>
      </div>
    </div>
  );
};

export default ExamCard;
