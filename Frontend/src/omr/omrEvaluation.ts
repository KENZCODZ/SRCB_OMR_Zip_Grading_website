// omrEvaluation.ts
// Single source of truth for live OMR evaluation. Pure functions only (no OpenCV, no DOM),
// so the Web Worker, the React session hook, and the Node verification script
// (Frontend/scripts/verifyOmrEvaluation.ts) all run exactly the same logic.
//
// ─── COUNTER DEFINITIONS ────────────────────────────────────────────────────────────────
// Per evaluation (one camera frame):
//   questionsRead       Questions 1..N whose bubbles were sampled on a template-verified
//                       warped sheet. 0 when the frame was rejected before decoding.
//   bubbleSlotsSampled  Template bubble positions sampled (N x 5). These are positions taken
//                       from the template, NOT detections — a slot existing proves nothing.
//   bubblesMarked       Sampled slots whose ink fill ratio reached the adaptive threshold.
//   singleMarked        Questions with exactly one marked bubble  -> a classified answer.
//   multipleMarked      Questions with 2+ marks or an indistinguishable near-tie -> review.
//   blank               Questions with no marked bubble.
//                       questionsRead === singleMarked + multipleMarked + blank (always).
//   answersClassified   === singleMarked. Blank and multi-mark questions are NOT classified
//                       answers, even though their template positions exist.
//   rejectedQuestions   Questions 1..N not evaluated because the frame was rejected.
// Grading (frame or session):
//   answersGraded       Questions with an answer state AND an answer-key entry that were
//                       compared against the key (correct + incorrect + omitted + multiple).
//   pending             Questions with no answer state yet (session not settled) — not graded.
//   scoringErrors       Questions 1..N with no valid answer-key entry — cannot be graded.
// ─────────────────────────────────────────────────────────────────────────────────────────

import type { BubbleCoord, OMRCoordinates } from '../data/omrCoordinates';

/** Standardized warp the template coordinates are defined in. */
export const WARPED_WIDTH = 850;
export const WARPED_HEIGHT = 1100;

/** Corner-marker centres after warping (detected marker centres are mapped here). */
export const FIDUCIAL_CENTERS = [
  { name: 'TL', cx: 50, cy: 50 },
  { name: 'TR', cx: 800, cy: 50 },
  { name: 'BR', cx: 800, cy: 1050 },
  { name: 'BL', cx: 50, cy: 1050 },
] as const;
export const FIDUCIAL_WINDOW_RADIUS = 14;
/**
 * Minimum ink density of a 28x28 window centred on each expected marker.
 * Calibrated on real sheets (new.jpg, ZipGrade50QuestionV2.png, c240032.jpeg,
 * EduAssess6980_50Question.png): correctly aligned warps measure 0.70–0.91.
 * The previous check accepted ~0.25, which is what a mis-registered warp produces.
 */
export const FIDUCIAL_MIN_DENSITY = 0.40;

/**
 * EduAssess 6980 sheets carry 4 extra column-divider squares. Measured mean density:
 * EduAssess 0.38–0.41, ZipGrade 0.12–0.14. Both layouts are supported in live scanning.
 */
export const EDUASSESS_MARKERS = [
  { cx: 314, cy: 638 },
  { cx: 538, cy: 638 },
  { cx: 314, cy: 1056 },
  { cx: 538, cy: 1056 },
] as const;
export const EDUASSESS_MIN_MEAN_DENSITY = 0.28;

/** Added to the measured paper noise floor to obtain the per-frame fill threshold. */
export const BUBBLE_FILL_OFFSET = 0.08;
/** If the top two options are both above 0.05 and closer than this, the mark is ambiguous. */
export const NEAR_TIE_DELTA = 0.045;

export const OPTIONS = ['A', 'B', 'C', 'D', 'E'] as const;

/** Binary image: 255 = ink, 0 = paper. Compatible with an OpenCV.js Mat (data/cols/rows). */
export interface BinaryImage {
  data: ArrayLike<number>;
  cols: number;
  rows: number;
}

export type CornerSource = 'fiducials' | 'sheet-edge';
export type SheetLayout = 'zipgrade_50' | 'eduassess_6980';

