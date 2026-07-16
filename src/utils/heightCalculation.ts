// src/utils/heightCalculation.ts
// ─────────────────────────────────────────────────────────────────
// Height Calculation Engine
// Translates BlazePose landmarks + accelerometer data into
// estimated child height in centimeters.
// ─────────────────────────────────────────────────────────────────

import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────
// BLAZEPOSE LANDMARK INDICES (MediaPipe Pose)
// ─────────────────────────────────────────────────────────
export const BLAZEPOSE_LANDMARKS = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const;

// ─────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────
export interface PoseLandmark {
  x: number; // normalized 0..1 (relative to image width)
  y: number; // normalized 0..1 (relative to image height)
  z: number; // depth (relative; smaller = closer to camera)
  visibility: number; // 0..1 confidence
}

export interface TiltState {
  pitch: number;   // degrees; 0 = perfectly upright
  roll: number;    // degrees
  isUpright: boolean;
  pitchDegrees: number; // raw angle
}

export interface MeasureState {
  canMeasure: boolean;
  statusMessage: string;
  tiltOk: boolean;
  landmarksVisible: boolean;
  childInBox: boolean;
  estimatedHeightCm: number | null;
  confidence: number; // 0..1
}

// ─────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────
const TILT_TOLERANCE_DEGREES = 2;   // ±2° from vertical
const MIN_VISIBILITY = 0.75;         // landmark confidence threshold
const VIRTUAL_BOX_HEIGHT_CM = 120;   // physical height the overlay represents
const REQUIRED_LANDMARKS: readonly number[] = [
  BLAZEPOSE_LANDMARKS.NOSE,
  BLAZEPOSE_LANDMARKS.LEFT_ANKLE,
  BLAZEPOSE_LANDMARKS.RIGHT_ANKLE,
] as const;

// ─────────────────────────────────────────────────────────
// ACCELEROMETER → TILT STATE
// ─────────────────────────────────────────────────────────
/**
 * Converts raw accelerometer gravity vector to pitch angle.
 * @param x - gravity along x-axis (side-to-side tilt)
 * @param y - gravity along y-axis (up-down tilt)
 * @param z - gravity along z-axis (forward-back)
 * @returns TiltState with pitch in degrees
 */
export function calculateTilt(
  x: number,
  y: number,
  z: number,
): TiltState {
  // Pitch = angle between gravity vector and the Y-axis
  // When phone is perfectly upright: gravity is along -Y (y ≈ -9.8)
  // Pitch = atan2(sqrt(x² + z²), |y|) converted to degrees
  const pitchRad = Math.atan2(Math.sqrt(x * x + z * z), Math.abs(y));
  const pitchDeg = (pitchRad * 180) / Math.PI;

  // Roll for side-to-side tilt
  const rollRad = Math.atan2(x, z);
  const rollDeg = (rollRad * 180) / Math.PI;

  const isUpright = pitchDeg <= TILT_TOLERANCE_DEGREES
    && Math.abs(rollDeg) <= TILT_TOLERANCE_DEGREES;

  return {
    pitch: pitchDeg,
    roll: rollDeg,
    isUpright,
    pitchDegrees: pitchDeg,
  };
}

/**
 * Generates a human-readable tilt guidance message.
 */
export function getTiltMessage(
  tilt: TiltState,
  language: 'en' | 'ne' = 'en',
): string {
  if (tilt.isUpright) {
    return language === 'en' ? '✓ Phone is straight' : '✓ फोन सीधा छ';
  }

  if (tilt.pitchDegrees > 5) {
    return language === 'en'
      ? `↗ Tilt phone up (${tilt.pitchDegrees.toFixed(0)}°)`
      : `↗ फोन माथि झुकाउनुहोस् (${tilt.pitchDegrees.toFixed(0)}°)`;
  }

  if (tilt.pitchDegrees <= TILT_TOLERANCE_DEGREES + 1) {
    return language === 'en'
      ? `· Almost there... (${tilt.pitchDegrees.toFixed(1)}°)`
      : `· अलिकति मात्र... (${tilt.pitchDegrees.toFixed(1)}°)`;
  }

  return language === 'en'
    ? `↘ Tilt phone down (${tilt.pitchDegrees.toFixed(0)}°)`
    : `↘ फोन तल झुकाउनुहोस् (${tilt.pitchDegrees.toFixed(0)}°)`;
}

