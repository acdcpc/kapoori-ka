// src/ai/heightEstimator.ts
// ─────────────────────────────────────────────────────────
// Pure math: takes 33 BlazePose landmarks + phone tilt + box geometry
// and outputs a final height estimate with confidence & warnings.
// ZERO UI / TFLite / camera imports.
// ─────────────────────────────────────────────────────────

import { type PoseLandmark, type TiltState, type HeightResult, LM } from './PoseTypes';

// ── Calibration constants ──
const TILT_TOLERANCE_DEG = 2.5;       // ±2.5° considered upright
const MIN_LANDMARK_VISIBILITY = 0.7;  // per-landmark confidence threshold
const BOX_REAL_HEIGHT_CM = 120;       // physical height the overlay represents
const MIN_CHILD_HEIGHT_CM = 30;       // sanity lower bound
const MAX_CHILD_HEIGHT_CM = 150;      // sanity upper bound
const FAR_TOO_FAR_RATIO = 0.15;      // child < 15% of box = probably too far

/** Tilt angle from raw accelerometer gravity values. */
export function calculateTilt(x: number, y: number, z: number): TiltState {
  const pitchRad = Math.atan2(Math.sqrt(x * x + z * z), Math.abs(y));
  const rollRad = Math.atan2(x, z);
  const pitchDeg = (pitchRad * 180) / Math.PI;
  const rollDeg = (rollRad * 180) / Math.PI;
  const isUpright = pitchDeg <= TILT_TOLERANCE_DEG && Math.abs(rollDeg) <= TILT_TOLERANCE_DEG;

  return { pitchDeg, rollDeg, isUpright };
}

/**
 * Get a human-readable tilt guidance message.
 */
export function getTiltMessage(tilt: TiltState, lang: 'en' | 'ne' = 'en'): string {
  if (tilt.isUpright) return lang === 'en' ? '✓ Phone straight' : '✓ फोन सीधा छ';
  if (tilt.pitchDeg > 5) return lang === 'en'
    ? `↗ Tilt up (${tilt.pitchDeg.toFixed(0)}°)`
    : `↗ माथि झुकाउनुहोस् (${tilt.pitchDeg.toFixed(0)}°)`;
  if (tilt.pitchDeg <= 3) return lang === 'en' ? '· Almost...' : '· अलिकति...';
  return lang === 'en'
    ? `↘ Tilt down (${tilt.pitchDeg.toFixed(0)}°)`
    : `↘ तल झुकाउनुहोस् (${tilt.pitchDeg.toFixed(0)}°)`;
}

/**
 * Core height estimation.
 *
 * Formula:
 *   scale = BOX_REAL_HEIGHT_CM / boxPixelHeight
 *   heightCm = (ankleY − noseY) × scale
 *
 * Also computes a confidence score 0–1.
 */
export function estimateHeight(
  landmarks: PoseLandmark[],
  tilt: TiltState,
  boxTopY: number,
  boxBottomY: number,
): HeightResult {
  const warnings: string[] = [];

  // ── Check tilt ──
  if (!tilt.isUpright) {
    warnings.push('Phone is tilted – measurement may be inaccurate');
  }

  // ── Check landmarks exist ──
  const nose = landmarks[LM.NOSE];
  const lAnkle = landmarks[LM.LEFT_ANKLE];
  const rAnkle = landmarks[LM.RIGHT_ANKLE];

  if (!nose) {
    return { heightCm: null, rawCm: null, confidence: 0, warnings: ['Cannot detect head'] };
  }

  const noseVis = nose.visibility;
  const lVis = lAnkle?.visibility ?? 0;
  const rVis = rAnkle?.visibility ?? 0;

  if (noseVis < MIN_LANDMARK_VISIBILITY && lVis < MIN_LANDMARK_VISIBILITY && rVis < MIN_LANDMARK_VISIBILITY) {
    return { heightCm: null, rawCm: null, confidence: 0, warnings: ['Subject not clearly visible'] };
  }

  if (noseVis < MIN_LANDMARK_VISIBILITY) warnings.push('Head partially obscured');
  if (lVis < MIN_LANDMARK_VISIBILITY && rVis < MIN_LANDMARK_VISIBILITY) {
    return { heightCm: null, rawCm: null, confidence: 0, warnings: ['Cannot detect feet'] };
  }

  if (lVis < MIN_LANDMARK_VISIBILITY) warnings.push('Left foot partially obscured');
  if (rVis < MIN_LANDMARK_VISIBILITY) warnings.push('Right foot partially obscured');

  // ── Compute pixel height ──
  const ankleY = Math.max(lAnkle?.y ?? 0, rAnkle?.y ?? 0);
  const headY = nose.y;
  const pixelHeight = ankleY - headY;

  if (pixelHeight <= 0) {
    return { heightCm: null, rawCm: null, confidence: 0, warnings: ['Invalid pose – head below feet'] };
  }

  const boxPX = boxBottomY - boxTopY;
  if (boxPX <= 0) {
    return { heightCm: null, rawCm: null, confidence: 0, warnings: ['Invalid bounding box'] };
  }

  // ── Scale & compute ──
  const scale = BOX_REAL_HEIGHT_CM / boxPX;
  const rawCm = pixelHeight * scale;

  // ── Sanity bounds ──
  if (rawCm < MIN_CHILD_HEIGHT_CM || rawCm > MAX_CHILD_HEIGHT_CM) {
    return {
      heightCm: null, rawCm: null, confidence: 0,
      warnings: [`Measurement (${rawCm.toFixed(1)} cm) outside valid range`],
    };
  }

  // ── Confidence ──
  // Weighted by: landmark visibility, tilt quality, child fill ratio
  const visScore = (noseVis + Math.max(lVis, rVis)) / 2;
  const tiltScore = tilt.isUpright ? 1 : Math.max(0, 1 - tilt.pitchDeg / 10);
  const fillRatio = pixelHeight / boxPX;
  const fillScore = fillRatio < FAR_TOO_FAR_RATIO
    ? fillRatio / FAR_TOO_FAR_RATIO
    : fillRatio > 1
      ? 1 / fillRatio
      : 1;

  const confidence = Math.round((visScore * 0.5 + tiltScore * 0.3 + fillScore * 0.2) * 100) / 100;

  // ── Warnings ──
  if (fillRatio < FAR_TOO_FAR_RATIO) warnings.push('Child too far – move closer');
  if (fillRatio > 1) warnings.push('Child exceeds box – step back');

  const heightCm = Math.round(rawCm * 10) / 10; // 1 decimal

  return { heightCm, rawCm, confidence, warnings };
}

/**
 * Convenience: build a status message suitable for the UI overlay.
 */
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
    // Quick translation for common warnings
    if (lang === 'ne') {
      if (w.includes('too far')) return 'अझ नजिक आउनुहोस्';
      if (w.includes('step back')) return 'अलि पछाडि जानुहोस्';
      if (w.includes('obscured')) return 'स्पष्ट देखिएन';
      return w;
    }
    return w;
  }
  return lang === 'en'
    ? `✓ Ready — ${result.heightCm} cm`
    : `✓ तयार — ${result.heightCm} सेमी`;
}
