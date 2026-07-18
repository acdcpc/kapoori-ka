// src/ai/BlazePoseEngine.ts
// ─────────────────────────────────────────────────────────
// Responsible for:
//   - Loading the BlazePose Lite int8 TFLite model
//   - Preprocessing camera frames → 192×192 RGB tensor
//   - Running inference
//   - Parsing raw output → PoseLandmark[]
//
// ZERO UI code. Pure AI engine.
// ─────────────────────────────────────────────────────────

import { type PoseLandmark, type DetectionResult, LM, LANDMARK_COUNT, TENSOR_SIZE } from './PoseTypes';

// ── Types ──
export type EngineStatus = 'idle' | 'loading' | 'loaded' | 'error';

export interface EngineState {
  status: EngineStatus;
  error?: string;
}

// ── Constants ──
const MODEL_INPUT_SIZE = 192;         // BlazePose Lite expects 192×192
const MIN_VISIBILITY = 0.7;           // discard landmarks below this

// Dynamic imports to keep the module tree-clean on web
let tfliteModule: any = null;
let resizePlugin: any = null;

async function ensureTFLite() {
  if (!tfliteModule) {
    tfliteModule = require('react-native-fast-tflite');
  }
  return tfliteModule;
}

async function ensureResize() {
  if (!resizePlugin) {
    resizePlugin = require('vision-camera-resize-plugin');
  }
  return resizePlugin;
}

/**
 * Singleton engine instance.
 * Load once; reuse across frames.
 */
let _model: any = null;
let _inputTensor: any = null;

/**
 * Load the int8 TFLite model.
 * Call once on mount.
 */
export async function loadModel(): Promise<EngineState> {
  try {
    if (_model) return { status: 'loaded' };

    const { useTensorflowModel } = await ensureTFLite();
    const model = useTensorflowModel(
      require('../../assets/models/blazepose_lite_int8.tflite'),
    );

    // Model hook is React-based — we need to handle the non-React case
    if (typeof model === 'object' && 'state' in model) {
      // This is inside a React hook context; poll for loaded
      return new Promise((resolve) => {
        const check = () => {
          if (model.state === 'loaded') {
            _model = model.model;
            resolve({ status: 'loaded' });
          } else if (model.state === 'error') {
            resolve({ status: 'error', error: 'Model failed to load' });
          } else {
            setTimeout(check, 100);
          }
        };
        check();
      });
    }

    _model = model;
    return { status: 'loaded' };
  } catch (e: any) {
    return { status: 'error', error: e?.message ?? 'Unknown model load error' };
  }
}

/**
 * Preprocess a VisionCamera frame → 192×192 float32 tensor suitable for BlazePose.
 *
 * Pipeline:
 *   raw frame → resize to 192×192 → convert to RGB32 → float32 [1,192,192,3]
 */
export function preprocessFrame(frame: any, resizePluginLib: any): any {
  // Use vision-camera-resize-plugin to get a 192×192 RGB buffer
  const resized = resizePluginLib.resize(frame, {
    width: MODEL_INPUT_SIZE,
    height: MODEL_INPUT_SIZE,
    pixelFormat: 'rgb',
    dataType: 'float32',
  });

  if (!resized || resized.length === 0) {
    throw new Error('Resize plugin returned empty buffer');
  }

  return resized;
}

/**
 * Run BlazePose inference on a preprocessed frame.
 * Returns raw float32 output tensor (132 floats = 33 landmarks × 4).
 */
export function runInference(model: any, inputTensor: any): Float32Array {
  // Fast TFLite runSync — the model outputs a flat float32 array
  const outputs = model.runSync([inputTensor]);
  if (!outputs || outputs.length === 0) {
    throw new Error('Model returned no outputs');
  }
  const raw = Array.isArray(outputs[0]) ? outputs[0] : outputs;
  if (raw instanceof Float32Array) return raw;
  // fallback: convert typed array
  return new Float32Array(raw as ArrayLike<number>);
}

/**
 * Parse raw TFLite output into PoseLandmark[].
 *
 * BlazePose Lite output tensor: [33 landmarks × 4 values]
 * Each quad: [x_norm, y_norm, z, visibility]
 *   - x_norm, y_norm are normalized 0..1 (relative to 192×192 input)
 *   - z is a relative depth proxy
 *   - visibility is a sigmoid score 0..1
 *
 * We denormalize to pixel space (frameWidth × frameHeight).
 */
export function parseLandmarks(
  rawTensor: Float32Array,
  frameWidth: number,
  frameHeight: number,
): PoseLandmark[] {
  const landmarks: PoseLandmark[] = [];

  for (let i = 0; i < LANDMARK_COUNT; i++) {
    const off = i * 4;
    const vis = rawTensor[off + 3];

    landmarks.push({
      x: rawTensor[off] * frameWidth,
      y: rawTensor[off + 1] * frameHeight,
      z: rawTensor[off + 2],
      visibility: Math.max(0, Math.min(1, vis)),
    });
  }

  return landmarks;
}

/**
 * Full end-to-end detection on a single frame.
 * Called from the worklet frame processor.
 *
 * `preloadedResize` and `preloadedModel` must be passed from React scope
 * via useFrameProcessor dependencies.
 */
export function detectPose(
  frame: any,
  preloadedModel: any,
  preloadedResize: any,
  frameWidth: number,
  frameHeight: number,
): DetectionResult {
  const t0 = Date.now();

  try {
    // 1. Preprocess
    const tensor = preprocessFrame(frame, preloadedResize);

    // 2. Inference
    const raw = runInference(preloadedModel, tensor);

    // 3. Parse
    const landmarks = parseLandmarks(raw, frameWidth, frameHeight);

    // 4. Validate — at least one landmark must have decent visibility
    const found = landmarks.some(l => l.visibility >= MIN_VISIBILITY);

    return {
      landmarks: found ? landmarks : [],
      inferenceMs: Date.now() - t0,
      found,
    };
  } catch (e) {
    return { landmarks: [], inferenceMs: Date.now() - t0, found: false };
  }
}