export interface TemplateCheck {
  dimensionsOk: boolean;
  cornerSource: CornerSource;
  fiducialDensities: number[]; // TL, TR, BR, BL (0..1)
  fiducialsFound: number; // 0..4
  geometryAligned: boolean; // all 4 markers where the template expects them
  isUpright: boolean; // orientation verified from asymmetric header features
  layout: SheetLayout;
  eduMarkerDensity: number;
  layoutSupported: boolean; // live coordinates exist for this layout
  gradable: boolean; // geometryAligned && isUpright && layoutSupported && dimensionsOk
  reason: string | null;
}

export type QuestionMarkStatus = 'single' | 'multiple' | 'blank';

export interface QuestionRead {
  questionNumber: string;
  status: QuestionMarkStatus;
  /** 'B' for single, 'AC' for multiple, null for blank. */
  selected: string | null;
  markedOptions: string[];
  bestRatio: number;
  secondRatio: number;
  optionRatios: Record<string, number>;
}

export interface DecodeCounters {
  questionsRead: number;
  bubbleSlotsSampled: number;
  bubblesMarked: number;
  singleMarked: number;
  multipleMarked: number;
  blank: number;
  answersClassified: number;
}

export interface DecodeResult {
  questions: Record<string, QuestionRead>;
  studentId: string;
  fillThreshold: number;
  counters: DecodeCounters;
}

export interface GradeSummary {
  total: number; // N (exam items)
  score: number; // correct single-mark answers
  percentage: number;
  passingThreshold: number;
  /** True only when every question 1..N has an answer state and a key entry. */
  isFinal: boolean;
  isPassing: boolean;
  answersGraded: number;
  correct: number;
  incorrect: number;
  omitted: number; // graded blank
  multiple: number; // graded multi-mark (0 pts)
  pending: number;
  scoringErrors: number;
  missingKeyQuestions: string[];
  answerKeyEntries: number; // valid entries within 1..N
  correctMap: Record<string, boolean>;
}

export interface EvaluationTrace {
  evalId: string;
  frameId: number;
  /** Where the pipeline stopped for this frame. */
  stage: 'quality' | 'corners' | 'template' | 'evaluated' | 'error';
  inputWidth: number;
  inputHeight: number;
  warpedWidth: number; // actual warped Mat size handed to the decoder (0 if not warped)
  warpedHeight: number;
  blurScore: number;
  contrastScore: number;
  qualityReason: 'BLURRY' | 'UNDEREXPOSED' | 'OVEREXPOSED' | 'LOW_CONTRAST' | 'NONE';
  cornerSource: CornerSource | null;
  template: TemplateCheck | null;
  numItems: number;
  answerKeyEntries: number;
  counters: DecodeCounters;
  rejectedQuestions: number;
  frameGrade: GradeSummary | null;
  error: string | null;
  processingTimeMs: number;
}

export interface EvaluatorStats {
  evalId: string;
  frameId: number;
  inputWidth: number;
  inputHeight: number;
  warpedWidth: number;
  warpedHeight: number;
  warpSuccess: boolean;
  isBlurry: boolean;
  blurScore: number;
  templateAligned: boolean;
  alignmentScore: number;
  detectedBubblesCount: number;
  classifiedAnswersCount: number;
  rejectedQuestions: number;
  scoringErrors: number;
  answersGraded: number;
  score?: number;
  evaluatorError?: string | null;
  stage: string;
  layout?: SheetLayout;
  answerKeyMatched: boolean;
  answerKeyEntries: number;
  numItems: number;
  minAnsweredReached: boolean;
}

export function traceToEvaluatorStats(trace: EvaluationTrace | null | undefined): EvaluatorStats | undefined {
  if (!trace) return undefined;
  const warpSuccess = trace.warpedWidth > 0 && trace.warpedHeight > 0;
  const templateAligned = Boolean(trace.template && (trace.template.geometryAligned || trace.template.fiducialsFound >= 3));
  const alignmentScore =
    trace.template && trace.template.fiducialDensities && trace.template.fiducialDensities.length > 0
      ? Math.round(
          (trace.template.fiducialDensities.reduce((sum, d) => sum + d, 0) /
            trace.template.fiducialDensities.length) *
            100
        )
      : trace.template
      ? Math.round((trace.template.fiducialsFound / 4) * 100)
      : 0;
  const answerKeyMatched = trace.answerKeyEntries > 0;
  return {
    evalId: trace.evalId,
    frameId: trace.frameId,
    inputWidth: trace.inputWidth,
    inputHeight: trace.inputHeight,
    warpedWidth: trace.warpedWidth,
    warpedHeight: trace.warpedHeight,
    warpSuccess,
    isBlurry: trace.qualityReason === 'BLURRY',
    blurScore: trace.blurScore,
    templateAligned,
    alignmentScore,
    detectedBubblesCount: trace.counters.bubblesMarked,
    classifiedAnswersCount: trace.counters.answersClassified,
    rejectedQuestions: trace.rejectedQuestions,
    scoringErrors: trace.frameGrade?.scoringErrors ?? 0,
    answersGraded: trace.frameGrade?.answersGraded ?? 0,
    score: trace.frameGrade?.score,
    evaluatorError: trace.error,
    stage: trace.stage,
    layout: trace.template?.layout,
    answerKeyMatched,
    answerKeyEntries: trace.answerKeyEntries,
    numItems: trace.numItems,
    minAnsweredReached: trace.counters.answersClassified >= Math.max(3, Math.floor(trace.numItems * 0.1)),
  };
}

