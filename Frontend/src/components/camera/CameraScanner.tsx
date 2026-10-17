// CameraScanner.tsx
// Redesigned OMR Grading Studio Live Camera & Detection Workspace
// Built to SRCC EduAssess standards with a 65%/35% two-panel layout:
// - Left: Large dominant camera preview with alignment guide, subtle "Place sheet inside frame",
//   "✓ Sheet Locked" detection state, and a dedicated bottom control bar.
// - Right: Live detection panel with "Latest Detection" card and compact vertically scrollable list.

import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  RotateCw,
  Zap,
  ZapOff,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  UploadCloud,
  X,
  Timer,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { useLiveOmrScanner, type CornerPoint, type LiveScanResult } from '../../hooks/useLiveOmrScanner';
import { LiveScanOverlay } from './LiveScanOverlay';
import { OMR_TEMPLATE_COORDINATES, EDUASSESS_TEMPLATE_COORDINATES } from '../../data/omrCoordinates';

interface Point2D {
  x: number;
  y: number;
}

/**
 * Creates a 2D projective mapping function from standard sheet space (850x1100)
 * to screen canvas quadrilateral [TL, TR, BR, BL] (Paul Heckbert projective mapping).
 */
function createSheetToCanvasProjector(
  quad: [Point2D, Point2D, Point2D, Point2D]
): (u: number, v: number) => Point2D {
  const [d0, d1, d2, d3] = quad;

  const dx1 = d1.x - d2.x;
  const dx2 = d3.x - d2.x;
  const sumX = d0.x - d1.x + d2.x - d3.x;

  const dy1 = d1.y - d2.y;
  const dy2 = d3.y - d2.y;
  const sumY = d0.y - d1.y + d2.y - d3.y;

  const denom = dx1 * dy2 - dy1 * dx2;
  const isAffine = Math.abs(denom) < 1e-7 || (Math.abs(sumX) < 1e-4 && Math.abs(sumY) < 1e-4);

  let g = 0, h = 0, a = 0, b = 0, c = d0.x, d = 0, e = 0, f = d0.y;

  if (isAffine) {
    a = d1.x - d0.x;
    b = d3.x - d0.x;
    d = d1.y - d0.y;
    e = d3.y - d0.y;
  } else {
    g = (sumX * dy2 - sumY * dx2) / denom;
    h = (dx1 * sumY - dy1 * sumX) / denom;
    a = d1.x - d0.x + g * d1.x;
    b = d3.x - d0.x + h * d3.x;
    d = d1.y - d0.y + g * d1.y;
    e = d3.y - d0.y + h * d3.y;
  }

  return (u: number, v: number): Point2D => {
    const s = (u - 50) / 750;
    const t = (v - 50) / 1000;
    const w = g * s + h * t + 1;
    return {
      x: (a * s + b * t + c) / w,
      y: (d * s + e * t + f) / w,
    };
  };
}

