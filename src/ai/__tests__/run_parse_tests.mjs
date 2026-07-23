// Standalone ES module test runner for parseLandmarks/parseDetections
// Run with: node --experimental-vm-modules src/ai/__tests__/run_parse_tests.mjs
// Pure logic tests — no RN, no native modules needed: both functions only use Float32Array.

// Replicate the parse functions inline (same logic as BlazePoseEngine.ts, verified identical)
const LANDMARK_COUNT = 39;
const STRIDE = 5;
const DETECTOR_SCORE_THRESHOLD = 0.5;
const DETECTOR_TOP_K = 1;

function parseDetections(output) {
  const results = [];
  const EXPECTED_DET_OUTPUT_LENGTH = 2254 * 12;
  if (output.length > 0 && output.length !== EXPECTED_DET_OUTPUT_LENGTH) {
    throw new Error(
      `[parseDetections] Buffer length mismatch: got ${output.length}, expected ${EXPECTED_DET_OUTPUT_LENGTH} (2254 anchors × 12 floats). ` +
      `Check that the model file is blazepose_detector_fp16.tflite and you are reading output index 0 (Identity).`
    );
  }
  const numAnchors = output.length / 12;
  if (numAnchors < 1) return results;
  for (let i = 0; i < numAnchors; i++) {
    const off = i * 12;
    const score = output[off + 4];
    if (score < DETECTOR_SCORE_THRESHOLD) continue;
    const xmin = output[off + 1];
    const ymin = output[off];
    const xmax = output[off + 3];
    const ymax = output[off + 2];
    const w = Math.max(0, xmax - xmin);
    const h = Math.max(0, ymax - ymin);
    if (w <= 0 || h <= 0) continue;
    results.push({ bbox: { x: xmin, y: ymin, w, h }, score: Math.min(1, score) });
  }
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, DETECTOR_TOP_K);
}

function parseLandmarks(rawLandmarks, frameW, frameH, cropX, cropY, cropW, cropH) {
  const EXPECTED_LM_OUTPUT_LENGTH = LANDMARK_COUNT * STRIDE;
  if (rawLandmarks.length !== EXPECTED_LM_OUTPUT_LENGTH) {
    throw new Error(
      `[parseLandmarks] Buffer length mismatch: got ${rawLandmarks.length}, expected ${EXPECTED_LM_OUTPUT_LENGTH} ` +
      `(${LANDMARK_COUNT} landmarks * ${STRIDE} floats = x, y, z, visibility, presence).`
    );
  }
  const landmarks = [];
  for (let i = 0; i < LANDMARK_COUNT; i++) {
    const o = i * STRIDE;
    landmarks.push({
      x: cropX + rawLandmarks[o] * cropW,
      y: cropY + rawLandmarks[o + 1] * cropH,
      z: rawLandmarks[o + 2],
      visibility: Math.max(0, Math.min(1, rawLandmarks[o + 3])),
      presence: Math.max(0, Math.min(1, rawLandmarks[o + 4])),
    });
  }
  return landmarks;
}

function parseWorldLandmarks(raw) {
  if (!raw || raw.length < LANDMARK_COUNT * 3) return null;
  const EXPECTED_WL_LENGTH = LANDMARK_COUNT * 3;
  if (raw.length > 0 && raw.length !== EXPECTED_WL_LENGTH) {
    throw new Error(
      `[parseWorldLandmarks] Buffer length mismatch: got ${raw.length}, expected ${EXPECTED_WL_LENGTH} ` +
      `(${LANDMARK_COUNT} world landmarks * 3 floats).`
    );
  }
  const wl = [];
  for (let i = 0; i < LANDMARK_COUNT; i++) {
    const o = i * 3;
    wl.push({ x: raw[o], y: raw[o + 1], z: raw[o + 2], visibility: 1, presence: 1 });
  }
  return wl;
}

// ── Test Runner ──
let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; }
  else { console.error(`FAIL: ${msg}`); failed++; }
}
function assertNear(a, b, eps, msg) {
  assert(Math.abs(a - b) < eps, `${msg}: expected ${b}, got ${a} (diff ${(a-b).toFixed(6)})`);
}

// ── parseDetections Tests ──
console.log('=== parseDetections ===');

// Test D1: empty
assert(parseDetections(new Float32Array(0)).length === 0, 'D1: empty input returns empty');

// Test D2: low scores
{
  const buf = new Float32Array(27048);
  const r = parseDetections(buf);
  assert(r.length === 0, 'D2: all zeros -> no detections');
}

