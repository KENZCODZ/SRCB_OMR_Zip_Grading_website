// verifyOmrEvaluation.ts
// Runs the exact browser evaluation module (src/omr/omrEvaluation.ts) against real warped
// sheets exported by omr_engine/scripts/export_live_fixtures.py.
//
//   cd omr_engine && .\.venv\Scripts\python.exe scripts\export_live_fixtures.py
//   cd Frontend   && node scripts/verifyOmrEvaluation.ts

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { OMR_TEMPLATE_COORDINATES } from '../src/data/omrCoordinates.ts';
import {
  WARPED_WIDTH,
  WARPED_HEIGHT,
  checkTemplate,
  decodeQuestions,
  gradeAnswers,
  type BinaryImage,
} from '../src/omr/omrEvaluation.ts';

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
let failures = 0;
function check(label: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`);
  if (!cond) failures++;
}

function loadGray(name: string): Uint8Array {
  const buf = readFileSync(join(FIXTURES, `${name}.gray`));
  if (buf.length !== WARPED_WIDTH * WARPED_HEIGHT) throw new Error(`${name}: bad size ${buf.length}`);
  return new Uint8Array(buf);
}

// Same binarization as the worker: Otsu, inverted (ink = 255).
function otsuBinary(gray: Uint8Array, cols = WARPED_WIDTH, rows = WARPED_HEIGHT): BinaryImage {
  const hist = new Array(256).fill(0);
  for (const v of gray) hist[v]++;
  const total = gray.length;
  let sumAll = 0;
  for (let i = 0; i < 256; i++) sumAll += i * hist[i];
  let sumB = 0, wB = 0, best = 0, thresh = 127;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += t * hist[t];
    const mB = sumB / wB, mF = (sumAll - sumB) / wF;
    const between = wB * wF * (mB - mF) ** 2;
    if (between > best) { best = between; thresh = t; }
  }
  const data = new Uint8Array(total);
  for (let i = 0; i < total; i++) data[i] = gray[i] > thresh ? 0 : 255;
  return { data, cols, rows };
}

// Pencil-fill a bubble on the grayscale sheet (dark disc at the template position).
function fillBubble(gray: Uint8Array, q: number, opt: string) {
  const b = OMR_TEMPLATE_COORDINATES.questions[String(q)]?.[opt];
  if (!b) throw new Error(`No coordinate for Q${q}${opt}`);
  const r = b.r - 2;
  for (let y = -r; y <= r; y++)
    for (let x = -r; x <= r; x++)
      if (x * x + y * y <= r * r) gray[(b.cy + y) * WARPED_WIDTH + (b.cx + x)] = 35;
}

function shift(gray: Uint8Array, dx: number, dy: number): Uint8Array {
  const out = new Uint8Array(gray.length).fill(255);
  for (let y = 0; y < WARPED_HEIGHT; y++)
    for (let x = 0; x < WARPED_WIDTH; x++) {
      const sx = x - dx, sy = y - dy;
      if (sx >= 0 && sy >= 0 && sx < WARPED_WIDTH && sy < WARPED_HEIGHT)
        out[y * WARPED_WIDTH + x] = gray[sy * WARPED_WIDTH + sx];
    }
  return out;
}

const N = 50;
const key: Record<string, string> = {};
for (let q = 1; q <= N; q++) key[String(q)] = 'ABCDE'[(q - 1) % 5];

// ── 1. Blank / single / multiple semantics on a real ZipGrade sheet ──────────────────────
console.log('\n== Blank / single / multiple semantics (real zipgrade_blank warp) ==');
const sheet = loadGray('zipgrade_blank');
fillBubble(sheet, 1, 'A');                       // single, correct (key A)
fillBubble(sheet, 2, 'C');                       // single, wrong   (key B)
fillBubble(sheet, 3, 'A'); fillBubble(sheet, 3, 'C'); // multiple
// Q4..Q50 deliberately left blank
const img = otsuBinary(sheet);
const tpl = checkTemplate(img, 'fiducials');
check('template gradable', tpl.gradable, tpl.reason ?? `fiducials ${tpl.fiducialDensities.map((d) => d.toFixed(2)).join(',')}`);
check('layout = zipgrade_50', tpl.layout === 'zipgrade_50', `edu density ${tpl.eduMarkerDensity.toFixed(2)}`);

const dec = decodeQuestions(img, OMR_TEMPLATE_COORDINATES, N);
const q = dec.questions;
check('Q1 single A', q['1'].status === 'single' && q['1'].selected === 'A', JSON.stringify(q['1'].selected));
check('Q2 single C', q['2'].status === 'single' && q['2'].selected === 'C', JSON.stringify(q['2'].selected));
check('Q3 multiple AC', q['3'].status === 'multiple' && q['3'].selected === 'AC', JSON.stringify(q['3'].selected));
check('Q4 blank', q['4'].status === 'blank' && q['4'].selected === null);
const c = dec.counters;
check('questionsRead = 50', c.questionsRead === 50, String(c.questionsRead));
check('bubbleSlotsSampled = 250', c.bubbleSlotsSampled === 250, String(c.bubbleSlotsSampled));
check('bubblesMarked = 4', c.bubblesMarked === 4, String(c.bubblesMarked));
check('answersClassified = 2 (single only)', c.answersClassified === 2, String(c.answersClassified));
check('multipleMarked = 1', c.multipleMarked === 1, String(c.multipleMarked));
check('blank = 47', c.blank === 47, String(c.blank));
check('read = single + multiple + blank', c.questionsRead === c.singleMarked + c.multipleMarked + c.blank);

const g = gradeAnswers(q, key, N, 30);
check('score = 1 (only Q1 correct)', g.score === 1, String(g.score));
check('answersGraded = 50', g.answersGraded === 50, String(g.answersGraded));
check('incorrect = 1, multiple = 1, omitted = 47', g.incorrect === 1 && g.multiple === 1 && g.omitted === 47,
  `${g.incorrect}/${g.multiple}/${g.omitted}`);
check('scoringErrors = 0, final', g.scoringErrors === 0 && g.isFinal);

// ── 2. Completely blank sheet must never produce answers ─────────────────────────────────
console.log('\n== Untouched blank sheet ==');
const blankDec = decodeQuestions(otsuBinary(loadGray('zipgrade_blank')), OMR_TEMPLATE_COORDINATES, N);
check('0 classified answers, 50 blank', blankDec.counters.answersClassified === 0 && blankDec.counters.blank === 50,
  `${blankDec.counters.answersClassified} classified / ${blankDec.counters.blank} blank`);

// ── 3. Mis-registered warp (what produced "Aligned (35%)") must be rejected ──────────────
console.log('\n== Mis-registered warp ==');
const shifted = checkTemplate(otsuBinary(shift(loadGray('zipgrade_blank'), 18, 14)), 'sheet-edge');
check('shifted sheet NOT gradable', !shifted.gradable, shifted.reason ?? '');

// ── 4. EduAssess sheet must be refused by the live (ZipGrade-only) decoder ───────────────
console.log('\n== EduAssess 6980 sheet ==');
const edu = checkTemplate(otsuBinary(loadGray('eduassess_marked')), 'fiducials');
check('geometry aligned', edu.geometryAligned);
check('layout detected as eduassess_6980', edu.layout === 'eduassess_6980', `edu density ${edu.eduMarkerDensity.toFixed(2)}`);
check('NOT gradable live', !edu.gradable, edu.reason ?? '');

// ── 5. Answer-key problems are scoring errors, not wrong answers ─────────────────────────
console.log('\n== Answer key coverage ==');
const partialKey = { ...key };
delete partialKey['10'];
partialKey['11'] = 'Z'; // invalid
const gk = gradeAnswers(q, partialKey, N);
check('scoringErrors = 2 (Q10 missing, Q11 invalid)', gk.scoringErrors === 2 && !gk.isFinal,
  gk.missingKeyQuestions.join(','));
const gp = gradeAnswers({ '1': q['1'] }, key, N);
check('unsettled questions are pending, not graded', gp.pending === 49 && gp.answersGraded === 1 && !gp.isFinal,
  `pending ${gp.pending}, graded ${gp.answersGraded}`);

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