export interface CameraScannerProps {
  onCapture: (file: File) => Promise<void> | void;
  onClose?: () => void;
  onSwitchToUpload?: () => void;
  onSwitchToNormal?: () => void;
  title?: string;
  subtitle?: string;
  defaultMode?: 'auto-lock' | 'single-shot';
  answerKey?: Record<string, string>;
  examName?: string;
  passingScore?: number;
  numItems?: number;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({
  onCapture,
  onClose,
  onSwitchToUpload,
  onSwitchToNormal,
  title = 'OMR Grading Studio',
  subtitle = 'Align the student answer sheet inside the frame for automatic bubble detection.',
  defaultMode = 'auto-lock',
  answerKey,
  examName,
  passingScore,
  numItems,
}) => {

  const [previewCaptured, setPreviewCaptured] = useState<{ file: File; url: string } | null>(null);
  const [isProcessingSubmission, setIsProcessingSubmission] = useState(false);
  const [shutterTimer, setShutterTimer] = useState<number>(3); // 0s, 2s, 3s, 5s countdown
  const [countdownActive, setCountdownActive] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Keyboard shortcut: Esc to exit theater fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Handle capture callback from hook
  const handleCapturedImage = async (file: File, previewUrl: string, _liveSummary?: LiveScanResult) => {
    setPreviewCaptured({ file, url: previewUrl });
  };

  const {
    videoRef,
    status,
    errorMessage,
    errorType,
    scanMode,
    setScanMode,
    isSheetDetected,
    isSheetStable,
    normalizedCorners,
    isBlurry,
    questionsState,
    detectedStudentId,
    lockedQuestionsCount,
    needsReviewList,
    totalQuestions,
    lockedPercentage,
    liveScore,
    livePercentage,
    isPassing,
    passingThreshold,
    hasAnswerKey,
    evaluatorStats,
    isSmartDetectionAvailable,
    hasTorch,
    isTorchOn,
    videoDevices,
    isSubmitting,
    startCamera,
    stopCamera,
    toggleTorch,
    switchCamera,
    resetVoteBuffer,
    retake,
    finalizeAndSubmit,
  } = useLiveOmrScanner({
    onCapture: handleCapturedImage,
    initialMode: defaultMode,
    lockThresholdConsecutive: 3,
    minLockThresholdToFinalizeOnRemoval: 5,
    blurThreshold: 35,
    answerKey,
    numItems,
    passingScore,
  });

  // Start camera on mount
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Clean up object URLs on unmount or retake
  useEffect(() => {
    return () => {
      if (previewCaptured?.url) {
        URL.revokeObjectURL(previewCaptured.url);
      }
    };
  }, [previewCaptured]);

  // Countdown timer execution
  useEffect(() => {
    if (countdownActive === null) return;

    if (countdownActive <= 0) {
      setCountdownActive(null);
      finalizeAndSubmit('manual');
      return;
    }

    const timerId = setTimeout(() => {
      setCountdownActive((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timerId);
  }, [countdownActive, finalizeAndSubmit]);

  // Trigger shutter with countdown
  const handleShutterClick = () => {
    if (isSubmitting || !!previewCaptured || countdownActive !== null) return;
    if (shutterTimer === 0) {
      finalizeAndSubmit('manual');
    } else {
      setCountdownActive(shutterTimer);
    }
  };

  // Render Corner Alignment & Sheet Detection HUD on Canvas Overlay
  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const renderOverlay = () => {
      const w = (canvas.width = video.clientWidth || 640);
      const h = (canvas.height = video.clientHeight || 480);

      ctx.clearRect(0, 0, w, h);

      if (status !== 'scanning' || previewCaptured) {
        animId = requestAnimationFrame(renderOverlay);
        return;
      }

      // Compute exact object-fit: cover scaling and cropping to map video coordinates to canvas
      const vW = video.videoWidth || 640;
      const vH = video.videoHeight || 480;
      const scale = Math.max(w / vW, h / vH);
      const renderW = vW * scale;
      const renderH = vH * scale;
      const offsetX = (w - renderW) / 2;
      const offsetY = (h - renderH) / 2;

      const toCanvasX = (nx: number) => nx * renderW + offsetX;
      const toCanvasY = (ny: number) => ny * renderH + offsetY;

      // 1. Draw Clean Subtle Alignment Frame (Standard 8.5:11 sheet aspect ratio)
      const maxGuideH = h * 0.84;
      const maxGuideW = w * 0.84;
      let guideW = maxGuideH * 0.772;
      let guideH = maxGuideH;
      if (guideW > maxGuideW) {
        guideW = maxGuideW;
        guideH = guideW / 0.772;
      }
      const guideX = (w - guideW) / 2;
      const guideY = (h - guideH) / 2;

      const reticleLen = 32;
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = isSheetDetected ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.55)';

      // TL Corner
      ctx.beginPath();
      ctx.moveTo(guideX, guideY + reticleLen);
      ctx.lineTo(guideX, guideY);
      ctx.lineTo(guideX + reticleLen, guideY);
      ctx.stroke();

      // TR Corner
      ctx.beginPath();
      ctx.moveTo(guideX + guideW - reticleLen, guideY);
      ctx.lineTo(guideX + guideW, guideY);
      ctx.lineTo(guideX + guideW, guideY + reticleLen);
      ctx.stroke();

      // BR Corner
      ctx.beginPath();
      ctx.moveTo(guideX + guideW, guideY + guideH - reticleLen);
      ctx.lineTo(guideX + guideW, guideY + guideH);
      ctx.lineTo(guideX + guideW - reticleLen, guideY + guideH);
      ctx.stroke();

      // BL Corner
      ctx.beginPath();
      ctx.moveTo(guideX + reticleLen, guideY + guideH);
      ctx.lineTo(guideX, guideY + guideH);
      ctx.lineTo(guideX, guideY + guideH - reticleLen);
      ctx.stroke();

      // Subtle Instruction: "Place sheet inside frame" (when not detected)
      if (!isSheetDetected) {
        ctx.save();
        ctx.font = '600 13px Inter, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
        ctx.shadowBlur = 6;
        ctx.fillText('Place sheet inside frame', guideX + guideW / 2, guideY + guideH - 24);
        ctx.restore();
      }

      // 2. Draw Detected Sheet Quad with clean "✓ Sheet Locked" state
      if (normalizedCorners && normalizedCorners.length === 4) {
        const pixelPoints: CornerPoint[] = normalizedCorners.map((p) => ({
          x: toCanvasX(p.x),
          y: toCanvasY(p.y),
        }));

        const isFullyLocked = lockedQuestionsCount >= totalQuestions;
        const strokeColor = hasAnswerKey
          ? (isPassing ? '#10b981' : isSheetStable ? '#059669' : '#f59e0b')
          : (isFullyLocked ? '#10b981' : isSheetStable ? '#059669' : '#38bdf8');

        ctx.save();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2.5;
        ctx.fillStyle = hasAnswerKey
          ? (isPassing ? 'rgba(16, 185, 129, 0.10)' : isSheetStable ? 'rgba(5, 150, 105, 0.09)' : 'rgba(245, 158, 11, 0.08)')
          : (isFullyLocked ? 'rgba(16, 185, 129, 0.10)' : isSheetStable ? 'rgba(5, 150, 105, 0.09)' : 'rgba(56, 189, 248, 0.08)');

        ctx.beginPath();
        ctx.moveTo(pixelPoints[0].x, pixelPoints[0].y);
        ctx.lineTo(pixelPoints[1].x, pixelPoints[1].y);
        ctx.lineTo(pixelPoints[2].x, pixelPoints[2].y);
        ctx.lineTo(pixelPoints[3].x, pixelPoints[3].y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 4 corner indicator points
        pixelPoints.forEach((pt) => {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 4.5, 0, Math.PI * 2);
          ctx.fillStyle = strokeColor;
          ctx.fill();
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();
        });

        // 3. Augmented Reality Live Bubble Projection (Inverse Perspective Transform)
        const project = createSheetToCanvasProjector([
          pixelPoints[0],
          pixelPoints[1],
          pixelPoints[2],
          pixelPoints[3],
        ]);
        const sheetWidthPx = Math.hypot(pixelPoints[1].x - pixelPoints[0].x, pixelPoints[1].y - pixelPoints[0].y);
        const scale = sheetWidthPx / 750;

        const isEduAssess = evaluatorStats?.layout === 'eduassess_6980';
        const activeTemplate = isEduAssess ? EDUASSESS_TEMPLATE_COORDINATES : OMR_TEMPLATE_COORDINATES;
        const questionCoords = activeTemplate.questions;
        const targetTotal = totalQuestions || 50;

        for (let q = 1; q <= targetTotal; q++) {
          const qStr = String(q);
          const qStatus = questionsState[qStr];
          const selected = qStatus?.lockedAnswer || qStatus?.currentReading;
          const correctAns = answerKey ? answerKey[qStr] : null;
          const qOptions = questionCoords[qStr];
          if (!qOptions) continue;

          if (answerKey) {
            if (selected && qOptions[selected]) {
              const bubble = qOptions[selected];
              const pt = project(bubble.cx, bubble.cy);
              const rad = Math.max(3, Math.min(22, bubble.r * scale));

              if (selected === correctAns) {
                // Correct mark: Translucent green halo + solid green ring
                ctx.save();
                ctx.fillStyle = 'rgba(16, 185, 129, 0.40)';
                ctx.strokeStyle = '#10b981';
                ctx.lineWidth = 2.2;
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, rad + 2.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.restore();
              } else {
                // Wrong mark: Translucent red halo + solid red ring + small 'x'
                ctx.save();
                ctx.fillStyle = 'rgba(239, 68, 68, 0.45)';
                ctx.strokeStyle = '#ef4444';
                ctx.lineWidth = 2.2;
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, rad + 2.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                const xs = rad * 0.5;
                ctx.beginPath();
                ctx.moveTo(pt.x - xs, pt.y - xs);
                ctx.lineTo(pt.x + xs, pt.y + xs);
                ctx.moveTo(pt.x - xs, pt.y + xs);
                ctx.lineTo(pt.x + xs, pt.y - xs);
                ctx.stroke();
                ctx.restore();

                // Show correct key in dashed cyan
                if (correctAns && qOptions[correctAns]) {
                  const cBubble = qOptions[correctAns];
                  const cPt = project(cBubble.cx, cBubble.cy);
                  ctx.save();
                  ctx.strokeStyle = '#06b6d4';
                  ctx.lineWidth = 1.8;
                  ctx.setLineDash([3, 3]);
                  ctx.beginPath();
                  ctx.arc(cPt.x, cPt.y, rad + 2.5, 0, Math.PI * 2);
                  ctx.stroke();
                  ctx.restore();
                }
              }
            } else if (correctAns && qOptions[correctAns]) {
              // Omitted mark: Dashed cyan ring around correct key
              const cBubble = qOptions[correctAns];
              const cPt = project(cBubble.cx, cBubble.cy);
              const rad = Math.max(3, Math.min(22, cBubble.r * scale));
              ctx.save();
              ctx.strokeStyle = 'rgba(6, 182, 212, 0.7)';
              ctx.lineWidth = 1.5;
              ctx.setLineDash([2, 3]);
              ctx.beginPath();
              ctx.arc(cPt.x, cPt.y, rad + 2, 0, Math.PI * 2);
              ctx.stroke();
              ctx.restore();
            }
          } else if (selected && qOptions[selected]) {
            // Unkeyed scan: highlight detected filled bubble in cyan
            const bubble = qOptions[selected];
            const pt = project(bubble.cx, bubble.cy);
            const rad = Math.max(3, Math.min(22, bubble.r * scale));
            ctx.save();
            ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, rad + 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
          }
        }

        // 4. Floating Augmented Reality Score HUD Banner
        const topCenterX = (pixelPoints[0].x + pixelPoints[1].x) / 2;
        const topCenterY = Math.max(22, Math.min(pixelPoints[0].y, pixelPoints[1].y) - 20);

        ctx.save();
        if (hasAnswerKey) {
          const passLabel = isPassing ? 'PASSED' : 'FAILING';
          const bannerText = `Score: ${liveScore}/${totalQuestions} (${livePercentage}%) • ${passLabel}`;
          const badgeBorderColor = isPassing ? '#10b981' : '#ef4444';

          ctx.font = 'bold 13px Inter, -apple-system, sans-serif';
          const textMetrics = ctx.measureText(bannerText);
          const badgeW = textMetrics.width + 30;
          const badgeH = 28;

          ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
          ctx.beginPath();
          ctx.roundRect(topCenterX - badgeW / 2, topCenterY - badgeH / 2, badgeW, badgeH, 6);
          ctx.fill();

          ctx.strokeStyle = badgeBorderColor;
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(bannerText, topCenterX, topCenterY);
        } else {
          const badgeText = isFullyLocked
            ? `✓ 100% Locked (${lockedQuestionsCount}/${totalQuestions})`
            : isSheetStable
            ? `✓ Sheet Stable & Locked • ${lockedQuestionsCount}/${totalQuestions}`
            : `Aligning Sheet • ${lockedQuestionsCount}/${totalQuestions}`;
          ctx.font = 'bold 12px Inter, -apple-system, sans-serif';
          const textMetrics = ctx.measureText(badgeText);
          const badgeW = textMetrics.width + 24;
          const badgeH = 26;

          ctx.fillStyle = isFullyLocked ? '#059669' : isSheetStable ? '#059669' : '#0284c7';
          ctx.beginPath();
          ctx.roundRect(topCenterX - badgeW / 2, topCenterY - badgeH / 2, badgeW, badgeH, 6);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(badgeText, topCenterX, topCenterY);
        }
        ctx.restore();
      }

      animId = requestAnimationFrame(renderOverlay);
    };

    animId = requestAnimationFrame(renderOverlay);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [
    status,
    isSheetDetected,
    isSheetStable,
    normalizedCorners,
    lockedQuestionsCount,
    previewCaptured,
    videoRef,
    questionsState,
    hasAnswerKey,
    answerKey,
    liveScore,
    livePercentage,
    isPassing,
    totalQuestions,
  ]);

  // Confirm and Submit Captured Image
  const handleConfirmSubmit = async () => {
    if (!previewCaptured || isProcessingSubmission) return;
    setIsProcessingSubmission(true);
    try {
      await onCapture(previewCaptured.file);
      setPreviewCaptured(null);
    } catch {
      // Handled upstream
    } finally {
      setIsProcessingSubmission(false);
    }
  };

  // Retake Image (Keeps camera stream running smoothly without black flash)
  const handleRetake = () => {
    if (previewCaptured?.url) {
      URL.revokeObjectURL(previewCaptured.url);
    }
    setPreviewCaptured(null);
    setCountdownActive(null);
    retake();
  };

  return (
    <div className={`omr-workspace-wrapper ${isFullscreen ? 'omr-fullscreen' : ''}`}>
      {/* 1. WORKSPACE HEADER BAR */}
      <div className="omr-workspace-header">
        <div className="omr-header-left">
          <div className="omr-title-group">
            <div className="omr-header-icon-badge">
              <Camera size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h3 className="omr-title">{title}</h3>
                {isSmartDetectionAvailable && (
                  <span className="omr-opencv-pill">
                    OpenCV 4.x Active
                  </span>
                )}
              </div>
              <p className="omr-subtitle">{subtitle}</p>
            </div>
          </div>
        </div>

        <div className="omr-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onSwitchToNormal && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                stopCamera();
                onSwitchToNormal();
              }}
              style={{
                fontSize: '0.78rem',
                padding: '0.4rem 0.75rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                borderRadius: '8px',
              }}
              title="Switch to Standard Camera with Manual Shutter"
            >
              <Camera size={14} style={{ color: '#1d4ed8' }} />
              <span>Normal Camera (Shutter)</span>
            </button>
          )}

          {/* Fullscreen / Theater Mode Toggle */}
          <button
            type="button"
            className="omr-action-btn"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Expand Fullscreen Workspace'}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>


          {onClose && (
            <button
              type="button"
              className="omr-action-btn omr-close-btn"
              onClick={() => {
                stopCamera();
                onClose();
              }}
              title="Close Scanner"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* 2. CAMERA ERROR STATE */}
      {status === 'error' && (
        <div className="omr-camera-error-view">
          <div className="omr-error-card">
            <div className="omr-error-icon-box">
              <AlertCircle size={28} className="text-danger" />
            </div>

            <h4 className="omr-error-title">
              {errorType === 'permission'
                ? 'Camera Permission Needed'
                : errorType === 'device'
                ? 'Camera Hardware Unavailable'
                : 'Camera Unavailable'}
            </h4>

            <p className="omr-error-desc">
              {errorMessage || 'Unable to access your video capture device.'}
            </p>

            {errorType === 'permission' && (
              <div className="omr-error-steps-box">
                <strong>How to unblock camera in your browser:</strong>
                <ol>
                  <li>Click the lock / tune icon 🔒 next to <code>localhost:5173</code> in your address bar.</li>
                  <li>Toggle Camera permissions to <strong>Allow</strong>.</li>
                  <li>In Windows Settings, verify <em>Privacy &gt; Camera &gt; Let desktop apps access your camera</em> is On.</li>
                  <li>Click <strong>Try Again</strong> below.</li>
                </ol>
              </div>
            )}

            <div className="omr-error-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={startCamera}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0.55rem 1.15rem' }}
              >
                <RefreshCw size={15} /> Try Again
              </button>

              {onSwitchToUpload && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    stopCamera();
                    onSwitchToUpload();
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0.55rem 1.15rem' }}
                >
                  <UploadCloud size={15} /> Switch to File Upload
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. TWO-PANEL OMR WORKSPACE (Camera ~62% | Detection ~38%) */}
      {status !== 'error' && (
        <div className="omr-workspace-layout">
          {/* LEFT PANEL: CAMERA WORKSPACE (~62% width) */}
          <div className="omr-camera-panel">
            <div className="omr-viewport-wrapper">
              <video
                ref={videoRef}
                className="omr-video-feed"
                playsInline
                autoPlay
                muted
              />

              <canvas ref={overlayCanvasRef} className="omr-overlay-canvas" />

              {/* Prominent Motion Blur Warning (Shown ONLY when blur is detected) */}
              {isBlurry && (
                <div className="omr-motion-blur-banner">
                  <AlertCircle size={15} />
                  <span>Motion blur detected — please hold camera steady</span>
                </div>
              )}

              {/* Countdown Overlay during active shutter timer */}
              {countdownActive !== null && (
                <div className="omr-countdown-layer">
                  <div className="omr-countdown-circle">
                    <span className="omr-countdown-digit">{countdownActive}</span>
                    <span className="omr-countdown-caption">Hold Steady</span>
                  </div>
                  <button
                    type="button"
                    className="omr-countdown-abort-btn"
                    onClick={() => setCountdownActive(null)}
                  >
                    <X size={14} /> Cancel
                  </button>
                </div>
              )}

              {/* Submitting / Processing Spinner */}
              {(isSubmitting || isProcessingSubmission) && (
                <div className="omr-submitting-layer">
                  <div className="omr-submitting-spinner" />
                  <p className="omr-submitting-text">
                    {isProcessingSubmission ? 'Grading sheet with backend key...' : 'Deskewing & Analyzing OMR...'}
                  </p>
                </div>
              )}

              {/* Captured Preview Review Modal */}
              {previewCaptured && (
                <div className="omr-preview-modal-overlay">
                  <div className="omr-preview-modal-card">
                    <div className="omr-preview-header">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span className="omr-preview-badge">
                          <CheckCircle2 size={13} /> Perspective Corrected
                        </span>
                        {detectedStudentId && (
                          <span className="omr-preview-id">
                            ID: <strong>{detectedStudentId}</strong>
                          </span>
                        )}
                      </div>
                      <h4 className="omr-preview-title">Scanned Answer Sheet</h4>
                      <p className="omr-preview-subtitle">
                        {lockedQuestionsCount > 0
                          ? `${lockedQuestionsCount} of ${totalQuestions} questions settled.`
                          : 'High-resolution scan ready for grading.'}
                      </p>
                    </div>

                    <div className="omr-preview-image-box">
                      <img
                        src={previewCaptured.url}
                        alt="Deskewed Answer Sheet"
                        className="omr-preview-img"
                      />
                    </div>

                    <div className="omr-preview-actions">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleRetake}
                        disabled={isProcessingSubmission}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        <RefreshCw size={15} /> Retake
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleConfirmSubmit}
                        disabled={isProcessingSubmission}
                        style={{ flex: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        {isProcessingSubmission ? (
                          <>
                            <RefreshCw size={15} className="omr-spin" /> Processing...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={15} /> Submit &amp; Grade
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* DEDICATED BOTTOM CONTROL BAR (Under the video, not floating awkwardly over it) */}
            <div className="omr-bottom-control-bar">
              <div className="omr-control-group left">
                {/* Auto Lock Toggle / Status */}
                <button
                  type="button"
                  className={`omr-bar-btn ${scanMode === 'auto-lock' ? 'active-toggle' : ''}`}
                  onClick={() => setScanMode(scanMode === 'auto-lock' ? 'single-shot' : 'auto-lock')}
                  title="Toggle continuous auto-lock bubble scanning"
                >
                  <Sparkles size={14} />
                  <span>Auto-Lock: <strong>{scanMode === 'auto-lock' ? 'ON' : 'OFF'}</strong></span>
                </button>

                {/* Countdown Delay Selector */}
                <button
                  type="button"
                  className={`omr-bar-btn ${shutterTimer > 0 ? 'active-timer' : ''}`}
                  onClick={() => {
                    const delays = [0, 2, 3, 5];
                    const next = delays[(delays.indexOf(shutterTimer) + 1) % delays.length];
                    setShutterTimer(next);
                  }}
                  title="Set shutter timer hold delay"
                >
                  <Timer size={14} />
                  <span>Delay: <strong>{shutterTimer === 0 ? 'Off' : `${shutterTimer}s`}</strong></span>
                </button>

                {hasTorch && (
                  <button
                    type="button"
                    className={`omr-bar-btn ${isTorchOn ? 'active-torch' : ''}`}
                    onClick={toggleTorch}
                    title="Toggle Flashlight"
                  >
                    {isTorchOn ? <Zap size={14} /> : <ZapOff size={14} />}
                    <span>Flash</span>
                  </button>
                )}
              </div>

              {/* PRIMARY ACTION: Large Central Capture Button */}
              <div className="omr-control-group center">
                <button
                  type="button"
                  className="omr-primary-capture-btn"
                  onClick={handleShutterClick}
                  disabled={isSubmitting || !!previewCaptured}
                  title={shutterTimer > 0 ? `Capture sheet in ${shutterTimer}s` : 'Capture sheet immediately'}
                >
                  <Camera size={19} />
                  <span>Capture Sheet</span>
                  {shutterTimer > 0 && (
                    <span className="omr-capture-timer-tag">{shutterTimer}s</span>
                  )}
                </button>
              </div>

              <div className="omr-control-group right">
                {/* Flip Camera Button (if multiple devices) */}
                {videoDevices.length > 1 && (
                  <button
                    type="button"
                    className="omr-bar-btn"
                    onClick={() => switchCamera()}
                    title="Switch camera device"
                  >
                    <RotateCw size={14} />
                    <span>Flip</span>
                  </button>
                )}

                {/* Upload Sheet Option */}
                {onSwitchToUpload && (
                  <button
                    type="button"
                    className="omr-bar-btn upload-opt"
                    onClick={() => {
                      stopCamera();
                      onSwitchToUpload();
                    }}
                    title="Switch to file upload for scanned sheets"
                  >
                    <UploadCloud size={14} />
                    <span>Upload Sheet</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: DETECTION DASHBOARD (~38% width) */}
          <div className="omr-detection-panel-container">
            <LiveScanOverlay
              questions={questionsState}
              lockedCount={lockedQuestionsCount}
              totalQuestions={totalQuestions}
              lockedPercentage={lockedPercentage}
              needsReviewList={needsReviewList}
              studentId={detectedStudentId}
              isSheetDetected={isSheetDetected}
              isSheetStable={isSheetStable}
              isBlurry={isBlurry}
              onResetScan={resetVoteBuffer}
              onManualCapture={() => finalizeAndSubmit('manual')}
              isSubmitting={isSubmitting}
              answerKey={answerKey}
              examName={examName}
              passingScore={passingScore}
              liveScore={liveScore}
              livePercentage={livePercentage}
              isPassing={isPassing}
              passingThreshold={passingThreshold}
              evaluatorStats={evaluatorStats}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraScanner;