export const EMPTY_COUNTERS: DecodeCounters = {
  questionsRead: 0,
  bubbleSlotsSampled: 0,
  bubblesMarked: 0,
  singleMarked: 0,
  multipleMarked: 0,
  blank: 0,
  answersClassified: 0,
};

function windowDensity(img: BinaryImage, cx: number, cy: number, half: number): number {
  const x1 = Math.max(0, cx - half);
  const x2 = Math.min(img.cols, cx + half);
  const y1 = Math.max(0, cy - half);
  const y2 = Math.min(img.rows, cy + half);
  let ink = 0;
  let total = 0;
  for (let y = y1; y < y2; y++) {
    const row = y * img.cols;
    for (let x = x1; x < x2; x++) {
      if (img.data[row + x] === 255) ink++;
      total++;
    }
  }
  return total > 0 ? ink / total : 0;
}

function regionDensity(img: BinaryImage, x1: number, y1: number, x2: number, y2: number): number {
  let ink = 0;
  let total = 0;
  for (let y = Math.max(0, y1); y < Math.min(img.rows, y2); y++) {
    const row = y * img.cols;
    for (let x = Math.max(0, x1); x < Math.min(img.cols, x2); x++) {
      if (img.data[row + x] === 255) ink++;
      total++;
    }
  }
  return total > 0 ? ink / total : 0;
}

/** Stage 4: verify the warped sheet actually matches the template geometry, orientation, and layout. */
export function checkTemplate(img: BinaryImage, cornerSource: CornerSource): TemplateCheck {
  const dimensionsOk = img.cols === WARPED_WIDTH && img.rows === WARPED_HEIGHT;
  const fiducialDensities = FIDUCIAL_CENTERS.map((f) =>
    windowDensity(img, f.cx, f.cy, FIDUCIAL_WINDOW_RADIUS)
  );
  const fiducialsFound = fiducialDensities.filter((d) => d >= FIDUCIAL_MIN_DENSITY).length;
  const meanFidDensity = fiducialDensities.reduce((s, d) => s + d, 0) / fiducialDensities.length;
  const geometryAligned = dimensionsOk && (fiducialsFound >= 3 || (fiducialsFound >= 2 && meanFidDensity >= 0.38));

  // Asymmetric orientation verification (incorporating student ID block & timing tracks):
  const topHeaderDensity = regionDensity(img, 100, 60, 750, 160);
  const bottomStripDensity = regionDensity(img, 100, 940, 750, 1040);
  const sidHeaderDensity = regionDensity(img, 80, 150, 400, 230);
  const bottomTrackDensity = regionDensity(img, 400, 1055, 720, 1085);
  const topTrackDensity = regionDensity(img, 400, 15, 720, 45);

  const orientationScore =
    (topHeaderDensity - bottomStripDensity) * 3.5 +
    sidHeaderDensity * 2.0 +
    (bottomTrackDensity - topTrackDensity);
  const isUpright = orientationScore >= 0 || topHeaderDensity >= bottomStripDensity * 0.75;

  const eduMarkerDensity =
    EDUASSESS_MARKERS.reduce((s, m) => s + windowDensity(img, m.cx, m.cy, 15), 0) /
    EDUASSESS_MARKERS.length;
  const layout: SheetLayout =
    eduMarkerDensity >= EDUASSESS_MIN_MEAN_DENSITY ? 'eduassess_6980' : 'zipgrade_50';
  const layoutSupported = layout === 'zipgrade_50' || layout === 'eduassess_6980';

  let reason: string | null = null;
  if (!dimensionsOk) {
    reason = `Decoder received ${img.cols}x${img.rows}; template expects ${WARPED_WIDTH}x${WARPED_HEIGHT}`;
  } else if (!geometryAligned) {
    const minPct = Math.round(Math.min(...fiducialDensities) * 100);
    reason =
      `Corner markers ${fiducialsFound}/4 at template positions (weakest ${minPct}%, need ` +
      `${Math.round(FIDUCIAL_MIN_DENSITY * 100)}%)` +
      (cornerSource === 'sheet-edge'
        ? ' — corners came from the paper edge, not the corner markers'
        : '');
  } else if (!isUpright) {
    reason = 'Sheet orientation inverted — header at bottom instead of top';
  } else if (!layoutSupported) {
    reason = `Unsupported layout ${layout}`;
  }

  return {
    dimensionsOk,
    cornerSource,
    fiducialDensities,
    fiducialsFound,
    geometryAligned,
    isUpright,
    layout,
    eduMarkerDensity,
    layoutSupported,
    gradable: dimensionsOk && geometryAligned && isUpright && layoutSupported,
    reason,
  };
}

