// useCameraScanner.ts
// Custom hook managing camera hardware, OpenCV Web Worker, corner stability tracking,
// blur filtering, and deskewed perspective capture.

import { useState, useEffect, useRef, useCallback } from 'react';

export interface CornerPoint {
  x: number;
  y: number;
}

export type ScannerStatus =
  | 'idle'
  | 'requesting-permission'
  | 'initializing'
  | 'scanning'
  | 'capturing'
  | 'processing'
  | 'error';

export type DetectionState = 'no-sheet' | 'unstable' | 'stable' | 'blurry';

export interface UseCameraScannerOptions {
  onCapture: (file: File, previewUrl: string) => Promise<void> | void;
  autoCaptureEnabled?: boolean;
  stabilityThresholdMs?: number;
  maxJitterThreshold?: number;
  blurThreshold?: number;
}

export function useCameraScanner({
  onCapture,
  autoCaptureEnabled = true,
  stabilityThresholdMs = 500,
  maxJitterThreshold = 0.028, // Max allowed corner drift in normalized coordinates
  blurThreshold = 45,
}: UseCameraScannerOptions) {
  const [status, setStatus] = useState<ScannerStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'permission' | 'device' | 'worker' | 'general' | null>(null);
  
  const [detectionState, setDetectionState] = useState<DetectionState>('no-sheet');
  const [detectedCorners, setDetectedCorners] = useState<CornerPoint[] | null>(null);
  const [normalizedCorners, setNormalizedCorners] = useState<CornerPoint[] | null>(null);
  const [isBlurry, setIsBlurry] = useState(false);
  const [blurScore, setBlurScore] = useState(100);
  const [stabilityProgress, setStabilityProgress] = useState(0); // 0 to 1

  const [isSmartDetectionAvailable, setIsSmartDetectionAvailable] = useState(true);
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Tracking buffers
  const cornerHistoryRef = useRef<CornerPoint[][]>([]);
  const stableStartTimeRef = useRef<number | null>(null);
  const lastProcessedTimeRef = useRef<number>(0);
  const isWorkerBusyRef = useRef<boolean>(false);
  const isSubmittingRef = useRef<boolean>(false);

  // Synchronize ref
  isSubmittingRef.current = isSubmitting;

  // Initialize offscreen canvas once
  useEffect(() => {
    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
    }
  }, []);

  // Enumerate available video input devices
  const enumerateDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      setVideoDevices(videoInputs);
    } catch {
      // Ignore device enumeration errors
    }
  }, []);

  const startRequestIdRef = useRef<number>(0);

  // Stop Camera Feed
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

  // Toggle Torch/Flashlight if supported
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
  const switchCamera = useCallback(() => {
    if (videoDevices.length <= 1) return;
    const currentIndex = videoDevices.findIndex((d) => d.deviceId === selectedDeviceId);
    const nextIndex = (currentIndex + 1) % videoDevices.length;
    const nextDevice = videoDevices[nextIndex];
    setSelectedDeviceId(nextDevice.deviceId);
  }, [videoDevices, selectedDeviceId]);

  // Check stability across rolling corner buffer
  const evaluateStability = useCallback(
    (currentNormalizedCorners: CornerPoint[]) => {
      const history = cornerHistoryRef.current;
      history.push(currentNormalizedCorners);
      if (history.length > 7) {
        history.shift();
      }

      if (history.length < 4) {
        stableStartTimeRef.current = null;
        setStabilityProgress(0);
        return false;
      }

      // Calculate maximum coordinate drift across recent frames
      let maxDrift = 0;
      for (let cornerIdx = 0; cornerIdx < 4; cornerIdx++) {
        for (let frameIdx = 0; frameIdx < history.length - 1; frameIdx++) {
          const p1 = history[frameIdx][cornerIdx];
          const p2 = history[frameIdx + 1][cornerIdx];
          const drift = Math.hypot(p1.x - p2.x, p1.y - p2.y);
          if (drift > maxDrift) maxDrift = drift;
        }
      }

      if (maxDrift <= maxJitterThreshold) {
        const now = performance.now();
        if (!stableStartTimeRef.current) {
          stableStartTimeRef.current = now;
        }
        const elapsed = now - stableStartTimeRef.current;
        const progress = Math.min(1, elapsed / stabilityThresholdMs);
        setStabilityProgress(progress);
        return elapsed >= stabilityThresholdMs;
      } else {
        stableStartTimeRef.current = null;
        setStabilityProgress(0);
        return false;
      }
    },
    [maxJitterThreshold, stabilityThresholdMs]
  );

  // Capture full resolution frame and apply perspective warp
  const triggerCapture = useCallback(
    async (cornersToWarp: CornerPoint[] | null = detectedCorners) => {
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
        if (!ctx) throw new Error('Could not create capture canvas context');

        ctx.drawImage(video, 0, 0, fullW, fullH);

        // If we have valid corners and worker is available, run perspective warp
        if (cornersToWarp && cornersToWarp.length === 4 && workerRef.current && isSmartDetectionAvailable) {
          const imgData = ctx.getImageData(0, 0, fullW, fullH);

          // Scale normalized corners to full resolution
          let scaledCorners: CornerPoint[];
          if (normalizedCorners && normalizedCorners.length === 4) {
            scaledCorners = normalizedCorners.map((p) => ({
              x: p.x * fullW,
              y: p.y * fullH,
            }));
          } else {
            scaledCorners = cornersToWarp;
          }

          // Request warp from worker with promise
          const warpedPromise = new Promise<{ imageData: ImageData; width: number; height: number }>(
            (resolve, reject) => {
              const timeout = setTimeout(() => {
                reject(new Error('Warp timeout, falling back to raw capture'));
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
                  width: fullW,
                  height: fullH,
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
                const file = new File([blob], `omr_camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
                const previewUrl = URL.createObjectURL(blob);
                await onCapture(file, previewUrl);
                return;
              }
            }
          } catch {
            // Fallback to unwarped full-res image if warp failed
          }
        }

        // Direct fallback: capture full canvas as JPEG
        const blob = await new Promise<Blob | null>((res) =>
          captureCanvas.toBlob((b) => res(b), 'image/jpeg', 0.92)
        );

        if (blob) {
          const file = new File([blob], `omr_camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
          const previewUrl = URL.createObjectURL(blob);
          await onCapture(file, previewUrl);
        } else {
          throw new Error('Failed to generate image file');
        }
      } catch (err: any) {
        setErrorMessage(err?.message || 'Capture failed');
        setStatus('scanning');
      } finally {
        setIsSubmitting(false);
      }
    },
    [detectedCorners, normalizedCorners, isSmartDetectionAvailable, onCapture]
  );

  // Main processing loop throttled to ~7 FPS (every ~140ms)
  const processVideoFrame = useCallback(() => {
    if (status !== 'scanning' || isSubmittingRef.current) {
      animationFrameRef.current = requestAnimationFrame(processVideoFrame);
      return;
    }

    const now = performance.now();
    if (now - lastProcessedTimeRef.current < 140) {
      animationFrameRef.current = requestAnimationFrame(processVideoFrame);
      return;
    }

    const video = videoRef.current;
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      animationFrameRef.current = requestAnimationFrame(processVideoFrame);
      return;
    }

    lastProcessedTimeRef.current = now;

    // If worker is still processing previous frame or disabled, skip
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

      // Downscale frame to ~480px width for fast OpenCV analysis
      const scale = Math.min(1, 480 / vWidth);
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

      isWorkerBusyRef.current = true;

      workerRef.current.postMessage(
        {
          type: 'PROCESS_FRAME',
          imageData: imgData,
          width: procW,
          height: procH,
          blurThreshold,
        },
        [imgData.data.buffer] // Zero-copy buffer transfer
      );
    } catch {
      isWorkerBusyRef.current = false;
    }

    animationFrameRef.current = requestAnimationFrame(processVideoFrame);
  }, [status, isSmartDetectionAvailable, blurThreshold]);

  // Start Camera Feed
  const startCamera = useCallback(async () => {
    stopCamera();
    const requestId = ++startRequestIdRef.current;
    setStatus('requesting-permission');
    setErrorMessage(null);
    setErrorType(null);

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

      // Check for torch capability
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities: any = videoTrack.getCapabilities?.() || {};
        if (capabilities.torch) {
          setHasTorch(true);
        }
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
  }, [selectedDeviceId, stopCamera, enumerateDevices]);

  const evaluateStabilityRef = useRef(evaluateStability);
  evaluateStabilityRef.current = evaluateStability;

  const autoCaptureEnabledRef = useRef(autoCaptureEnabled);
  autoCaptureEnabledRef.current = autoCaptureEnabled;

  const triggerCaptureRef = useRef(triggerCapture);
  triggerCaptureRef.current = triggerCapture;

  // Initialize Worker on Mount
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

          const blurry = !!data.isBlurry;
          setIsBlurry(blurry);
          setBlurScore(data.blurScore ?? 100);

          if (data.detected && data.corners && data.normalizedCorners && !blurry) {
            setDetectedCorners(data.corners);
            setNormalizedCorners(data.normalizedCorners);

            // Stability analysis
            const isStable = evaluateStabilityRef.current(data.normalizedCorners);

            if (isStable) {
              setDetectionState('stable');
              if (autoCaptureEnabledRef.current && !isSubmittingRef.current) {
                triggerCaptureRef.current(data.corners);
              }
            } else {
              setDetectionState('unstable');
            }
          } else {
            setDetectedCorners(null);
            setNormalizedCorners(null);
            stableStartTimeRef.current = null;
            setStabilityProgress(0);
            setDetectionState(blurry ? 'blurry' : 'no-sheet');
          }
        }
      };

      // Send initial INIT to worker
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

  // Manage Animation Loop
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

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    videoRef,
    status,
    errorMessage,
    errorType,
    detectionState,
    detectedCorners,
    normalizedCorners,
    isBlurry,
    blurScore,
    stabilityProgress,
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
    triggerCapture,
  };
}
