// LiveScanOverlay.tsx
// Visual real-time HUD matrix displaying per-question live locking states,
// multi-mark warnings, overall progress bar, and student ID extraction readout.

import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';
import type { QuestionStatus } from '../hooks/useLiveOmrScanner';

export interface LiveScanOverlayProps {
  questions: Record<string, QuestionStatus>;
  lockedCount: number;
  totalQuestions: number;
  lockedPercentage: number;
  needsReviewList: string[];
  studentId?: string;
  isSheetDetected: boolean;
  isBlurry: boolean;
  onResetScan?: () => void;
  onManualCapture?: () => void;
  isSubmitting?: boolean;
}

export const LiveScanOverlay: React.FC<LiveScanOverlayProps> = ({
  questions,
  lockedCount,
  totalQuestions = 50,
  lockedPercentage,
  needsReviewList,
  studentId,
  isSheetDetected,
  isBlurry,
  onResetScan,
  onManualCapture,
  isSubmitting,
}) => {
  const questionKeys = Array.from({ length: totalQuestions }, (_, i) => String(i + 1));

  return (
    <div className="live-scan-hud-container">
      {/* Top Status & Progress Bar */}
      <div className="live-hud-header">
        <div className="live-hud-title-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="live-hud-pulse-dot" />
            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#ffffff' }}>
              Real-Time Bubble Reader
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {studentId && (
              <span className="live-hud-student-id">
                ID: <strong>{studentId}</strong>
              </span>
            )}
            <span className="live-hud-counter">
              <strong>{lockedCount}</strong> / {totalQuestions} Locked ({lockedPercentage}%)
            </span>
          </div>
        </div>

        {/* Animated Progress Bar */}
        <div className="live-hud-progress-track">
          <div
            className="live-hud-progress-bar"
            style={{
              width: `${lockedPercentage}%`,
              background:
                lockedPercentage === 100
                  ? 'linear-gradient(90deg, #10b981, #34d399)'
                  : 'linear-gradient(90deg, #3b82f6, #60a5fa)',
            }}
          />
        </div>

        {/* Needs Review Alert Banner */}
        {needsReviewList.length > 0 && (
          <div className="live-hud-review-banner">
            <AlertTriangle size={14} className="text-amber" />
            <span>
              Multi-mark detected on <strong>Q{needsReviewList.join(', Q')}</strong> (flagged for review)
            </span>
          </div>
        )}
      </div>

      {/* 50-Question Compact Matrix Grid */}
      <div className="live-hud-matrix-scroll">
        <div className="live-hud-matrix-grid">
          {questionKeys.map((qNum) => {
            const q = questions[qNum] || {
              questionNumber: qNum,
              state: 'searching',
              lockedAnswer: null,
              currentReading: null,
              isMultiMark: false,
            };

            let badgeClass = 'q-searching';
            let icon = <span className="q-dot">·</span>;
            let displayVal = '-';

            if (q.state === 'locked') {
              badgeClass = 'q-locked';
              icon = <CheckCircle2 size={10} className="q-icon-green" />;
              displayVal = q.lockedAnswer || '∅';
            } else if (q.state === 'needs_review') {
              badgeClass = 'q-review';
              icon = <AlertTriangle size={10} className="q-icon-amber" />;
              displayVal = q.currentReading || 'Multi';
            } else if (q.state === 'reading') {
              badgeClass = 'q-reading';
              icon = <RefreshCw size={10} className="q-spin-icon" />;
              displayVal = q.currentReading || '?';
            }

            return (
              <div
                key={qNum}
                className={`live-q-cell ${badgeClass}`}
                title={`Question ${qNum}: ${q.state.toUpperCase()} (${displayVal})`}
              >
                <span className="live-q-num">{qNum}</span>
                <span className="live-q-val">{displayVal}</span>
                <span className="live-q-icon">{icon}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div className="live-hud-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#94a3b8' }}>
          {isSheetDetected ? (
            isBlurry ? (
              <span style={{ color: '#f87171' }}>⚠️ Camera blurry — hold still</span>
            ) : (
              <span style={{ color: '#34d399', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Sparkles size={12} /> Auto-reading active (settling answers)
              </span>
            )
          ) : (
            <span style={{ color: '#cbd5e1', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <HelpCircle size={12} /> Hold OMR sheet in view to scan
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {onResetScan && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={onResetScan}
              disabled={isSubmitting}
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
              title="Clear locked readings and restart scan"
            >
              <RefreshCw size={12} /> Reset
            </button>
          )}

          {onManualCapture && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onManualCapture}
              disabled={isSubmitting}
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem' }}
              title="Force submit now with currently settled answers"
            >
              Capture Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