/** Classify one question from its five option fill ratios. */
export function classifyQuestion(
  optionRatios: Record<string, number>,
  fillThreshold: number
): Pick<QuestionRead, 'status' | 'selected' | 'markedOptions' | 'bestRatio' | 'secondRatio'> {
  const ranked = OPTIONS.map((opt) => ({ opt, ratio: optionRatios[opt] ?? 0 })).sort(
    (a, b) => b.ratio - a.ratio
  );
  const best = ranked[0];
  const second = ranked[1];
  const markedOptions = ranked
    .filter((r) => r.ratio >= fillThreshold)
    .map((r) => r.opt)
    .sort();

  if (markedOptions.length === 0) {
    return { status: 'blank', selected: null, markedOptions, bestRatio: best.ratio, secondRatio: second.ratio };
  }
  if (markedOptions.length >= 2) {
    // If one mark is dominant over an erased mark, pick dominant single answer:
    if (best.ratio - second.ratio >= 0.08 && second.ratio / (best.ratio || 1) <= 0.65) {
      return { status: 'single', selected: best.opt, markedOptions: [best.opt], bestRatio: best.ratio, secondRatio: second.ratio };
    }
    return {
      status: 'multiple',
      selected: markedOptions.join(''),
      markedOptions,
      bestRatio: best.ratio,
      secondRatio: second.ratio,
    };
  }
  // Exactly one option above threshold, but runner-up is a visible near-tie: cannot decide.
  if (second.ratio > 0.05 && best.ratio - second.ratio < NEAR_TIE_DELTA) {
    const pair = [best.opt, second.opt].sort();
    return { status: 'multiple', selected: pair.join(''), markedOptions: pair, bestRatio: best.ratio, secondRatio: second.ratio };
  }
  return { status: 'single', selected: best.opt, markedOptions, bestRatio: best.ratio, secondRatio: second.ratio };
}

