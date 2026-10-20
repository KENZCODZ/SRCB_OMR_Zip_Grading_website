// omrScanner.worker.ts
// Live OMR pipeline (one camera frame -> one EvaluationTrace):
//   1 Image quality check -> 2 detect sheet corners -> 3 perspective correction (850x1100)
//   -> 4 template check (corner markers + layout) -> 5 classify bubbles -> 6 grade frame
// All classification and grading lives in ../omr/omrEvaluation.ts (shared with the session
// hook and scripts/verifyOmrEvaluation.ts). This file only does OpenCV image work.

import { OMR_TEMPLATE_COORDINATES, EDUASSESS_TEMPLATE_COORDINATES } from '../data/omrCoordinates';
import {
  EMPTY_COUNTERS,
  WARPED_HEIGHT,
  WARPED_WIDTH,
  checkTemplate,
  decodeQuestions,
  gradeAnswers,
  normalizeAnswerKey,
  type CornerSource,
  type EvaluationTrace,
  type EvaluatorStats,
  type QuestionRead,
} from '../omr/omrEvaluation';

export type { EvaluatorStats };

declare const importScripts: (...urls: string[]) => void;
declare function postMessage(message: any, transfer?: Transferable[]): void;
declare let cv: any;

export interface Point {
  x: number;
  y: number;
}

export interface FrameResultMessage {
  type: 'FRAME_RESULT';
  frameId: number;
  evalId: string;
  sheetDetected: boolean;
  /** Template verified: geometry aligned AND layout supported. Answers are only present when true. */
  templateGradable: boolean;
  corners: Point[] | null;
  normalizedCorners: Point[] | null;
  questions: Record<string, QuestionRead> | null;
  studentId: string;
  trace: EvaluationTrace;
}

let isOpenCvReady = false;
let isOpenCvLoading = false;

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
          scriptLoaded = false; // module workers: fall through to fetch
        }
      }
      if (!scriptLoaded) {
        const resp = await fetch('/opencv.js');
        new Function(await resp.text())();
      }
    }

    if (typeof cv === 'undefined') throw new Error('OpenCV script did not define cv object');
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
  } catch (err: any) {
    isOpenCvLoading = false;
    postMessage({ type: 'OPENCV_ERROR', error: err?.message || 'Failed to load OpenCV.js in worker' });
  }
}

// ── Stage 1: image quality ──────────────────────────────────────────────────────────────
function evaluateImageQuality(grayMat: any, blurThreshold: number) {
  const lap = new cv.Mat();
  const mean = new cv.Mat();
  const std = new cv.Mat();
  try {
    cv.Laplacian(grayMat, lap, cv.CV_64F);
    cv.meanStdDev(lap, mean, std);
    const blurScore = std.data64F[0] ** 2;
    cv.meanStdDev(grayMat, mean, std);
    const meanVal = mean.data64F[0];
    const contrastScore = std.data64F[0];

    let reason: EvaluationTrace['qualityReason'] = 'NONE';
    if (blurScore < blurThreshold) reason = 'BLURRY';
    else if (meanVal < 35) reason = 'UNDEREXPOSED';
    else if (meanVal > 245) reason = 'OVEREXPOSED';
    else if (contrastScore < 16) reason = 'LOW_CONTRAST';
    return { usable: reason === 'NONE', blurScore, contrastScore, reason };
  } finally {
    lap.delete();
    mean.delete();
    std.delete();
  }
}

// ── Stage 2: corners ────────────────────────────────────────────────────────────────────
function orderQuadClockwise(pts: Point[]): Point[] {
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  const sorted = [...pts].sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));
  // Guarantee index 0 is consistently Top-Left (min sum of x + y)
  let minSum = Infinity;
  let tlIdx = 0;
  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i].x + sorted[i].y;
    if (s < minSum) {
      minSum = s;
      tlIdx = i;
    }
  }
  return [
    sorted[tlIdx],
    sorted[(tlIdx + 1) % 4],
    sorted[(tlIdx + 2) % 4],
    sorted[(tlIdx + 3) % 4],
  ];
}

