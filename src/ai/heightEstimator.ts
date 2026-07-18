// src/ai/heightEstimator.ts
// ─────────────────────────────────────────────────────────
// Height estimation from 39 GHUM landmarks + phone tilt.
//
// Signals combined for confidence:
//   0.25 × detector score
//   0.25 × mean landmark visibility
//   0.20 × body completeness (visible keypoints ratio)
//   0.15 × camera angle quality
//   0.15 × temporal stability (EMA-smoothed jitter)
//
// Camera distance estimated from bounding box size ratio.
// ─────────────────────────────────────────────────────────

import {
  type PoseLandmark, type TiltState, type HeightResult,
  LM, LANDMARK_COUNT, EMA_ALPHA,
} from './PoseTypes';

// ── Calibration constants ──
const TILT_TOLERANCE_DEG = 2.5;
const BOX_REAL_HEIGHT_CM = 120;  // overlay physical height
const MIN_CHILD_CM = 30;
const MAX_CHILD_CM = 150;
const MIN_VISIBILITY = 0.6;

// Camera: assume ~70° vertical FOV (typical smartphone)
const CAMERA_VFOV_RAD = (70 * Math.PI) / 180;

// ── Tilt calculation ──
export function calculateTilt(x: number, y: number, z: number): TiltState {
  const pitchRad = Math.atan2(Math.sqrt(x * x + z * z), Math.abs(y));
  const rollRad = Math.atan2(x, z);
  const pitchDeg = (pitchRad * 180) / Math.PI;
  const rollDeg = (rollRad * 180) / Math.PI;
  return {
    pitchDeg,
    rollDeg,
    isUpright: pitchDeg <= TILT_TOLERANCE_DEG && Math.abs(rollDeg) <= TILT_TOLERANCE_DEG,
  };
}

export function getTiltMessage(tilt: TiltState, lang: 'en' | 'ne' = 'en'): string {
  if (tilt.isUpright) return lang === 'en' ? '✓ Phone straight' : '✓ फोन सीधा छ';
  if (tilt.pitchDeg > 5) return lang === 'en'
    ? `↗ Tilt up (${tilt.pitchDeg.toFixed(0)}°)` : `↗ माथि झुकाउनुहोस् (${tilt.pitchDeg.toFixed(0)}°)`;
  if (tilt.pitchDeg <= 3) return lang === 'en' ? '· Almost...' : '· अलिकति...';
  return lang === 'en'
    ? `↘ Tilt down (${tilt.pitchDeg.toFixed(0)}°)` : `↘ तल झुकाउनुहोस् (${tilt.pitchDeg.toFixed(0)}°)`;
}

/**
 * Estimate camera-to-subject distance from bounding box.
 * Uses pinhole camera model.
 */
export function estimateDistance(
  bboxPixelHeight: number,
  frameHeight: number,
  realSubjectHeightCm: number = 100,
): number {
  const angularHeight = (bboxPixelHeight / frameHeight) * CAMERA_VFOV_RAD;
  if (angularHeight < 0.01) return 300;
  return realSubjectHeightCm / (2 * Math.tan(angularHeight / 2));
}

export function bodyCompleteness(landmarks: PoseLandmark[]): number {
  if (landmarks.length === 0) return 0;
  const visible = landmarks.filter(l => l.visibility >= MIN_VISIBILITY).length;
  return visible / LANDMARK_COUNT;
}

