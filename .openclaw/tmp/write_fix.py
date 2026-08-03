import re

filepath = "src/screens/HeightMeasureScreen.tsx"
with open(filepath, 'r') as f:
    content = f.read()

# 1. Add module-level vars after imports (before BOX constants)
box_marker = "// ── Layout ──"
module_vars = """// ── Module-level model references (worklet-safe) ──
// TFLite Nitro HybridObjects cannot be captured in worklet closures —
// rnWorklets' deep-wrap during setFrameProcessor causes SIGSEGV in
// libNitroTflite.so. Instead, store models at module scope and access
// them from runOnJS callbacks that execute on the Hermes main thread.
let _gDetModel: any = null;
let _gLmModel: any = null;
let _gCropRes: { cx: number; cy: number; cw: number; ch: number; score: number } | null = null;

"""
content = content.replace(box_marker, module_vars + box_marker)

# 2. After model loading, set module-level vars
# Find: detModelRef.current = detModel;
set_det = "detModelRef.current = detModel;"
set_det_new = "detModelRef.current = detModel; _gDetModel = detModel; // module-level ref for worklet-safe access"
content = content.replace(set_det, set_det_new)

set_lm = "lmModelRef.current = lmModel;"
set_lm_new = "lmModelRef.current = lmModel; _gLmModel = lmModel; // module-level ref for worklet-safe access"
content = content.replace(set_lm, set_lm_new)

# 3. Add runOnJS inference callbacks before the frame processor
# Insert before: "  // ── TWO-STAGE FRAME PROCESSOR ──"
fp_header = "  // ── TWO-STAGE FRAME PROCESSOR ──"
inference_callbacks = """  // ── TFLite inference callbacks (run on JS thread via createRunOnJS) ──
  // These access _gDetModel / _gLmModel (module-level) — NOT the worklet
  // closure's detModel/lmModel. This avoids rnWorklets trying to deep-wrap
  // Nitro HybridObjects, which causes SIGSEGV (see module-level comment above).
  const runDetectorJS = useMemo(
    () => Worklets.createRunOnJS((detBuf: ArrayBuffer, fw: number, fh: number) => {
      const m = _gDetModel;
      if (!m || !detBuf) return;
      try {
        const copy = new Float32Array(detBuf);
        const out = m.runSync([copy]);
        if (!out?.[0]) { _gCropRes = null; return; }
        const raw = new Float32Array(out[0] as unknown as ArrayBuffer);
        const detections = parseDetections(raw);
        if (!detections.length) { _gCropRes = null; return; }
        const best = detections[0];
        const { bbox, score } = best;
        const margin = 0.15;
        const cx0 = Math.max(0, (bbox.x - bbox.w * margin) * fw);
        const cy0 = Math.max(0, (bbox.y - bbox.h * margin) * fh);
        _gCropRes = {
          cx: cx0, cy: cy0,
          cw: Math.min(fw - cx0, bbox.w * (1 + margin * 2) * fw),
          ch: Math.min(fh - cy0, bbox.h * (1 + margin * 2) * fh),
          score,
        };
      } catch { _gCropRes = null; }
    }),
    [] // stable: only accesses module-level vars
  );

  const runLandmarkJS = useMemo(
    () => Worklets.createRunOnJS((lmBuf: ArrayBuffer, fw: number, fh: number) => {
      const m = _gLmModel;
      if (!m || !lmBuf) return;
      try {
        const copy = new Float32Array(lmBuf);
        const out = m.runSync([copy]);
        if (!out?.[0]) return;
        const raw = new Float32Array(out[0] as unknown as ArrayBuffer);
        const crop = _gCropRes;
        const landmarks = parseLandmarks(raw, fw, fh, crop?.cx ?? 0, crop?.cy ?? 0, crop?.cw ?? 1, crop?.ch ?? 1);
        onResult(landmarks, crop?.score ?? 0.5);
      } catch {}
    }),
    [onResult]
  );

"""
content = content.replace(fp_header, inference_callbacks + fp_header)

# 4. Replace the frame processor body
old_fp_start = "  const fp = useFrameProcessor((frame) => {"
old_fp_end = "  }, [detModel, lmModel, resize, runOnJSImpl]);"

fp_start_idx = content.find(old_fp_start)
fp_end_idx = content.find(old_fp_end) + len(old_fp_end)

if fp_start_idx == -1 or fp_end_idx == -1:
    print("ERROR: Could not find FP block")
    exit(1)

new_fp = """  const fp = useFrameProcessor((frame) => {
    'worklet';
    if (!resize) return;

    _frameCnt += 1;
    if (_frameCnt === 1) runOnJSImpl.setDiagJS('frame_1');
    if (_frameCnt === 30) runOnJSImpl.setDiagJS('frame_30');

    runAtTargetFps(8, () => {
      try {
        // Stage 1: Detector — resize on worklet, inference on JS thread
        const detInput = resize.resize(frame, {
          scale: { width: 224, height: 224 },
          pixelFormat: 'rgb', dataType: 'float32',
        });
        if (detInput?.length) {
          runDetectorJS(detInput.buffer as ArrayBuffer, frame.width, frame.height);
        }

        // Stage 2: Landmark — use crop from detector, resize on worklet, inference on JS thread
        const crop = _gCropRes;
        if (!crop || crop.cw < 50 || crop.ch < 50) return;

        const rotation = (frame as any).orientation === 'portrait' ? '0deg'
          : (frame as any).orientation === 'landscape-left' ? '90deg'
          : (frame as any).orientation === 'landscape-right' ? '270deg'
          : '0deg';

        const lmInput = resize.resize(frame, {
          crop: { x: Math.round(crop.cx), y: Math.round(crop.cy), width: Math.round(crop.cw), height: Math.round(crop.ch) },
          scale: { width: 256, height: 256 },
          pixelFormat: 'rgb', dataType: 'float32',
          rotation,
        });
        if (lmInput?.length) {
          runLandmarkJS(lmInput.buffer as ArrayBuffer, frame.width, frame.height);
        }
      } catch {
        _consecutiveFails += 1;
        if (_consecutiveFails >= 40) {
          runOnJSImpl.setDiagJS('frame_error');
        }
      }
    });
  }, [resize, runOnJSImpl, runDetectorJS, runLandmarkJS]);"""

content = content[:fp_start_idx] + new_fp + content[fp_end_idx:]

with open(filepath, 'w') as f:
    f.write(content)

print("SUCCESS: HeightMeasureScreen.tsx patched")