function identifyTemplateCorners(grayMat: any, rawCorners: Point[]): Point[] {
  if (rawCorners.length !== 4) return rawCorners;
  const cw = orderQuadClockwise(rawCorners);

  // Measure perimeter edge lengths
  const l0 = Math.hypot(cw[1].x - cw[0].x, cw[1].y - cw[0].y);
  const l1 = Math.hypot(cw[2].x - cw[1].x, cw[2].y - cw[1].y);
  const l2 = Math.hypot(cw[3].x - cw[2].x, cw[3].y - cw[2].y);
  const l3 = Math.hypot(cw[0].x - cw[3].x, cw[0].y - cw[3].y);

  // Standard template width between fiducials is 750, height is 1000 (aspect ratio 1.33).
  // The shorter opposite pair of edges corresponds to Top/Bottom, and longer to Left/Right.
  const avg02 = (l0 + l2) / 2;
  const avg13 = (l1 + l3) / 2;
  const candidates = avg02 <= avg13 ? [0, 2] : [1, 3];
  const startIdx = candidates[0];

  const cand: Point[] = [
    cw[startIdx],
    cw[(startIdx + 1) % 4],
    cw[(startIdx + 2) % 4],
    cw[(startIdx + 3) % 4],
  ];

  let dstPts: any = null;
  let srcPts: any = null;
  let M: any = null;
  let warped: any = null;
  let th: any = null;

  try {
    dstPts = cv.matFromArray(4, 1, cv.CV_32FC2, [50, 50, 800, 50, 800, 1050, 50, 1050]);
    srcPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
      cand[0].x, cand[0].y,
      cand[1].x, cand[1].y,
      cand[2].x, cand[2].y,
      cand[3].x, cand[3].y,
    ]);
    M = cv.getPerspectiveTransform(srcPts, dstPts);
    warped = new cv.Mat();
    th = new cv.Mat();
    cv.warpPerspective(grayMat, warped, M, new cv.Size(850, 1100), cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar(255));
    cv.threshold(warped, th, 0, 255, cv.THRESH_BINARY_INV + cv.THRESH_OTSU);

    const thData = th.data;
    const getRegionDensity = (x1: number, y1: number, x2: number, y2: number) => {
      let ink = 0;
      let count = 0;
      for (let y = y1; y < y2; y += 3) {
        const row = y * 850;
        for (let x = x1; x < x2; x += 3) {
          if (thData[row + x] === 255) ink++;
          count++;
        }
      }
      return count > 0 ? ink / count : 0;
    };

    // 1. Asymmetric feature: Top header strip vs Bottom strip
    const topStrip = getRegionDensity(100, 60, 750, 160);
    const botStrip = getRegionDensity(100, 940, 750, 1040);

    // 2. Student ID header
    const sidHdr = getRegionDensity(80, 150, 400, 230);

    // 3. ZipGrade bottom timing track vs clean top margin
    const botTrack = getRegionDensity(400, 1055, 720, 1085);
    const topTrack = getRegionDensity(400, 15, 720, 45);

    const score = (topStrip - botStrip) * 3.5 + sidHdr * 2.0 + (botTrack - topTrack);
    if (score >= 0 || topStrip >= botStrip * 0.75) {
      return cand;
    } else {
      return [
        cw[(startIdx + 2) % 4],
        cw[(startIdx + 3) % 4],
        cw[startIdx],
        cw[(startIdx + 1) % 4],
      ];
    }
  } catch {
    return cand;
  } finally {
    if (dstPts) dstPts.delete();
    if (srcPts) srcPts.delete();
    if (M) M.delete();
    if (warped) warped.delete();
    if (th) th.delete();
  }
}

function angleAt(A: Point, B: Point, C: Point): number {
  const ab = { x: A.x - B.x, y: A.y - B.y };
  const cb = { x: C.x - B.x, y: C.y - B.y };
  const m = Math.hypot(ab.x, ab.y) * Math.hypot(cb.x, cb.y);
  if (m === 0) return 0;
  return (Math.acos(Math.max(-1, Math.min(1, (ab.x * cb.x + ab.y * cb.y) / m))) * 180) / Math.PI;
}

