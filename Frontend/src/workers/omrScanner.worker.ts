// omrScanner.worker.ts
// Background Web Worker dedicated to OpenCV.js computer vision tasks:
// 1. Script loading & initialization
// 2. Laplacian blur estimation
// 3. Canny edge & contour detection for 4-point rectangular OMR sheet
// 4. Client-side real-time bubble fill ratio decoding across 50 questions
// 5. 4-point perspective warping to standardize deskewed sheet output

import { OMR_TEMPLATE_COORDINATES, type BubbleCoord } from '../data/omrCoordinates';

declare const importScripts: (...urls: string[]) => void;
declare function postMessage(message: any, transfer?: Transferable[]): void;
declare let cv: any;

export interface Point {
  x: number;
  y: number;
}

export interface QuestionBubbleRead {
  questionNumber: string;
  selected: string | null;
  status: 'unfilled' | 'filled' | 'ambiguous';
  isMultiMark: boolean;
  bestRatio: number;
  secondRatio: number;
  optionRatios: Record<string, number>;
}

let isOpenCvReady = false;
let isOpenCvLoading = false;

// Initialize OpenCV.js inside the Web Worker supporting both Module and Classic Workers
async function initOpenCV() {
  if (isOpenCvReady) {
    postMessage({ type: 'OPENCV_READY' });
    return;
  }
  if (isOpenCvLoading) return;
  isOpenCvLoading = true;

  try {
    if (typeof cv === 'undefined') {
      let scriptLoaded = false;
      if (typeof importScripts === 'function') {
        try {
          importScripts('/opencv.js');
          scriptLoaded = true;
        } catch {
          // Module workers throw TypeError on importScripts; use fetch below
          scriptLoaded = false;
        }
      }

      if (!scriptLoaded) {
        const resp = await fetch('/opencv.js');
        const scriptText = await resp.text();
        const runScript = new Function(scriptText);
        runScript();
      }
    }

    if (typeof cv !== 'undefined') {
      if (cv.Mat) {
        isOpenCvReady = true;
        isOpenCvLoading = false;
        postMessage({ type: 'OPENCV_READY' });
      } else {
        cv['onRuntimeInitialized'] = () => {
          isOpenCvReady = true;
          isOpenCvLoading = false;
          postMessage({ type: 'OPENCV_READY' });
        };
      }
    } else {
      throw new Error('OpenCV script did not define cv object');
    }
  } catch (err: any) {
    isOpenCvLoading = false;
    postMessage({
      type: 'OPENCV_ERROR',
      error: err?.message || 'Failed to load OpenCV.js in worker',
    });
  }
}

// Calculate image blur variance using Laplacian operator
function computeLaplacianVariance(grayMat: any): number {
  let laplacian: any = null;
  let mean: any = null;
  let stddev: any = null;
  try {
    laplacian = new cv.Mat();
    mean = new cv.Mat();
    stddev = new cv.Mat();

    cv.Laplacian(grayMat, laplacian, cv.CV_64F);
    cv.meanStdDev(laplacian, mean, stddev);

    const stdVal = stddev.data64F[0];
    return stdVal * stdVal;
  } catch {
    return 100;
  } finally {
    if (laplacian) laplacian.delete();
    if (mean) mean.delete();
    if (stddev) stddev.delete();
  }
}

// Order 4 points canonically: [Top-Left, Top-Right, Bottom-Right, Bottom-Left]
function orderCorners(pts: Point[]): Point[] {
  if (pts.length !== 4) return pts;

  const sumSorted = [...pts].sort((a, b) => a.x + a.y - (b.x + b.y));
  const tl = sumSorted[0];
  const br = sumSorted[3];

  const diffSorted = [...pts].sort((a, b) => a.y - a.x - (b.y - b.x));
  const tr = diffSorted[0];
  const bl = diffSorted[3];

  return [tl, tr, br, bl];
}

