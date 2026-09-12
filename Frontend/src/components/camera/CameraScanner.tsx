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

export interface CameraScannerProps {
  onCapture: (file: File) => Promise<void> | void;
  onClose?: () => void;
  onSwitchToUpload?: () => void;
  title?: string;
  subtitle?: string;
  defaultMode?: 'auto-lock' | 'single-shot';
}

export const CameraScanner: React.FC<CameraScannerProps> = ({
  onCapture,
  onClose,
  onSwitchToUpload,
  title = 'OMR Grading Studio',
  subtitle = 'Align the student answer sheet inside the frame for automatic bubble detection.',
  defaultMode = 'auto-lock',
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
    normalizedCorners,
    isBlurry,
    questionsState,
    detectedStudentId,
    lockedQuestionsCount,
    needsReviewList,
    totalQuestions,
    lockedPercentage,
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
    finalizeAndSubmit,
  } = useLiveOmrScanner({
    onCapture: handleCapturedImage,
    initialMode: defaultMode,
    lockThresholdConsecutive: 4,
    minLockThresholdToFinalizeOnRemoval: 5,
    blurThreshold: 45,
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

      // 1. Draw Clean Subtle Alignment Frame
      const guidePadding = Math.min(w, h) * 0.08;
      const guideW = w - guidePadding * 2;
      const guideH = h - guidePadding * 2;
      const guideX = guidePadding;
      const guideY = guidePadding;

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
          x: p.x * w,
          y: p.y * h,
        }));

        const isFullyLocked = lockedQuestionsCount >= 50;
        const strokeColor = isFullyLocked ? '#10b981' : '#38bdf8';

        ctx.save();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2.5;
        ctx.fillStyle = isFullyLocked ? 'rgba(16, 185, 129, 0.12)' : 'rgba(56, 189, 248, 0.08)';

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

        // Clean state badge: "✓ Sheet Locked"
        const badgeText = isFullyLocked ? '✓ 100% Locked' : '✓ Sheet Locked';
        ctx.font = 'bold 12px Inter, -apple-system, sans-serif';
        const textMetrics = ctx.measureText(badgeText);
        const badgeW = textMetrics.width + 24;
        const badgeH = 26;

        // Position badge above top center of sheet
        const topCenterX = (pixelPoints[0].x + pixelPoints[1].x) / 2;
        const topCenterY = Math.max(20, Math.min(pixelPoints[0].y, pixelPoints[1].y) - 18);

        ctx.fillStyle = isFullyLocked ? '#059669' : '#0284c7';
        ctx.beginPath();
        ctx.roundRect(topCenterX - badgeW / 2, topCenterY - badgeH / 2, badgeW, badgeH, 6);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeText, topCenterX, topCenterY);

        ctx.restore();
      }

      animId = requestAnimationFrame(renderOverlay);
    };

    animId = requestAnimationFrame(renderOverlay);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [status, isSheetDetected, normalizedCorners, lockedQuestionsCount, previewCaptured, videoRef]);

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

  // Retake Image
  const handleRetake = () => {
    if (previewCaptured?.url) {
      URL.revokeObjectURL(previewCaptured.url);
    }
    setPreviewCaptured(null);
    setCountdownActive(null);
    resetVoteBuffer();
    startCamera();
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

        <div className="omr-header-actions">
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
              isBlurry={isBlurry}
              onResetScan={resetVoteBuffer}
              onManualCapture={() => finalizeAndSubmit('manual')}
              isSubmitting={isSubmitting}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraScanner;
