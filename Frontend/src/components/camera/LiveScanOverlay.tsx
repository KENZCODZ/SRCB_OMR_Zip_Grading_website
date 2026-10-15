// LiveScanOverlay.tsx
// Redesigned OMR Detection Dashboard & Telemetry Panel
// Implements complete Evaluator Telemetry exposing:
// - Evaluator's actual error & diagnostic warnings
// - Input image dimensions & warped standard resolution
// - Number of detected bubbles & classified answers
// - Template alignment score & blur variance
// - Synchronized quantitative pass/fail grading

import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Award,
  X,
  Activity,
} from 'lucide-react';
import type { QuestionStatus } from '../../hooks/useLiveOmrScanner';
import type { EvaluatorStats } from '../../workers/omrScanner.worker';

export interface LiveScanOverlayProps {
  questions: Record<string, QuestionStatus>;
  lockedCount: number;
  totalQuestions: number;
  lockedPercentage: number;
  needsReviewList: string[];
  studentId?: string;
  isSheetDetected: boolean;
  isSheetStable?: boolean;
  isBlurry: boolean;
  onResetScan?: () => void;
  onManualCapture?: () => void;
  isSubmitting?: boolean;
  answerKey?: Record<string, string>;
  examName?: string;
  passingScore?: number;
  liveScore?: number;
  livePercentage?: number;
  isPassing?: boolean;
  passingThreshold?: number;
  evaluatorStats?: EvaluatorStats;
}

