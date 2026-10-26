// NormalCameraScanner.tsx
// Standard OMR Sheet Camera Scanner with Manual Shutter
// Provides a clean camera viewfinder, sheet alignment guide, tactile shutter button,
// countdown timer, synthetic shutter click sound, flash effect, and photo review.

import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  FileCheck,
} from 'lucide-react';

export interface NormalCameraScannerProps {
  onCapture: (file: File) => Promise<void> | void;
  onClose?: () => void;
  onSwitchToUpload?: () => void;
  onSwitchToLive?: () => void;
  title?: string;
  subtitle?: string;
}

export const NormalCameraScanner: React.FC<NormalCameraScannerProps> = ({
  onCapture,
  onClose,
  onSwitchToUpload,
  onSwitchToLive,
  title = 'Standard OMR Camera',
  subtitle = 'Position the answer sheet inside the framing guide and press the shutter button to take a photo.',
}) => {
  const [status, setStatus] = useState<'idle' | 'initializing' | 'ready' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'permission' | 'device' | 'general' | null>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  // Mobile detection
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= 768;
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [shutterTimer, setShutterTimer] = useState<number>(0); // 0s (instant), 2s, 3s, 5s
  const [countdownActive, setCountdownActive] = useState<number | null>(null);
  const [flashActive, setFlashActive] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [captureWarning, setCaptureWarning] = useState<string | null>(null);

  const [previewCaptured, setPreviewCaptured] = useState<{
    file: File;
    url: string;
    width: number;
    height: number;
  } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startRequestIdRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Play synthetic camera shutter mechanical click
  const playShutterSound = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      // 1. Initial mechanical click (high frequency chirp)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.05);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);

      // 2. Secondary shutter release snap
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(450, now + 0.04);
      osc2.frequency.exponentialRampToValueAtTime(120, now + 0.1);
      gain2.gain.setValueAtTime(0.25, now + 0.04);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.04);
      osc2.stop(now + 0.11);
    } catch {
      // Audio playback is optional, ignore audio context restrictions
    }
  }, []);

  // Enumerate video devices
  const enumerateDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      setVideoDevices(videoInputs);
    } catch {
      // Ignore enumeration failure
    }
  }, []);

  // Stop camera feed
  const stopCamera = useCallback(() => {
    startRequestIdRef.current++;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsTorchOn(false);
    setHasTorch(false);
  }, []);

  // Start camera feed with robust fallback constraints
  const startCamera = useCallback(async () => {
    // Stop any existing stream FIRST, before generating the new requestId
    stopCamera();
    const requestId = ++startRequestIdRef.current;
    setStatus('initializing');
    setErrorMessage(null);
    setErrorType(null);

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setStatus('error');
        setErrorType('device');
        setErrorMessage(
          window.isSecureContext === false
            ? 'Camera access requires a secure origin (HTTPS or localhost). Please open this site via http://localhost:5173.'
            : 'Camera API (navigator.mediaDevices.getUserMedia) is not supported in this browser.'
        );
        return;
      }

      const isMobile =
        typeof navigator !== 'undefined' &&
        /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');

      // Multi-tier constraint candidates: High Res -> Medium Res -> Any Video
      const constraintCandidates: MediaStreamConstraints[] = [
        ...(selectedDeviceId
          ? [
              {
                audio: false,
                video: {
                  deviceId: { exact: selectedDeviceId },
                  width: { ideal: 1920 },
                  height: { ideal: 1080 },
                },
              },
              {
                audio: false,
                video: { deviceId: { exact: selectedDeviceId } },
              },
            ]
          : []),
        {
          audio: false,
          video: isMobile
            ? {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1920 },
                height: { ideal: 1080 },
              }
            : {
                width: { ideal: 1920 },
                height: { ideal: 1080 },
              },
        },
        {
          audio: false,
          video: isMobile
            ? { facingMode: { ideal: 'environment' } }
            : { width: { ideal: 1280 }, height: { ideal: 720 } },
        },
        {
          audio: false,
          video: { width: { ideal: 640 }, height: { ideal: 480 } },
        },
        {
          audio: false,
          video: true,
        },
      ];

      let stream: MediaStream | null = null;
      let lastError: any = null;

      for (const candidate of constraintCandidates) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(candidate);
          if (stream) break;
        } catch (err: any) {
          lastError = err;
          // If explicitly denied by user, stop cascade immediately
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            throw err;
          }
        }
      }

      if (!stream) {
        throw lastError || new Error('Could not establish connection with camera device.');
      }

      // Check if another request superceded this one while awaiting
      if (requestId !== startRequestIdRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;

      // Check torch capability
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities: any = videoTrack.getCapabilities?.() || {};
        if (capabilities.torch) {
          setHasTorch(true);
        }
      }

      // Attach stream to video element
      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        video.muted = true;
        try {
          await video.play();
        } catch (playErr: any) {
          if (playErr.name !== 'AbortError') {
            console.warn('Video play warning:', playErr);
          }
        }
      }

      if (requestId !== startRequestIdRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      await enumerateDevices();
      setStatus('ready');
    } catch (err: any) {
      if (requestId !== startRequestIdRef.current) return;
      stopCamera();
      setStatus('error');

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorType('permission');
        setErrorMessage('Camera access was denied. Please allow camera permissions in your browser.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorType('device');
        setErrorMessage('No camera device found on this system. Please connect a webcam or use File Upload.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setErrorType('device');
        setErrorMessage('Camera is currently in use by another application. Please close other camera apps and retry.');
      } else {
        setErrorType('general');
        setErrorMessage(err?.message || 'Unable to access camera.');
      }
    }
  }, [enumerateDevices, selectedDeviceId, stopCamera]);

  // Start camera on mount & cleanup
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, [startCamera, stopCamera]);

  // Clean up preview object URL
  useEffect(() => {
    return () => {
      if (previewCaptured?.url) {
        URL.revokeObjectURL(previewCaptured.url);
      }
    };
  }, [previewCaptured]);

  // Keyboard shortcut: Esc to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Switch camera device
  const switchCamera = useCallback(() => {
    if (videoDevices.length <= 1) return;
    const currentIndex = videoDevices.findIndex((d) => d.deviceId === selectedDeviceId);
    const nextIndex = (currentIndex + 1) % videoDevices.length;
    const nextDevice = videoDevices[nextIndex];
    setSelectedDeviceId(nextDevice.deviceId);
  }, [videoDevices, selectedDeviceId]);

  // Toggle torch / flashlight
  const toggleTorch = useCallback(async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const next = !isTorchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: next }],
      });
      setIsTorchOn(next);
    } catch {
      setHasTorch(false);
    }
  }, [isTorchOn]);

  // Perform actual photo snap from live video stream
  const snapPhoto = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    // Check if video is loaded and ready
    if (video.readyState < 2 && (!video.videoWidth || !video.videoHeight)) {
      setCaptureWarning('Camera is still loading. Please wait for the video preview to display before taking a photo.');
      return;
    }

    setIsCapturing(true);

    // 1. Trigger Flash & Shutter Sound
    setFlashActive(true);
    playShutterSound();
    setTimeout(() => setFlashActive(false), 160);

    try {
      const fullW = video.videoWidth || 1280;
      const fullH = video.videoHeight || 720;

      const canvas = document.createElement('canvas');
      canvas.width = fullW;
      canvas.height = fullH;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to create canvas context');

      // Draw full resolution frame
      ctx.drawImage(video, 0, 0, fullW, fullH);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.95)
      );

      if (!blob) throw new Error('Could not encode captured photo to JPEG');

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const file = new File([blob], `omr_sheet_snap_${timestamp}.jpg`, { type: 'image/jpeg' });
      const previewUrl = URL.createObjectURL(blob);

      setPreviewCaptured({
        file,
        url: previewUrl,
        width: fullW,
        height: fullH,
      });
    } catch (err: any) {
      setCaptureWarning(`Could not capture photo: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsCapturing(false);
    }
  }, [playShutterSound]);

  // Countdown timer handler
  useEffect(() => {
    if (countdownActive === null) return;

    if (countdownActive <= 0) {
      setCountdownActive(null);
      snapPhoto();
      return;
    }

    const timerId = setTimeout(() => {
      setCountdownActive((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timerId);
  }, [countdownActive, snapPhoto]);

  // Shutter button click
  const handleShutterClick = () => {
    if (status !== 'ready' || isCapturing || previewCaptured || countdownActive !== null) return;
    if (shutterTimer === 0) {
      snapPhoto();
    } else {
      setCountdownActive(shutterTimer);
    }
  };

  // Retake photo
  const handleRetake = () => {
    if (previewCaptured?.url) {
      URL.revokeObjectURL(previewCaptured.url);
    }
    setPreviewCaptured(null);
    setSubmitError(null);
    setCountdownActive(null);
    startCamera();
  };

  // Confirm and submit captured photo
  const handleConfirmSubmit = async () => {
    if (!previewCaptured) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await onCapture(previewCaptured.file);
      if (previewCaptured?.url) {
        URL.revokeObjectURL(previewCaptured.url);
      }
      setPreviewCaptured(null);
      // Restart camera stream ready for next sheet or retake
      startCamera();
    } catch (err: any) {
      setSubmitError(
        err?.message ||
          'Grading failed. Ensure all 4 black corner squares of the standard ZipGrade 50-item answer sheet are flat and clearly visible in the frame.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`omr-workspace-wrapper ${isFullscreen ? 'omr-fullscreen' : ''} ${isMobile ? 'omr-mobile-mode' : 'omr-desktop-mode'}`}>
      {/* 1. DESKTOP HEADER (PC only) */}
      {!isMobile && (
        <div className="omr-workspace-header">
          <div className="omr-header-left">
            <div className="omr-title-group">
              <div className="omr-header-icon-badge" style={{ background: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe' }}>
                <Camera size={18} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h3 className="omr-title">{title}</h3>
                  <span
                    style={{
                      background: '#f1f5f9',
                      color: '#475569',
                      border: '1px solid #cbd5e1',
                      borderRadius: '20px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Manual Shutter Mode
                  </span>
                </div>
                <p className="omr-subtitle">{subtitle}</p>
              </div>
            </div>
          </div>

          <div className="omr-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Quick link to Live Auto-Scanner if available */}
            {onSwitchToLive && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  stopCamera();
                  onSwitchToLive();
                }}
                style={{
                  fontSize: '0.78rem',
                  padding: '0.4rem 0.75rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  borderRadius: '8px',
                }}
                title="Switch to Live Auto-Detection Scanner"
              >
                <Sparkles size={14} style={{ color: 'var(--primary, #28166f)' }} />
                <span>Switch to Live Scanner</span>
              </button>
            )}

            {/* Theater / Fullscreen Toggle */}
            <button
              type="button"
              className="omr-action-btn"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Expand Viewfinder'}
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
      )}

      {/* 2. ERROR STATE */}
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
              {errorMessage || 'Unable to access your video camera device.'}
            </p>

            {errorType === 'permission' && (
              <div className="omr-error-steps-box">
                <strong>How to enable your camera in browser:</strong>
                <ol>
                  <li>Click the camera or lock icon 🔒 next to the URL in your browser address bar.</li>
                  <li>Set <strong>Camera</strong> permissions to <strong>Allow</strong>.</li>
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

      {/* 3. NORMAL CAMERA VIEWFINDER & CONTROLS */}
      {status !== 'error' && (
        <div className="normal-camera-container">
          {/* VIEWFINDER SCREEN */}
          <div className="normal-camera-viewport">
            {/* MOBILE FLOATING TOP BAR */}
            {isMobile && (
              <div className="omr-mobile-top-bar">
                {onClose ? (
                  <button
                    type="button"
                    className="omr-mobile-icon-btn omr-close-glass"
                    onClick={() => {
                      stopCamera();
                      onClose();
                    }}
                    title="Close Scanner"
                  >
                    <X size={18} />
                  </button>
                ) : (
                  <div style={{ width: 38 }} />
                )}

                <div className="omr-mobile-status-pill state-searching">
                  <Camera size={13} style={{ color: '#60a5fa' }} />
                  <span>Manual Shutter</span>
                </div>

                <div className="omr-mobile-top-actions">
                  {hasTorch && (
                    <button
                      type="button"
                      className={`omr-mobile-icon-btn ${isTorchOn ? 'active-torch' : ''}`}
                      onClick={toggleTorch}
                      title="Toggle Flashlight"
                    >
                      {isTorchOn ? <Zap size={16} /> : <ZapOff size={16} />}
                    </button>
                  )}

                  {videoDevices.length > 1 && (
                    <button
                      type="button"
                      className="omr-mobile-icon-btn"
                      onClick={switchCamera}
                      title="Switch camera device"
                    >
                      <RotateCw size={16} />
                    </button>
                  )}

                  <button
                    type="button"
                    className={`omr-mobile-icon-btn ${shutterTimer > 0 ? 'active-timer' : ''}`}
                    onClick={() => {
                      const delays = [0, 2, 3, 5];
                      const next = delays[(delays.indexOf(shutterTimer) + 1) % delays.length];
                      setShutterTimer(next);
                    }}
                    title="Set shutter timer delay"
                  >
                    <Timer size={16} />
                    {shutterTimer > 0 && <span className="omr-timer-badge">{shutterTimer}s</span>}
                  </button>

                  {onSwitchToLive && (
                    <button
                      type="button"
                      className="omr-mobile-icon-btn"
                      onClick={() => {
                        stopCamera();
                        onSwitchToLive();
                      }}
                      title="Switch to Live Auto-Scanner"
                    >
                      <Sparkles size={16} style={{ color: '#a78bfa' }} />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Live Video Element */}
            <video
              ref={videoRef}
              className="normal-camera-video"
              playsInline
              autoPlay
              muted
              onLoadedMetadata={() => {
                if (videoRef.current) {
                  videoRef.current.play().catch(() => {});
                }
              }}
            />

            {/* Warning / Error Toast Banner */}
            {captureWarning && (
              <div
                style={{
                  position: 'absolute',
                  top: '16px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 30,
                  background: 'rgba(220, 38, 38, 0.95)',
                  backdropFilter: 'blur(8px)',
                  color: '#ffffff',
                  padding: '0.6rem 1rem',
                  borderRadius: '10px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  maxWidth: '90%',
                }}
              >
                <AlertCircle size={16} />
                <span>{captureWarning}</span>
                <button
                  type="button"
                  onClick={() => setCaptureWarning(null)}
                  style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', marginLeft: '6px', display: 'flex', alignItems: 'center' }}
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Connecting Spinner / Initializing Banner */}
            {status === 'initializing' && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(7, 11, 20, 0.88)',
                  color: '#ffffff',
                  zIndex: 20,
                  gap: '0.75rem',
                }}
              >
                <RefreshCw size={32} className="omr-spin" style={{ color: '#818cf8' }} />
                <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>Starting Camera Feed...</span>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Please grant camera permission if prompted by browser
                </span>
              </div>
            )}

            {/* Flash Effect on Capture */}
            {flashActive && <div className="normal-camera-flash-overlay" />}

            {/* SHEET FRAMING GUIDE OVERLAY */}
            {!previewCaptured && status === 'ready' && (
              <div className="normal-camera-sheet-guide-container">
                <div className="normal-camera-sheet-frame">
                  {/* Four Corner Reticles */}
                  <div className="normal-sheet-corner top-left" />
                  <div className="normal-sheet-corner top-right" />
                  <div className="normal-sheet-corner bottom-left" />
                  <div className="normal-sheet-corner bottom-right" />

                  {/* Center Subtle Crosshair */}
                  <div className="normal-sheet-crosshair" />

                  {/* Guidance Badge */}
                  <div className="normal-sheet-guide-label">
                    <FileCheck size={14} />
                    <span>Align Answer Sheet inside Frame</span>
                  </div>
                </div>
              </div>
            )}

            {/* COUNTDOWN OVERLAY */}
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

            {/* CAPTURE REVIEW MODAL / OVERLAY */}
            {previewCaptured && (
              <div className="omr-preview-modal-overlay">
                <div className="omr-preview-modal-card">
                  <div className="omr-preview-header">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                      <span className="omr-preview-badge" style={{ background: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe' }}>
                        <CheckCircle2 size={13} /> Photo Captured
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            color: '#64748b',
                            fontWeight: 700,
                            background: '#f1f5f9',
                            padding: '2px 8px',
                            borderRadius: '6px',
                          }}
                        >
                          {previewCaptured.width} × {previewCaptured.height} px
                        </span>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={handleRetake}
                          disabled={isSubmitting}
                          style={{
                            padding: '3px 8px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            color: '#334155',
                            cursor: 'pointer',
                          }}
                          title="Discard current photo and retake"
                        >
                          <RefreshCw size={12} /> Retake
                        </button>
                      </div>
                    </div>
                    <h4 className="omr-preview-title">Review Captured Sheet</h4>
                    <p className="omr-preview-subtitle">
                      Verify that all 4 black corner squares and student bubbles are clearly visible and in focus.
                    </p>
                  </div>

                  <div className="omr-preview-image-box" style={{ background: '#0f172a' }}>
                    <img
                      src={previewCaptured.url}
                      alt="Captured Answer Sheet"
                      className="omr-preview-img"
                    />
                  </div>

                  {submitError && (
                    <div
                      style={{
                        padding: '0.75rem 1rem',
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '10px',
                        color: '#b91c1c',
                        fontSize: '0.8rem',
                        lineHeight: 1.45,
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                      }}
                    >
                      <AlertCircle size={16} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <strong style={{ color: '#991b1b', display: 'block', marginBottom: '2px' }}>
                          Grading Failed (400 Bad Request)
                        </strong>
                        <span>{submitError}</span>
                        <div style={{ marginTop: '5px', fontSize: '0.74rem', color: '#64748b' }}>
                          Tip: The OMR engine requires all 4 black corner squares of the standard ZipGrade 50-item answer sheet to be completely visible, straight, and uncropped.
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="omr-preview-actions" style={{ marginTop: '0.25rem', flexShrink: 0 }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleRetake}
                      disabled={isSubmitting}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '0.65rem 0.85rem',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        borderRadius: '10px',
                      }}
                    >
                      <RefreshCw size={15} /> Retake Photo
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleConfirmSubmit}
                      disabled={isSubmitting}
                      style={{
                        flex: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '0.65rem 0.85rem',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        borderRadius: '10px',
                      }}
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw size={15} className="omr-spin" /> Processing &amp; Grading...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={15} /> Use Photo &amp; Grade Sheet
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* MOBILE BOTTOM SHUTTER BAR */}
          {isMobile && !previewCaptured && (
            <div className="omr-mobile-shutter-bar">
              <button
                type="button"
                className={`omr-mobile-mode-pill ${shutterTimer > 0 ? 'mode-auto' : 'mode-manual'}`}
                onClick={() => {
                  const delays = [0, 2, 3, 5];
                  const next = delays[(delays.indexOf(shutterTimer) + 1) % delays.length];
                  setShutterTimer(next);
                }}
                title="Timer delay"
              >
                <Timer size={13} />
                <span>{shutterTimer === 0 ? 'Instant' : `${shutterTimer}s`}</span>
              </button>

              <div className="omr-mobile-shutter-center">
                <button
                  type="button"
                  className="omr-mobile-shutter-button"
                  onClick={handleShutterClick}
                  disabled={status !== 'ready' || isCapturing || !!previewCaptured || countdownActive !== null}
                  title="Take photo of sheet"
                >
                  <div className="omr-mobile-shutter-inner">
                    {shutterTimer > 0 ? (
                      <span className="omr-mobile-shutter-timer-digit">{shutterTimer}s</span>
                    ) : (
                      <Camera size={26} style={{ color: '#28166f' }} />
                    )}
                  </div>
                </button>
              </div>

              <div className="omr-mobile-shutter-right">
                {onSwitchToUpload ? (
                  <button
                    type="button"
                    className="omr-mobile-icon-btn"
                    onClick={() => {
                      stopCamera();
                      onSwitchToUpload();
                    }}
                    title="Switch to file upload mode"
                  >
                    <UploadCloud size={18} />
                  </button>
                ) : onSwitchToLive ? (
                  <button
                    type="button"
                    className="omr-mobile-icon-btn"
                    onClick={() => {
                      stopCamera();
                      onSwitchToLive();
                    }}
                    title="Switch to Live Auto-Scanner"
                  >
                    <Sparkles size={18} style={{ color: '#a78bfa' }} />
                  </button>
                ) : (
                  <div style={{ width: 38 }} />
                )}
              </div>
            </div>
          )}

          {/* DEDICATED DESKTOP CAMERA BOTTOM CONTROL BAR */}
          {!isMobile && (
            <div className="normal-camera-control-bar">
              {/* Left Options: Timer & Torch */}
              <div className="normal-camera-control-group left">
                {/* Timer Delay Selector */}
                <button
                  type="button"
                  className={`omr-bar-btn ${shutterTimer > 0 ? 'active-timer' : ''}`}
                  onClick={() => {
                    const delays = [0, 2, 3, 5];
                    const next = delays[(delays.indexOf(shutterTimer) + 1) % delays.length];
                    setShutterTimer(next);
                  }}
                  title="Set shutter timer delay"
                >
                  <Timer size={15} />
                  <span>Timer: <strong>{shutterTimer === 0 ? 'Off' : `${shutterTimer}s`}</strong></span>
                </button>

                {/* Torch / Flashlight Toggle */}
                {hasTorch && (
                  <button
                    type="button"
                    className={`omr-bar-btn ${isTorchOn ? 'active-torch' : ''}`}
                    onClick={toggleTorch}
                    title="Toggle Flashlight"
                  >
                    {isTorchOn ? <Zap size={15} /> : <ZapOff size={15} />}
                    <span>Flash</span>
                  </button>
                )}
              </div>

              {/* Center: Prominent Circular Shutter Button */}
              <div className="normal-camera-control-group center">
                <button
                  type="button"
                  className="normal-shutter-btn"
                  onClick={handleShutterClick}
                  disabled={status !== 'ready' || isCapturing || !!previewCaptured || countdownActive !== null}
                  title={
                    status !== 'ready'
                      ? 'Camera is loading...'
                      : shutterTimer > 0
                      ? `Take picture in ${shutterTimer}s`
                      : 'Take picture of answer sheet'
                  }
                >
                  <div className="normal-shutter-inner">
                    <Camera size={24} />
                  </div>
                  {shutterTimer > 0 && (
                    <span className="normal-shutter-timer-badge">{shutterTimer}s</span>
                  )}
                </button>
              </div>

              {/* Right: Camera Flip & Upload Switch */}
              <div className="normal-camera-control-group right">
                {videoDevices.length > 1 && (
                  <button
                    type="button"
                    className="omr-bar-btn"
                    onClick={switchCamera}
                    title="Switch camera device"
                  >
                    <RotateCw size={15} />
                    <span>Flip Camera</span>
                  </button>
                )}

                {onSwitchToUpload && (
                  <button
                    type="button"
                    className="omr-bar-btn upload-opt"
                    onClick={() => {
                      stopCamera();
                      onSwitchToUpload();
                    }}
                    title="Switch to file upload mode"
                  >
                    <UploadCloud size={15} />
                    <span>Upload File</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NormalCameraScanner;
