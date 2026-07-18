// src/ai/PoseTypes.ts
// ─────────────────────────────────────────────────────────
// Shared types — 39-landmark BlazePose GHUM (not 33).
// ─────────────────────────────────────────────────────────

/** Single BlazePose GHUM landmark (39 total). */
export interface PoseLandmark {
  x: number;       // pixel X in frame coords
  y: number;       // pixel Y in frame coords
  z: number;       // relative depth (smaller = closer)
  visibility: number; // 0–1 confidence
}

export interface Detection {
  /** Normalised [0,1] bounding box in frame coords. */
  bbox: { x: number; y: number; w: number; h: number };
  score: number; // 0–1 detector confidence
}

export interface DetectionResult {
  detections: Detection[];
  inferenceMs: number;
}

export interface LandmarkResult {
  landmarks: PoseLandmark[]; // 39 GHUM landmarks
  worldLandmarks: PoseLandmark[] | null;
  poseFlag: number;  // 0–1: probability a person is present
  inferenceMs: number;
}

export interface HeightResult {
  heightCm: number | null;
  rawCm: number | null;
  confidence: number; // 0–1
  warnings: string[];
}

export interface TiltState {
  pitchDeg: number;
  rollDeg: number;
  isUpright: boolean;
}

export interface MeasureState {
  canMeasure: boolean;
  statusMessage: string;
  tiltOk: boolean;
  landmarksVisible: boolean;
  childInBox: boolean;
  estimatedHeightCm: number | null;
  confidence: number;
}

// ── 39-LANDMARK INDICES (BlazePose GHUM) ──
export const LM = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,  LEFT_EYE: 2,  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4, RIGHT_EYE: 5, RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,        RIGHT_EAR: 8,
  MOUTH_LEFT: 9,      MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,     RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,     RIGHT_WRIST: 16,
  LEFT_PINKY: 17,     RIGHT_PINKY: 18,
  LEFT_INDEX: 19,     RIGHT_INDEX: 20,
  LEFT_THUMB: 21,     RIGHT_THUMB: 22,
  LEFT_HIP: 23,       RIGHT_HIP: 24,
  LEFT_KNEE: 25,      RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,     RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,      RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31, RIGHT_FOOT_INDEX: 32,
  // GHUM adds 6 more (indices 33-38)
  // These are auxiliary face/body landmarks not in the standard 33
  AUX0: 33, AUX1: 34, AUX2: 35, AUX3: 36, AUX4: 37, AUX5: 38,
} as const;

export const LANDMARK_COUNT = 39;
export const TENSOR_SIZE = LANDMARK_COUNT * 4; // 156 floats for landmarks
export const REQUIRED_LANDMARKS: readonly number[] = [LM.NOSE, LM.LEFT_ANKLE, LM.RIGHT_ANKLE];

// ── EMA smoothing config ──
export const EMA_ALPHA = 0.35; // smoothing factor (0 = no update, 1 = raw)