// ── Temporal stability buffer ──
const BUFFER_MAX = 16;
const OUTLIER_STD_MULT = 2.0;
let heightBuffer: number[] = [];
let emaHeight: number | null = null;
let emaJitter: number = 0;

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function stdDev(arr: number[], mean: number): number {
  if (arr.length < 2) return 0;
  const variance = arr.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

export function smoothHeight(rawCm: number): { smoothed: number; jitter: number } {
  heightBuffer.push(rawCm);
  if (heightBuffer.length > BUFFER_MAX) heightBuffer.shift();
  if (heightBuffer.length < 4) {
    return { smoothed: Math.round(rawCm * 10) / 10, jitter: 0 };
  }
  const med = median(heightBuffer);
  const sd = stdDev(heightBuffer, med);
  const filtered = heightBuffer.filter(v => Math.abs(v - med) <= OUTLIER_STD_MULT * Math.max(sd, 0.5));
  if (filtered.length === 0) {
    return { smoothed: Math.round(rawCm * 10) / 10, jitter: 0 };
  }
  const stableValue = median(filtered);
  if (emaHeight === null) {
    emaHeight = stableValue;
    emaJitter = 0;
  } else {
    const prevEma = emaHeight;
    emaHeight = EMA_ALPHA * stableValue + (1 - EMA_ALPHA) * prevEma;
    emaJitter = 0.8 * emaJitter + 0.2 * Math.abs(stableValue - prevEma);
  }
  return { smoothed: Math.round(emaHeight * 10) / 10, jitter: emaJitter };
}

export function resetSmoothing(): void {
  heightBuffer = [];
  emaHeight = null;
  emaJitter = 0;
}

// ── Measurement lock ──
let lockStableCount = 0;
const LOCK_FRAMES = 16;       // ~2s at 8 FPS
const LOCK_MIN_CONF = 0.95;
const LOCK_MAX_VAR_CM = 0.5;
let lockLastHt: number | null = null;
let _locked: { heightCm: number; confidence: number } | null = null;

export function updateLock(heightCm: number, confidence: number): {
  locked: boolean;
  measurement: { heightCm: number; confidence: number } | null;
} {
  if (_locked) return { locked: true, measurement: _locked };
  if (confidence < LOCK_MIN_CONF) {
    lockStableCount = 0; lockLastHt = null;
    return { locked: false, measurement: null };
  }
  if (lockLastHt === null) {
    lockLastHt = heightCm; lockStableCount = 1;
    return { locked: false, measurement: null };
  }
  const v = Math.abs(heightCm - lockLastHt);
  lockLastHt = heightCm;
  if (v <= LOCK_MAX_VAR_CM) {
    lockStableCount++;
    if (lockStableCount >= LOCK_FRAMES) {
      _locked = { heightCm, confidence };
      return { locked: true, measurement: _locked };
    }
  } else {
    lockStableCount = 1;
  }
  return { locked: false, measurement: null };
}

export function unlockMeasurement(): void {
  _locked = null; lockStableCount = 0; lockLastHt = null;
}

export function resetAll(): void {
  resetSmoothing();
  unlockMeasurement();
}

// ── Core height estimation ──
export function estimateHeight(
  landmarks: PoseLandmark[],
  tilt: TiltState,
  boxTopY: number,
  boxBottomY: number,
  detectorScore: number = 0.8,
  frameHeight: number = 1080,
): HeightResult {
  const warnings: string[] = [];
  if (!tilt.isUpright) {
    warnings.push('Phone is tilted – measurement may be inaccurate');
  }
  const nose = landmarks[LM.NOSE];
  const lAnkle = landmarks[LM.LEFT_ANKLE];
  const rAnkle = landmarks[LM.RIGHT_ANKLE];
  if (!nose || nose.visibility < MIN_VISIBILITY) {
    return { heightCm: null, rawCm: null, confidence: 0, warnings: ['Cannot detect head'] };
  }
  const lVis = lAnkle?.visibility ?? 0;
  const rVis = rAnkle?.visibility ?? 0;
  if (lVis < MIN_VISIBILITY && rVis < MIN_VISIBILITY) {
    return { heightCm: null, rawCm: null, confidence: 0, warnings: ['Cannot detect feet'] };
  }
  const ankleY = Math.max(lAnkle?.y ?? 0, rAnkle?.y ?? 0);
  const headY = nose.y;
  const pixelH = ankleY - headY;
  if (pixelH <= 0) {
    return { heightCm: null, rawCm: null, confidence: 0, warnings: ['Invalid pose'] };
  }
  const boxPX = boxBottomY - boxTopY;
  if (boxPX <= 0) {
    return { heightCm: null, rawCm: null, confidence: 0, warnings: ['Invalid box'] };
  }
  const scale = BOX_REAL_HEIGHT_CM / boxPX;
  const rawCm = pixelH * scale;
  if (rawCm < MIN_CHILD_CM || rawCm > MAX_CHILD_CM) {
    return {
      heightCm: null, rawCm: null, confidence: 0,
      warnings: [`Measurement (${rawCm.toFixed(1)} cm) out of range`],
    };
  }
  const { smoothed, jitter } = smoothHeight(rawCm);
  const heightCm = smoothed;
  const visScore = (nose.visibility + Math.max(lVis, rVis)) / 2;
  const completeness = bodyCompleteness(landmarks);
  const tiltScore = tilt.isUpright ? 1 : Math.max(0, 1 - tilt.pitchDeg / 10);
  const jitterScore = jitter < 2 ? 1 : Math.max(0, 1 - (jitter - 2) / 10);
  const confidence = Math.round((
    detectorScore * 0.25 +
    visScore * 0.25 +
    completeness * 0.20 +
    tiltScore * 0.15 +
    jitterScore * 0.15
  ) * 100) / 100;

  const fillRatio = pixelH / boxPX;
  if (fillRatio < 0.15) warnings.push('Too far – move closer');
  if (fillRatio > 1.05) warnings.push('Too close – step back');
  if (lVis < MIN_VISIBILITY) warnings.push('Left foot partially obscured');
  if (rVis < MIN_VISIBILITY) warnings.push('Right foot partially obscured');
  if (completeness < 0.5) warnings.push('Body partially outside frame');
  if (jitter > 5) warnings.push('Too much movement – hold still');

  return { heightCm, rawCm, confidence, warnings };
}

/** Tier label + emoji for a confidence value (0–1). */
export function qualityTier(confidence: number, lang: 'en' | 'ne' = 'en'): string {
  if (confidence >= 0.95) return lang === 'en' ? '🟢 Excellent' : '🟢 उत्कृष्ट';
  if (confidence >= 0.80) return lang === 'en' ? '🟡 Good' : '🟡 राम्रो';
  if (confidence >= 0.60) return lang === 'en' ? '🟠 Fair' : '🟠 ठीक';
  return lang === 'en' ? '🔴 Poor' : '🔴 कमजोर';
}

export function getMeasureStatusMessage(
  result: HeightResult | null,
  tilt: TiltState,
  lang: 'en' | 'ne' = 'en',
): string {
  if (!tilt.isUpright) return getTiltMessage(tilt, lang);
  if (!result || result.heightCm === null) {
    return lang === 'en' ? 'Finding child...' : 'बच्चा खोज्दै...';
  }
  if (result.warnings.length > 0) {
    const w = result.warnings[0];
    if (lang === 'ne') {
      if (w.includes('too far') || w.includes('Too far')) return 'अझ नजिक आउनुहोस्';
      if (w.includes('too close') || w.includes('Too close')) return 'अलि पछाडि जानुहोस्';
      if (w.includes('obscured')) return 'स्पष्ट देखिएन';
      if (w.includes('movement') || w.includes('hold still')) return 'स्थिर रहनुहोस्';
      return w;
    }
    return w;
  }
  return lang === 'en'
    ? `✓ Ready — ${result.heightCm} cm`
    : `✓ तयार — ${result.heightCm} सेमी`;
}