function isValidSheetQuad(c: Point[], w: number, h: number): boolean {
  if (c.length !== 4) return false;
  const cw = orderQuadClockwise(c);
  for (let i = 0; i < 4; i++) {
    const a = angleAt(cw[(i + 3) % 4], cw[i], cw[(i + 1) % 4]);
    if (a < 48 || a > 132) return false;
  }
  const topW = Math.hypot(cw[1].x - cw[0].x, cw[1].y - cw[0].y);
  const rightH = Math.hypot(cw[2].x - cw[1].x, cw[2].y - cw[1].y);
  const botW = Math.hypot(cw[3].x - cw[2].x, cw[3].y - cw[2].y);
  const leftH = Math.hypot(cw[0].x - cw[3].x, cw[0].y - cw[3].y);
  const minSide = Math.min(w, h) * 0.16;
  if (Math.min(topW, botW, leftH, rightH) < minSide) return false;

  // Opposite sides of an answer sheet in perspective (allow natural camera tilt up to 42%)
  const maxW = Math.max(topW, botW);
  const maxH = Math.max(leftH, rightH);
  if (maxW === 0 || maxH === 0) return false;
  if (Math.abs(topW - botW) / maxW > 0.42) return false;
  if (Math.abs(leftH - rightH) / maxH > 0.42) return false;

  // Quad area must occupy at least 8% of the camera frame
  let quadArea = 0;
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    quadArea += cw[i].x * cw[j].y - cw[j].x * cw[i].y;
  }
  quadArea = Math.abs(quadArea) / 2;
  if (quadArea < w * h * 0.08) return false;

  // Sheet aspect ratio: continuous range from 0.45 to 1.95 (no artificial hole between 0.95 and 1.05)
  const aspect = (topW + botW) / (leftH + rightH);
  return aspect >= 0.45 && aspect <= 1.95;
}

function findBestQuadFromCandidates(candidates: Point[], w: number, h: number): Point[] | null {
  if (candidates.length < 4) return null;

  if (candidates.length === 4) {
    const quad = orderQuadClockwise(candidates);
    return isValidSheetQuad(quad, w, h) ? quad : null;
  }

  // If more than 4 candidates, filter to outermost candidates by distance from image center
  let pool = candidates;
  if (pool.length > 10) {
    const cx = w / 2;
    const cy = h / 2;
    pool = [...candidates]
      .sort((a, b) => Math.hypot(b.x - cx, b.y - cy) - Math.hypot(a.x - cx, a.y - cy))
      .slice(0, 10);
  }

  let bestQuad: Point[] | null = null;
  let maxArea = 0;

  // 1. First test diagonal extremes heuristic for speed
  let minSum = Infinity, maxSum = -Infinity;
  let minDiff = Infinity, maxDiff = -Infinity;
  let tlIdx = -1, brIdx = -1, blIdx = -1, trIdx = -1;

  for (let i = 0; i < pool.length; i++) {
    const p = pool[i];
    const s = p.x + p.y;
    const d = p.x - p.y;
    if (s < minSum) { minSum = s; tlIdx = i; }
    if (s > maxSum) { maxSum = s; brIdx = i; }
    if (d > maxDiff) { maxDiff = d; trIdx = i; }
    if (d < minDiff) { minDiff = d; blIdx = i; }
  }

  const diagIndices = new Set([tlIdx, trIdx, brIdx, blIdx]);
  if (diagIndices.size === 4) {
    const quad = [pool[tlIdx], pool[trIdx], pool[brIdx], pool[blIdx]];
    if (isValidSheetQuad(quad, w, h)) {
      let area = 0;
      for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4;
        area += quad[i].x * quad[j].y - quad[j].x * quad[i].y;
      }
      bestQuad = quad;
      maxArea = Math.abs(area) / 2;
    }
  }

  // 2. Evaluate 4-point combinations to find the quadrilateral with maximum valid area
  const n = pool.length;
  for (let i = 0; i < n - 3; i++) {
    for (let j = i + 1; j < n - 2; j++) {
      for (let k = j + 1; k < n - 1; k++) {
        for (let l = k + 1; l < n; l++) {
          const quad = orderQuadClockwise([pool[i], pool[j], pool[k], pool[l]]);
          if (isValidSheetQuad(quad, w, h)) {
            let area = 0;
            for (let m = 0; m < 4; m++) {
              const next = (m + 1) % 4;
              area += quad[m].x * quad[next].y - quad[next].x * quad[m].y;
            }
            area = Math.abs(area) / 2;
            if (area > maxArea) {
              maxArea = area;
              bestQuad = quad;
            }
          }
        }
      }
    }
  }

  return bestQuad;
}

