// src/ai/BlazePoseEngine.ts
// ─────────────────────────────────────────────────────────
// Two-stage BlazePose pipeline (matches Google's architecture):
//
//   Stage 1: Detector (blazepose_detector_fp16.tflite)
//     Input:  camera frame 224×224
//     Output: [1, 2254, 12] detections + [1, 2254, 1] scores
//
//   Stage 2: Landmark (blazepose_landmark_lite_fp16.tflite)
//     Input:  cropped ROI 256×256
//     Output: Identity   [1, 195]  = 39 landmarks × 5 (x,y,z,vis,presence)
//             Identity_1  [1, 1]    = pose flag
//             Identity_2  [1,256,256,1] = heatmap
//             Identity_3  [1,64,64,39]  = segmentation
//             Identity_4  [1, 117]  = world landmarks × 3 (x,y,z)
//
// Stay FP16 — no INT8 quantization to preserve landmark precision.
// ─────────────────────────────────────────────────────────

import { type PoseLandmark, type Detection, type LandmarkResult, type DetectionResult, LM, LANDMARK_COUNT, STRIDE } from './PoseTypes';

// ── Model input sizes ──
const DETECTOR_SIZE = 224;
const LANDMARK_SIZE = 256;

// ── Detection parsing ──
// BlazePose detector outputs: [1, 2254, 12] where each anchor has
// [ymin, xmin, ymax, xmax, score, kp0_x, kp0_y, kp1_x, kp1_y, kp2_x, kp2_y, kp3_x, kp4_y]
const DETECTOR_SCORE_THRESHOLD = 0.5;
const DETECTOR_TOP_K = 1;

export function parseDetections(output: Float32Array): Detection[] {
  const results: Detection[] = [];

  // Runtime assertion: detector output must be 2254 anchors × 12 floats = 27048.
  // Skip for empty/zero-length input (graceful no-op).
  // If non-empty and mismatched: model file was swapped or wrong tensor was extracted.
  if (output.length > 0 && output.length !== 2254 * 12) {
    throw new Error(
      `[parseDetections] Buffer length mismatch: got ${output.length}, expected ${2254 * 12} (2254 anchors × 12 floats). ` +
      `Check that the model file is blazepose_detector_fp16.tflite and you are reading output index 0 (Identity).`
    );
  }
  const numAnchors = output.length / 12;
  if (numAnchors < 1) return results;

  for (let i = 0; i < numAnchors; i++) {
    const off = i * 12;
    const score = output[off + 4];
    if (score < DETECTOR_SCORE_THRESHOLD) continue;

    const ymin = output[off];
    const xmin = output[off + 1];
    const ymax = output[off + 2];
    const xmax = output[off + 3];

    const w = Math.max(0, xmax - xmin);
    const h = Math.max(0, ymax - ymin);

    if (w <= 0 || h <= 0) continue;

    results.push({ bbox: { x: xmin, y: ymin, w, h }, score: Math.min(1, score) });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, DETECTOR_TOP_K);
}

// ── Landmark output parsing ──
// Output tensor shape: [1, 195] = 39 landmarks × 5 floats (x, y, z, visibility, presence)
// Stride is 5, NOT 4 — the 5th value is a presence flag that was being misread as x of next landmark.
export function parseLandmarks(
  rawLandmarks: Float32Array,
  frameW: number,
  frameH: number,
  cropX: number,
  cropY: number,
  cropW: number,
  cropH: number,
): PoseLandmark[] {
  // Runtime assertion: landmark output must be LANDMARK_COUNT * STRIDE floats.
  // Actual model (blazepose_landmark_lite_fp16) Identity output is [1, 195] = 39 * 5.
  const EXPECTED_LM_OUTPUT_LENGTH = LANDMARK_COUNT * STRIDE; // 195
  if (rawLandmarks.length !== EXPECTED_LM_OUTPUT_LENGTH) {
    throw new Error(
      `[parseLandmarks] Buffer length mismatch: got ${rawLandmarks.length}, expected ${EXPECTED_LM_OUTPUT_LENGTH} ` +
      `(${LANDMARK_COUNT} landmarks * ${STRIDE} floats = x, y, z, visibility, presence). ` +
      `Check that the model file is blazepose_landmark_lite_fp16.tflite and you are reading output index 0 (Identity).`
    );
  }

  const landmarks: PoseLandmark[] = [];

  for (let i = 0; i < LANDMARK_COUNT; i++) {
    const o = i * STRIDE;  // STRIDE = 5: x, y, z, visibility, presence
    const xNorm = rawLandmarks[o];
    const yNorm = rawLandmarks[o + 1];
    landmarks.push({
      x: cropX + xNorm * cropW,
      y: cropY + yNorm * cropH,
      z: rawLandmarks[o + 2],
      visibility: Math.max(0, Math.min(1, rawLandmarks[o + 3])),
      presence: Math.max(0, Math.min(1, rawLandmarks[o + 4])),
    });
  }

  return landmarks;
}

/** Parse world landmarks output (Identity_4). Shape: [1, 117] = 39 × 3 (x, y, z). */
export function parseWorldLandmarks(raw: Float32Array): PoseLandmark[] | null {
  if (!raw || raw.length < LANDMARK_COUNT * 3) return null;
  // Runtime assertion: world landmarks must be exactly LANDMARK_COUNT * 3 = 117
  // if non-empty. Skip for zero-length (graceful null return).
  if (raw.length > 0 && raw.length !== LANDMARK_COUNT * 3) {
    throw new Error(
      `[parseWorldLandmarks] Buffer length mismatch: got ${raw.length}, expected ${LANDMARK_COUNT * 3} ` +
      `(${LANDMARK_COUNT} world landmarks * 3 floats). ` +
      `Check that the model file is blazepose_landmark_lite_fp16.tflite and you are reading output index 4 (Identity_4).`
    );
  }
  const wl: PoseLandmark[] = [];
  for (let i = 0; i < LANDMARK_COUNT; i++) {
    const o = i * 3;
    wl.push({ x: raw[o], y: raw[o + 1], z: raw[o + 2], visibility: 1, presence: 1 });
  }
  return wl;
}