/** Stage 5: sample the template bubbles on a verified warped sheet and classify questions 1..N. */
export function decodeQuestions(
  img: BinaryImage,
  template: OMRCoordinates,
  numItems: number,
  fillOffset = BUBBLE_FILL_OFFSET
): DecodeResult {
  // Sample strictly inside the bubble (radius b.r - 1) to eliminate adjacent bubble crosstalk:
  const fillRatio = (b: BubbleCoord) => windowDensity(img, b.cx, b.cy, Math.max(6, b.r - 1));

  // Paper noise floor from four blank margin areas (adapts to lighting / paper texture).
  const marginSamples = [
    { x: 100, y: 100 },
    { x: 750, y: 100 },
    { x: 100, y: 1000 },
    { x: 750, y: 1000 },
  ];
  const noiseFloor =
    marginSamples.reduce((s, p) => s + windowDensity(img, p.x, p.y, 10), 0) / marginSamples.length;
  const fillThreshold = Math.max(0.06, Math.min(0.25, noiseFloor + fillOffset));

  const counters: DecodeCounters = { ...EMPTY_COUNTERS };
  const questions: Record<string, QuestionRead> = {};
  const n = Math.min(numItems, template.total_questions ?? 50);

  for (let q = 1; q <= n; q++) {
    const qStr = String(q);
    const coords = template.questions[qStr];
    if (!coords) continue;

    const optionRatios: Record<string, number> = {};
    for (const opt of OPTIONS) {
      const bubble = coords[opt];
      if (!bubble) {
        optionRatios[opt] = 0;
        continue;
      }
      counters.bubbleSlotsSampled++;
      const r = fillRatio(bubble);
      optionRatios[opt] = r;
      if (r >= fillThreshold) counters.bubblesMarked++;
    }

    const c = classifyQuestion(optionRatios, fillThreshold);
    counters.questionsRead++;
    if (c.status === 'single') counters.singleMarked++;
    else if (c.status === 'multiple') counters.multipleMarked++;
    else counters.blank++;

    questions[qStr] = { questionNumber: qStr, optionRatios, ...c };
  }
  counters.answersClassified = counters.singleMarked;

  // Student ID decoding (handles 10-col ZipGrade 1-9,0 and 6-col EduAssess 0-9)
  let studentId = '';
  const isEduAssess = template.template_id?.startsWith('eduassess') || (template.student_id && template.student_id.length === 6);
  for (const col of template.student_id ?? []) {
    let bestDigit = '?';
    let bestRatio = 0;
    let secondRatio = 0;
    col.forEach((bubble, rowIdx) => {
      if (!bubble) return;
      const r = fillRatio(bubble);
      if (r > bestRatio) {
        secondRatio = bestRatio;
        bestRatio = r;
        bestDigit = isEduAssess ? String(rowIdx) : (rowIdx === 9 ? '0' : String(rowIdx + 1));
      } else if (r > secondRatio) {
        secondRatio = r;
      }
    });
    if (bestRatio >= fillThreshold) {
      studentId += (secondRatio >= fillThreshold && (bestRatio - secondRatio < 0.08)) ? '?' : bestDigit;
    }
  }

  return { questions, studentId, fillThreshold, counters };
}

/** Normalize keys ("1", "01", 1) to "1" and values to uppercase single letters A–E. */
export function normalizeAnswerKey(answerKey?: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  if (!answerKey) return out;
  for (const [k, v] of Object.entries(answerKey)) {
    const q = parseInt(k, 10);
    const ans = String(v ?? '').toUpperCase().trim();
    if (!isNaN(q) && /^[A-E]$/.test(ans)) out[String(q)] = ans;
  }
  return out;
}

export interface AnswerState {
  status: QuestionMarkStatus;
  selected: string | null;
}

/**
 * Grade answers 1..N against the key. `answers[q]` undefined means "no answer state yet"
 * (pending). Only single-mark answers can score. Blank = omitted, multi-mark = 0 pts.
 */
export function gradeAnswers(
  answers: Record<string, AnswerState | undefined>,
  answerKey: Record<string, string> | undefined,
  numItems: number,
  passingScore?: number
): GradeSummary {
  const key = normalizeAnswerKey(answerKey);
  const total = Math.max(1, numItems);
  const g: GradeSummary = {
    total,
    score: 0,
    percentage: 0,
    passingThreshold: passingScore ?? Math.round(total * 0.6),
    isFinal: false,
    isPassing: false,
    answersGraded: 0,
    correct: 0,
    incorrect: 0,
    omitted: 0,
    multiple: 0,
    pending: 0,
    scoringErrors: 0,
    missingKeyQuestions: [],
    answerKeyEntries: 0,
    correctMap: {},
  };

  for (let q = 1; q <= total; q++) {
    const qStr = String(q);
    const expected = key[qStr];
    if (expected) g.answerKeyEntries++;
    const a = answers[qStr];

    if (!a) {
      g.pending++;
      if (!expected) {
        g.scoringErrors++;
        g.missingKeyQuestions.push(qStr);
      }
      continue;
    }
    if (!expected) {
      g.scoringErrors++;
      g.missingKeyQuestions.push(qStr);
      continue;
    }

    g.answersGraded++;
    if (a.status === 'blank') {
      g.omitted++;
      g.correctMap[qStr] = false;
    } else if (a.status === 'multiple') {
      g.multiple++;
      g.correctMap[qStr] = false;
    } else if (a.selected === expected) {
      g.correct++;
      g.correctMap[qStr] = true;
    } else {
      g.incorrect++;
      g.correctMap[qStr] = false;
    }
  }

  g.score = g.correct;
  g.percentage = Math.round((g.score / total) * 100);
  g.isFinal = g.pending === 0 && g.scoringErrors === 0;
  g.isPassing = g.score >= g.passingThreshold;
  return g;
}
