// CameraScanner.tsx
// Real-time camera scanner component for OMR answer sheets
// Supporting both "No-Touch Auto-Lock Live Scanner" (continuous client-side bubble fill decoding)
// and "Single-Shot Capture" with a multi-second hold countdown timer.

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
  SlidersHorizontal,
  Video,
  Timer,
} from 'lucide-react';
import { useLiveOmrScanner, type CornerPoint, type LiveScanResult } from '../hooks/useLiveOmrScanner';
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
  title = 'Live OMR Sheet Scanner',
  subtitle = 'Point camera at the ZipGrade answer sheet. Align corners and hold steady.',
  defaultMode = 'auto-lock',
}) => {
  const [previewCaptured, setPreviewCaptured] = useState<{ file: File; url: string } | null>(null);
  const [isProcessingSubmission, setIsProcessingSubmission] = useState(false);
  const [shutterTimer, setShutterTimer] = useState<number>(3); // 0s, 2s, 3s, 5s countdown
  const [countdownActive, setCountdownActive] = useState<number | null>(null);

  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);

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
    selectedDeviceId,
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

  // Render Corner HUD on Canvas Overlay
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

      // 1. Draw Default Alignment Guide Frame
      const guidePadding = Math.min(w, h) * 0.08;
      const guideW = w - guidePadding * 2;
      const guideH = h - guidePadding * 2;
      const guideX = guidePadding;
      const guideY = guidePadding;

      const reticleLen = 28;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';

      // TL
      ctx.beginPath();
      ctx.moveTo(guideX, guideY + reticleLen);
      ctx.lineTo(guideX, guideY);
      ctx.lineTo(guideX + reticleLen, guideY);
      ctx.stroke();

      // TR
      ctx.beginPath();
      ctx.moveTo(guideX + guideW - reticleLen, guideY);
      ctx.lineTo(guideX + guideW, guideY);
      ctx.lineTo(guideX + guideW, guideY + reticleLen);
      ctx.stroke();

      // BR
      ctx.beginPath();
      ctx.moveTo(guideX + guideW, guideY + guideH - reticleLen);
      ctx.lineTo(guideX + guideW, guideY + guideH);
      ctx.lineTo(guideX + guideW - reticleLen, guideY + guideH);
      ctx.stroke();

      // BL
      ctx.beginPath();
      ctx.moveTo(guideX + reticleLen, guideY + guideH);
      ctx.lineTo(guideX, guideY + guideH);
      ctx.lineTo(guideX, guideY + guideH - reticleLen);
      ctx.stroke();

      // Draw active scanning laser beam when searching for sheet
      if (!isSheetDetected) {
        const time = performance.now() * 0.0018;
        const laserY = guideY + ((Math.sin(time) + 1) / 2) * guideH;

        const grad = ctx.createLinearGradient(guideX, laserY, guideX + guideW, laserY);
        grad.addColorStop(0, 'rgba(59, 130, 246, 0)');
        grad.addColorStop(0.5, 'rgba(59, 130, 246, 0.85)');
        grad.addColorStop(1, 'rgba(59, 130, 246, 0)');

        ctx.save();
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.shadowColor = '#3b82f6';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(guideX, laserY);
        ctx.lineTo(guideX + guideW, laserY);
        ctx.stroke();
        ctx.restore();
      }

      // 2. Draw Detected Sheet Quad
      if (normalizedCorners && normalizedCorners.length === 4) {
        const pixelPoints: CornerPoint[] = normalizedCorners.map((p) => ({
          x: p.x * w,
          y: p.y * h,
        }));

        const isFullyLocked = lockedQuestionsCount >= 50;
        const strokeColor = isFullyLocked
          ? 'rgba(16, 185, 129, 0.95)'
          : isSheetDetected
            ? 'rgba(59, 130, 246, 0.9)'
            : 'rgba(245, 158, 11, 0.85)';
        const fillColor = isFullyLocked
          ? 'rgba(16, 185, 129, 0.2)'
          : isSheetDetected
            ? 'rgba(59, 130, 246, 0.14)'
            : 'rgba(245, 158, 11, 0.12)';

        ctx.save();
        ctx.shadowColor = strokeColor;
        ctx.shadowBlur = isFullyLocked ? 16 : 8;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = isFullyLocked ? 4 : 3;
        ctx.fillStyle = fillColor;

        ctx.beginPath();
        ctx.moveTo(pixelPoints[0].x, pixelPoints[0].y);
        ctx.lineTo(pixelPoints[1].x, pixelPoints[1].y);
        ctx.lineTo(pixelPoints[2].x, pixelPoints[2].y);
        ctx.lineTo(pixelPoints[3].x, pixelPoints[3].y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        pixelPoints.forEach((pt, idx) => {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, isFullyLocked ? 7 : 5, 0, Math.PI * 2);
          ctx.fillStyle = strokeColor;
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();

          const labels = ['TL', 'TR', 'BR', 'BL'];
          ctx.font = '10px "Plus Jakarta Sans", sans-serif';
          ctx.fillStyle = '#ffffff';
          ctx.fillText(labels[idx], pt.x + 8, pt.y - 8);
        });

        // Draw Center Recognition Status Badge on Sheet
        const centerX = (pixelPoints[0].x + pixelPoints[1].x + pixelPoints[2].x + pixelPoints[3].x) / 4;
        const centerY = (pixelPoints[0].y + pixelPoints[1].y + pixelPoints[2].y + pixelPoints[3].y) / 4;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1.5;
        const badgeText = isFullyLocked
          ? '✓ 100% LOCKED'
          : `⚡ READING: ${lockedQuestionsCount}/50 (${lockedPercentage}%)`;
        
        ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
        const textMetrics = ctx.measureText(badgeText);
        const badgeW = textMetrics.width + 20;
        const badgeH = 24;

        ctx.beginPath();
        ctx.roundRect(centerX - badgeW / 2, centerY - badgeH / 2, badgeW, badgeH, 12);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeText, centerX, centerY);

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
    <div className="camera-scanner-wrapper">
      {/* HEADER BAR */}
      <div className="camera-scanner-header">
        <div className="camera-header-info">
          <div className="camera-title-row">
            <Camera size={20} className="text-primary" />
            <h3 className="camera-title">{title}</h3>
            {isSmartDetectionAvailable && (
              <span className="badge badge-success" style={{ fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Sparkles size={12} /> OpenCV Active
              </span>
            )}
          </div>
          <p className="camera-subtitle">{subtitle}</p>
        </div>

        <div className="camera-header-actions">
          {/* Scanning Mode Switcher */}
          <div className="scan-mode-subtabs">
            <button
              type="button"
              className={`scan-mode-subtab-btn ${scanMode === 'auto-lock' ? 'active' : ''}`}
              onClick={() => setScanMode('auto-lock')}
              title="No-touch continuous bubble locking"
            >
              <Sparkles size={13} /> Auto-Lock Live
            </button>
            <button
              type="button"
              className={`scan-mode-subtab-btn ${scanMode === 'single-shot' ? 'active' : ''}`}
              onClick={() => setScanMode('single-shot')}
              title="Single frame shutter capture"
            >
              <Camera size={13} /> Single-Shot
            </button>
          </div>

          {/* Camera Device Selector Dropdown for Desktop with 2+ cameras */}
          {videoDevices.length > 1 && (
            <div className="camera-device-select-container">
              <Video size={14} className="camera-select-icon" />
              <select
                className="camera-device-select"
                value={selectedDeviceId || ''}
                onChange={(e) => switchCamera(e.target.value)}
                title="Select video input device"
              >
                {videoDevices.map((device, idx) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {onSwitchToUpload && (
            <button
              type="button"
              className="btn btn-outline"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={() => {
                stopCamera();
                onSwitchToUpload();
              }}
            >
              <UploadCloud size={16} /> Switch to Upload
            </button>
          )}

          {onClose && (
            <button
              type="button"
              className="btn-icon"
              onClick={() => {
                stopCamera();
                onClose();
              }}
              title="Close Scanner"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* ERROR CARD */}
      {status === 'error' && (
        <div className="camera-error-container">
          <div className="camera-error-card">
            <AlertCircle size={48} className="text-danger" style={{ marginBottom: '1rem' }} />
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              {errorType === 'permission' ? 'Camera Permission Required' : 'Camera Unavailable'}
            </h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '420px', margin: '0 auto 1.5rem auto', lineHeight: '1.5' }}>
              {errorMessage || 'Unable to access your device camera.'}
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={startCamera}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <RefreshCw size={16} /> Try Again
              </button>

              {onSwitchToUpload && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    stopCamera();
                    onSwitchToUpload();
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <UploadCloud size={16} /> Switch to File Upload
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SCANNER VIEWPORT & REAL-TIME HUD */}
      {status !== 'error' && (
        <div className="camera-split-layout">
          {/* LEFT: LIVE VIDEO VIEWPORT */}
          <div className="camera-viewport-container">
            <video
              ref={videoRef}
              className="camera-video-feed"
              playsInline
              autoPlay
              muted
            />

            <canvas ref={overlayCanvasRef} className="camera-overlay-canvas" />

            {/* TOP HUD STATUS PILLS */}
            <div className="camera-hud-top">
              {scanMode === 'auto-lock' ? (
                <div className={`camera-hud-badge ${isSheetDetected ? (lockedQuestionsCount >= 50 ? 'status-locked-all' : 'status-reading-active') : 'status-searching'}`}>
                  {isSheetDetected ? (
                    lockedQuestionsCount >= 50 ? (
                      <>
                        <CheckCircle2 size={15} className="hud-icon-green" />
                        <span style={{ fontWeight: 700 }}>100% Locked — Auto Submitting!</span>
                      </>
                    ) : (
                      <>
                        <span className="live-hud-pulse-dot" />
                        <span>Sheet Recognized: <strong>{lockedQuestionsCount}/50 Locked</strong> ({lockedPercentage}%)</span>
                      </>
                    )
                  ) : (
                    <>
                      <SlidersHorizontal size={14} className="spin-slow" />
                      <span>Searching for Sheet — Align inside box</span>
                    </>
                  )}
                </div>
              ) : (
                <div className={`camera-hud-badge status-${isSheetDetected ? 'stable' : 'no-sheet'}`}>
                  {isSheetDetected ? (
                    <>
                      <CheckCircle2 size={14} className="hud-icon-green" />
                      <span>Sheet Aligned — Ready for Shutter</span>
                    </>
                  ) : (
                    <>
                      <SlidersHorizontal size={14} />
                      <span>Align OMR Sheet Inside Frame</span>
                    </>
                  )}
                </div>
              )}

              {isBlurry && (
                <div className="camera-hud-badge status-blurry">
                  <AlertCircle size={14} />
                  <span>Motion Blur — Hold Camera Still</span>
                </div>
              )}
            </div>

            {/* COUNTDOWN TIMER OVERLAY */}
            {countdownActive !== null && (
              <div className="camera-countdown-overlay">
                <div className="camera-countdown-circle">
                  <span className="camera-countdown-number">{countdownActive}</span>
                  <span className="camera-countdown-label">Hold Sheet Steady</span>
                </div>
                <button
                  type="button"
                  className="camera-countdown-cancel-btn"
                  onClick={() => setCountdownActive(null)}
                >
                  <X size={14} /> Cancel Timer
                </button>
              </div>
            )}

            {/* SUBMITTING OVERLAY */}
            {(isSubmitting || isProcessingSubmission) && (
              <div className="camera-submitting-overlay">
                <div className="camera-submitting-spinner" />
                <p style={{ marginTop: '1rem', fontWeight: 600, fontSize: '0.95rem', color: '#ffffff' }}>
                  {isProcessingSubmission ? 'Authoritative Backend Grading...' : 'Deskewing & Submitting...'}
                </p>
              </div>
            )}

            {/* PREVIEW REVIEW MODAL */}
            {previewCaptured && (
              <div className="camera-preview-overlay">
                <div className="camera-preview-card">
                  <div className="camera-preview-header">
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle2 size={18} className="text-success" />
                      OMR Sheet Captured & Deskewed
                    </h4>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {lockedQuestionsCount} of {totalQuestions} questions settled. Ready to grade.
                    </p>
                  </div>

                  <div className="camera-preview-image-container">
                    <img
                      src={previewCaptured.url}
                      alt="Captured OMR Deskewed"
                      className="camera-preview-image"
                    />
                  </div>

                  <div className="camera-preview-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleRetake}
                      disabled={isProcessingSubmission}
                      style={{ flex: 1 }}
                    >
                      <RefreshCw size={16} /> Retake
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleConfirmSubmit}
                      disabled={isProcessingSubmission}
                      style={{ flex: 1.5 }}
                    >
                      {isProcessingSubmission ? 'Processing...' : 'Submit & Grade Sheet'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* BOTTOM CONTROLS TOOLBAR */}
            <div className="camera-controls-toolbar">
              {/* Countdown Timer Delay Selector */}
              <button
                type="button"
                className={`camera-tool-btn ${shutterTimer > 0 ? 'active' : ''}`}
                onClick={() => {
                  const cycle = [0, 2, 3, 5];
                  const currentIdx = cycle.indexOf(shutterTimer);
                  const nextVal = cycle[(currentIdx + 1) % cycle.length];
                  setShutterTimer(nextVal);
                }}
                title="Hold Timer: Click to change delay before capture"
              >
                <Timer size={16} />
                <span className="camera-btn-label">{shutterTimer === 0 ? 'Instant' : `${shutterTimer}s`}</span>
              </button>

              {hasTorch && (
                <button
                  type="button"
                  className={`camera-tool-btn ${isTorchOn ? 'active' : ''}`}
                  onClick={toggleTorch}
                  title="Toggle Flashlight"
                >
                  {isTorchOn ? <Zap size={16} /> : <ZapOff size={16} />}
                  <span className="camera-btn-label">Flash</span>
                </button>
              )}

              {/* Shutter Button (Manual Trigger with Countdown Support) */}
              <button
                type="button"
                className={`camera-shutter-btn ${countdownActive !== null ? 'counting' : ''}`}
                onClick={handleShutterClick}
                disabled={isSubmitting || !!previewCaptured}
                title={shutterTimer > 0 ? `Capture in ${shutterTimer}s` : 'Capture immediately'}
              >
                <div className="shutter-inner">
                  {shutterTimer > 0 && countdownActive === null && (
                    <span className="shutter-timer-badge">{shutterTimer}s</span>
                  )}
                  {countdownActive !== null && (
                    <span className="shutter-timer-badge active">{countdownActive}</span>
                  )}
                </div>
              </button>

              {videoDevices.length > 1 && (
                <button
                  type="button"
                  className="camera-tool-btn"
                  onClick={() => switchCamera()}
                  title="Switch Camera (Front/Rear)"
                >
                  <RotateCw size={16} />
                  <span className="camera-btn-label">Flip</span>
                </button>
              )}
            </div>
          </div>

          {/* RIGHT: REAL-TIME HUD MATRIX (When in auto-lock mode) */}
          {scanMode === 'auto-lock' && (
            <div className="camera-hud-sidebar">
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
          )}
        </div>
      )}
    </div>
  );
};
