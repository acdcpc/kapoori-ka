// src/ai/PoseTypes.ts
// ─────────────────────────────────────────────────────────
// Shared types for the BlazePose → height measurement pipeline.
// ─────────────────────────────────────────────────────────

/** Raw BlazePose landmark (single joint). */
export interface PoseLandmark {
  /** Pixel X in frame coordinates (0 = left edge). */
  x: number;
  /** Pixel Y in frame coordinates (0 = top edge). */
  y: number;
  /** Depth proxy (smaller = closer to camera). BlazePose z is relative, not metric. */
  z: number;
  /** Confidence 0–1 from the model heatmap. */
  visibility: number;
}

/** Result of one inference pass. */
export interface DetectionResult {
  /** 33 pose landmarks (or empty if no person detected). */
  landmarks: PoseLandmark[];
  /** Inference time in milliseconds. */
  inferenceMs: number;
  /** Whether the detector found a valid person. */
  found: boolean;
}

/** Phone orientation from accelerometer. */
export interface TiltState {
  pitchDeg: number;
  rollDeg: number;
  isUpright: boolean;
}

/** Height measurement readiness. */
export interface MeasureState {
  canMeasure: boolean;
  statusMessage: string;
  tiltOk: boolean;
  landmarksVisible: boolean;
  childInBox: boolean;
  estimatedHeightCm: number | null;
  confidence: number;
}

/** Final height calculation result. */
export interface HeightResult {
  heightCm: number | null;
  rawCm: number | null;
  confidence: number;
  warnings: string[];
}

// ─────────────────────────────────────────────────────────
// BLAZEPOSE LANDMARK INDICES
// ─────────────────────────────────────────────────────────
export const LM = {
  NOSE: 0, LEFT_EYE_INNER: 1, LEFT_EYE: 2, LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4, RIGHT_EYE: 5, RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7, RIGHT_EAR: 8, MOUTH_LEFT: 9, MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12, LEFT_ELBOW: 13, RIGHT_ELBOW: 14,
  LEFT_WRIST: 15, RIGHT_WRIST: 16, LEFT_PINKY: 17, RIGHT_PINKY: 18,
  LEFT_INDEX: 19, RIGHT_INDEX: 20, LEFT_THUMB: 21, RIGHT_THUMB: 22,
  LEFT_HIP: 23, RIGHT_HIP: 24, LEFT_KNEE: 25, RIGHT_KNEE: 26,
  LEFT_ANKLE: 27, RIGHT_ANKLE: 28, LEFT_HEEL: 29, RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31, RIGHT_FOOT_INDEX: 32,
} as const;

export const LANDMARK_COUNT = 33;
export const TENSOR_SIZE = 132; // 33 × 4

/** Landmarks required for measurement (nose + at least one ankle). */
export const REQUIRED_LANDMARKS: readonly number[] = [LM.NOSE, LM.LEFT_ANKLE, LM.RIGHT_ANKLE];