// Test D3: single valid detection
{
  const buf = new Float32Array(27048);
  buf[0] = 0.1; buf[1] = 0.2; buf[2] = 0.8; buf[3] = 0.7; buf[4] = 0.85;
  const r = parseDetections(buf);
  assert(r.length === 1, 'D3: found 1 detection');
  assertNear(r[0].score, 0.85, 0.001, 'D3: score');
  assertNear(r[0].bbox.x, 0.2, 0.001, 'D3: bbox x');
  assertNear(r[0].bbox.y, 0.1, 0.001, 'D3: bbox y');
  assertNear(r[0].bbox.w, 0.5, 0.001, 'D3: bbox w');
  assertNear(r[0].bbox.h, 0.7, 0.001, 'D3: bbox h');
}

// Test D4: top-k = 1 on multiple detections
{
  const buf = new Float32Array(27048);
  // Anchor 0: score too low
  buf[4] = 0.4;
  // Anchor 1: valid bbox + highest score
  const a1 = 12;
  buf[a1] = 0.05; buf[a1+1] = 0.15; buf[a1+2] = 0.55; buf[a1+3] = 0.45; buf[a1+4] = 0.7;
  // Anchor 2: valid bbox + mid score
  const a2 = 24;
  buf[a2] = 0.20; buf[a2+1] = 0.30; buf[a2+2] = 0.60; buf[a2+3] = 0.50; buf[a2+4] = 0.6;
  const r = parseDetections(buf);
  assert(r.length === 1, 'D4: only top-1 returned');
  assertNear(r[0].score, 0.7, 0.001, 'D4: highest score is 0.7');
}

// Test D5: zero-area boxes skipped
{
  const buf = new Float32Array(27048);
  buf[0] = 0.1; buf[1] = 0.1; buf[2] = 0.1; buf[3] = 0.1; buf[4] = 0.9;
  const r = parseDetections(buf);
  assert(r.length === 0, 'D5: zero-area boxes skipped');
}

// Test D6: length mismatch throws
{
  const buf = new Float32Array(100);
  let threw = false;
  try { parseDetections(buf); } catch { threw = true; }
  assert(threw, 'D6: throws on length mismatch');
}

// Test D7: throws includes actual vs expected
{
  const buf = new Float32Array(100);
  try { parseDetections(buf); } catch (e) {
    assert(e.message.includes('got 100'), 'D7a: error includes actual (100)');
    assert(e.message.includes('expected 27048'), 'D7b: error includes expected (27048)');
  }
}

console.log(`  ${passed}/${passed+failed} passed`);

// ── parseLandmarks Tests ──
let lmPassed = 0, lmFailed = 0;
function lmAssert(c, m) { if(c) lmPassed++; else { console.error(`FAIL: ${m}`); lmFailed++; } }
console.log('\n=== parseLandmarks ===');

const FRAME_W = 1080, FRAME_H = 1920;
const CROP = { x: 100, y: 200, w: 880, h: 1200 };
const TENSOR_SIZE = LANDMARK_COUNT * STRIDE; // 195

// Test L1: landmark 0 positions
{
  const buf = new Float32Array(TENSOR_SIZE);
  buf[0] = 0.5; buf[1] = 0.3; buf[2] = -0.1; buf[3] = 0.9; buf[4] = 0.95;
  const r = parseLandmarks(buf, FRAME_W, FRAME_H, CROP.x, CROP.y, CROP.w, CROP.h);
  lmAssert(Math.abs(r[0].x - 540) < 1, 'L1a: LM0 x = 540');
  lmAssert(Math.abs(r[0].y - 560) < 1, 'L1b: LM0 y = 560');
  lmAssert(Math.abs(r[0].z + 0.1) < 0.01, 'L1c: LM0 z = -0.1');
  lmAssert(Math.abs(r[0].visibility - 0.9) < 0.01, 'L1d: LM0 vis = 0.9');
  lmAssert(Math.abs(r[0].presence - 0.95) < 0.01, 'L1e: LM0 presence = 0.95');
}

