// src/ai/BlazePoseEngine.ts
// ─────────────────────────────────────────────────────────
// Two-stage BlazePose pipeline (matches Google's architecture):
//
//   Stage 1: Detector (blazepose_detector_fp16.tflite)
//     Input:  camera frame 224×224
//     Output: bounding boxes + scores
//
//   Stage 2: Landmark (blazepose_landmark_lite_fp16.tflite)
//     Input:  cropped ROI 256×256
//     Output: 39 GHUM landmarks, world_landmarks, poseflag, heatmap, seg
//
// Stay FP16 — no INT8 quantization to preserve landmark precision.
// ─────────────────────────────────────────────────────────

import { type PoseLandmark, type Detection, type LandmarkResult, type DetectionResult, LM, LANDMARK_COUNT } from './PoseTypes';

// ── Model input sizes ──
const DETECTOR_SIZE = 224;
const LANDMARK_SIZE = 256;

// ── Detection parsing ──
// BlazePose detector outputs: [1, 2254, 12] where each anchor has
// [ymin, xmin, ymax, xmax, score, kp0_x, kp0_y, kp1_x, kp1_y, kp2_x, kp2_y, kp3_x, kp4_y]
const DETECTOR_SCORE_THRESHOLD = 0.5;
const DETECTOR_TOP_K = 1; // we only need the best detection

/** Parse detector output tensor → sorted Detection[]. */
export function parseDetections(output: Float32Array): Detection[] {
  const results: Detection[] = [];
  // output shape is [1, 2254, 12] flattened = 27048 floats
  const numAnchors = output.length / 12;
  if (numAnchors < 1) return results;

  for (let i = 0; i < numAnchors; i++) {
    const off = i * 12;
    const score = output[off + 4]; // sigmoid score
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

  // Sort by score desc, keep top-k
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, DETECTOR_TOP_K);
}

// ── Landmark output parsing ──
// Output tensor shape: [1, 39, 4] flattened = 156 floats
// The landmark model has multiple outputs; we need Identity (landmarks),
// Identity_1 (poseflag), Identity_4 (world_landmarks)
export function parseLandmarks(
  rawLandmarks: Float32Array,
  frameW: number,
  frameH: number,
  cropX: number,
  cropY: number,
  cropW: number,
  cropH: number,
): PoseLandmark[] {
  const landmarks: PoseLandmark[] = [];

  for (let i = 0; i < LANDMARK_COUNT; i++) {
    const o = i * 4;
    // Denormalise from crop space → frame pixel space
    const xNorm = rawLandmarks[o];
    const yNorm = rawLandmarks[o + 1];
    landmarks.push({
      x: cropX + xNorm * cropW,
      y: cropY + yNorm * cropH,
      z: rawLandmarks[o + 2],
      visibility: Math.max(0, Math.min(1, rawLandmarks[o + 3])),
    });
  }

  return landmarks;
}

/** Parse world landmarks output (Identity_4). Shape: [1, 39, 3]. */
export function parseWorldLandmarks(raw: Float32Array): PoseLandmark[] | null {
  if (!raw || raw.length < LANDMARK_COUNT * 3) return null;
  const wl: PoseLandmark[] = [];
  for (let i = 0; i < LANDMARK_COUNT; i++) {
    const o = i * 3;
    wl.push({ x: raw[o], y: raw[o + 1], z: raw[o + 2], visibility: 1 });
  }
  return wl;
}
