// useLiveOmrScanner.ts
// Hook managing real-time OMR scanning, per-question vote buffer locking,
// dual finalize triggers (all-locked & sheet-removed), and multi-camera selection.

import { useState, useEffect, useRef, useCallback } from 'react';
import type { QuestionBubbleRead } from '../workers/omrScanner.worker';

export interface CornerPoint {
  x: number;
  y: number;
}

export type QuestionLockState = 'searching' | 'reading' | 'locked' | 'needs_review';

export interface QuestionStatus {
  questionNumber: string;
  state: QuestionLockState;
  lockedAnswer: string | null;
  currentReading: string | null;
  isMultiMark: boolean;
  consecutiveMatches: number;
}

export interface LiveScanResult {
  lockedCount: number;
  totalQuestions: number;
  lockedPercentage: number;
  questions: Record<string, QuestionStatus>;
  studentId: string;
  needsReviewQuestions: string[];
}

// Configurable Tuning Constants
export const DEFAULT_CONSECUTIVE_LOCK_FRAMES = 4; // Frames needed to settle a question answer
export const DEFAULT_MIN_LOCK_THRESHOLD_ON_REMOVAL = 5; // Minimum questions locked to auto-submit when sheet is pulled away
export const DEFAULT_BLUR_THRESHOLD = 45; // Laplacian blur rejection threshold

export interface UseLiveOmrScannerOptions {
  onCapture: (file: File, previewUrl: string, liveSummary?: LiveScanResult) => Promise<void> | void;
  lockThresholdConsecutive?: number;
  minLockThresholdToFinalizeOnRemoval?: number;
  blurThreshold?: number;
  initialMode?: 'auto-lock' | 'single-shot';
}