// Calculate angle in degrees between three points (B is vertex)
function calculateAngle(A: Point, B: Point, C: Point): number {
  const AB = { x: A.x - B.x, y: A.y - B.y };
  const CB = { x: C.x - B.x, y: C.y - B.y };
  const dot = AB.x * CB.x + AB.y * CB.y;
  const magAB = Math.sqrt(AB.x * AB.x + AB.y * AB.y);
  const magCB = Math.sqrt(CB.x * CB.x + CB.y * CB.y);
  if (magAB * magCB === 0) return 0;
  const cos = Math.max(-1, Math.min(1, dot / (magAB * magCB)));
  return (Math.acos(cos) * 180) / Math.PI;
}

// Check if 4 corners form a plausible quadrilateral sheet
function isValidSheetQuad(corners: Point[], imgWidth: number, imgHeight: number): boolean {
  if (corners.length !== 4) return false;

  const [tl, tr, br, bl] = corners;

  const angles = [
    calculateAngle(bl, tl, tr),
    calculateAngle(tl, tr, br),
    calculateAngle(tr, br, bl),
    calculateAngle(br, bl, tl),
  ];

  for (const angle of angles) {
    if (angle < 40 || angle > 145) {
      return false;
    }
  }

  const topW = Math.hypot(tr.x - tl.x, tr.y - tl.y);
  const botW = Math.hypot(br.x - bl.x, br.y - bl.y);
  const leftH = Math.hypot(bl.x - tl.x, bl.y - tl.y);
  const rightH = Math.hypot(br.x - tr.x, br.y - tr.y);

  const minDim = Math.min(imgWidth, imgHeight);
  if (topW < minDim * 0.18 || botW < minDim * 0.18 || leftH < minDim * 0.18 || rightH < minDim * 0.18) {
    return false;
  }

  const avgW = (topW + botW) / 2;
  const avgH = (leftH + rightH) / 2;
  const aspect = avgW / avgH;
  if (aspect < 0.3 || aspect > 3.0) {
    return false;
  }

  return true;
}

