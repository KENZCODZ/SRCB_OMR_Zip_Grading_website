import React, { useState, useEffect, useRef } from "react";

export interface SmoothContentTransitionProps {
  isLoading: boolean;
  hasExistingData?: boolean;
  skeleton: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  minDurationMs?: number;
}

/**
 * SmoothContentTransition
 * Ensures the skeleton loader is visibly displayed and useful (min 320ms duration),
 * preventing instant micro-flickers and gently crossfading fresh content into view.
 */
export const SmoothContentTransition: React.FC<SmoothContentTransitionProps> = ({
  isLoading,
  skeleton,
  children,
  className = "",
  style = {},
  minDurationMs = 320,
}) => {
  const [showSkeleton, setShowSkeleton] = useState(isLoading);
  const startTimeRef = useRef<number | null>(isLoading ? Date.now() : null);
  const timeoutRef = useRef<any>(null);

  useEffect(() => {
    if (isLoading) {
      startTimeRef.current = Date.now();
      setShowSkeleton(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    } else {
      const elapsed = startTimeRef.current
        ? Date.now() - startTimeRef.current
        : minDurationMs;
      const remaining = Math.max(0, minDurationMs - elapsed);

      if (remaining > 0) {
        timeoutRef.current = setTimeout(() => {
          setShowSkeleton(false);
          startTimeRef.current = null;
        }, remaining);
      } else {
        setShowSkeleton(false);
        startTimeRef.current = null;
      }
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isLoading, minDurationMs]);

  if (showSkeleton) {
    return (
      <div
        className={`skeleton-fade-enter ${className}`}
        style={{ width: "100%", ...style }}
      >
        {skeleton}
      </div>
    );
  }

  return (
    <div
      className={`content-crossfade-enter ${className}`}
      style={{ position: "relative", width: "100%", ...style }}
    >
      {children}
    </div>
  );
};

export default SmoothContentTransition;
