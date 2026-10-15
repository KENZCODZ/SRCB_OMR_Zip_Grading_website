// useLiveOmrScanner.ts
// Redesigned Live OMR Scanning Hook matching the Architectural Flowchart:
// Camera Frame -> Image Quality Check -> Detect Sheet Corners -> Perspective Correction ->
// Align OMR Template -> Detect & Classify Bubbles -> Validate Question Count ->
// Generate One Complete Result -> Update UI Atomically -> Sheet Stable? -> Lock or Capture Sheet
//
// Key Fixes:
// 1. Tracks continuous session across frames (prevents detection count fluctuations 49/50 -> 0/50).
// 2. Atomic sequence frame dispatching via monotonic frameId (prevents partial state tearing).
// 3. Complete Evaluator telemetry synchronized with atomic results (input dimensions, detected bubbles, classified answers, errors).
// 4. Stream ownership decoupled from processing (preview video is NEVER destroyed or blacked out during capture or retake).
// 5. Validated multi-frame stability detector ("Sheet Stable?") before locking answers.

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { FrameResultMessage } from '../workers/omrScanner.worker';
import {
  gradeAnswers,
  traceToEvaluatorStats,
  type AnswerState,
  type EvaluationTrace,
  type EvaluatorStats,
  type GradeSummary,
  type QuestionRead,
} from '../omr/omrEvaluation';

export type { EvaluatorStats };

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
  trace?: EvaluationTrace | null;
  grade?: GradeSummary;
}

/**
 * Settled answer state of a question, or undefined if it has not settled yet.
 * A question settles when the same reading (single letter, multi-mark, or blank)
 * is seen on `lockThresholdConsecutive` consecutive template-verified frames.
 */
export function settledAnswerState(q: QuestionStatus | undefined): AnswerState | undefined {
  if (!q) return undefined;
  if (q.state === 'needs_review') return { status: 'multiple', selected: q.lockedAnswer };
  if (q.state !== 'locked') return undefined;
  return q.lockedAnswer ? { status: 'single', selected: q.lockedAnswer } : { status: 'blank', selected: null };
}

/** Session-level counters (multi-frame). Every count is restricted to questions 1..N. */
export interface SessionCounters {
  total: number; // N
  settled: number; // answered + multiple + blank
  answered: number; // settled single-mark answers (the only gradable answers)
  multiple: number; // settled multi-mark -> needs review
  blank: number; // settled blank
  unsettled: number; // N - settled
}

// Configurable Tuning Constants
export const DEFAULT_CONSECUTIVE_LOCK_FRAMES = 3; // Frames required to settle an answer
export const DEFAULT_MIN_LOCK_THRESHOLD_ON_REMOVAL = 5; // Minimum answers to auto-submit when sheet pulled away
export const DEFAULT_BLUR_THRESHOLD = 35; // Laplacian blur threshold

export interface UseLiveOmrScannerOptions {
  onCapture: (file: File, previewUrl: string, liveSummary?: LiveScanResult) => Promise<void> | void;
  lockThresholdConsecutive?: number;
  minLockThresholdToFinalizeOnRemoval?: number;
  blurThreshold?: number;
  initialMode?: 'auto-lock' | 'single-shot';
  answerKey?: Record<string, string>;
  numItems?: number;
  passingScore?: number;
}