// Decode bubble fill ratios across all 50 questions from a standardized 850x1100 warped threshold image
function decodeBubblesFromThreshMat(
  threshMat: any,
  fillThreshold = 0.08
): { questions: Record<string, QuestionBubbleRead>; studentId: string } {
  const questionsResult: Record<string, QuestionBubbleRead> = {};
  const data = threshMat.data; // 850 x 1100 Uint8Array (255 = filled mark, 0 = background)
  const width = threshMat.cols;
  const height = threshMat.rows;

  // Helper to compute fill ratio of a ROI in the thresholded image
  const getRoiFillRatio = (bubble: BubbleCoord): number => {
    const wRoi = bubble.r + 4;
    const x1 = Math.max(0, bubble.cx - wRoi);
    const x2 = Math.min(width, bubble.cx + wRoi);
    const y1 = Math.max(0, bubble.cy - wRoi);
    const y2 = Math.min(height, bubble.cy + wRoi);

    let filledCount = 0;
    let totalCount = 0;

    for (let y = y1; y < y2; y++) {
      const rowOffset = y * width;
      for (let x = x1; x < x2; x++) {
        if (data[rowOffset + x] === 255) {
          filledCount++;
        }
        totalCount++;
      }
    }

    return totalCount > 0 ? filledCount / totalCount : 0;
  };

  // Compute adaptive noise floor from sheet margin samples (relative thresholding)
  // Samples background areas to adapt to ambient lighting, glare, and pencil vs pen contrast
  let bgSampleSum = 0;
  let bgSampleCount = 0;
  const samplePoints = [
    { x: 100, y: 100 },
    { x: 750, y: 100 },
    { x: 100, y: 1000 },
    { x: 750, y: 1000 },
  ];
  samplePoints.forEach((pt) => {
    let localFilled = 0;
    for (let dy = -10; dy <= 10; dy++) {
      const rowOffset = (pt.y + dy) * width;
      for (let dx = -10; dx <= 10; dx++) {
        if (data[rowOffset + (pt.x + dx)] === 255) localFilled++;
      }
    }
    bgSampleSum += localFilled / 441;
    bgSampleCount++;
  });
  const bgNoiseFloor = bgSampleCount > 0 ? bgSampleSum / bgSampleCount : 0.01;
  const adaptiveFillThreshold = Math.max(0.06, Math.min(0.25, bgNoiseFloor + fillThreshold));

  // 1. Process Questions 1 to 50
  const questionCoords = OMR_TEMPLATE_COORDINATES.questions;

  for (let q = 1; q <= 50; q++) {
    const qStr = String(q);
    const options = questionCoords[qStr];
    if (!options) continue;

    const ratios: { opt: string; ratio: number }[] = [];
    const optionRatios: Record<string, number> = {};

    for (const opt of ['A', 'B', 'C', 'D', 'E']) {
      const bubble = options[opt];
      if (bubble) {
        const ratio = getRoiFillRatio(bubble);
        ratios.push({ opt, ratio });
        optionRatios[opt] = ratio;
      } else {
        ratios.push({ opt, ratio: 0 });
        optionRatios[opt] = 0;
      }
    }

    // Sort descending by fill ratio
    ratios.sort((a, b) => b.ratio - a.ratio);
    const best = ratios[0];
    const second = ratios[1];

    let status: 'unfilled' | 'filled' | 'ambiguous' = 'unfilled';
    let selected: string | null = null;
    let isMultiMark = false;

    // Relative contrast delta check: distinguish clear single mark vs smudge/double-mark
    const contrastDelta = best.ratio - second.ratio;

    if (best.ratio >= adaptiveFillThreshold) {
      if (second.ratio >= adaptiveFillThreshold || (second.ratio > 0.05 && contrastDelta < 0.035)) {
        status = 'ambiguous';
        isMultiMark = true;
        selected = best.opt + second.opt;
      } else {
        status = 'filled';
        selected = best.opt;
      }
    } else {
      status = 'unfilled';
      selected = null;
    }

    questionsResult[qStr] = {
      questionNumber: qStr,
      selected,
      status,
      isMultiMark,
      bestRatio: best.ratio,
      secondRatio: second.ratio,
      optionRatios,
    };
  }

  // 2. Process Student ID columns (10 digits)
  let studentId = '';
  const studentIdCols = OMR_TEMPLATE_COORDINATES.student_id;

  if (studentIdCols && studentIdCols.length > 0) {
    for (const col of studentIdCols) {
      let bestDigit = '?';
      let bestRatio = 0;
      let secondRatio = 0;

      col.forEach((bubble, rowIdx) => {
        if (!bubble) return;
        const ratio = getRoiFillRatio(bubble);
        if (ratio > bestRatio) {
          secondRatio = bestRatio;
          bestRatio = ratio;
          bestDigit = rowIdx === 9 ? '0' : String(rowIdx + 1);
        } else if (ratio > secondRatio) {
          secondRatio = ratio;
        }
      });

      if (bestRatio >= fillThreshold && secondRatio < fillThreshold) {
        studentId += bestDigit;
      } else if (bestRatio >= fillThreshold && secondRatio >= fillThreshold) {
        studentId += '?';
      }
    }
  }

  return { questions: questionsResult, studentId };
}

