// omrScanner.worker.ts
// Live OMR pipeline (one camera frame -> one EvaluationTrace):
//   1 Image quality check -> 2 detect sheet corners -> 3 perspective correction (850x1100)
//   -> 4 template check (corner markers + layout) -> 5 classify bubbles -> 6 grade frame
// All classification and grading lives in ../omr/omrEvaluation.ts (shared with the session
// hook and scripts/verifyOmrEvaluation.ts). This file only does OpenCV image work.

import { OMR_TEMPLATE_COORDINATES } from '../data/omrCoordinates';
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
function orderCorners(pts: Point[]): Point[] {
  const bySum = [...pts].sort((a, b) => a.x + a.y - (b.x + b.y));
  const byDiff = [...pts].sort((a, b) => a.y - a.x - (b.y - b.x));
  return [bySum[0], byDiff[0], bySum[3], byDiff[3]];
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
  const [tl, tr, br, bl] = c;
  for (const a of [angleAt(bl, tl, tr), angleAt(tl, tr, br), angleAt(tr, br, bl), angleAt(br, bl, tl)]) {
    if (a < 40 || a > 145) return false;
  }
  const topW = Math.hypot(tr.x - tl.x, tr.y - tl.y);
  const botW = Math.hypot(br.x - bl.x, br.y - bl.y);
  const leftH = Math.hypot(bl.x - tl.x, bl.y - tl.y);
  const rightH = Math.hypot(br.x - tr.x, br.y - tr.y);
  const minSide = Math.min(w, h) * 0.18;
  if (Math.min(topW, botW, leftH, rightH) < minSide) return false;
  const aspect = (topW + botW) / (leftH + rightH);
  return aspect >= 0.35 && aspect <= 2.8;
}