export function useLiveOmrScanner({
  onCapture,
  lockThresholdConsecutive = DEFAULT_CONSECUTIVE_LOCK_FRAMES,
  minLockThresholdToFinalizeOnRemoval = DEFAULT_MIN_LOCK_THRESHOLD_ON_REMOVAL,
  blurThreshold = DEFAULT_BLUR_THRESHOLD,
  initialMode = 'auto-lock',
  answerKey,
  numItems,
  passingScore,
}: UseLiveOmrScannerOptions) {
  // One exam length used by the worker, the session counters and the grader alike.
  // (Previously the worker graded `numItems || 50` while the UI divided by the key length.)
  const totalItems = Math.min(50, Math.max(1, numItems || (answerKey ? Object.keys(answerKey).length : 50)));
  const [scanMode, setScanMode] = useState<'auto-lock' | 'single-shot'>(initialMode);
  const [status, setStatus] = useState<
    'idle' | 'requesting-permission' | 'scanning' | 'capturing' | 'submitting' | 'error'
  >('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'permission' | 'device' | 'worker' | 'general' | null>(null);

  // Sheet Detection State
  const [isSheetDetected, setIsSheetDetected] = useState(false);
  const [isSheetStable, setIsSheetStable] = useState(false);
  const [detectedCorners, setDetectedCorners] = useState<CornerPoint[] | null>(null);
  const [normalizedCorners, setNormalizedCorners] = useState<CornerPoint[] | null>(null);
  const [isBlurry, setIsBlurry] = useState(false);
  const [blurScore, setBlurScore] = useState(100);

  // Live Questions State (Questions 1 to 50)
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

  // Latest per-frame evaluation, rendered verbatim by the telemetry panel.
  const [latestTrace, setLatestTrace] = useState<EvaluationTrace | null>(null);

  // Hardware / Stream State
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

  // Monotonic frame tracking to prevent out-of-order partial state tearing
  const frameSeqRef = useRef<number>(0);
  const lastProcessedFrameIdRef = useRef<number>(0);

  // Persistent Vote Buffer across continuous session
  const voteBufferRef = useRef<
    Record<
      string,
      {
        lastRead: string | null;
        count: number;
        locked: boolean;
        lockedValue: string | null;
        isMulti: boolean;
      }
    >
  >({});

  // Performance throttling & adaptive interval
  const lastProcessedTimeRef = useRef<number>(0);
  const targetFrameIntervalRef = useRef<number>(140); // 140ms ~ 7 FPS
  const isWorkerBusyRef = useRef<boolean>(false);
  const isSubmittingRef = useRef<boolean>(false);
  const detectedCornersRef = useRef<CornerPoint[] | null>(null);
  const normalizedCornersRef = useRef<CornerPoint[] | null>(null);

  // Stability detection references (calculates corner movement delta)
  const prevNormalizedCornersRef = useRef<CornerPoint[] | null>(null);
  const stabilityStreakRef = useRef<number>(0);

  // Session Grace Decay: retains detected state across momentary 1-2 frame blur/occlusion
  const sessionGraceFramesRef = useRef<number>(0);
  const consecutiveSheetDetectedRef = useRef<number>(0);
  const lostSheetFramesRef = useRef<number>(0);

  isSubmittingRef.current = isSubmitting;
  detectedCornersRef.current = detectedCorners;
  normalizedCornersRef.current = normalizedCorners;

  // Initialize vote buffer once
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

  const startRequestIdRef = useRef<number>(0);

  // Stop camera media stream completely (only on unmount or device switch)
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
  const switchCamera = useCallback(
    (deviceId?: string) => {
      if (deviceId) {
        setSelectedDeviceId(deviceId);
      } else if (videoDevices.length > 1) {
        const currentIndex = videoDevices.findIndex((d) => d.deviceId === selectedDeviceId);
        const nextIndex = (currentIndex + 1) % videoDevices.length;
        setSelectedDeviceId(videoDevices[nextIndex].deviceId);
      }
    },
    [videoDevices, selectedDeviceId]
  );

  // Reset live vote buffer without interrupting camera stream
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
    sessionGraceFramesRef.current = 0;
    stabilityStreakRef.current = 0;
    setIsSheetStable(false);
  }, []);

  // Seamless Retake (DOES NOT touch the MediaStream; camera continues running smoothly)
  const retake = useCallback(() => {
    resetVoteBuffer();
    setIsSubmitting(false);
    setStatus('scanning');
  }, [resetVoteBuffer]);

  // Capture and perspective warp
  const finalizeAndSubmit = useCallback(
    async (triggerReason: 'all_locked' | 'sheet_removed' | 'manual' = 'all_locked') => {
      if (isSubmittingRef.current || !videoRef.current) return;
      setIsSubmitting(true);

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
          totalQuestions: totalItems,
          lockedPercentage: Math.round((lockedCount / totalItems) * 100),
          questions: questionsState,
          studentId: detectedStudentId,
          needsReviewQuestions: needsReview,
          trace: latestTrace,
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
                const file = new File([blob], `omr_scan_${triggerReason}_${Date.now()}.jpg`, {
                  type: 'image/jpeg',
                });
                const previewUrl = URL.createObjectURL(blob);
                await onCapture(file, previewUrl, liveSummary);
                return;
              }
            }
          } catch {
            // Fallback to unwarped direct capture
          }
        }

        // Direct fallback capture
        const blob = await new Promise<Blob | null>((res) =>
          captureCanvas.toBlob((b) => res(b), 'image/jpeg', 0.92)
        );

        if (blob) {
          const file = new File([blob], `omr_scan_${triggerReason}_${Date.now()}.jpg`, {
            type: 'image/jpeg',
          });
          const previewUrl = URL.createObjectURL(blob);
          await onCapture(file, previewUrl, liveSummary);
        }
      } catch (err: any) {
        setErrorMessage(err?.message || 'Capture failed');
      } finally {
        setIsSubmitting(false);
      }
    },
    [questionsState, detectedStudentId, isSmartDetectionAvailable, onCapture, totalItems, latestTrace]
  );

  // Update rolling vote buffer with continuous session tracking
  const updateSessionVotes = useCallback(
    (
      decodedQuestions: Record<string, QuestionRead>,
      studentId: string,
      isTemplateAligned: boolean
    ) => {
      const buffer = voteBufferRef.current;
      const updatedQuestions: Record<string, QuestionStatus> = {};
      let totalLocked = 0;
      const targetQuestions = totalItems;

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

        // If template was not aligned, keep previous locked answer without updating reading
        if (!isTemplateAligned || !read) {
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

        // If already locked, retain locked value across shadow flickers
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

        // Evaluate read consistency across frames
        // Vote key: 'A' (single), 'AC' (multiple), 'EMPTY' (blank). Blank is a reading, not a gap.
        const currentReadVal = read.status === 'blank' ? 'EMPTY' : read.selected;

        if (currentReadVal !== null && currentReadVal === prev.lastRead) {
          const nextCount = prev.count + 1;
          const isNowLocked = nextCount >= lockThresholdConsecutive;
          const isMulti = read.status === 'multiple';

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
            isMulti: read.status === 'multiple',
          };

          updatedQuestions[qStr] = {
            questionNumber: qStr,
            state: 'reading',
            lockedAnswer: null,
            currentReading: read.selected,
            isMultiMark: read.status === 'multiple',
            consecutiveMatches: 1,
          };
        }
      }

      setQuestionsState(updatedQuestions);
      if (studentId) setDetectedStudentId(studentId);

      // Completion = every question 1..N has SETTLED (answered, multi-mark or blank) on a
      // stable, template-verified sheet. It does not mean every question was answered.
      if (
        totalLocked >= targetQuestions &&
        isSheetStable &&
        !isSubmittingRef.current &&
        scanMode === 'auto-lock'
      ) {
        finalizeAndSubmit('all_locked');
      }
    },
    [lockThresholdConsecutive, scanMode, isSheetStable, finalizeAndSubmit, totalItems]
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

      const frameId = ++frameSeqRef.current;
      isWorkerBusyRef.current = true;

      workerRef.current.postMessage(
        {
          type: 'PROCESS_FRAME',
          frameId,
          imageData: imgData,
          width: procW,
          height: procH,
          decodeBubbles: scanMode === 'auto-lock',
          blurThreshold,
          numExpectedQuestions: totalItems,
          answerKey,
          passingScore,
        },
        [imgData.data.buffer]
      );
    } catch {
      isWorkerBusyRef.current = false;
    }

    animationFrameRef.current = requestAnimationFrame(processVideoFrame);
  }, [status, scanMode, isSmartDetectionAvailable, blurThreshold, totalItems, answerKey, passingScore]);

  // Start Camera (Acquires stream once and leaves it running)
  const startCamera = useCallback(async () => {
    stopCamera();
    const requestId = ++startRequestIdRef.current;
    setStatus('requesting-permission');
    setErrorMessage(null);
    setErrorType(null);
    resetVoteBuffer();

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        stopCamera();
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
        typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
      const constraintCandidates: MediaStreamConstraints[] = [
        ...(selectedDeviceId ? [{ audio: false, video: { deviceId: { exact: selectedDeviceId } } }] : []),
        {
          audio: false,
          video: isMobile
            ? { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }
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

      for (const c of constraintCandidates) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(c);
          if (stream) break;
        } catch (err: any) {
          lastError = err;
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            throw err;
          }
        }
      }

      if (!stream) {
        throw lastError || new Error('Could not establish video stream with any camera device.');
      }

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
          if (playErr.name === 'AbortError') return;
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
      if (requestId !== startRequestIdRef.current) return;
      stopCamera();
      setStatus('error');
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorType('permission');
        setErrorMessage(
          'Camera access was denied. Please allow camera permissions in your browser address bar.'
        );
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorType('device');
        setErrorMessage(
          'No camera device found on this system. Please connect a USB webcam or use File Upload.'
        );
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setErrorType('device');
        setErrorMessage(
          'Camera is currently in use by another application. Please close other camera apps and try again.'
        );
      } else {
        setErrorType('general');
        setErrorMessage(err?.message || 'Could not start camera feed.');
      }
    }
  }, [selectedDeviceId, stopCamera, enumerateDevices, resetVoteBuffer]);

  // Synchronize video element srcObject if video element mounted while stream was initializing
  useEffect(() => {
    if (videoRef.current && streamRef.current && status === 'scanning') {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch((playErr: any) => {
          if (playErr.name !== 'AbortError') {
            console.warn('Video stream play deferred:', playErr);
          }
        });
      }
    }
  }, [status]);

  const updateSessionVotesRef = useRef(updateSessionVotes);
  updateSessionVotesRef.current = updateSessionVotes;

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
          return;
        }
        if (data.type === 'OPENCV_ERROR') {
          setIsSmartDetectionAvailable(false);
          return;
        }

        if (data.type === 'FRAME_RESULT') {
          const frameResult = data as FrameResultMessage;
          const trace = frameResult.trace;
          isWorkerBusyRef.current = false;

          // Monotonic sequence verification: discard stale or out-of-order frames
          if (frameResult.frameId < lastProcessedFrameIdRef.current) {
            return;
          }
          lastProcessedFrameIdRef.current = frameResult.frameId;

          // Adaptive frame interval
          targetFrameIntervalRef.current = trace.processingTimeMs > 110 ? 190 : 140;

          // Telemetry renders this exact object (same evalId/frameId as the log line below).
          setLatestTrace(trace);
          if (trace.stage === 'evaluated' || trace.stage === 'template') {
            const c = trace.counters;
            const fg = trace.frameGrade;
            console.debug(
              `[OMR ${trace.evalId} frame ${trace.frameId}] stage=${trace.stage} ` +
                `warped=${trace.warpedWidth}x${trace.warpedHeight} corners=${trace.cornerSource} ` +
                `fiducials=${trace.template?.fiducialsFound ?? 0}/4 layout=${trace.template?.layout ?? '-'} | ` +
                `read=${c.questionsRead} slots=${c.bubbleSlotsSampled} marked=${c.bubblesMarked} ` +
                `classified=${c.answersClassified} multi=${c.multipleMarked} blank=${c.blank} ` +
                `rejected=${trace.rejectedQuestions} | key=${trace.answerKeyEntries}/${trace.numItems} ` +
                (fg ? `graded=${fg.answersGraded} score=${fg.score} scoringErrors=${fg.scoringErrors}` : 'graded=- (no key)') +
                (trace.error ? ` | error="${trace.error}"` : '')
            );
          }

          const blurry = trace.qualityReason === 'BLURRY';
          setIsBlurry(blurry);
          setBlurScore(trace.blurScore);

          // Flowchart Step: Usable Quality & Detected Sheet
          if (frameResult.sheetDetected && frameResult.corners && frameResult.normalizedCorners) {
            sessionGraceFramesRef.current = 0;
            setIsSheetDetected(true);
            setDetectedCorners(frameResult.corners);
            setNormalizedCorners(frameResult.normalizedCorners);
            consecutiveSheetDetectedRef.current++;

            // Measure corner drift across consecutive frames (Sheet Stability detector)
            if (prevNormalizedCornersRef.current && prevNormalizedCornersRef.current.length === 4) {
              const prev = prevNormalizedCornersRef.current;
              const cur = frameResult.normalizedCorners;
              let driftSum = 0;
              for (let i = 0; i < 4; i++) {
                driftSum += Math.hypot(cur[i].x - prev[i].x, cur[i].y - prev[i].y);
              }
              const avgDrift = driftSum / 4;

              // Stable = corner drift < 1.5% of frame AND template verified on this frame
              if (avgDrift < 0.015 && frameResult.templateGradable && !blurry) {
                stabilityStreakRef.current = Math.min(10, stabilityStreakRef.current + 1);
              } else {
                stabilityStreakRef.current = Math.max(0, stabilityStreakRef.current - 1);
              }
            }
            prevNormalizedCornersRef.current = frameResult.normalizedCorners;
            setIsSheetStable(stabilityStreakRef.current >= 3);

            // Only template-verified frames carry answers; rejected frames never touch votes.
            if (frameResult.templateGradable && frameResult.questions) {
              updateSessionVotesRef.current(
                frameResult.questions,
                frameResult.studentId || '',
                true
              );
            }
          } else {
            // Sheet not detected in this frame
            sessionGraceFramesRef.current++;
            stabilityStreakRef.current = 0;
            setIsSheetStable(false);

            // Grace Decay: Only clear outline after 8 consecutive missing frames (~1.2s)
            // This prevents the outline and detection count from flickering wildly
            if (sessionGraceFramesRef.current >= 8) {
              setIsSheetDetected(false);
              setDetectedCorners(null);
              setNormalizedCorners(null);
              prevNormalizedCornersRef.current = null;
            }

            // Trigger 2: Sheet Removed from view after locking answers
            if (consecutiveSheetDetectedRef.current >= 4) {
              lostSheetFramesRef.current++;
              let answeredCount = 0;
              Object.values(voteBufferRef.current).forEach((v) => {
                // Settled answers only — a settled blank is not evidence the sheet was read.
                if (v.locked && v.lockedValue !== null && !v.isMulti) answeredCount++;
              });

              if (
                lostSheetFramesRef.current >= 4 &&
                answeredCount >= minLockThresholdRef.current &&
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

  // ── Session counters & score (single grader, settled answers only) ─────────────────────
  // Root cause of "50/50 complete" with 7 answers: blank questions that settled were counted
  // as "detected". Now settled, answered, blank and multi-mark are reported separately.
  const settledAnswers: Record<string, AnswerState | undefined> = {};
  const needsReviewList: string[] = [];
  const sessionCounters: SessionCounters = {
    total: totalItems,
    settled: 0,
    answered: 0,
    multiple: 0,
    blank: 0,
    unsettled: 0,
  };
  for (let i = 1; i <= totalItems; i++) {
    const qStr = String(i);
    const s = settledAnswerState(questionsState[qStr]);
    settledAnswers[qStr] = s;
    if (!s) continue;
    sessionCounters.settled++;
    if (s.status === 'single') sessionCounters.answered++;
    else if (s.status === 'multiple') {
      sessionCounters.multiple++;
      needsReviewList.push(qStr);
    } else sessionCounters.blank++;
  }
  sessionCounters.unsettled = totalItems - sessionCounters.settled;

  const hasAnswerKey = !!answerKey && Object.keys(answerKey).length > 0;
  // Same gradeAnswers() the worker uses per frame. Unsettled questions are "pending", never
  // scored from a transient reading, so the score can only change when an answer settles.
  const grade = gradeAnswers(settledAnswers, answerKey, totalItems, passingScore);
  const evaluatorStats = useMemo(() => traceToEvaluatorStats(latestTrace), [latestTrace]);

  return {
    videoRef,
    status,
    errorMessage,
    errorType,
    scanMode,
    setScanMode,
    isSheetDetected,
    isSheetStable,
    detectedCorners,
    normalizedCorners,
    isBlurry,
    blurScore,
    questionsState,
    detectedStudentId,
    sessionCounters,
    /** @deprecated use sessionCounters.settled — kept for existing callers. */
    lockedQuestionsCount: sessionCounters.settled,
    needsReviewCount: sessionCounters.multiple,
    needsReviewList,
    totalQuestions: totalItems,
    lockedPercentage: Math.round((sessionCounters.settled / totalItems) * 100),
    grade,
    liveScore: grade.score,
    livePercentage: grade.percentage,
    isPassing: grade.isPassing,
    passingThreshold: grade.passingThreshold,
    correctMap: grade.correctMap,
    hasAnswerKey,
    latestTrace,
    evaluatorStats,
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
    retake,
    finalizeAndSubmit,
  };
}
