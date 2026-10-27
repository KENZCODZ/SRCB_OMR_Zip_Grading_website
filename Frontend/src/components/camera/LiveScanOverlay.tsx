// LiveScanOverlay.tsx
// Redesigned OMR Detection Dashboard & Telemetry Panel
// Features:
// - Compact, collapsible Evaluator Telemetry drawer with high-level summary chip
// - Dual-column layout (Q1-25 & Q26-50) and Bubble Matrix Grid view
// - Live quantitative pass/fail scoring against official answer key
// - Quick status filtering (All, Settled, Review, Pending)
// - Interactive question inspector and haptic-feel detection feedback

import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Award,
  X,
  Activity,
  ChevronDown,
  ChevronUp,
  Grid,
  Columns,
  Check,
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
  isMobileDrawer?: boolean;
  onCloseMobileDrawer?: () => void;
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
  isMobileDrawer = false,
  onCloseMobileDrawer,
}) => {
  const effectivePassingThreshold = passingThreshold !== undefined ? passingThreshold : passingScore;
  const questionKeys = useMemo(
    () => Array.from({ length: totalQuestions }, (_, i) => String(i + 1)),
    [totalQuestions]
  );
  const reviewCount = needsReviewList.length;

  // Layout & Telemetry State
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false); // Collapsed by default
  const [viewLayout, setViewLayout] = useState<'columns' | 'matrix'>('columns');
  const [filterMode, setFilterMode] = useState<'all' | 'locked' | 'review' | 'pending'>('all');
  const [latestQNum, setLatestQNum] = useState<string>('1');

  const prevQuestionsRef = useRef<Record<string, QuestionStatus>>({});
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Track which question recently changed to keep inspector updated
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
    } else if (lockedCount === 0 && (!latestQNum || latestQNum === '1')) {
      setLatestQNum('1');
    }

    prevQuestionsRef.current = { ...questions };
  }, [questions, totalQuestions, lockedCount, latestQNum]);

  // Keep latest question in view when in Column view
  useEffect(() => {
    if (viewLayout === 'columns' && latestQNum && rowRefs.current[latestQNum]) {
      rowRefs.current[latestQNum]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [latestQNum, viewLayout]);

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

  // Filtered Question list
  const filteredQuestionKeys = useMemo(() => {
    return questionKeys.filter((qNum) => {
      const q = questions[qNum];
      const state = q ? q.state : 'searching';
      if (filterMode === 'locked') return state === 'locked';
      if (filterMode === 'review') return state === 'needs_review';
      if (filterMode === 'pending') return state === 'reading' || state === 'searching';
      return true;
    });
  }, [questionKeys, questions, filterMode]);

  // Dual column split (Q1-25 & Q26-50 when totalQuestions is 50, or half-and-half)
  const halfPoint = Math.ceil(questionKeys.length / 2);
  const col1Keys = questionKeys.slice(0, halfPoint);
  const col2Keys = questionKeys.slice(halfPoint);

  const pendingCount = Math.max(0, totalQuestions - lockedCount - reviewCount);

  // Helper to render question row in column view
  const renderQuestionRow = (qNum: string) => {
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
          statusLabel = 'Match';
          statusIcon = <CheckCircle2 size={12} style={{ color: '#10b981' }} />;
          statusClass = 'status-locked';
        } else {
          statusLabel = `Key: ${officialKey}`;
          statusIcon = <X size={12} style={{ color: '#ef4444' }} />;
          statusClass = 'status-review';
        }
      } else {
        statusLabel = 'Locked';
        statusIcon = <CheckCircle2 size={12} className="text-emerald" />;
        statusClass = 'status-locked';
      }
    } else if (q.state === 'needs_review') {
      answerChar = q.currentReading || 'Multi';
      statusLabel = officialKey ? `Review (Key: ${officialKey})` : 'Review';
      statusIcon = <AlertTriangle size={12} className="text-amber" />;
      statusClass = 'status-review';
      confText = '60%';
    } else if (q.state === 'reading') {
      answerChar = q.currentReading || '?';
      confText = `${Math.min(92, Math.max(55, Math.round(50 + (q.consecutiveMatches / 4) * 42)))}%`;
      if (officialKey && answerChar !== '?') {
        statusLabel = answerChar === officialKey ? 'Reading (Match)' : `Key: ${officialKey}`;
      } else {
        statusLabel = officialKey ? `Key: ${officialKey}` : 'Reading';
      }
      statusIcon = <RefreshCw size={11} className="omr-spin text-indigo" />;
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
        className={`omr-compact-row ${statusClass} ${isSelected ? 'is-selected-row' : ''}`}
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
  };

  return (
    <div className={`omr-detection-panel ${isMobileDrawer ? 'is-mobile-drawer' : ''}`}>
      {/* Mobile Drawer Top Bar (only in mobile drawer mode) */}
      {isMobileDrawer && (
        <div className="omr-mobile-drawer-handle-bar">
          <div className="omr-mobile-drawer-grabber" />
          <div className="omr-mobile-drawer-nav">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>
                OMR Live Grade Inspection
              </span>
              <span className="omr-mobile-drawer-count-badge">
                {lockedCount}/{totalQuestions}
              </span>
            </div>
            {onCloseMobileDrawer && (
              <button
                type="button"
                className="omr-mobile-drawer-close-btn"
                onClick={onCloseMobileDrawer}
                title="Return to Camera View"
              >
                <ChevronDown size={18} />
                <span>Camera</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 1. DETECTION HEADER */}
      <div className="omr-detection-header">
        <div className="omr-detection-title-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 className="omr-detection-title">Live Detection</h3>
            {studentId && (
              <span className="omr-student-id-tag">
                Student ID: <strong>{studentId}</strong>
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {isSheetStable ? (
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: '#ecfdf5',
                  color: '#065f46',
                  border: '1px solid #a7f3d0',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Check size={11} /> Locked &amp; Stable
              </span>
            ) : isSheetDetected ? (
              <span className="omr-detection-live-tag">
                <span className="omr-live-indicator-dot" /> Tracking ({lockedCount}/{totalQuestions})
              </span>
            ) : (
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: '#f8fafc',
                  color: '#64748b',
                  border: '1px solid #e2e8f0',
                }}
              >
                Searching...
              </span>
            )}
          </div>
        </div>

        {/* Metric Summary Counters */}
        <div className="omr-detection-counts-row">
          <div className="omr-count-item detected" title="Questions confirmed and settled across stable frames">
            <span className="omr-count-number">
              {lockedCount} / {totalQuestions}
            </span>
            <span className="omr-count-label">settled</span>
          </div>

          <div
            className={`omr-count-item ${reviewCount > 0 ? 'review-alert' : 'review-clean'}`}
            title="Multiple marks or ambiguity requiring human review"
          >
            <span className="omr-count-number">{reviewCount}</span>
            <span className="omr-count-label">review</span>
          </div>

          <div className="omr-count-item review-clean" title="Unanswered or currently being processed">
            <span className="omr-count-number">{pendingCount}</span>
            <span className="omr-count-label">pending</span>
          </div>
        </div>

        {/* Smooth Royal Indigo Progress Bar */}
        <div className="omr-progress-track">
          <div className="omr-progress-bar" style={{ width: `${lockedPercentage}%` }} />
        </div>

        {/* ── QUANTITATIVE EVALUATION SCORE CARD (when answer key is present) ── */}
        {answerKey && Object.keys(answerKey).length > 0 && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: '10px',
              background: !hasAnswersRead
                ? '#f8fafc'
                : isPassing
                ? 'rgba(16, 185, 129, 0.08)'
                : 'rgba(239, 68, 68, 0.08)',
              border: `1px solid ${
                !hasAnswersRead
                  ? '#e2e8f0'
                  : isPassing
                  ? 'rgba(16, 185, 129, 0.3)'
                  : 'rgba(239, 68, 68, 0.3)'
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
                  letterSpacing: '0.04em',
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
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: !hasAnswersRead ? '#64748b' : isPassing ? '#065f46' : '#991b1b',
                  }}
                >
                  {liveScore}
                </span>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                  / {totalQuestions} ({livePercentage}%)
                </span>
              </div>
            </div>

            <div
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                padding: '3px 8px',
                borderRadius: '8px',
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

        {/* ── COMPACT EVALUATOR TELEMETRY ACCORDION (EXPANDABLE) ── */}
        {evaluatorStats && (
          <div>
            <div className="omr-telemetry-chip-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                <Activity size={13} style={{ color: '#4326b8', flexShrink: 0 }} />
                <span style={{ color: '#475569', fontWeight: 600, fontSize: '0.72rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  WASM CV: <strong style={{ color: evaluatorStats.templateAligned ? '#059669' : '#d97706' }}>
                    {evaluatorStats.templateAligned ? `Aligned (${evaluatorStats.alignmentScore}%)` : 'Calibrating...'}
                  </strong>
                  {' • '}
                  <span>Focus: {evaluatorStats.blurScore} {evaluatorStats.isBlurry ? '(Blurry)' : '(Sharp)'}</span>
                </span>
              </div>
              <button
                type="button"
                className="omr-telemetry-toggle-btn"
                onClick={() => setShowDiagnostics(!showDiagnostics)}
                title="Toggle OpenCV Evaluator Telemetry"
              >
                <span>{showDiagnostics ? 'Hide' : 'Details'}</span>
                {showDiagnostics ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            </div>

            {/* Smooth Collapsible Telemetry Details Drawer */}
            {showDiagnostics && (
              <div
                style={{
                  marginTop: '6px',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.7rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  animation: 'modalFadeIn 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.67rem' }}>
                  <span>Trace: <strong>#{evaluatorStats.evalId}</strong> • Frame #{evaluatorStats.frameId}</span>
                  <span>Stage: <strong style={{ textTransform: 'uppercase' }}>{evaluatorStats.stage}</strong></span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  <span
                    style={{
                      background: evaluatorStats.warpSuccess ? '#f0fdf4' : '#fef2f2',
                      border: `1px solid ${evaluatorStats.warpSuccess ? '#bbf7d0' : '#fecaca'}`,
                      color: evaluatorStats.warpSuccess ? '#166534' : '#991b1b',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      fontWeight: 600,
                    }}
                  >
                    Warp: {evaluatorStats.warpSuccess ? `${evaluatorStats.warpedWidth}×${evaluatorStats.warpedHeight} (OK)` : 'Failed'}
                  </span>
                  <span
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      color: '#334155',
                      fontWeight: 600,
                    }}
                  >
                    Input: {evaluatorStats.inputWidth}×{evaluatorStats.inputHeight}
                  </span>
                  <span
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      color: '#334155',
                      fontWeight: 600,
                    }}
                  >
                    Bubbles: {evaluatorStats.detectedBubblesCount}
                  </span>
                  <span
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      color: '#334155',
                      fontWeight: 600,
                    }}
                  >
                    Classified: {evaluatorStats.classifiedAnswersCount} / {totalQuestions}
                  </span>
                </div>

                {evaluatorStats.evaluatorError && (
                  <div
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      color: '#b91c1c',
                      fontSize: '0.68rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <AlertTriangle size={12} style={{ flexShrink: 0 }} />
                    <span><strong>Diagnostic:</strong> {evaluatorStats.evaluatorError}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. PROMINENT "LATEST DETECTION" CARD */}
      <div className="omr-latest-detection-card">
        <div className="omr-latest-card-top">
          <span className="omr-latest-title">Selected Question</span>
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
                  <CheckCircle2 size={13} className="text-emerald" />
                  <span>Automatically locked</span>
                </>
              )}
              {latestQ.state === 'needs_review' && (
                <>
                  <AlertTriangle size={13} className="text-amber" />
                  <span>Multiple marks detected</span>
                </>
              )}
              {latestQ.state === 'reading' && (
                <>
                  <RefreshCw size={12} className="omr-spin text-indigo" />
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

      {/* 3. ANSWER VERIFICATION CONTROLS & DUAL-COLUMN GRID */}
      <div className="omr-answer-list-section">
        {/* Sub-header: Filters and Layout Mode Switcher */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.45rem 0.75rem',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            gap: '6px',
            flexWrap: 'wrap',
          }}
        >
          {/* Quick Filter Tabs */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              style={{
                background: filterMode === 'all' ? '#28166f' : '#ffffff',
                color: filterMode === 'all' ? '#ffffff' : '#64748b',
                border: `1px solid ${filterMode === 'all' ? '#28166f' : '#cbd5e1'}`,
                borderRadius: '6px',
                padding: '2px 7px',
                fontSize: '0.68rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              All ({totalQuestions})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('locked')}
              style={{
                background: filterMode === 'locked' ? '#059669' : '#ffffff',
                color: filterMode === 'locked' ? '#ffffff' : '#64748b',
                border: `1px solid ${filterMode === 'locked' ? '#059669' : '#cbd5e1'}`,
                borderRadius: '6px',
                padding: '2px 7px',
                fontSize: '0.68rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Settled ({lockedCount})
            </button>
            {reviewCount > 0 && (
              <button
                type="button"
                onClick={() => setFilterMode('review')}
                style={{
                  background: filterMode === 'review' ? '#d97706' : '#ffffff',
                  color: filterMode === 'review' ? '#ffffff' : '#b45309',
                  border: `1px solid ${filterMode === 'review' ? '#d97706' : '#fde68a'}`,
                  borderRadius: '6px',
                  padding: '2px 7px',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Review ({reviewCount})
              </button>
            )}
          </div>

          {/* Layout Mode Switcher (2-Columns vs Bubble Matrix) */}
          <div style={{ display: 'flex', gap: '3px' }}>
            <button
              type="button"
              onClick={() => setViewLayout('columns')}
              style={{
                background: viewLayout === 'columns' ? '#e0e7ff' : '#ffffff',
                color: viewLayout === 'columns' ? '#4326b8' : '#64748b',
                border: `1px solid ${viewLayout === 'columns' ? '#c7d2fe' : '#e2e8f0'}`,
                borderRadius: '5px',
                padding: '2px 6px',
                fontSize: '0.68rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
              }}
              title="Dual-Column Table View (Q1–25 & Q26–50)"
            >
              <Columns size={12} />
              <span>2-Col</span>
            </button>
            <button
              type="button"
              onClick={() => setViewLayout('matrix')}
              style={{
                background: viewLayout === 'matrix' ? '#e0e7ff' : '#ffffff',
                color: viewLayout === 'matrix' ? '#4326b8' : '#64748b',
                border: `1px solid ${viewLayout === 'matrix' ? '#c7d2fe' : '#e2e8f0'}`,
                borderRadius: '5px',
                padding: '2px 6px',
                fontSize: '0.68rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
              }}
              title="Bubble Matrix Grid View"
            >
              <Grid size={12} />
              <span>Grid</span>
            </button>
          </div>
        </div>

        {/* ── VIEW 1: DUAL COLUMN SIDE-BY-SIDE LAYOUT ── */}
        {viewLayout === 'columns' && (
          <div className="omr-dual-columns-grid">
            {/* Column 1: Questions 1 to 25 */}
            <div className="omr-subcolumn">
              <div className="omr-subcolumn-header">
                <span>Q#</span>
                <span>Ans</span>
                <span>Result</span>
                <span style={{ textAlign: 'right' }}>Conf</span>
              </div>
              <div style={{ overflowY: 'auto', maxHeight: '320px' }}>
                {col1Keys
                  .filter((k) => filteredQuestionKeys.includes(k))
                  .map(renderQuestionRow)}
              </div>
            </div>

            {/* Column 2: Questions 26 to 50 */}
            <div className="omr-subcolumn">
              <div className="omr-subcolumn-header">
                <span>Q#</span>
                <span>Ans</span>
                <span>Result</span>
                <span style={{ textAlign: 'right' }}>Conf</span>
              </div>
              <div style={{ overflowY: 'auto', maxHeight: '320px' }}>
                {col2Keys
                  .filter((k) => filteredQuestionKeys.includes(k))
                  .map(renderQuestionRow)}
              </div>
            </div>
          </div>
        )}

        {/* ── VIEW 2: BUBBLE MATRIX GRID ── */}
        {viewLayout === 'matrix' && (
          <div className="omr-matrix-grid">
            {filteredQuestionKeys.map((qNum) => {
              const q = questions[qNum];
              const state = q ? q.state : 'searching';
              const isSelected = qNum === latestQNum;
              const ans = q && q.lockedAnswer ? q.lockedAnswer : q && q.currentReading ? q.currentReading : '—';
              const officialKey = answerKey ? answerKey[qNum] : null;

              let chipClass = 'state-pending';
              if (state === 'locked') chipClass = 'state-locked';
              else if (state === 'needs_review') chipClass = 'state-review';
              else if (state === 'reading') chipClass = 'state-reading';

              return (
                <div
                  key={qNum}
                  className={`omr-matrix-chip ${chipClass} ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => setLatestQNum(qNum)}
                  title={`Question ${qNum}: ${ans} ${officialKey ? `(Key: ${officialKey})` : ''}`}
                >
                  <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#64748b' }}>
                    Q{qNum.padStart(2, '0')}
                  </span>
                  <span style={{ fontSize: '0.98rem', fontWeight: 900, lineHeight: 1.1 }}>
                    {ans}
                  </span>
                  {officialKey && (
                    <span style={{ fontSize: '0.58rem', color: ans === officialKey ? '#059669' : '#dc2626', fontWeight: 700 }}>
                      {ans === officialKey ? '✓' : `Key:${officialKey}`}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. BOTTOM TELEMETRY ACTIONS */}
      <div className="omr-detection-footer">
        <div className="omr-detection-status-hint">
          {isSheetDetected ? (
            isBlurry ? (
              <span style={{ color: '#f87171', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <AlertTriangle size={12} /> Motion blur — hold steady
              </span>
            ) : (
              <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Sparkles size={12} /> {isSheetStable ? 'Sheet locked & stable' : 'Live tracking active'}
              </span>
            )
          ) : (
            <span style={{ color: '#94a3b8' }}>Aim at ZipGrade answer sheet</span>
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
              style={{
                background: 'var(--primary, #28166f)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                boxShadow: '0 2px 8px rgba(40, 22, 111, 0.25)',
              }}
            >
              <CheckCircle2 size={13} /> Grade Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveScanOverlay;