/** Primary: the 4 black corner squares with robust rotated-rect solidity and geometric sanity. */
function detectCornerMarkers(blurMat: any, w: number, h: number): Point[] | null {
  const minDim = Math.min(w, h);
  const imgArea = w * h;
  const minMarkerArea = Math.max(35, imgArea * 0.00005);
  const maxMarkerArea = imgArea * 0.03;

  const bs21 = 21;
  const bsProp = Math.max(15, Math.floor(minDim / 40) * 2 + 1);

  const threshMat = new cv.Mat();
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();

  // Cascade methods matching omr.py:
  const methods: Array<{ mode: number; apply: (dst: any) => void }> = [
    { mode: cv.RETR_EXTERNAL, apply: (dst) => cv.threshold(blurMat, dst, 0, 255, cv.THRESH_BINARY_INV + cv.THRESH_OTSU) },
    { mode: cv.RETR_EXTERNAL, apply: (dst) => cv.adaptiveThreshold(blurMat, dst, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, bs21, 3) },
    { mode: cv.RETR_LIST,     apply: (dst) => cv.adaptiveThreshold(blurMat, dst, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, bs21, 3) },
    { mode: cv.RETR_EXTERNAL, apply: (dst) => cv.adaptiveThreshold(blurMat, dst, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, bsProp, 3) },
  ];

  try {
    for (const { mode, apply } of methods) {
      apply(threshMat);
      cv.findContours(threshMat, contours, hierarchy, mode, cv.CHAIN_APPROX_SIMPLE);

      const candidates: Point[] = [];
      for (let i = 0; i < contours.size(); ++i) {
        const cnt = contours.get(i);
        const area = cv.contourArea(cnt);
        if (area >= minMarkerArea && area <= maxMarkerArea) {
          const rect = cv.boundingRect(cnt);
          const rRect = cv.minAreaRect(cnt);
          const rw = rRect.size.width;
          const rh = rRect.size.height;
          const rMin = Math.min(rw, rh);
          const rMax = Math.max(rw, rh);
          const rAspect = rMax > 0 ? rMin / rMax : 0;
          const rSolidity = rw * rh > 0 ? area / (rw * rh) : 0;

          const bbAspect = rect.height > 0 ? rect.width / rect.height : 0;
          const bbSolidity = rect.width * rect.height > 0 ? area / (rect.width * rect.height) : 0;

          // Robust square fiducial detection:
          // Uses rotated-rect aspect ratio & solidity (handles any rotation angle from 0-360)
          // or axis-aligned fallback:
          const isSquareFiducial =
            (rAspect >= 0.58 && rSolidity >= 0.65) ||
            (bbAspect >= 0.65 && bbAspect <= 1.55 && bbSolidity >= 0.55);

          if (isSquareFiducial) {
            const M = cv.moments(cnt);
            if (M.m00 > 0) {
              candidates.push({ x: M.m10 / M.m00, y: M.m01 / M.m00 });
            }
          }
        }
        cnt.delete();
      }

      if (candidates.length >= 4) {
        const quad = findBestQuadFromCandidates(candidates, w, h);
        if (quad) {
          return quad;
        }
      }
    }

    return null;
  } catch {
    return null;
  } finally {
    threshMat.delete();
    contours.delete();
    hierarchy.delete();
  }
}


/**
 * Fallback: outer paper edge. When paper edge is detected, insets estimated corners by the template margin
 * so the warped perspective accurately aligns to template fiducial positions.
 */