// Find 4 black square fiducial markers (ZipGrade standard corner squares)
function detectCornerMarkers(
  threshMat: any,
  width: number,
  height: number
): Point[] | null {
  let contours: any = null;
  let hierarchy: any = null;

  try {
    contours = new cv.MatVector();
    hierarchy = new cv.Mat();

    cv.findContours(threshMat, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    const imgArea = width * height;
    const candidates: Point[] = [];

    for (let i = 0; i < contours.size(); ++i) {
      const contour = contours.get(i);
      const rect = cv.boundingRect(contour);
      const area = cv.contourArea(contour);

      const w = rect.width;
      const h = rect.height;
      const aspect = h > 0 ? w / h : 0;
      const solidity = w * h > 0 ? area / (w * h) : 0;

      // ZipGrade fiducial square: aspect ~ 1.0, high solidity, area 0.005% to 5.0% of frame
      if (
        aspect >= 0.45 &&
        aspect <= 1.85 &&
        solidity >= 0.45 &&
        area >= 20 &&
        area <= imgArea * 0.05
      ) {
        const cx = rect.x + w / 2;
        const cy = rect.y + h / 2;
        candidates.push({ x: cx, y: cy });
      }

      contour.delete();
    }

    if (candidates.length < 4) {
      return null;
    }

    // 4-Extreme Corner matching
    const sumSorted = [...candidates].sort((a, b) => a.x + a.y - (b.x + b.y));
    const tl = sumSorted[0];
    const br = sumSorted[sumSorted.length - 1];

    const diffSorted = [...candidates].sort((a, b) => a.x - a.y - (b.x - b.y));
    const bl = diffSorted[0];
    const tr = diffSorted[diffSorted.length - 1];

    const corners = [tl, tr, br, bl];
    if (isValidSheetQuad(corners, width, height)) {
      return corners;
    }

    // Fallback: partition by Y then X
    const sortedByY = [...candidates].sort((a, b) => a.y - b.y);
    const topCandidates = sortedByY.slice(0, Math.ceil(candidates.length / 2)).sort((a, b) => a.x - b.x);
    const botCandidates = sortedByY.slice(Math.ceil(candidates.length / 2)).sort((a, b) => a.x - b.x);

    if (topCandidates.length >= 2 && botCandidates.length >= 2) {
      const fallbackCorners = [
        topCandidates[0],
        topCandidates[topCandidates.length - 1],
        botCandidates[botCandidates.length - 1],
        botCandidates[0],
      ];
      if (isValidSheetQuad(fallbackCorners, width, height)) {
        return fallbackCorners;
      }
    }

    return null;
  } catch {
    return null;
  } finally {
    if (contours) contours.delete();
    if (hierarchy) hierarchy.delete();
  }
}

// Process frame for sheet detection AND real-time client-side bubble decoding
function processFrameWithBubbles(
  imageData: ImageData,
  width: number,
  height: number,
  decodeBubbles = true,
  blurThreshold = 35
) {
  const startTime = performance.now();

  if (!isOpenCvReady || typeof cv === 'undefined') {
    postMessage({
      type: 'FRAME_PROCESSED',
      detected: false,
      isBlurry: false,
      blurScore: 100,
      corners: null,
      normalizedCorners: null,
      questions: null,
      studentId: '',
      width,
      height,
      processingTimeMs: 0,
    });
    return;
  }

  let srcMat: any = null;
  let grayMat: any = null;
  let blurMat: any = null;
  let adaptThreshMat: any = null;
  let edgeMat: any = null;
  let kernelMat: any = null;
  let contours: any = null;
  let hierarchy: any = null;
  let approxMat: any = null;

  // Warp & bubble analysis mats
  let srcCornersMat: any = null;
  let dstCornersMat: any = null;
  let M: any = null;
  let warpedMat: any = null;
  let warpedGray: any = null;
  let warpedBlur: any = null;
  let warpedThresh: any = null;

  try {
    srcMat = cv.matFromImageData(imageData);
    grayMat = new cv.Mat();
    blurMat = new cv.Mat();
    adaptThreshMat = new cv.Mat();

    // 1. Grayscale & blur evaluation
    cv.cvtColor(srcMat, grayMat, cv.COLOR_RGBA2GRAY);
    const blurScore = computeLaplacianVariance(grayMat);
    const isBlurry = blurScore < blurThreshold;

    cv.GaussianBlur(grayMat, blurMat, new cv.Size(5, 5), 0);

    // 2. PRIMARY DETECTOR: ZipGrade 4 Corner Square Markers (matches omr.py)
    cv.adaptiveThreshold(
      blurMat,
      adaptThreshMat,
      255,
      cv.ADAPTIVE_THRESH_GAUSSIAN_C,
      cv.THRESH_BINARY_INV,
      11,
      2
    );

    let detectedCorners = detectCornerMarkers(adaptThreshMat, width, height);

    // 3. SECONDARY DETECTOR: Outer Sheet Boundary Rectangle (Canny Fallback)
    if (!detectedCorners) {
      edgeMat = new cv.Mat();
      kernelMat = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
      contours = new cv.MatVector();
      hierarchy = new cv.Mat();
      approxMat = new cv.Mat();

      cv.Canny(blurMat, edgeMat, 40, 140);
      cv.dilate(edgeMat, edgeMat, kernelMat);
      cv.findContours(edgeMat, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

      const frameArea = width * height;
      const minArea = frameArea * 0.10;
      let bestContourArea = 0;

      for (let i = 0; i < contours.size(); ++i) {
        const contour = contours.get(i);
        const area = cv.contourArea(contour);

        if (area < minArea || area < bestContourArea) {
          contour.delete();
          continue;
        }

        const peri = cv.arcLength(contour, true);
        cv.approxPolyDP(contour, approxMat, 0.03 * peri, true);

        if (approxMat.rows === 4 && cv.isContourConvex(approxMat)) {
          const rawPoints: Point[] = [];
          for (let j = 0; j < 4; j++) {
            rawPoints.push({
              x: approxMat.data32S[j * 2],
              y: approxMat.data32S[j * 2 + 1],
            });
          }

          const ordered = orderCorners(rawPoints);
          if (isValidSheetQuad(ordered, width, height)) {
            bestContourArea = area;
            detectedCorners = ordered;
          }
        }

        contour.delete();
      }
    }

    let normalizedCorners: Point[] | null = null;
    let decodedQuestions: Record<string, QuestionBubbleRead> | null = null;
    let studentId = '';

    if (detectedCorners) {
      normalizedCorners = detectedCorners.map((p) => ({
        x: p.x / width,
        y: p.y / height,
      }));

      // 4. Warp to standardized 850x1100 view and decode bubbles
      if (decodeBubbles) {
        const [tl, tr, br, bl] = detectedCorners;
        const outW = 850;
        const outH = 1100;

        const srcCoords = [tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y];
        const dstCoords = [50, 50, 800, 50, 800, 1050, 50, 1050];

        srcCornersMat = cv.matFromArray(4, 1, cv.CV_32FC2, srcCoords);
        dstCornersMat = cv.matFromArray(4, 1, cv.CV_32FC2, dstCoords);
        M = cv.getPerspectiveTransform(srcCornersMat, dstCornersMat);

        warpedMat = new cv.Mat();
        warpedGray = new cv.Mat();
        warpedBlur = new cv.Mat();
        warpedThresh = new cv.Mat();

        cv.warpPerspective(
          srcMat,
          warpedMat,
          M,
          new cv.Size(outW, outH),
          cv.INTER_LINEAR,
          cv.BORDER_CONSTANT,
          new cv.Scalar(255, 255, 255, 255)
        );

        cv.cvtColor(warpedMat, warpedGray, cv.COLOR_RGBA2GRAY);
        cv.GaussianBlur(warpedGray, warpedBlur, new cv.Size(5, 5), 0);
        cv.threshold(warpedBlur, warpedThresh, 0, 255, cv.THRESH_BINARY_INV + cv.THRESH_OTSU);

        // Decode bubble fill ratios
        const decoded = decodeBubblesFromThreshMat(warpedThresh, 0.08);
        decodedQuestions = decoded.questions;
        studentId = decoded.studentId;
      }
    }

    const elapsed = performance.now() - startTime;

    postMessage({
      type: 'FRAME_PROCESSED',
      detected: detectedCorners !== null,
      isBlurry,
      blurScore,
      corners: detectedCorners,
      normalizedCorners,
      questions: decodedQuestions,
      studentId,
      width,
      height,
      processingTimeMs: Math.round(elapsed),
    });
  } catch (err: any) {
    postMessage({
      type: 'FRAME_PROCESSED',
      detected: false,
      isBlurry: false,
      blurScore: 100,
      corners: null,
      normalizedCorners: null,
      questions: null,
      studentId: '',
      width,
      height,
      processingTimeMs: Math.round(performance.now() - startTime),
      error: err?.message,
    });
  } finally {
    if (srcMat) srcMat.delete();
    if (grayMat) grayMat.delete();
    if (blurMat) blurMat.delete();
    if (adaptThreshMat) adaptThreshMat.delete();
    if (edgeMat) edgeMat.delete();
    if (kernelMat) kernelMat.delete();
    if (contours) contours.delete();
    if (hierarchy) hierarchy.delete();
    if (approxMat) approxMat.delete();

    if (srcCornersMat) srcCornersMat.delete();
    if (dstCornersMat) dstCornersMat.delete();
    if (M) M.delete();
    if (warpedMat) warpedMat.delete();
    if (warpedGray) warpedGray.delete();
    if (warpedBlur) warpedBlur.delete();
    if (warpedThresh) warpedThresh.delete();
  }
}

// 4-Point Perspective Transform to deskew and normalize full resolution sheet image
function warpPerspective(
  imageData: ImageData,
  corners: Point[],
  targetWidth = 1200,
  targetHeight = 1600
) {
  if (!isOpenCvReady || typeof cv === 'undefined' || corners.length !== 4) {
    postMessage({
      type: 'WARP_COMPLETED',
      success: false,
      error: 'OpenCV not ready or invalid corners',
    });
    return;
  }

  let srcMat: any = null;
  let dstMat: any = null;
  let srcCornersMat: any = null;
  let dstCornersMat: any = null;
  let M: any = null;

  try {
    const ordered = orderCorners(corners);
    const [tl, tr, br, bl] = ordered;

    const topW = Math.hypot(tr.x - tl.x, tr.y - tl.y);
    const botW = Math.hypot(br.x - bl.x, br.y - bl.y);
    const maxW = Math.max(topW, botW);

    const leftH = Math.hypot(bl.x - tl.x, bl.y - tl.y);
    const rightH = Math.hypot(br.x - tr.x, br.y - tr.y);
    const maxH = Math.max(leftH, rightH);

    const outW = targetWidth || Math.round(Math.max(800, Math.min(1800, maxW)));
    const outH = targetHeight || Math.round(Math.max(1100, Math.min(2400, maxH)));

    srcMat = cv.matFromImageData(imageData);
    dstMat = new cv.Mat();

    const srcCoords = [tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y];
    const dstCoords = [0, 0, outW, 0, outW, outH, 0, outH];

    srcCornersMat = cv.matFromArray(4, 1, cv.CV_32FC2, srcCoords);
    dstCornersMat = cv.matFromArray(4, 1, cv.CV_32FC2, dstCoords);

    M = cv.getPerspectiveTransform(srcCornersMat, dstCornersMat);
    const dsize = new cv.Size(outW, outH);

    cv.warpPerspective(
      srcMat,
      dstMat,
      M,
      dsize,
      cv.INTER_LINEAR,
      cv.BORDER_CONSTANT,
      new cv.Scalar(255, 255, 255, 255)
    );

    const outputImageData = new ImageData(
      new Uint8ClampedArray(dstMat.data),
      dstMat.cols,
      dstMat.rows
    );

    postMessage(
      {
        type: 'WARP_COMPLETED',
        success: true,
        imageData: outputImageData,
        width: outW,
        height: outH,
      },
      [outputImageData.data.buffer]
    );
  } catch (err: any) {
    postMessage({
      type: 'WARP_COMPLETED',
      success: false,
      error: err?.message || 'Perspective warp failed',
    });
  } finally {
    if (srcMat) srcMat.delete();
    if (dstMat) dstMat.delete();
    if (srcCornersMat) srcCornersMat.delete();
    if (dstCornersMat) dstCornersMat.delete();
    if (M) M.delete();
  }
}

// Worker message listener
self.onmessage = (e: MessageEvent) => {
  const data = e.data;
  if (!data || !data.type) return;

  switch (data.type) {
    case 'INIT':
      initOpenCV();
      break;

    case 'PROCESS_FRAME':
      processFrameWithBubbles(
        data.imageData,
        data.width,
        data.height,
        data.decodeBubbles ?? true,
        data.blurThreshold ?? 45
      );
      break;

    case 'WARP_PERSPECTIVE':
      warpPerspective(
        data.imageData,
        data.corners,
        data.targetWidth,
        data.targetHeight
      );
      break;
  }
};
