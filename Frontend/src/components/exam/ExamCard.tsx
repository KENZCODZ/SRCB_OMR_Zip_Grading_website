import React from "react";
import {
  BookOpen,
  Calendar,
  Trash2,
  ChevronRight,
  User,
  Layers,
} from "lucide-react";
import type { Exam } from "../../types";

export interface ExamCardProps {
  exam: Exam;
  isSelected?: boolean;
  submissionCount?: number;
  onSelect: (examId: string) => void;
  onDelete?: (examId: string) => void;
  onInspect?: (exam: Exam) => void;
  formatDate: (iso: string) => string;
}

export const ExamCard: React.FC<ExamCardProps> = ({
  exam,
  isSelected = false,
  submissionCount,
  onSelect,
  onDelete,
  onInspect: _onInspect,
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
          background: "var(--primary-light-surface, #f5f3ff)",
          color: "#2563eb",
          border: "1px solid var(--primary-light-border, #ddd6fe)",
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
        border: isSelected ? "2px solid var(--primary, #28166f)" : "1px solid #e2e8f0",
        background: isSelected
          ? "linear-gradient(135deg, #f8f7ff 0%, #f1effe 100%)"
          : "#ffffff",
        boxShadow: isSelected
          ? "0 4px 16px rgba(40, 22, 111, 0.12), 0 0 0 1px var(--primary, #28166f)"
          : "0 2px 6px rgba(0, 0, 0, 0.02)",
        borderRadius: "14px",
        padding: "1rem 1.15rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.65rem",
        flexShrink: 0,
        width: "100%",
        boxSizing: "border-box",
        minHeight: "fit-content",
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
            background: "var(--primary, #28166f)",
            borderTopLeftRadius: "14px",
            borderBottomLeftRadius: "14px",
          }}
        />
      )}

      {/* Top Header Row: Badges on left, Actions on right */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            flexWrap: "wrap",
          }}
        >
          <span
            className="badge"
            style={{
              ...getExamTypeBadgeStyle(safeExamType),
              fontSize: "0.72rem",
              padding: "0.2rem 0.55rem",
              borderRadius: "6px",
              fontWeight: 700,
            }}
          >
            {safeExamType}
          </span>

          {isSelected && (
            <span
              style={{
                fontSize: "0.68rem",
                fontWeight: 700,
                background: "var(--primary, #28166f)",
                color: "#ffffff",
                padding: "0.15rem 0.5rem",
                borderRadius: "6px",
                letterSpacing: "0.02em",
              }}
            >
              Selected
            </span>
          )}

          {course_code && (
            <span
              style={{
                fontSize: "0.74rem",
                fontWeight: 700,
                color: "var(--primary, #28166f)",
                background: "rgba(40, 22, 111, 0.06)",
                padding: "0.15rem 0.45rem",
                borderRadius: "4px",
              }}
            >
              [{course_code}]
            </span>
          )}

          {section && (
            <span style={{ fontSize: "0.74rem", color: "#64748b", fontWeight: 500 }}>
              • {section}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            flexShrink: 0,
          }}
        >
          {onDelete && (
            <button
              className="btn btn-secondary btn-icon-only"
              title="Delete Exam"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(id);
              }}
              style={{
                width: "28px",
                height: "28px",
                padding: 0,
                background: "#fef2f2",
                border: "1px solid #fecaca",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
                borderRadius: "7px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <Trash2 size={13} style={{ color: "#ef4444" }} />
            </button>
          )}
          <ChevronRight
            size={16}
            style={{
              color: isSelected ? "var(--primary, #28166f)" : "#94a3b8",
              transform: isSelected ? "translateX(2px)" : "none",
              transition: "all 0.2s ease",
            }}
          />
        </div>
      </div>

      {/* Middle Body: Icon + Title & Subject */}
      <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", width: "100%" }}>
        <div
          className="icon-avatar"
          style={{
            background: isSelected ? "var(--primary, #28166f)" : "var(--primary-light-surface, #f5f3ff)",
            color: isSelected ? "#ffffff" : "var(--primary, #28166f)",
            border: isSelected ? "1px solid var(--primary, #28166f)" : "1px solid var(--primary-light-border, #ddd6fe)",
            minWidth: "32px",
            width: "32px",
            height: "32px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            marginTop: "1px",
            boxShadow: isSelected ? "0 2px 6px rgba(40, 22, 111, 0.25)" : "none",
            transition: "all 0.2s ease",
          }}
        >
          <BookOpen size={16} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <h4
            style={{
              margin: 0,
              fontSize: "0.96rem",
              fontWeight: 700,
              lineHeight: 1.35,
              color: isSelected ? "var(--primary, #28166f)" : "#0f172a",
              wordBreak: "break-word",
            }}
          >
            {name}
          </h4>

          {subject && subject !== name && (
            <div
              style={{
                fontSize: "0.78rem",
                color: "#64748b",
                marginTop: "3px",
                wordBreak: "break-word",
              }}
            >
              {subject}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Metadata Row: Items, Graded count, Instructor, AY, Date */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          flexWrap: "wrap",
          fontSize: "0.76rem",
          color: "#64748b",
          paddingTop: "0.4rem",
          borderTop: "1px dashed #edf2f7",
          marginTop: "0.15rem",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
          <Layers size={13} color="var(--primary, #28166f)" />
          <strong style={{ color: "#0f172a" }}>{questionCount}</strong> items
        </span>

        {submissionCount !== undefined && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "3px",
              padding: "0.15rem 0.45rem",
              borderRadius: "5px",
              background: submissionCount > 0 ? "#f0fdf4" : "#f8fafc",
              color: submissionCount > 0 ? "#15803d" : "#64748b",
              border: `1px solid ${submissionCount > 0 ? "#bbf7d0" : "#e2e8f0"}`,
              fontSize: "0.7rem",
              fontWeight: 700,
            }}
          >
            {submissionCount} Graded
          </span>
        )}

        {academic_year && (
          <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
            AY {academic_year} {semester ? `(${semester})` : ""}
          </span>
        )}

        {instructor_name && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.72rem" }}>
            <User size={12} />
            {instructor_name}
          </span>
        )}

        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            marginLeft: "auto",
            fontSize: "0.72rem",
            color: "#94a3b8",
          }}
        >
          <Calendar size={12} />
          {formatDate(created_at)}
        </span>
      </div>

      {/* Action Footer: Launch Grading Studio */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: "0.25rem",
          paddingTop: "0.5rem",
          borderTop: "1px solid #f1f5f9",
        }}
      >
        <span style={{ fontSize: "0.74rem", color: "#64748b", fontWeight: 600 }}>
          {submissionCount && submissionCount > 0 ? `${submissionCount} sheets graded` : "Ready for OMR grading"}
        </span>
        <button
          type="button"
          className="btn btn-sm btn-primary"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(id);
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "0.76rem",
            fontWeight: 700,
            borderRadius: "8px",
            padding: "0.3rem 0.75rem",
          }}
        >
          Open Grading Studio <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
};

export default ExamCard;