// ─────────────────────────────────────────────────────────
// TFLITE OUTPUT → HEIGHT IN CM
// ─────────────────────────────────────────────────────────

/**
 * Extracts relevant landmarks from raw TFLite float32 output tensor.
 * BlazePose outputs a flat array: [landmark0_x, landmark0_y, landmark0_z, landmark0_vis, landmark1_x, ...]
 * Total: 33 landmarks × 4 values = 132 floats (lite model)
 *
 * @param rawTensor - Float32Array from TFLite output tensor
 * @param imageWidth - camera frame width in pixels
 * @param imageHeight - camera frame height in pixels
 * @returns array of PoseLandmark objects
 */
export function parseLandmarks(
  rawTensor: Float32Array,
  imageWidth: number,
  imageHeight: number,
): PoseLandmark[] {
  const landmarks: PoseLandmark[] = [];
  const LANDMARK_COUNT = 33; // BlazePose lite has 33 landmarks

  for (let i = 0; i < LANDMARK_COUNT; i++) {
    const offset = i * 4;
    landmarks.push({
      x: rawTensor[offset] * imageWidth,
      y: rawTensor[offset + 1] * imageHeight,
      z: rawTensor[offset + 2],
      visibility: rawTensor[offset + 3],
    });
  }

  return landmarks;
}

/**
 * Checks if all required landmarks are visible with sufficient confidence.
 */
export function areLandmarksValid(
  landmarks: PoseLandmark[],
): { valid: boolean; missingLabels: string[] } {
  const missingLabels: string[] = [];

  for (const idx of REQUIRED_LANDMARKS) {
    if (!landmarks[idx] || landmarks[idx].visibility < MIN_VISIBILITY) {
      missingLabels.push(
        idx === 0 ? 'Nose/Head' : idx === 27 ? 'Left Ankle' : 'Right Ankle',
      );
    }
  }

  return {
    valid: missingLabels.length === 0,
    missingLabels,
  };
}

/**
 * Checks if the child's body fits within the visual bounding box.
 * Box is assumed to occupy the vertical center of the camera preview.
 *
 * @param landmarks - parsed pose landmarks
 * @param boxTopY - pixel Y of top reference line
 * @param boxBottomY - pixel Y of bottom reference line
 */
export function isChildInBox(
  landmarks: PoseLandmark[],
  boxTopY: number,
  boxBottomY: number,
): boolean {
  const nose = landmarks[BLAZEPOSE_LANDMARKS.NOSE];
  const leftAnkle = landmarks[BLAZEPOSE_LANDMARKS.LEFT_ANKLE];
  const rightAnkle = landmarks[BLAZEPOSE_LANDMARKS.RIGHT_ANKLE];

  if (!nose || (!leftAnkle && !rightAnkle)) return false;

  const ankleY = Math.max(
    leftAnkle?.y ?? 0,
    rightAnkle?.y ?? 0,
  );

  return nose.y >= boxTopY && ankleY <= boxBottomY;
}

/**
 * THE CORE: Calculates child height from landmarks using the bounding box
 * scale factor method.
 *
 * Formula:
 *   ScaleFactor = VIRTUAL_BOX_HEIGHT_CM / boxHeightPixels
 *   ChildHeight = (ankleY - noseY) × ScaleFactor
 *
 * @param landmarks - parsed landmarks
 * @param boxTopY - pixel Y of top line
 * @param boxBottomY - pixel Y of bottom line
 * @returns height in centimeters, or null if can't calculate
 */
