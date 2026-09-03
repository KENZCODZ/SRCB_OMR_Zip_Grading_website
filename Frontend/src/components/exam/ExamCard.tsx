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
import type { Exam } from "../../types";

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
          background: "#eff6ff",
          color: "#2563eb",
          border: "1px solid #bfdbfe",
        };
      case "midterm":
        return {
          background: "#fef3c7",
          color: "#b45309",
          border: "1px solid #fde68a",
        };
      case "pre-final":
      case "prefinal":
        return {
          background: "#f3e8ff",
          color: "#7e22ce",
          border: "1px solid #e9d5ff",
        };
      case "final":
        return {
          background: "#ecfdf5",
          color: "#047857",
          border: "1px solid #a7f3d0",
        };
      default:
        return {
          background: "#f1f5f9",
          color: "#475569",
          border: "1px solid #cbd5e1",
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
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        border: isSelected ? "2px solid #0062ff" : "1px solid #e2e8f0",
        background: isSelected
          ? "linear-gradient(135deg, #f0f7ff 0%, #e0effe 100%)"
          : "#ffffff",
        boxShadow: isSelected
          ? "0 4px 16px rgba(0, 98, 255, 0.16), 0 0 0 1px #0062ff"
          : "0 2px 6px rgba(0, 0, 0, 0.02)",
        borderRadius: "14px",
        padding: "1rem",
        overflow: "hidden",
      }}
    >
      {isSelected && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            bottom: 0,
            width: "4px",
            background: "#0062ff",
            borderTopLeftRadius: "14px",
            borderBottomLeftRadius: "14px",
          }}
        />
      )}
      <div
        className="flex-justify-between"
        style={{ alignItems: "flex-start" }}
      >
        <div style={{ display: "flex", gap: "12px", flex: 1 }}>
          <div
            className="icon-avatar"
            style={{
              background: isSelected ? "#0062ff" : "#eff6ff",
              color: isSelected ? "#ffffff" : "#0062ff",
              border: isSelected ? "1px solid #0062ff" : "1px solid #bfdbfe",
              minWidth: "36px",
              height: "36px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: isSelected ? "0 2px 8px rgba(0, 98, 255, 0.3)" : "none",
              transition: "all 0.2s ease",
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

              {isSelected && (
                <span
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    background: "#0062ff",
                    color: "#ffffff",
                    padding: "0.15rem 0.5rem",
                    borderRadius: "4px",
                    letterSpacing: "0.02em",
                  }}
                >
                  Selected
                </span>
              )}

              {course_code && (
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: "#0062ff",
                  }}
                >
                  [{course_code}]
                </span>
              )}

              {section && (
                <span
                  style={{ fontSize: "0.75rem", color: "#64748b" }}
                >
                  • {section}
                </span>
              )}
            </div>

            <h4
              style={{
                margin: "0 0 4px 0",
                fontSize: "1.02rem",
                fontWeight: 700,
                color: isSelected ? "#0052d9" : "#0f172a",
                transition: "color 0.2s ease",
              }}
            >
              {name}
            </h4>

            {subject && subject !== name && (
              <div
                style={{
                  fontSize: "0.82rem",
                  color: "#475569",
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
                color: "#64748b",
              }}
            >
              <span
                style={{ display: "flex", alignItems: "center", gap: "4px" }}
              >
                <Layers size={13} color="#0062ff" />
                <strong style={{ color: "#0f172a" }}>{questionCount}</strong> items
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
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.04)",
                color: "#0f172a",
                borderRadius: "8px",
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
                background: "#fef2f2",
                border: "1px solid #fecaca",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.04)",
                borderRadius: "8px",
              }}
            >
              <Trash2 size={14} style={{ color: "#ef4444" }} />
            </button>
          )}
          <ChevronRight
            size={18}
            style={{
              color: isSelected ? "#0062ff" : "#94a3b8",
              transform: isSelected ? "translateX(2px)" : "none",
              transition: "all 0.2s ease",
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ExamCard;