// Test L2: stride=5 verified (landmark 1 at correct offset)
{
  const buf = new Float32Array(TENSOR_SIZE);
  buf[STRIDE + 0] = 0.7; buf[STRIDE + 1] = 0.6;
  buf[STRIDE + 2] = -0.05; buf[STRIDE + 3] = 0.8; buf[STRIDE + 4] = 1.0;
  const r = parseLandmarks(buf, FRAME_W, FRAME_H, CROP.x, CROP.y, CROP.w, CROP.h);
  lmAssert(Math.abs(r[1].x - (100 + 0.7 * 880)) < 1, 'L2a: LM1 x at stride 5');
  lmAssert(Math.abs(r[1].presence - 1.0) < 0.01, 'L2b: LM1 presence');
  // LM0 should NOT be affected
  lmAssert(r[0].x === CROP.x, 'L2c: LM0.x untouched by LM1 write');
  lmAssert(r[0].y === CROP.y, 'L2d: LM0.y untouched');
}

// Test L3: count matches LANDMARK_COUNT
{
  const buf = new Float32Array(TENSOR_SIZE);
  const r = parseLandmarks(buf, FRAME_W, FRAME_H, CROP.x, CROP.y, CROP.w, CROP.h);
  lmAssert(r.length === LANDMARK_COUNT, `L3: ${LANDMARK_COUNT} landmarks returned`);
}

// Test L4: visibility clamped [0,1]
{
  const buf = new Float32Array(TENSOR_SIZE);
  buf[3] = -2.0; buf[STRIDE + 3] = 5.0;
  const r = parseLandmarks(buf, FRAME_W, FRAME_H, CROP.x, CROP.y, CROP.w, CROP.h);
  lmAssert(r[0].visibility === 0, 'L4a: negative vis → 0');
  lmAssert(r[1].visibility === 1, 'L4b: >1 vis → 1');
}

// Test L5: last landmark (AUX5, index 38) at correct offset
{
  const buf = new Float32Array(TENSOR_SIZE);
  const lastIdx = 38;
  const lastOff = lastIdx * STRIDE;
  lmAssert(lastOff === 190, `L5a: last offset = ${lastOff} (expected 190)`);
  buf[lastOff] = 0.99; buf[lastOff + 3] = 0.88; buf[lastOff + 4] = 0.77;
  const r = parseLandmarks(buf, FRAME_W, FRAME_H, CROP.x, CROP.y, CROP.w, CROP.h);
  lmAssert(Math.abs(r[lastIdx].x - (100 + 0.99 * 880)) < 1, 'L5b: AUX5 x correct');
  lmAssert(Math.abs(r[lastIdx].visibility - 0.88) < 0.01, 'L5c: AUX5 vis');
  lmAssert(Math.abs(r[lastIdx].presence - 0.77) < 0.01, 'L5d: AUX5 presence');
}

// Test L6: wrong stride (old bug) detection
{
  const buf = new Float32Array(132); // 33*4 — the old bug
  let threw = false;
  try { parseLandmarks(buf, 0, 0, 0, 0, 0, 0); } catch { threw = true; }
  lmAssert(threw, 'L6a: throws on wrong length (132)');
  try { parseLandmarks(buf, 0, 0, 0, 0, 0, 0); } catch (e) {
    lmAssert(e.message.includes('got 132'), 'L6b: error mentions actual 132');
    lmAssert(e.message.includes('expected 195'), 'L6c: error mentions expected 195');
  }
}

console.log(`  ${lmPassed}/${lmPassed+lmFailed} passed`);

// ── TENSOR_SIZE Invariant ──
let invPassed = 0, invFailed = 0;
console.log('\n=== Invariants ===');
function iAssert(c, m) { if(c) invPassed++; else { console.error(`FAIL: ${m}`); invFailed++; } }

iAssert(TENSOR_SIZE === 195, `I1: TENSOR_SIZE = ${TENSOR_SIZE} (expected 195)`);
iAssert(TENSOR_SIZE === LANDMARK_COUNT * STRIDE, `I2: ${LANDMARK_COUNT} * ${STRIDE} = ${TENSOR_SIZE}`);
iAssert(LANDMARK_COUNT === 39, `I3: LANDMARK_COUNT = ${LANDMARK_COUNT}`);
iAssert(STRIDE === 5, `I4: STRIDE = ${STRIDE}`);

console.log(`  ${invPassed}/${invPassed+invFailed} passed`);

// ── Summary ──
const total = passed + lmPassed + invPassed;
const totalFailed = failed + lmFailed + invFailed;
console.log(`\n========================================`);
console.log(`  TOTAL: ${total} passed, ${totalFailed} failed`);
console.log(`========================================`);
if (totalFailed > 0) process.exit(1);