function detectSheetEdge(blurMat: any, w: number, h: number): Point[] | null {
  const edges = new cv.Mat();
  const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  const approx = new cv.Mat();
  try {
    cv.Canny(blurMat, edges, 40, 140);
    cv.dilate(edges, edges, kernel);
    cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    let best: Point[] | null = null;
    let bestArea = w * h * 0.16; // Sheet of paper must occupy at least 16% of viewfinder

    for (let i = 0; i < contours.size(); ++i) {
      const cnt = contours.get(i);
      const area = cv.contourArea(cnt);
      if (area > bestArea && area < w * h * 0.95) {
        const peri = cv.arcLength(cnt, true);
        for (const eps of [0.02, 0.025, 0.035, 0.045]) {
          cv.approxPolyDP(cnt, approx, eps * peri, true);
          if (approx.rows === 4 && cv.isContourConvex(approx)) {
            const rawPts: Point[] = [];
            for (let j = 0; j < 4; j++) {
              rawPts.push({ x: approx.data32S[j * 2], y: approx.data32S[j * 2 + 1] });
            }
            if (isValidSheetQuad(rawPts, w, h)) {
              // Order by diagonal sum/diff to unambiguously identify corners:
              const sumPts = rawPts.map((p) => p.x + p.y);
              const diffPts = rawPts.map((p) => p.x - p.y);
              const tl = rawPts[sumPts.indexOf(Math.min(...sumPts))];
              const br = rawPts[sumPts.indexOf(Math.max(...sumPts))];
              const tr = rawPts[diffPts.indexOf(Math.max(...diffPts))];
              const bl = rawPts[diffPts.indexOf(Math.min(...diffPts))];

              // Inset paper boundary corners to fiducial centers:
              // Standard template fiducials are 50px inside 850x1100 page:
              // Margins: 50 / 850 = 5.88% horizontal, 50 / 1100 = 4.55% vertical
              const inX = 0.0588, inY = 0.0455;
              const ut = { x: tr.x - tl.x, y: tr.y - tl.y };
              const ub = { x: br.x - bl.x, y: br.y - bl.y };
              const vl = { x: bl.x - tl.x, y: bl.y - tl.y };
              const vr = { x: br.x - tr.x, y: br.y - tr.y };

              const fidTL = { x: tl.x + inX * ut.x + inY * vl.x, y: tl.y + inX * ut.y + inY * vl.y };
              const fidTR = { x: tr.x - inX * ut.x + inY * vr.x, y: tr.y - inX * ut.y + inY * vr.y };
              const fidBR = { x: br.x - inX * ub.x - inY * vr.x, y: br.y - inX * ub.y - inY * vr.y };
              const fidBL = { x: bl.x + inX * ub.x - inY * vl.x, y: bl.y + inX * ub.y - inY * vl.y };

              best = [fidTL, fidTR, fidBR, fidBL];
              bestArea = area;
              break;
            }
          }
        }
      }
      cnt.delete();
    }
    return best;
  } finally {
    edges.delete();
    kernel.delete();
    contours.delete();
    hierarchy.delete();
    approx.delete();
  }
}

