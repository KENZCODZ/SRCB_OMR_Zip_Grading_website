import React from "react";

export interface SkeletonProps {
  variant?: "text" | "circular" | "rounded" | "rectangular";
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  animation?: "shimmer" | "pulse" | "none";
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Base atomic Skeleton component with smooth shimmer wave animation.
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  variant = "rounded",
  width,
  height,
  borderRadius,
  animation = "shimmer",
  className = "",
  style = {},
}) => {
  const getVariantClass = () => {
    switch (variant) {
      case "circular":
        return "skeleton-circular";
      case "text":
        return "skeleton-text";
      case "rectangular":
        return "skeleton-rectangular";
      case "rounded":
      default:
        return "skeleton-rounded";
    }
  };

  const getAnimationClass = () => {
    switch (animation) {
      case "pulse":
        return "skeleton-pulse";
      case "none":
        return "skeleton-none";
      case "shimmer":
      default:
        return "";
    }
  };

  const computedStyle: React.CSSProperties = {
    width: width !== undefined ? (typeof width === "number" ? `${width}px` : width) : undefined,
    height: height !== undefined ? (typeof height === "number" ? `${height}px` : height) : undefined,
    borderRadius: borderRadius !== undefined ? (typeof borderRadius === "number" ? `${borderRadius}px` : borderRadius) : undefined,
    ...style,
  };

  return (
    <div
      className={`skeleton ${getVariantClass()} ${getAnimationClass()} ${className}`.trim()}
      style={computedStyle}
      aria-hidden="true"
    />
  );
};

export interface SkeletonTextProps {
  lines?: number;
  gap?: string | number;
  height?: string | number;
  lastLineWidth?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Multi-line paragraph skeleton loader with organic varied line lengths.
 */
export const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 3,
  gap = "0.45rem",
  height = "0.85rem",
  lastLineWidth = "65%",
  className = "",
  style = {},
}) => {
  return (
    <div
      className={`skeleton-text-group ${className}`.trim()}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: typeof gap === "number" ? `${gap}px` : gap,
        width: "100%",
        ...style,
      }}
      aria-hidden="true"
    >
      {Array.from({ length: lines }).map((_, index) => {
        const isLast = index === lines - 1;
        const width = isLast ? lastLineWidth : index % 2 === 1 ? "92%" : "100%";
        return (
          <Skeleton
            key={index}
            variant="text"
            height={height}
            width={width}
            borderRadius={6}
          />
        );
      })}
    </div>
  );
};

export interface SkeletonAvatarProps {
  size?: number | string;
  shape?: "circular" | "rounded";
  className?: string;
  style?: React.CSSProperties;
}

export const SkeletonAvatar: React.FC<SkeletonAvatarProps> = ({
  size = 40,
  shape = "circular",
  className = "",
  style = {},
}) => {
  const dimension = typeof size === "number" ? `${size}px` : size;
  return (
    <Skeleton
      variant={shape === "circular" ? "circular" : "rounded"}
      width={dimension}
      height={dimension}
      className={className}
      style={style}
    />
  );
};

export interface SkeletonButtonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export const SkeletonButton: React.FC<SkeletonButtonProps> = ({
  width = "110px",
  height = "36px",
  borderRadius = "10px",
  className = "",
  style = {},
}) => {
  return (
    <Skeleton
      variant="rounded"
      width={width}
      height={height}
      borderRadius={borderRadius}
      className={className}
      style={style}
    />
  );
};

export interface SkeletonBadgeProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export const SkeletonBadge: React.FC<SkeletonBadgeProps> = ({
  width = "72px",
  height = "22px",
  className = "",
  style = {},
}) => {
  return (
    <Skeleton
      variant="rounded"
      width={width}
      height={height}
      borderRadius="9999px"
      className={className}
      style={style}
    />
  );
};

/**
 * High-fidelity Skeleton loader designed specifically for Exam Cards
 */
