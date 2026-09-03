import React from "react";
import { BookOpen, TrendingUp, CheckCircle2 } from "lucide-react";

interface StudentStatsHeaderProps {
  totalExamsTaken: number;
  avgPercentage: number;
  passedCount: number;
}

export const StudentStatsHeader: React.FC<StudentStatsHeaderProps> = ({
  totalExamsTaken,
  avgPercentage,
  passedCount,
}) => {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: "0.85rem",
      }}
    >
      {/* Exams Completed */}
      <div
        style={{
          padding: "1rem 1.15rem",
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.02)",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "0.78rem",
              fontWeight: 600,
              color: "#64748b",
              marginBottom: "0.25rem",
            }}
          >
            Exams Completed
          </div>
          <div
            style={{
              fontSize: "1.45rem",
              fontWeight: 800,
              color: "#0f172a",
              lineHeight: 1.1,
            }}
          >
            {totalExamsTaken}
          </div>
        </div>
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "8px",
            background: "#eff6ff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#0062ff",
          }}
        >
          <BookOpen size={18} />
        </div>
      </div>

      {/* Average Score */}
      <div
        style={{
          padding: "1rem 1.15rem",
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.02)",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "0.78rem",
              fontWeight: 600,
              color: "#64748b",
              marginBottom: "0.25rem",
            }}
          >
            Average Score
          </div>
          <div
            style={{
              fontSize: "1.45rem",
              fontWeight: 800,
              color: "#0f172a",
              lineHeight: 1.1,
            }}
          >
            {avgPercentage}%
          </div>
        </div>
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "8px",
            background: "#eff6ff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#0062ff",
          }}
        >
          <TrendingUp size={18} />
        </div>
      </div>

      {/* Passing Record */}
      <div
        style={{
          padding: "1rem 1.15rem",
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.02)",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "0.78rem",
              fontWeight: 600,
              color: "#64748b",
              marginBottom: "0.25rem",
            }}
          >
            Passing Record
          </div>
          <div
            style={{
              fontSize: "1.45rem",
              fontWeight: 800,
              color: "#059669",
              lineHeight: 1.1,
            }}
          >
            {passedCount} / {totalExamsTaken}
          </div>
        </div>
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "8px",
            background: "#ecfdf5",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#059669",
          }}
        >
          <CheckCircle2 size={18} />
        </div>
      </div>
    </div>
  );
};

export default StudentStatsHeader;