export function calculateHeightFromLandmarks(
  landmarks: PoseLandmark[],
  boxTopY: number,
  boxBottomY: number,
): number | null {
  const nose = landmarks[BLAZEPOSE_LANDMARKS.NOSE];
  const leftAnkle = landmarks[BLAZEPOSE_LANDMARKS.LEFT_ANKLE];
  const rightAnkle = landmarks[BLAZEPOSE_LANDMARKS.RIGHT_ANKLE];

  if (!nose || (!leftAnkle && !rightAnkle)) return null;

  // Use the lower (higher Y) of the two ankles
  const ankleY = Math.max(
    leftAnkle?.y ?? 0,
    rightAnkle?.y ?? 0,
  );

  const childPixelHeight = ankleY - nose.y;
  if (childPixelHeight <= 0) return null;

  const boxPixelHeight = boxBottomY - boxTopY;
  if (boxPixelHeight <= 0) return null;

  const scaleFactor = VIRTUAL_BOX_HEIGHT_CM / boxPixelHeight;
  const heightCm = childPixelHeight * scaleFactor;

  // Sanity check: child height should be between 30cm (newborn) and 150cm
  if (heightCm < 30 || heightCm > 150) return null;

  return Math.round(heightCm * 10) / 10; // 1 decimal precision
}

/**
 * Combines all checks into a single measurement state.
 * Call this from the frame processor or React state update.
 */
export function evaluateMeasureState(
  landmarks: PoseLandmark[] | null,
  tilt: TiltState,
  boxTopY: number,
  boxBottomY: number,
  language: 'en' | 'ne' = 'en',
): MeasureState {
  // 1. Tilt check
  if (!tilt.isUpright) {
    return {
      canMeasure: false,
      statusMessage: getTiltMessage(tilt, language),
      tiltOk: false,
      landmarksVisible: false,
      childInBox: false,
      estimatedHeightCm: null,
      confidence: 0,
    };
  }

  // 2. Landmarks check
  if (!landmarks) {
    return {
      canMeasure: false,
      statusMessage: language === 'en'
        ? 'Looking for child...'
        : 'बच्चा खोज्दै...',
      tiltOk: true,
      landmarksVisible: false,
      childInBox: false,
      estimatedHeightCm: null,
      confidence: 0,
    };
  }

  const landmarkCheck = areLandmarksValid(landmarks);
  if (!landmarkCheck.valid) {
    return {
      canMeasure: false,
      statusMessage: language === 'en'
        ? `Can't see: ${landmarkCheck.missingLabels.join(', ')}`
        : `देखिएन: ${landmarkCheck.missingLabels.join(', ')}`,
      tiltOk: true,
      landmarksVisible: false,
      childInBox: false,
      estimatedHeightCm: null,
      confidence: 0,
    };
  }

  // 3. Box position check
  const inBox = isChildInBox(landmarks, boxTopY, boxBottomY);
  if (!inBox) {
    return {
      canMeasure: false,
      statusMessage: language === 'en'
        ? 'Move closer or step back'
        : 'नजिक वा टाढा जानुहोस्',
      tiltOk: true,
      landmarksVisible: true,
      childInBox: false,
      estimatedHeightCm: null,
      confidence: 0,
    };
  }

  // 4. Calculate height
  const height = calculateHeightFromLandmarks(landmarks, boxTopY, boxBottomY);
  if (height === null) {
    return {
      canMeasure: false,
      statusMessage: language === 'en'
        ? 'Hold still...'
        : 'स्थिर रहनुहोस्...',
      tiltOk: true,
      landmarksVisible: true,
      childInBox: true,
      estimatedHeightCm: null,
      confidence: 0,
    };
  }

  // 5. ALL CHECKS PASSED — ready to capture
  const avgVisibility = REQUIRED_LANDMARKS.reduce(
    (sum, idx) => sum + (landmarks[idx]?.visibility ?? 0),
    0,
  ) / REQUIRED_LANDMARKS.length;

  return {
    canMeasure: true,
    statusMessage: language === 'en'
      ? `✓ Ready — ${height} cm`
      : `✓ तयार — ${height} सेमी`,
    tiltOk: true,
    landmarksVisible: true,
    childInBox: true,
    estimatedHeightCm: height,
    confidence: avgVisibility,
  };
}