export const LiveScanOverlay: React.FC<LiveScanOverlayProps> = ({
  questions,
  lockedCount,
  totalQuestions = 50,
  lockedPercentage,
  needsReviewList,
  studentId,
  isSheetDetected,
  isSheetStable = false,
  isBlurry,
  onResetScan,
  onManualCapture,
  isSubmitting,
  answerKey,
  examName,
  passingScore,
  liveScore = 0,
  livePercentage = 0,
  isPassing = false,
  passingThreshold,
  evaluatorStats,
}) => {
  const effectivePassingThreshold = passingThreshold !== undefined ? passingThreshold : passingScore;
  const questionKeys = Array.from({ length: totalQuestions }, (_, i) => String(i + 1));
  const reviewCount = needsReviewList.length;

  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(true);
  const [latestQNum, setLatestQNum] = useState<string>('1');
  const prevQuestionsRef = useRef<Record<string, QuestionStatus>>({});
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const listContainerRef = useRef<HTMLDivElement | null>(null);

  // Track which question recently changed
  useEffect(() => {
    let changedQ: string | null = null;

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
      if (!latestQNum || latestQNum === '1') {
        setLatestQNum('1');
      }
    }

    prevQuestionsRef.current = { ...questions };
  }, [questions, totalQuestions, lockedCount, latestQNum]);

  // Keep latest detected question in view
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

  let latestConfidence = '—';
  if (latestQ.state === 'locked') {
    latestConfidence = '98% confidence';
  } else if (latestQ.state === 'needs_review') {
    latestConfidence = '60% confidence';
  } else if (latestQ.state === 'reading') {
    const confVal = Math.min(92, Math.max(55, Math.round(50 + (latestQ.consecutiveMatches / 4) * 42)));
    latestConfidence = `${confVal}% confidence`;
  }

  const hasAnswersRead =
    lockedCount > 0 || (evaluatorStats && evaluatorStats.classifiedAnswersCount > 0);

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {isSheetStable && (
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#065f46',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                }}
              >
                Stable
              </span>
            )}
            {lockedCount === totalQuestions && totalQuestions > 0 && isSheetStable ? (
              <span className="omr-detection-complete-tag">
                <CheckCircle2 size={12} /> 100% Settled
              </span>
            ) : (
              <span className="omr-detection-live-tag">
                <span className="omr-live-indicator-dot" /> Live ({lockedCount}/{totalQuestions})
              </span>
            )}
          </div>
        </div>

        {/* Counts Row: Clearly separated Settled Answers, Classified, and Review */}
        <div className="omr-detection-counts-row">
          <div className="omr-count-item detected" title="Questions confirmed and settled across stable frames">
            <span className="omr-count-number">
              {lockedCount} / {totalQuestions}
            </span>
            <span className="omr-count-label">settled</span>
          </div>
          {evaluatorStats && (
            <div className="omr-count-item" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }} title="Questions with filled or marked answers on current frame">
              <span className="omr-count-number" style={{ color: '#0284c7' }}>
                {evaluatorStats.classifiedAnswersCount} / {totalQuestions}
              </span>
              <span className="omr-count-label">classified</span>
            </div>
          )}
          <div className={`omr-count-item ${reviewCount > 0 ? 'review-alert' : 'review-clean'}`} title="Multiple marks or near-tie marks needing review">
            <span className="omr-count-number">{reviewCount}</span>
            <span className="omr-count-label">requiring review</span>
          </div>
        </div>

        {/* Minimal Progress Line */}
        <div className="omr-progress-track">
          <div className="omr-progress-bar" style={{ width: `${lockedPercentage}%` }} />
        </div>

        {/* ── PROBLEM 2 FIX: EVALUATOR DIAGNOSTICS TELEMETRY ───────────────── */}
        {evaluatorStats && (
          <div
            style={{
              marginTop: '10px',
              padding: '8px 12px',
              borderRadius: '8px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              fontSize: '0.72rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '6px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  color: '#475569',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                <Activity size={12} style={{ color: '#2563eb' }} />
                <span>Evaluator Telemetry</span>
              </div>
              <button
                type="button"
                onClick={() => setShowDiagnostics(!showDiagnostics)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '0.68rem',
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline',
                }}
              >
                {showDiagnostics ? 'Hide' : 'Show'}
              </button>
            </div>

            {showDiagnostics && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {/* Trace & Frame ID Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '3px 6px',
                    borderRadius: '4px',
                    background: '#f1f5f9',
                    color: '#475569',
                    fontWeight: 600,
                    fontSize: '0.67rem',
                  }}
                >
                  <span>
                    Trace: <strong>#{evaluatorStats.evalId}</strong> • Frame #{evaluatorStats.frameId}
                  </span>
                  <span>
                    Stage: <strong style={{ textTransform: 'uppercase' }}>{evaluatorStats.stage}</strong>
                  </span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {/* Warp Perspective Status */}
                  <span
                    style={{
                      background: evaluatorStats.warpSuccess ? '#f0fdf4' : '#fef2f2',
                      border: `1px solid ${evaluatorStats.warpSuccess ? '#bbf7d0' : '#fecaca'}`,
                      color: evaluatorStats.warpSuccess ? '#166534' : '#991b1b',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontWeight: 600,
                    }}
                    title="Warped perspective transformation status (Expected 850×1100)"
                  >
                    Warp: {evaluatorStats.warpSuccess ? `${evaluatorStats.warpedWidth}×${evaluatorStats.warpedHeight} (OK)` : 'Failed'}
                  </span>

                  {/* Input Dimensions */}
                  <span
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      color: '#334155',
                      fontWeight: 600,
                    }}
                    title="Camera processing frame resolution"
                  >
                    Input: {evaluatorStats.inputWidth}×{evaluatorStats.inputHeight}
                  </span>

                  {/* Blur Score */}
                  <span
                    style={{
                      background: evaluatorStats.isBlurry ? '#fee2e2' : '#ffffff',
                      border: `1px solid ${evaluatorStats.isBlurry ? '#fca5a5' : '#cbd5e1'}`,
                      color: evaluatorStats.isBlurry ? '#b91c1c' : '#334155',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontWeight: 600,
                    }}
                    title="Laplacian blur variance (Higher = sharper focus)"
                  >
                    Focus: {evaluatorStats.blurScore} {evaluatorStats.isBlurry ? '(Blurry)' : '(Sharp)'}
                  </span>

                  {/* Template Alignment */}
                  <span
                    style={{
                      background: evaluatorStats.templateAligned ? '#dcfce7' : '#fef3c7',
                      border: `1px solid ${evaluatorStats.templateAligned ? '#86efac' : '#fde68a'}`,
                      color: evaluatorStats.templateAligned ? '#15803d' : '#b45309',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontWeight: 600,
                    }}
                    title="Corner fiducials alignment density"
                  >
                    Template: {evaluatorStats.templateAligned ? `Aligned (${evaluatorStats.alignmentScore}%)` : 'Checking...'}
                  </span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {/* Answer Key Matched */}
                  <span
                    style={{
                      background: evaluatorStats.answerKeyMatched ? '#f0fdf4' : '#f8fafc',
                      border: `1px solid ${evaluatorStats.answerKeyMatched ? '#bbf7d0' : '#cbd5e1'}`,
                      color: evaluatorStats.answerKeyMatched ? '#166534' : '#475569',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontWeight: 600,
                    }}
                    title="Answer key status"
                  >
                    Key: {evaluatorStats.answerKeyMatched ? `${evaluatorStats.answerKeyEntries} items matched` : 'No Answer Key'}
                  </span>

                  {/* Detected Bubbles */}
                  <span
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      color: '#334155',
                      fontWeight: 600,
                    }}
                    title="Number of bubble ROIs with mark density detected"
                  >
                    Bubbles: {evaluatorStats.detectedBubblesCount} detected
                  </span>

                  {/* Classified Answers */}
                  <span
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      color: '#334155',
                      fontWeight: 600,
                    }}
                    title="Number of questions classified as single filled"
                  >
                    Classified: {evaluatorStats.classifiedAnswersCount} / {totalQuestions}
                  </span>

                  {/* Rejected Questions */}
                  {evaluatorStats.rejectedQuestions > 0 && (
                    <span
                      style={{
                        background: '#fff7ed',
                        border: '1px solid #fed7aa',
                        color: '#c2410c',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontWeight: 600,
                      }}
                      title="Questions rejected during evaluation"
                    >
                      Rejected: {evaluatorStats.rejectedQuestions}
                    </span>
                  )}

                  {/* Scoring Errors */}
                  {evaluatorStats.scoringErrors > 0 && (
                    <span
                      style={{
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        color: '#b91c1c',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontWeight: 600,
                      }}
                      title="Scoring errors (e.g. missing or invalid key entries)"
                    >
                      Scoring Errors: {evaluatorStats.scoringErrors}
                    </span>
                  )}
                </div>

                {/* Evaluator Error / Rejection Reason */}
                {evaluatorStats.evaluatorError && (
                  <div
                    style={{
                      marginTop: '4px',
                      padding: '6px 10px',
                      borderRadius: '4px',
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      color: '#b91c1c',
                      fontSize: '0.70rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <AlertTriangle size={13} style={{ flexShrink: 0 }} />
                    <span>
                      <strong>Rejection Reason:</strong> {evaluatorStats.evaluatorError}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── QUANTITATIVE EVALUATION SCORE CARD ──────────────────────────── */}
        {answerKey && Object.keys(answerKey).length > 0 && (
          <div
            style={{
              marginTop: '10px',
              padding: '10px 14px',
              borderRadius: '8px',
              background: !hasAnswersRead
                ? '#f8fafc'
                : isPassing
                ? 'rgba(16, 185, 129, 0.08)'
                : 'rgba(239, 68, 68, 0.08)',
              border: `1px solid ${
                !hasAnswersRead
                  ? '#e2e8f0'
                  : isPassing
                  ? 'rgba(16, 185, 129, 0.35)'
                  : 'rgba(239, 68, 68, 0.35)'
              }`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '0.68rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: '#64748b',
                  fontWeight: 700,
                }}
              >
                {examName || 'Live Exam Score'}{' '}
                {effectivePassingThreshold !== undefined ? `• Pass: ${effectivePassingThreshold} pts` : ''}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px', marginTop: '2px' }}>
                <span
                  style={{
                    fontSize: '1.35rem',
                    fontWeight: 800,
                    color: !hasAnswersRead ? '#64748b' : isPassing ? '#065f46' : '#991b1b',
                  }}
                >
                  {liveScore}
                </span>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                  / {totalQuestions} ({livePercentage}%)
                </span>
              </div>
            </div>
            <div
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '12px',
                backgroundColor: !hasAnswersRead
                  ? '#f1f5f9'
                  : isPassing
                  ? '#dcfce7'
                  : '#fee2e2',
                color: !hasAnswersRead ? '#475569' : isPassing ? '#15803d' : '#b91c1c',
                border: `1px solid ${
                  !hasAnswersRead ? '#cbd5e1' : isPassing ? '#86efac' : '#fca5a5'
                }`,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Award size={12} />
              <span>
                {!hasAnswersRead
                  ? 'READING SHEET'
                  : isPassing
                  ? 'PASSED'
                  : 'FAILING'}
              </span>
            </div>
          </div>
        )}
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
          <span className="col-status">{answerKey ? 'KEY / RESULT' : 'STATUS'}</span>
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
            const officialKey = answerKey ? answerKey[qNum] : null;

            let answerChar = '—';
            let statusLabel = 'Pending';
            let statusIcon = <span className="status-dot-neutral" />;
            let statusClass = 'status-pending';
            let confText = '—';

            if (q.state === 'locked') {
              answerChar = q.lockedAnswer || '∅';
              confText = '98%';

              if (officialKey) {
                if (answerChar === officialKey) {
                  statusLabel = 'Correct';
                  statusIcon = <CheckCircle2 size={13} style={{ color: '#10b981' }} />;
                  statusClass = 'status-locked';
                } else {
                  statusLabel = `Key: ${officialKey}`;
                  statusIcon = <X size={13} style={{ color: '#ef4444' }} />;
                  statusClass = 'status-review';
                }
              } else {
                statusLabel = 'Locked';
                statusIcon = <CheckCircle2 size={13} className="text-emerald" />;
                statusClass = 'status-locked';
              }
            } else if (q.state === 'needs_review') {
              answerChar = q.currentReading || 'Multi';
              statusLabel = officialKey ? `Review (Key: ${officialKey})` : 'Review';
              statusIcon = <AlertTriangle size={13} className="text-amber" />;
              statusClass = 'status-review';
              confText = '60%';
            } else if (q.state === 'reading') {
              answerChar = q.currentReading || '?';
              confText = `${Math.min(92, Math.max(55, Math.round(50 + (q.consecutiveMatches / 4) * 42)))}%`;
              if (officialKey && answerChar !== '?') {
                statusLabel =
                  answerChar === officialKey ? 'Reading (Match)' : `Reading (Key: ${officialKey})`;
              } else {
                statusLabel = officialKey ? `Key: ${officialKey}` : 'Reading';
              }
              statusIcon = <RefreshCw size={12} className="omr-spin text-indigo" />;
              statusClass = 'status-reading';
            } else if (officialKey) {
              statusLabel = `Key: ${officialKey}`;
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
              <span style={{ color: '#f87171' }}>⚠️ Motion blur detected</span>
            ) : (
              <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Sparkles size={12} /> {isSheetStable ? 'Sheet locked & stable' : 'Live tracking active'}
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
