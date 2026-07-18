// src/hooks/usePoseDetector.ts
// ─────────────────────────────────────────────────────────
// React hook wrapping BlazePoseEngine + heightEstimator.
// Handles loading state, accelerometer subscription, and
// bridging the worklet frame processor → React state.
// ─────────────────────────────────────────────────────────

import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import {
  useTensorflowModel,
  type TensorflowModel,
} from 'react-native-fast-tflite';
import { useResizePlugin } from 'vision-camera-resize-plugin';
import { LanguageContext } from '../context/LanguageContext';
import {
  type PoseLandmark,
  type TiltState,
  type MeasureState,
  type HeightResult,
  LM,
} from '../ai/PoseTypes';
import { estimateHeight, calculateTilt, getTiltMessage, getMeasureStatusMessage } from '../ai/heightEstimator';

// ── Constants ──
const INFERENCE_FPS = 5; // run TFLite at 5 fps to save battery
const ACCELEROMETER_INTERVAL_MS = 100; // 10 Hz

export interface PoseDetectorState {
  /** Whether the TFLite model is loaded and ready. */
  modelReady: boolean;
  /** Loading / error message for the model. */
  modelStatus: string;
  /** Current tilt from accelerometer. */
  tilt: TiltState;
  /** Full measure state for the UI overlay. */
  measure: MeasureState;
  /** Latest height result (null = nothing captured yet). */
  latestResult: HeightResult | null;
}

export interface PoseDetectorActions {
  /** Capture the current measurement. */
  capture: () => void;
  /** Reset after a capture. */
  retake: () => void;
}

/**
 * Main hook for pose detection + height measurement.
 *
 * Usage:
 * ```
 * const { state, actions, model, resizePlugin } = usePoseDetector(boxTopY, boxBottomY);
 * // Pass model + resizePlugin to useFrameProcessor
 * ```
 */
export function usePoseDetector(
  boxTopY: number,
  boxBottomY: number,
): {
  detector: PoseDetectorState;
  actions: PoseDetectorActions;
  /** The loaded TFLite model (pass to frame processor). */
  model: any;
  /** The resize plugin instance (pass to frame processor). */
  resizePlugin: any;
} {
  const { language } = useContext(LanguageContext);
  const isNe = language === 'ne';

  // ── Model loading ──
  let modelHook: any = null;
  try {
    modelHook = useTensorflowModel(
      require('../../assets/models/blazepose_lite_int8.tflite'),
      [],
    );
  } catch {
    modelHook = { state: 'error', error: 'TFLite not available on this platform' };
  }

  const modelReady = modelHook?.state === 'loaded';
  const model = modelReady ? modelHook.model : undefined;
  const modelStatus = modelHook?.state === 'error'
    ? (isNe ? 'AI मोडल लोड गर्न सकिएन' : 'AI model failed to load')
    : modelReady
      ? (isNe ? 'तयार' : 'Ready')
      : (isNe ? 'AI मोडल लोड हुँदै...' : 'Loading AI model...');

  // ── Resize plugin ──
  let resizePlugin: any = null;
  try {
    resizePlugin = useResizePlugin();
  } catch {
    // Web: no resize plugin available
  }

  // ── Tilt ──
  const [tilt, setTilt] = useState<TiltState>({ pitchDeg: 0, rollDeg: 0, isUpright: true });

  useEffect(() => {
    let sub: { remove: () => void } | null = null;
    Accelerometer.isAvailableAsync().then((ok) => {
      if (!ok) return;
      Accelerometer.setUpdateInterval(ACCELEROMETER_INTERVAL_MS);
      sub = Accelerometer.addListener(({ x, y, z }) => {
        setTilt(calculateTilt(x, y, z));
      });
    });
    return () => sub?.remove();
  }, []);

  // ── Measure state & height result ──
  const [measure, setMeasure] = useState<MeasureState>({
    canMeasure: false,
    statusMessage: isNe ? 'क्यामेरा सुरु गर्दै...' : 'Starting camera...',
    tiltOk: true,
    landmarksVisible: false,
    childInBox: false,
    estimatedHeightCm: null,
    confidence: 0,
  });
  const [latestResult, setLatestResult] = useState<HeightResult | null>(null);

  // Store last known landmarks from frame processor
  const latestLandmarksRef = useRef<PoseLandmark[]>([]);
  const frameWidthRef = useRef(1);
  const frameHeightRef = useRef(1);
  const lastInferenceMsRef = useRef(0);

  /**
   * Called from the worklet frame processor (via runOnJS).
   * Receives pose landmarks and updates React state.
   */
  const onDetectionResult = useCallback(
    (landmarks: PoseLandmark[], frameW: number, frameH: number, inferenceMs: number) => {
      latestLandmarksRef.current = landmarks;
      frameWidthRef.current = frameW;
      frameHeightRef.current = frameH;
      lastInferenceMsRef.current = inferenceMs;

      // Compute height estimate
      const result = estimateHeight(landmarks, tilt, boxTopY, boxBottomY);

      const childInBox = result.heightCm !== null;
      const landmarksVisible = landmarks.length > 0 && landmarks.some(l => l.visibility >= 0.7);

      setMeasure({
        canMeasure: childInBox && tilt.isUpright,
        statusMessage: getMeasureStatusMessage(result, tilt, language as 'en' | 'ne'),
        tiltOk: tilt.isUpright,
        landmarksVisible,
        childInBox,
        estimatedHeightCm: result.heightCm,
        confidence: result.confidence,
      });
    },
    [tilt, boxTopY, boxBottomY, language],
  );

  // Merge tilt into measure state whenever tilt changes
  useEffect(() => {
    setMeasure(prev => {
      if (!tilt.isUpright) {
        return {
          ...prev,
          tiltOk: false,
          canMeasure: false,
          statusMessage: getTiltMessage(tilt, language as 'en' | 'ne'),
        };
      }
      return { ...prev, tiltOk: true };
    });
  }, [tilt.isUpright]);

  // ── Actions ──
  const capture = useCallback(() => {
    if (!measure.canMeasure || measure.estimatedHeightCm === null) return;

    const result = estimateHeight(
      latestLandmarksRef.current,
      tilt,
      boxTopY,
      boxBottomY,
    );
    setLatestResult(result);
  }, [measure.canMeasure, measure.estimatedHeightCm, tilt, boxTopY, boxBottomY]);

  const retake = useCallback(() => {
    setLatestResult(null);
  }, []);

  return {
    detector: { modelReady, modelStatus, tilt, measure, latestResult },
    actions: { capture, retake },
    model,
    resizePlugin,
  };
}