// ── Pipeline ────────────────────────────────────────────────────────────────────────────
function processFrame(
  frameId: number,
  imageData: ImageData,
  width: number,
  height: number,
  decode: boolean,
  blurThreshold: number,
  numItems: number,
  answerKey: Record<string, string> | undefined,
  passingScore: number | undefined
) {
  const t0 = performance.now();
  const evalId = `ev-${frameId}-${Math.random().toString(36).slice(2, 7)}`;
  const answerKeyEntries = Object.keys(normalizeAnswerKey(answerKey)).filter(
    (k) => Number(k) >= 1 && Number(k) <= numItems
  ).length;

  const trace: EvaluationTrace = {
    evalId,
    frameId,
    stage: 'quality',
    inputWidth: width,
    inputHeight: height,
    warpedWidth: 0,
    warpedHeight: 0,
    blurScore: 0,
    contrastScore: 0,
    qualityReason: 'NONE',
    cornerSource: null,
    template: null,
    numItems,
    answerKeyEntries,
    counters: { ...EMPTY_COUNTERS },
    rejectedQuestions: numItems,
    frameGrade: null,
    error: null,
    processingTimeMs: 0,
  };
  const msg: FrameResultMessage = {
    type: 'FRAME_RESULT',
    frameId,
    evalId,
    sheetDetected: false,
    templateGradable: false,
    corners: null,
    normalizedCorners: null,
    questions: null,
    studentId: '',
    trace,
  };
  const finish = () => {
    trace.processingTimeMs = Math.round(performance.now() - t0);
    postMessage(msg);
  };

  if (!isOpenCvReady || typeof cv === 'undefined') {
    trace.stage = 'error';
    trace.error = 'OpenCV engine not ready';
    finish();
    return;
  }

  const mats: any[] = [];
  const track = <T>(m: T): T => {
    mats.push(m);
    return m;
  };

  try {
    const src = track(cv.matFromImageData(imageData));
    const gray = track(new cv.Mat());
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

    // 1. Quality
    const q = evaluateImageQuality(gray, blurThreshold);
    trace.blurScore = Math.round(q.blurScore);
    trace.contrastScore = Math.round(q.contrastScore);
    trace.qualityReason = q.reason;

    // 2. Corners
    trace.stage = 'corners';
    const blur = track(new cv.Mat());
    cv.GaussianBlur(gray, blur, new cv.Size(5, 5), 0);
    let source: CornerSource = 'fiducials';
    let corners = detectCornerMarkers(blur, width, height);
    if (!corners) {
      corners = detectSheetEdge(blur, width, height);
      source = 'sheet-edge';
    }
    if (!corners) {
      trace.error = q.reason === 'BLURRY' ? 'Motion blur — hold the camera steady' : 'No sheet found in the viewfinder';
      finish();
      return;
    }

    // Identify which marker corresponds to each template corner
    corners = identifyTemplateCorners(gray, corners);
    trace.cornerSource = source;

    // 3. Perspective correction — warp grayscale frame directly to template dimensions
    const [tl, tr, br, bl] = corners;
    const srcPts = track(cv.matFromArray(4, 1, cv.CV_32FC2, [tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y]));
    const dstPts = track(cv.matFromArray(4, 1, cv.CV_32FC2, [50, 50, 800, 50, 800, 1050, 50, 1050]));
    const M = track(cv.getPerspectiveTransform(srcPts, dstPts));
    const warped = track(new cv.Mat());
    cv.warpPerspective(gray, warped, M, new cv.Size(WARPED_WIDTH, WARPED_HEIGHT), cv.INTER_LINEAR,
      cv.BORDER_CONSTANT, new cv.Scalar(255));

    // Direct thresholding on warped grayscale image for template check:
    // Preserves solid black density of fiducial markers without cv.divide erosion!
    const directThresh = track(new cv.Mat());
    cv.threshold(warped, directThresh, 0, 255, cv.THRESH_BINARY_INV + cv.THRESH_OTSU);

    // Illumination normalization for bubble extraction:
    const bg = track(new cv.Mat());
    cv.GaussianBlur(warped, bg, new cv.Size(51, 51), 0);
    const norm = track(new cv.Mat());
    cv.divide(warped, bg, norm, 255);

    const wBlur = track(new cv.Mat());
    const wThresh = track(new cv.Mat());
    cv.GaussianBlur(norm, wBlur, new cv.Size(5, 5), 0);
    cv.threshold(wBlur, wThresh, 0, 255, cv.THRESH_BINARY_INV + cv.THRESH_OTSU);
    trace.warpedWidth = wThresh.cols;
    trace.warpedHeight = wThresh.rows;

    // 4. Template check on direct binarized image:
    trace.stage = 'template';
    let tpl = checkTemplate(directThresh, source);

    // If orientation inverted, auto-rotate 180°:
    if (!tpl.isUpright) {
      const rotW = track(new cv.Mat());
      const rotD = track(new cv.Mat());
      cv.rotate(warped, rotW, cv.ROTATE_180);
      cv.rotate(directThresh, rotD, cv.ROTATE_180);
      const rotTpl = checkTemplate(rotD, source);
      if (rotTpl.isUpright) {
        tpl = rotTpl;
        cv.rotate(wThresh, wThresh, cv.ROTATE_180);
        corners = [corners[2], corners[3], corners[0], corners[1]];
      }
    }
    trace.template = tpl;

    // Confirm sheetDetected if geometry is aligned and dimensions are valid
    if (tpl.geometryAligned && tpl.dimensionsOk) {
      msg.sheetDetected = true;
      msg.corners = corners;
      msg.normalizedCorners = corners.map((p) => ({ x: p.x / width, y: p.y / height }));
      if (tpl.gradable) {
        msg.templateGradable = true;
      }
    } else {
      msg.sheetDetected = false;
      msg.corners = null;
      msg.normalizedCorners = null;
      trace.error = tpl.reason || 'Align answer sheet in viewfinder';
      finish();
      return;
    }

    if (!tpl.gradable) {
      trace.error = tpl.reason;
      finish();
      return;
    }

    // Quality check: Only gate on severe blur or severe exposure loss
    if (q.blurScore < 15 || q.reason === 'UNDEREXPOSED' || q.reason === 'OVEREXPOSED') {
      trace.error = q.blurScore < 15 ? 'Motion blur — hold the camera steady' : `Poor lighting: ${q.reason}`;
      finish();
      return;
    }

    // 5. Classify using the verified layout template coordinates (EduAssess 6980 or ZipGrade 50)
    trace.stage = 'evaluated';
    if (decode) {
      const activeCoords = tpl.layout === 'eduassess_6980' ? EDUASSESS_TEMPLATE_COORDINATES : OMR_TEMPLATE_COORDINATES;
      const dec = decodeQuestions(wThresh, activeCoords, numItems);
      msg.questions = dec.questions;
      msg.studentId = dec.studentId;
      trace.counters = dec.counters;
      trace.rejectedQuestions = numItems - dec.counters.questionsRead;
      // 6. Grade this frame with the same grader the session uses
      if (answerKeyEntries > 0) {
        trace.frameGrade = gradeAnswers(dec.questions, answerKey, numItems, passingScore);
      }
    }
    finish();
  } catch (err: any) {
    trace.stage = 'error';
    trace.error = err?.message || 'Unexpected computer-vision error';
    finish();
  } finally {
    for (const m of mats) {
      try {
        m.delete();
      } catch {
        /* already freed */
      }
    }
  }
}


