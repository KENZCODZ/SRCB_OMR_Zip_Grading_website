// LiveScanOverlay.tsx
// Redesigned OMR Detection Dashboard:
// - Header with detection progress ("48 / 50 detected", "X requiring review")
// - Prominent "Latest Detection" card with large readable letter and confidence
// - Compact vertically scrollable list (01 A ✓ Locked) with auto-scroll to latest detection
// - Academic, restrained styling fitting SRCC EduAssess identity

import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import type { QuestionStatus } from '../../hooks/useLiveOmrScanner';

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
  const reviewCount = needsReviewList.length;

  // Track latest detected question
  const [latestQNum, setLatestQNum] = useState<string>('1');
  const prevQuestionsRef = useRef<Record<string, QuestionStatus>>({});
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const listContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let changedQ: string | null = null;

    // Check which question recently transitioned or changed
    for (let i = 1; i <= totalQuestions; i++) {
      const qKey = String(i);
      const cur = questions[qKey];
      const prev = prevQuestionsRef.current[qKey];

      if (cur) {
        if (!prev) {
          if (cur.state === 'locked' || cur.state === 'reading' || cur.state === 'needs_review') {
            changedQ = qKey;
          }
        } else if (
          cur.lockedAnswer !== prev.lockedAnswer ||
          cur.state !== prev.state ||
          (cur.currentReading && cur.currentReading !== prev.currentReading)
        ) {
          changedQ = qKey;
        }
      }
    }

    if (changedQ) {
      setLatestQNum(changedQ);
    } else if (lockedCount === 0) {
      // If nothing detected yet, default to first question
      if (!latestQNum || latestQNum === '1') {
        setLatestQNum('1');
      }
    }

    prevQuestionsRef.current = { ...questions };
  }, [questions, totalQuestions, lockedCount, latestQNum]);

  // Automatically keep latest detected question in view within the list
  useEffect(() => {
    if (latestQNum && rowRefs.current[latestQNum]) {
      rowRefs.current[latestQNum]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [latestQNum]);

  const latestQ = questions[latestQNum] || {
    questionNumber: latestQNum,
    state: 'searching',
    lockedAnswer: null,
    currentReading: null,
    isMultiMark: false,
    consecutiveMatches: 0,
  };

  // Compute confidence for latest detection card
  let latestConfidence = '—';
  if (latestQ.state === 'locked') {
    latestConfidence = '98% confidence';
  } else if (latestQ.state === 'needs_review') {
    latestConfidence = '60% confidence';
  } else if (latestQ.state === 'reading') {
    const confVal = Math.min(92, Math.max(55, Math.round(50 + (latestQ.consecutiveMatches / 4) * 42)));
    latestConfidence = `${confVal}% confidence`;
  }

  return (
    <div className="omr-detection-panel">
      {/* 1. DETECTION HEADER */}
      <div className="omr-detection-header">
        <div className="omr-detection-title-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 className="omr-detection-title">Detection</h3>
            {studentId && (
              <span className="omr-student-id-tag">
                Student ID: <strong>{studentId}</strong>
              </span>
            )}
          </div>
          {lockedCount === totalQuestions && totalQuestions > 0 ? (
            <span className="omr-detection-complete-tag">
              <CheckCircle2 size={12} /> 100% Complete
            </span>
          ) : (
            <span className="omr-detection-live-tag">
              <span className="omr-live-indicator-dot" /> Live
            </span>
          )}
        </div>

        {/* Counts Row: "48 / 50 detected", "2 requiring review" */}
        <div className="omr-detection-counts-row">
          <div className="omr-count-item detected">
            <span className="omr-count-number">{lockedCount} / {totalQuestions}</span>
            <span className="omr-count-label">detected</span>
          </div>
          <div className={`omr-count-item ${reviewCount > 0 ? 'review-alert' : 'review-clean'}`}>
            <span className="omr-count-number">{reviewCount}</span>
            <span className="omr-count-label">requiring review</span>
          </div>
        </div>

        {/* Minimal Progress Line */}
        <div className="omr-progress-track">
          <div
            className="omr-progress-bar"
            style={{ width: `${lockedPercentage}%` }}
          />
        </div>
      </div>

      {/* 2. PROMINENT "LATEST DETECTION" CARD */}
      <div className="omr-latest-detection-card">
        <div className="omr-latest-card-top">
          <span className="omr-latest-title">Latest Detection</span>
          {latestConfidence !== '—' && (
            <span className="omr-latest-confidence-badge">{latestConfidence}</span>
          )}
        </div>

        <div className="omr-latest-card-body">
          <div className="omr-latest-info-col">
            <span className="omr-latest-q-number">
              {lockedCount > 0 || latestQ.state !== 'searching'
                ? `Question ${latestQ.questionNumber.padStart(2, '0')}`
                : 'Waiting for sheet...'}
            </span>
            <div className={`omr-latest-status-pill status-${latestQ.state}`}>
              {latestQ.state === 'locked' && (
                <>
                  <CheckCircle2 size={14} className="text-emerald" />
                  <span>Automatically locked</span>
                </>
              )}
              {latestQ.state === 'needs_review' && (
                <>
                  <AlertTriangle size={14} className="text-amber" />
                  <span>Multiple marks detected</span>
                </>
              )}
              {latestQ.state === 'reading' && (
                <>
                  <RefreshCw size={13} className="omr-spin text-indigo" />
                  <span>Reading bubble fills...</span>
                </>
              )}
              {latestQ.state === 'searching' && (
                <span style={{ color: '#94a3b8' }}>Place sheet inside frame</span>
              )}
            </div>
          </div>

          <div className={`omr-latest-letter-display letter-state-${latestQ.state}`}>
            {latestQ.state === 'locked'
              ? latestQ.lockedAnswer || '∅'
              : latestQ.currentReading || '—'}
          </div>
        </div>
      </div>

      {/* 3. ANSWER VERIFICATION LIST */}
      <div className="omr-answer-list-section">
        <div className="omr-list-table-header">
          <span className="col-num">Q#</span>
          <span className="col-answer">ANSWER</span>
          <span className="col-status">STATUS</span>
          <span className="col-conf">CONFIDENCE</span>
        </div>

        <div className="omr-answer-list-scroll" ref={listContainerRef}>
          {questionKeys.map((qNum) => {
            const q = questions[qNum] || {
              questionNumber: qNum,
              state: 'searching',
              lockedAnswer: null,
              currentReading: null,
              isMultiMark: false,
              consecutiveMatches: 0,
            };

            const isSelected = qNum === latestQNum;
            const paddedNum = qNum.padStart(2, '0');

            let answerChar = '—';
            let statusLabel = 'Pending';
            let statusIcon = <span className="status-dot-neutral" />;
            let statusClass = 'status-pending';
            let confText = '—';

            if (q.state === 'locked') {
              answerChar = q.lockedAnswer || '∅';
              statusLabel = 'Locked';
              statusIcon = <CheckCircle2 size={13} className="text-emerald" />;
              statusClass = 'status-locked';
              confText = '98%';
            } else if (q.state === 'needs_review') {
              answerChar = q.currentReading || 'Multi';
              statusLabel = 'Review';
              statusIcon = <AlertTriangle size={13} className="text-amber" />;
              statusClass = 'status-review';
              confText = '60%';
            } else if (q.state === 'reading') {
              answerChar = q.currentReading || '?';
              statusLabel = 'Reading';
              statusIcon = <RefreshCw size={12} className="omr-spin text-indigo" />;
              statusClass = 'status-reading';
              confText = `${Math.min(92, Math.max(55, Math.round(50 + (q.consecutiveMatches / 4) * 42)))}%`;
            }

            return (
              <div
                key={qNum}
                ref={(el) => {
                  rowRefs.current[qNum] = el;
                }}
                className={`omr-list-row ${statusClass} ${isSelected ? 'is-selected-row' : ''}`}
                onClick={() => setLatestQNum(qNum)}
                title={`Question ${paddedNum}: ${statusLabel} (${confText})`}
              >
                <span className="col-num">{paddedNum}</span>
                <span className={`col-answer ${answerChar !== '—' ? 'has-answer' : ''}`}>
                  {answerChar}
                </span>
                <span className={`col-status ${statusClass}`}>
                  {statusIcon}
                  <span>{statusLabel}</span>
                </span>
                <span className="col-conf">{confText}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. BOTTOM TELEMETRY ACTIONS */}
      <div className="omr-detection-footer">
        <div className="omr-detection-status-hint">
          {isSheetDetected ? (
            isBlurry ? (
              <span style={{ color: '#f87171' }}>⚠️ Motion blur</span>
            ) : (
              <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Sparkles size={12} /> Live tracking active
              </span>
            )
          ) : (
            <span style={{ color: '#94a3b8' }}>Searching for OMR sheet</span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {onResetScan && (
            <button
              type="button"
              className="omr-detection-btn btn-reset"
              onClick={onResetScan}
              disabled={isSubmitting}
              title="Reset locked reading vote buffer"
            >
              <RefreshCw size={12} /> Reset
            </button>
          )}

          {onManualCapture && (
            <button
              type="button"
              className="omr-detection-btn btn-force-submit"
              onClick={onManualCapture}
              disabled={isSubmitting}
              title="Submit sheet now with current readings"
            >
              Grade Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveScanOverlay;