export function useLiveOmrScanner({
  onCapture,
  lockThresholdConsecutive = DEFAULT_CONSECUTIVE_LOCK_FRAMES,
  minLockThresholdToFinalizeOnRemoval = DEFAULT_MIN_LOCK_THRESHOLD_ON_REMOVAL,
  blurThreshold = DEFAULT_BLUR_THRESHOLD,
  initialMode = 'auto-lock',
}: UseLiveOmrScannerOptions) {
  const [scanMode, setScanMode] = useState<'auto-lock' | 'single-shot'>(initialMode);
  const [status, setStatus] = useState<
    'idle' | 'requesting-permission' | 'scanning' | 'capturing' | 'submitting' | 'error'
  >('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'permission' | 'device' | 'worker' | 'general' | null>(null);

  const [isSheetDetected, setIsSheetDetected] = useState(false);
  const [detectedCorners, setDetectedCorners] = useState<CornerPoint[] | null>(null);
  const [normalizedCorners, setNormalizedCorners] = useState<CornerPoint[] | null>(null);
  const [isBlurry, setIsBlurry] = useState(false);
  const [blurScore, setBlurScore] = useState(100);

  // Live Questions State
  const [questionsState, setQuestionsState] = useState<Record<string, QuestionStatus>>(() => {
    const init: Record<string, QuestionStatus> = {};
    for (let i = 1; i <= 50; i++) {
      init[String(i)] = {
        questionNumber: String(i),
        state: 'searching',
        lockedAnswer: null,
        currentReading: null,
        isMultiMark: false,
        consecutiveMatches: 0,
      };
    }
    return init;
  });

  const [detectedStudentId, setDetectedStudentId] = useState<string>('');
  const [isSmartDetectionAvailable, setIsSmartDetectionAvailable] = useState(true);
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // References
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Vote buffer reference: question -> history of readings
  const voteBufferRef = useRef<Record<string, { lastRead: string | null; count: number; locked: boolean; lockedValue: string | null; isMulti: boolean }>>({});

  // Performance throttling & adaptive interval
  const lastProcessedTimeRef = useRef<number>(0);
  const targetFrameIntervalRef = useRef<number>(140); // 140ms ~ 7 FPS
  const isWorkerBusyRef = useRef<boolean>(false);
  const isSubmittingRef = useRef<boolean>(false);
  const detectedCornersRef = useRef<CornerPoint[] | null>(null);
  const normalizedCornersRef = useRef<CornerPoint[] | null>(null);

  // Sheet tracking for removal trigger
  const consecutiveSheetDetectedRef = useRef<number>(0);
  const lostSheetFramesRef = useRef<number>(0);
  const lastGoodImageBufferRef = useRef<ImageData | null>(null);

  isSubmittingRef.current = isSubmitting;
  detectedCornersRef.current = detectedCorners;
  normalizedCornersRef.current = normalizedCorners;

  // Initialize vote buffer
  useEffect(() => {
    const initBuffer: typeof voteBufferRef.current = {};
    for (let i = 1; i <= 50; i++) {
      initBuffer[String(i)] = {
        lastRead: null,
        count: 0,
        locked: false,
        lockedValue: null,
        isMulti: false,
      };
    }
    voteBufferRef.current = initBuffer;
  }, []);

  // Initialize offscreen canvas once
  useEffect(() => {
    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
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
      // Ignore
    }
  }, []);

  // Race-condition prevention: monotonic request ID ref
  const startRequestIdRef = useRef<number>(0);

  // Stop camera media stream
  const stopCamera = useCallback(() => {
    startRequestIdRef.current++;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsTorchOn(false);
    setHasTorch(false);
  }, []);

  // Toggle Torch
  const toggleTorch = useCallback(async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const nextState = !isTorchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextState }],
      });
      setIsTorchOn(nextState);
    } catch {
      setHasTorch(false);
    }
  }, [isTorchOn]);

  // Switch camera device
  const switchCamera = useCallback((deviceId?: string) => {
    if (deviceId) {
      setSelectedDeviceId(deviceId);
    } else if (videoDevices.length > 1) {
      const currentIndex = videoDevices.findIndex((d) => d.deviceId === selectedDeviceId);
      const nextIndex = (currentIndex + 1) % videoDevices.length;
      setSelectedDeviceId(videoDevices[nextIndex].deviceId);
    }
  }, [videoDevices, selectedDeviceId]);

  // Reset live vote buffer (e.g. for new scan)
  const resetVoteBuffer = useCallback(() => {
    const initBuffer: typeof voteBufferRef.current = {};
    const newQuestions: Record<string, QuestionStatus> = {};

    for (let i = 1; i <= 50; i++) {
      const qStr = String(i);
      initBuffer[qStr] = {
        lastRead: null,
        count: 0,
        locked: false,
        lockedValue: null,
        isMulti: false,
      };
      newQuestions[qStr] = {
        questionNumber: qStr,
        state: 'searching',
        lockedAnswer: null,
        currentReading: null,
        isMultiMark: false,
        consecutiveMatches: 0,
      };
    }
    voteBufferRef.current = initBuffer;
    setQuestionsState(newQuestions);
    setDetectedStudentId('');
    consecutiveSheetDetectedRef.current = 0;
    lostSheetFramesRef.current = 0;
  }, []);

  // Capture and perspective warp
  const finalizeAndSubmit = useCallback(
    async (triggerReason: 'all_locked' | 'sheet_removed' | 'manual' = 'all_locked') => {
      if (isSubmittingRef.current || !videoRef.current) return;
      setIsSubmitting(true);
      setStatus('capturing');

      try {
        const video = videoRef.current;
        const fullW = video.videoWidth || 1280;
        const fullH = video.videoHeight || 720;

        const captureCanvas = document.createElement('canvas');
        captureCanvas.width = fullW;
        captureCanvas.height = fullH;
        const ctx = captureCanvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error('Could not create capture canvas');

        ctx.drawImage(video, 0, 0, fullW, fullH);

        const cornersToWarp = detectedCornersRef.current;
        const normCorners = normalizedCornersRef.current;

        // Build live summary
        let lockedCount = 0;
        const needsReview: string[] = [];
        Object.values(questionsState).forEach((q) => {
          if (q.state === 'locked' || q.state === 'needs_review') lockedCount++;
          if (q.state === 'needs_review') needsReview.push(q.questionNumber);
        });

        const liveSummary: LiveScanResult = {
          lockedCount,
          totalQuestions: 50,
          lockedPercentage: Math.round((lockedCount / 50) * 100),
          questions: questionsState,
          studentId: detectedStudentId,
          needsReviewQuestions: needsReview,
        };

        // If we have valid corners and worker, perform perspective warp
        if (cornersToWarp && cornersToWarp.length === 4 && workerRef.current && isSmartDetectionAvailable) {
          const imgData = ctx.getImageData(0, 0, fullW, fullH);
          let scaledCorners: CornerPoint[];
          if (normCorners && normCorners.length === 4) {
            scaledCorners = normCorners.map((p) => ({
              x: p.x * fullW,
              y: p.y * fullH,
            }));
          } else {
            scaledCorners = cornersToWarp;
          }

          const warpedPromise = new Promise<{ imageData: ImageData; width: number; height: number }>(
            (resolve, reject) => {
              const timeout = setTimeout(() => {
                reject(new Error('Warp timeout'));
              }, 2500);

              const handleWarpMessage = (e: MessageEvent) => {
                if (e.data?.type === 'WARP_COMPLETED') {
                  clearTimeout(timeout);
                  workerRef.current?.removeEventListener('message', handleWarpMessage);
                  if (e.data.success && e.data.imageData) {
                    resolve(e.data);
                  } else {
                    reject(new Error(e.data.error || 'Warp error'));
                  }
                }
              };

              workerRef.current?.addEventListener('message', handleWarpMessage);
              workerRef.current?.postMessage(
                {
                  type: 'WARP_PERSPECTIVE',
                  imageData: imgData,
                  corners: scaledCorners,
                  targetWidth: 1200,
                  targetHeight: 1600,
                },
                [imgData.data.buffer]
              );
            }
          );

          try {
            const warpedResult = await warpedPromise;
            const warpedCanvas = document.createElement('canvas');
            warpedCanvas.width = warpedResult.width;
            warpedCanvas.height = warpedResult.height;
            const warpedCtx = warpedCanvas.getContext('2d');
            if (warpedCtx) {
              warpedCtx.putImageData(warpedResult.imageData, 0, 0);
              const blob = await new Promise<Blob | null>((res) =>
                warpedCanvas.toBlob((b) => res(b), 'image/jpeg', 0.92)
              );
              if (blob) {
                const file = new File([blob], `omr_scan_${triggerReason}_${Date.now()}.jpg`, { type: 'image/jpeg' });
                const previewUrl = URL.createObjectURL(blob);
                await onCapture(file, previewUrl, liveSummary);
                return;
              }
            }
          } catch {
            // Fallback to unwarped
          }
        }

        // Direct fallback capture
        const blob = await new Promise<Blob | null>((res) =>
          captureCanvas.toBlob((b) => res(b), 'image/jpeg', 0.92)
        );

        if (blob) {
          const file = new File([blob], `omr_scan_${triggerReason}_${Date.now()}.jpg`, { type: 'image/jpeg' });
          const previewUrl = URL.createObjectURL(blob);
          await onCapture(file, previewUrl, liveSummary);
        }
      } catch (err: any) {
        setErrorMessage(err?.message || 'Capture failed');
        setStatus('scanning');
      } finally {
        setIsSubmitting(false);
      }
    },
    [questionsState, detectedStudentId, isSmartDetectionAvailable, onCapture]
  );

  // Update rolling vote buffer with new frame readings
  const updateVoteBuffer = useCallback(
    (decodedQuestions: Record<string, QuestionBubbleRead>, studentId: string) => {
      const buffer = voteBufferRef.current;
      const updatedQuestions: Record<string, QuestionStatus> = {};
      let totalLocked = 0;

      for (let i = 1; i <= 50; i++) {
        const qStr = String(i);
        const read = decodedQuestions[qStr];
        const prev = buffer[qStr] || {
          lastRead: null,
          count: 0,
          locked: false,
          lockedValue: null,
          isMulti: false,
        };

        if (!read) {
          updatedQuestions[qStr] = {
            questionNumber: qStr,
            state: prev.locked ? (prev.isMulti ? 'needs_review' : 'locked') : 'searching',
            lockedAnswer: prev.lockedValue,
            currentReading: null,
            isMultiMark: prev.isMulti,
            consecutiveMatches: prev.count,
          };
          if (prev.locked) totalLocked++;
          continue;
        }

        // If already locked, keep locked state to avoid shadow flickers
        if (prev.locked) {
          updatedQuestions[qStr] = {
            questionNumber: qStr,
            state: prev.isMulti ? 'needs_review' : 'locked',
            lockedAnswer: prev.lockedValue,
            currentReading: read.selected,
            isMultiMark: prev.isMulti,
            consecutiveMatches: prev.count,
          };
          totalLocked++;
          continue;
        }

        // Evaluate read consistency
        const currentReadVal = read.selected || (read.status === 'unfilled' ? 'EMPTY' : null);

        if (currentReadVal !== null && currentReadVal === prev.lastRead) {
          const nextCount = prev.count + 1;
          const isNowLocked = nextCount >= lockThresholdConsecutive;
          const isMulti = read.isMultiMark;

          buffer[qStr] = {
            lastRead: currentReadVal,
            count: nextCount,
            locked: isNowLocked,
            lockedValue: isNowLocked ? (currentReadVal === 'EMPTY' ? null : currentReadVal) : null,
            isMulti,
          };

          const state: QuestionLockState = isNowLocked
            ? isMulti
              ? 'needs_review'
              : 'locked'
            : 'reading';

          updatedQuestions[qStr] = {
            questionNumber: qStr,
            state,
            lockedAnswer: buffer[qStr].lockedValue,
            currentReading: read.selected,
            isMultiMark: isMulti,
            consecutiveMatches: nextCount,
          };

          if (isNowLocked) totalLocked++;
        } else {
          // New candidate reading
          buffer[qStr] = {
            lastRead: currentReadVal,
            count: 1,
            locked: false,
            lockedValue: null,
            isMulti: read.isMultiMark,
          };

          updatedQuestions[qStr] = {
            questionNumber: qStr,
            state: 'reading',
            lockedAnswer: null,
            currentReading: read.selected,
            isMultiMark: read.isMultiMark,
            consecutiveMatches: 1,
          };
        }
      }

      setQuestionsState(updatedQuestions);
      if (studentId) setDetectedStudentId(studentId);

      // Trigger 1: All 50 Questions Locked!
      if (totalLocked === 50 && !isSubmittingRef.current && scanMode === 'auto-lock') {
        finalizeAndSubmit('all_locked');
      }
    },
    [lockThresholdConsecutive, scanMode, finalizeAndSubmit]
  );

  // Main frame processing loop
  const processVideoFrame = useCallback(() => {
    if (status !== 'scanning' || isSubmittingRef.current) {
      animationFrameRef.current = requestAnimationFrame(processVideoFrame);
      return;
    }

    const now = performance.now();
    if (now - lastProcessedTimeRef.current < targetFrameIntervalRef.current) {
      animationFrameRef.current = requestAnimationFrame(processVideoFrame);
      return;
    }

    const video = videoRef.current;
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      animationFrameRef.current = requestAnimationFrame(processVideoFrame);
      return;
    }

    lastProcessedTimeRef.current = now;

    if (isWorkerBusyRef.current || !workerRef.current || !isSmartDetectionAvailable) {
      animationFrameRef.current = requestAnimationFrame(processVideoFrame);
      return;
    }

    try {
      const vWidth = video.videoWidth;
      const vHeight = video.videoHeight;
      if (vWidth === 0 || vHeight === 0) {
        animationFrameRef.current = requestAnimationFrame(processVideoFrame);
        return;
      }

      // Downscale frame (~720px width) for crisp fiducial square & bubble contour analysis
      const scale = Math.min(1, 720 / vWidth);
      const procW = Math.round(vWidth * scale);
      const procH = Math.round(vHeight * scale);

      const canvas = offscreenCanvasRef.current;
      if (!canvas) return;
      canvas.width = procW;
      canvas.height = procH;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, procW, procH);
      const imgData = ctx.getImageData(0, 0, procW, procH);

      lastGoodImageBufferRef.current = imgData;
      isWorkerBusyRef.current = true;

      workerRef.current.postMessage(
        {
          type: 'PROCESS_FRAME',
          imageData: imgData,
          width: procW,
          height: procH,
          decodeBubbles: scanMode === 'auto-lock',
          blurThreshold,
        },
        [imgData.data.buffer]
      );
    } catch {
      isWorkerBusyRef.current = false;
    }

    animationFrameRef.current = requestAnimationFrame(processVideoFrame);
  }, [status, scanMode, isSmartDetectionAvailable, blurThreshold]);

  // Start Camera
  const startCamera = useCallback(async () => {
    stopCamera();
    const requestId = ++startRequestIdRef.current;
    setStatus('requesting-permission');
    setErrorMessage(null);
    setErrorType(null);
    resetVoteBuffer();

    try {
      const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
      const videoConstraints: MediaTrackConstraints = selectedDeviceId
        ? { deviceId: { exact: selectedDeviceId } }
        : isMobile
          ? {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            }
          : {
              width: { ideal: 1280 },
              height: { ideal: 720 },
            };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: videoConstraints });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
      }

      // If a newer request has started or component unmounted, immediately stop tracks and abandon
      if (requestId !== startRequestIdRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities: any = videoTrack.getCapabilities?.() || {};
        if (capabilities.torch) setHasTorch(true);
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playErr: any) {
          if (playErr.name === 'AbortError') {
            // Expected signal that a newer load request took over
            return;
          }
          throw playErr;
        }
      }

      if (requestId !== startRequestIdRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      await enumerateDevices();
      setStatus('scanning');
    } catch (err: any) {
      if (requestId !== startRequestIdRef.current) {
        return;
      }
      stopCamera();
      setStatus('error');
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorType('permission');
        setErrorMessage('Camera access was denied. Please allow camera permissions in your browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorType('device');
        setErrorMessage('No camera device found on this system.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setErrorType('device');
        setErrorMessage('Camera is currently in use by another application.');
      } else {
        setErrorType('general');
        setErrorMessage(err?.message || 'Could not start camera feed.');
      }
    }
  }, [selectedDeviceId, stopCamera, enumerateDevices, resetVoteBuffer]);

  // Keep fresh callback references for the long-lived Web Worker
  const updateVoteBufferRef = useRef(updateVoteBuffer);
  updateVoteBufferRef.current = updateVoteBuffer;

  const finalizeAndSubmitRef = useRef(finalizeAndSubmit);
  finalizeAndSubmitRef.current = finalizeAndSubmit;

  const scanModeRef = useRef(scanMode);
  scanModeRef.current = scanMode;

  const minLockThresholdRef = useRef(minLockThresholdToFinalizeOnRemoval);
  minLockThresholdRef.current = minLockThresholdToFinalizeOnRemoval;

  // Initialize Worker once on mount
  useEffect(() => {
    let worker: Worker | null = null;

    try {
      worker = new Worker(new URL('../workers/omrScanner.worker.ts', import.meta.url), {
        type: 'module',
      });
      workerRef.current = worker;

      worker.onmessage = (e: MessageEvent) => {
        const data = e.data;
        if (!data) return;

        if (data.type === 'OPENCV_READY') {
          setIsSmartDetectionAvailable(true);
        } else if (data.type === 'OPENCV_ERROR') {
          setIsSmartDetectionAvailable(false);
        } else if (data.type === 'FRAME_PROCESSED') {
          isWorkerBusyRef.current = false;

          // Adaptive frame interval: adjust if worker latency exceeds budget
          if (data.processingTimeMs && data.processingTimeMs > 110) {
            targetFrameIntervalRef.current = 190; // ~5 FPS
          } else {
            targetFrameIntervalRef.current = 140; // ~7 FPS
          }

          const blurry = !!data.isBlurry;
          setIsBlurry(blurry);
          setBlurScore(data.blurScore ?? 100);

          if (data.detected && data.corners && data.normalizedCorners) {
            setIsSheetDetected(true);
            setDetectedCorners(data.corners);
            setNormalizedCorners(data.normalizedCorners);
            consecutiveSheetDetectedRef.current++;
            if (data.questions) {
              updateVoteBufferRef.current(data.questions, data.studentId || '');
            }
          } else {
            setIsSheetDetected(false);
            setDetectedCorners(null);
            setNormalizedCorners(null);

            // Sheet was lost: check Trigger 2 (Sheet Removed)
            if (consecutiveSheetDetectedRef.current >= 4) {
              lostSheetFramesRef.current++;
              let lockedCount = 0;
              Object.values(voteBufferRef.current).forEach((v) => {
                if (v.locked) lockedCount++;
              });

              // If sheet removed after locking sufficient questions, trigger auto-submit!
              if (
                lostSheetFramesRef.current >= 3 &&
                lockedCount >= minLockThresholdRef.current &&
                !isSubmittingRef.current &&
                scanModeRef.current === 'auto-lock'
              ) {
                consecutiveSheetDetectedRef.current = 0;
                finalizeAndSubmitRef.current('sheet_removed');
              }
            }
          }
        }
      };

      worker.postMessage({ type: 'INIT' });
    } catch {
      setIsSmartDetectionAvailable(false);
    }

    return () => {
      if (worker) {
        worker.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  // Manage Animation Frame Loop
  useEffect(() => {
    if (status === 'scanning') {
      animationFrameRef.current = requestAnimationFrame(processVideoFrame);
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [status, processVideoFrame]);

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Compute live statistics
  let lockedQuestionsCount = 0;
  let needsReviewCount = 0;
  const needsReviewList: string[] = [];

  Object.values(questionsState).forEach((q) => {
    if (q.state === 'locked') lockedQuestionsCount++;
    if (q.state === 'needs_review') {
      lockedQuestionsCount++;
      needsReviewCount++;
      needsReviewList.push(q.questionNumber);
    }
  });

  return {
    videoRef,
    status,
    errorMessage,
    errorType,
    scanMode,
    setScanMode,
    isSheetDetected,
    detectedCorners,
    normalizedCorners,
    isBlurry,
    blurScore,
    questionsState,
    detectedStudentId,
    lockedQuestionsCount,
    needsReviewCount,
    needsReviewList,
    totalQuestions: 50,
    lockedPercentage: Math.round((lockedQuestionsCount / 50) * 100),
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
  };
}