// High-resolution deskew used when the sheet is captured for server grading.
function warpPerspective(imageData: ImageData, corners: Point[], outW = 850, outH = 1100) {
  if (!isOpenCvReady || typeof cv === 'undefined' || corners.length !== 4) {
    postMessage({ type: 'WARP_COMPLETED', success: false, error: 'OpenCV not ready or invalid corners' });
    return;
  }
  let src: any = null, gray: any = null, dst: any = null, s: any = null, d: any = null, M: any = null;
  try {
    src = cv.matFromImageData(imageData);
    gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    const [tl, tr, br, bl] = identifyTemplateCorners(gray, corners);
    dst = new cv.Mat();
    s = cv.matFromArray(4, 1, cv.CV_32FC2, [tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y]);

    // Template fiducials sit at (50, 50), (800, 50), (800, 1050), (50, 1050) in standardized 850x1100 space
    const scaleX = outW / 850;
    const scaleY = outH / 1100;
    d = cv.matFromArray(4, 1, cv.CV_32FC2, [
      50 * scaleX, 50 * scaleY,
      800 * scaleX, 50 * scaleY,
      800 * scaleX, 1050 * scaleY,
      50 * scaleX, 1050 * scaleY,
    ]);
    M = cv.getPerspectiveTransform(s, d);
    cv.warpPerspective(src, dst, M, new cv.Size(outW, outH), cv.INTER_LINEAR, cv.BORDER_CONSTANT,
      new cv.Scalar(255, 255, 255, 255));
    const out = new ImageData(new Uint8ClampedArray(dst.data), dst.cols, dst.rows);
    postMessage({ type: 'WARP_COMPLETED', success: true, imageData: out, width: outW, height: outH }, [out.data.buffer]);
  } catch (err: any) {
    postMessage({ type: 'WARP_COMPLETED', success: false, error: err?.message || 'Perspective warp failed' });
  } finally {
    [src, gray, dst, s, d, M].forEach((m) => m && m.delete());
  }
}

self.onmessage = (e: MessageEvent) => {
  const data = e.data;
  if (!data?.type) return;
  switch (data.type) {
    case 'INIT':
      initOpenCV();
      break;
    case 'PROCESS_FRAME':
      processFrame(
        data.frameId ?? 0,
        data.imageData,
        data.width,
        data.height,
        data.decodeBubbles ?? true,
        data.blurThreshold ?? 35,
        data.numExpectedQuestions ?? 50,
        data.answerKey,
        data.passingScore
      );
      break;
    case 'WARP_PERSPECTIVE':
      warpPerspective(data.imageData, data.corners, data.targetWidth, data.targetHeight);
      break;
  }
};