/** Primary: the 4 black corner squares. Their centres map to the template fiducial positions. */
function detectCornerMarkers(threshMat: any, w: number, h: number): Point[] | null {
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  try {
    cv.findContours(threshMat, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    const candidates: Point[] = [];
    for (let i = 0; i < contours.size(); ++i) {
      const cnt = contours.get(i);
      const rect = cv.boundingRect(cnt);
      const area = cv.contourArea(cnt);
      const aspect = rect.height > 0 ? rect.width / rect.height : 0;
      const solidity = rect.width * rect.height > 0 ? area / (rect.width * rect.height) : 0;
      if (aspect >= 0.45 && aspect <= 1.85 && solidity >= 0.45 && area >= 20 && area <= w * h * 0.05) {
        candidates.push({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
      }
      cnt.delete();
    }
    if (candidates.length < 4) return null;

    const bySum = [...candidates].sort((a, b) => a.x + a.y - (b.x + b.y));
    const byDiff = [...candidates].sort((a, b) => a.x - a.y - (b.x - b.y));
    const extreme = [bySum[0], byDiff[byDiff.length - 1], bySum[bySum.length - 1], byDiff[0]];
    if (isValidSheetQuad(extreme, w, h)) return extreme;

    const byY = [...candidates].sort((a, b) => a.y - b.y);
    const half = Math.ceil(candidates.length / 2);
    const top = byY.slice(0, half).sort((a, b) => a.x - b.x);
    const bot = byY.slice(half).sort((a, b) => a.x - b.x);
    if (top.length >= 2 && bot.length >= 2) {
      const fb = [top[0], top[top.length - 1], bot[bot.length - 1], bot[0]];
      if (isValidSheetQuad(fb, w, h)) return fb;
    }
    return null;
  } catch {
    return null;
  } finally {
    contours.delete();
    hierarchy.delete();
  }
}

/**
 * Fallback: outer paper edge. NOTE: paper corners are not the corner-marker centres, so a warp
 * from these points does not register the template. Stage 4 will reject it unless the markers
 * happen to land on their template positions. It is kept so the UI can still outline the sheet.
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
    let bestArea = w * h * 0.1;
    for (let i = 0; i < contours.size(); ++i) {
      const cnt = contours.get(i);
      const area = cv.contourArea(cnt);
      if (area > bestArea) {
        cv.approxPolyDP(cnt, approx, 0.03 * cv.arcLength(cnt, true), true);
        if (approx.rows === 4 && cv.isContourConvex(approx)) {
          const pts: Point[] = [];
          for (let j = 0; j < 4; j++) pts.push({ x: approx.data32S[j * 2], y: approx.data32S[j * 2 + 1] });
          const ordered = orderCorners(pts);
          if (isValidSheetQuad(ordered, w, h)) {
            best = ordered;
            bestArea = area;
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
    if (!q.usable) {
      trace.error = q.reason === 'BLURRY' ? 'Motion blur — hold the camera steady' : `Poor lighting: ${q.reason}`;
      finish();
      return;
    }

    // 2. Corners
    trace.stage = 'corners';
    const blur = track(new cv.Mat());
    const adapt = track(new cv.Mat());
    cv.GaussianBlur(gray, blur, new cv.Size(5, 5), 0);
    cv.adaptiveThreshold(blur, adapt, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 11, 2);
    let source: CornerSource = 'fiducials';
    let corners = detectCornerMarkers(adapt, width, height);
    if (!corners) {
      corners = detectSheetEdge(blur, width, height);
      source = 'sheet-edge';
    }
    if (!corners) {
      trace.error = 'No sheet found in the viewfinder';
      finish();
      return;
    }
    trace.cornerSource = source;
    msg.sheetDetected = true;
    msg.corners = corners;
    msg.normalizedCorners = corners.map((p) => ({ x: p.x / width, y: p.y / height }));

    // 3. Perspective correction — marker centres -> template fiducial positions
    const [tl, tr, br, bl] = corners;
    const srcPts = track(cv.matFromArray(4, 1, cv.CV_32FC2, [tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y]));
    const dstPts = track(cv.matFromArray(4, 1, cv.CV_32FC2, [50, 50, 800, 50, 800, 1050, 50, 1050]));
    const M = track(cv.getPerspectiveTransform(srcPts, dstPts));
    const warped = track(new cv.Mat());
    const wGray = track(new cv.Mat());
    const wBlur = track(new cv.Mat());
    const wThresh = track(new cv.Mat());
    cv.warpPerspective(src, warped, M, new cv.Size(WARPED_WIDTH, WARPED_HEIGHT), cv.INTER_LINEAR,
      cv.BORDER_CONSTANT, new cv.Scalar(255, 255, 255, 255));
    cv.cvtColor(warped, wGray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(wGray, wBlur, new cv.Size(5, 5), 0);
    cv.threshold(wBlur, wThresh, 0, 255, cv.THRESH_BINARY_INV + cv.THRESH_OTSU);
    trace.warpedWidth = wThresh.cols;
    trace.warpedHeight = wThresh.rows;

    // 4. Template check
    trace.stage = 'template';
    const tpl = checkTemplate(wThresh, source);
    trace.template = tpl;
    if (!tpl.gradable) {
      trace.error = tpl.reason;
      finish();
      return;
    }
    msg.templateGradable = true;

    // 5. Classify
    trace.stage = 'evaluated';
    if (decode) {
      const dec = decodeQuestions(wThresh, OMR_TEMPLATE_COORDINATES, numItems);
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
function warpPerspective(imageData: ImageData, corners: Point[], outW = 1200, outH = 1600) {
  if (!isOpenCvReady || typeof cv === 'undefined' || corners.length !== 4) {
    postMessage({ type: 'WARP_COMPLETED', success: false, error: 'OpenCV not ready or invalid corners' });
    return;
  }
  let src: any = null, dst: any = null, s: any = null, d: any = null, M: any = null;
  try {
    const [tl, tr, br, bl] = orderCorners(corners);
    src = cv.matFromImageData(imageData);
    dst = new cv.Mat();
    s = cv.matFromArray(4, 1, cv.CV_32FC2, [tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y]);
    d = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, outW, 0, outW, outH, 0, outH]);
    M = cv.getPerspectiveTransform(s, d);
    cv.warpPerspective(src, dst, M, new cv.Size(outW, outH), cv.INTER_LINEAR, cv.BORDER_CONSTANT,
      new cv.Scalar(255, 255, 255, 255));
    const out = new ImageData(new Uint8ClampedArray(dst.data), dst.cols, dst.rows);
    postMessage({ type: 'WARP_COMPLETED', success: true, imageData: out, width: outW, height: outH }, [out.data.buffer]);
  } catch (err: any) {
    postMessage({ type: 'WARP_COMPLETED', success: false, error: err?.message || 'Perspective warp failed' });
  } finally {
    [src, dst, s, d, M].forEach((m) => m && m.delete());
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