export const SkeletonExamCard: React.FC = () => {
  return (
    <div className="skeleton-exam-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", gap: "12px", flex: 1 }}>
          <Skeleton variant="rounded" width={36} height={36} borderRadius={8} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Skeleton variant="text" width="55%" height="1.05rem" borderRadius={4} />
              <SkeletonBadge width={64} height={20} />
            </div>
            <Skeleton variant="text" width="75%" height="0.8rem" borderRadius={4} />
          </div>
        </div>
        <Skeleton variant="rounded" width={28} height={28} borderRadius={6} />
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "4px" }}>
        <SkeletonBadge width={80} height={22} />
        <SkeletonBadge width={68} height={22} />
        <SkeletonBadge width={90} height={22} />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: "0.65rem",
          marginTop: "0.2rem",
          borderTop: "1px solid #f1f5f9",
        }}
      >
        <Skeleton variant="text" width={110} height="0.75rem" borderRadius={4} />
        <div style={{ display: "flex", gap: "8px" }}>
          <Skeleton variant="rounded" width={70} height={26} borderRadius={6} />
          <Skeleton variant="rounded" width={26} height={26} borderRadius={6} />
        </div>
      </div>
    </div>
  );
};

/**
 * List of Exam Card skeletons
 */
export const SkeletonExamList: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        width: "100%",
      }}
      aria-label="Loading examinations..."
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonExamCard key={i} />
      ))}
    </div>
  );
};

export interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Table skeleton loader matching SubmissionTable and administrative rosters.
 */
export const SkeletonTable: React.FC<SkeletonTableProps> = ({
  rows = 6,
  columns = 6,
  showHeader = true,
  className = "",
  style = {},
}) => {
  const columnWidths = ["18%", "24%", "20%", "14%", "12%", "12%"];

  return (
    <div className={`skeleton-table-container ${className}`.trim()} style={style} aria-label="Loading table data...">
      {showHeader && (
        <div className="skeleton-table-header">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <div
              key={colIdx}
              style={{
                flex: colIdx === 1 ? 2 : 1,
                maxWidth: columnWidths[colIdx % columnWidths.length] || "auto",
              }}
            >
              <Skeleton
                variant="text"
                width={colIdx === 0 ? "60px" : colIdx === 1 ? "100px" : "75px"}
                height="0.75rem"
                borderRadius={4}
              />
            </div>
          ))}
        </div>
      )}

      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div className="skeleton-table-row" key={rowIdx}>
          {Array.from({ length: columns }).map((_, colIdx) => {
            return (
              <div
                key={colIdx}
                style={{
                  flex: colIdx === 1 ? 2 : 1,
                  maxWidth: columnWidths[colIdx % columnWidths.length] || "auto",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                {colIdx === 0 ? (
                  // Student ID / Code pill
                  <Skeleton variant="rounded" width="70px" height="1.4rem" borderRadius={6} />
                ) : colIdx === 1 ? (
                  // Student name with avatar
                  <>
                    <Skeleton variant="circular" width={28} height={28} />
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
                      <Skeleton variant="text" width="80%" height="0.85rem" borderRadius={4} />
                      <Skeleton variant="text" width="50%" height="0.65rem" borderRadius={4} />
                    </div>
                  </>
                ) : colIdx === 2 ? (
                  // Exam Name
                  <Skeleton variant="text" width="85%" height="0.8rem" borderRadius={4} />
                ) : colIdx === 3 ? (
                  // Score pill / bar
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", width: "80%" }}>
                    <Skeleton variant="text" width="60%" height="0.8rem" borderRadius={4} />
                    <Skeleton variant="rounded" width="100%" height="6px" borderRadius={3} />
                  </div>
                ) : colIdx === 4 ? (
                  // Grade / Status badge
                  <SkeletonBadge width={65} height={22} />
                ) : (
                  // Action buttons
                  <div style={{ display: "flex", gap: "6px" }}>
                    <Skeleton variant="rounded" width={28} height={28} borderRadius={6} />
                    <Skeleton variant="rounded" width={28} height={28} borderRadius={6} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

/**
 * Metric/KPI Stat card skeleton loader
 */
export const SkeletonStatCard: React.FC = () => {
  return (
    <div className="skeleton-stat-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Skeleton variant="text" width="90px" height="0.8rem" borderRadius={4} />
        <Skeleton variant="rounded" width={32} height={32} borderRadius={8} />
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
        <Skeleton variant="text" width="80px" height="1.8rem" borderRadius={6} />
        <SkeletonBadge width={50} height={18} />
      </div>
      <Skeleton variant="text" width="65%" height="0.75rem" borderRadius={4} />
    </div>
  );
};

/**
 * Full Dashboard Skeleton layout
 */
export const SkeletonDashboard: React.FC = () => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", width: "100%" }}>
      {/* 4 KPI Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
        }}
      >
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      {/* Main Table Skeleton */}
      <SkeletonTable rows={6} columns={6} />
    </div>
  );
};

export default Skeleton;
