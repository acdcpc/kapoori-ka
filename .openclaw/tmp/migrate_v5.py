import re

with open('src/screens/HeightMeasureScreen.tsx') as f:
    content = f.read()

# ============================================================
# CHANGE 1: Imports
# ============================================================
old_imports = """import {
  useCameraDevice, useCameraPermission, useFrameProcessor,
  Camera, runAtTargetFps,
} from 'react-native-vision-camera';

import { Asset } from 'expo-asset';
import { useResizePlugin } from 'vision-camera-resize-plugin';
import { Worklets } from 'react-native-worklets-core';"""

new_imports = """import {
  useCameraDevice, useCameraPermission, useFrameOutput,
  Camera,
} from 'react-native-vision-camera';

import { Asset } from 'expo-asset';
import { useResizer } from 'react-native-vision-camera-resizer';
import { runOnJS } from 'react-native-worklets';"""

content = content.replace(old_imports, new_imports)
print("CHANGE 1: Imports updated")

# ============================================================
# CHANGE 2: Resize plugin → useResizer
# ============================================================
old_resize_init = """  // ── Resize plugin ──
  const [resizeReady, setResizeReady] = useState(false);
  const resizeRef = useRef<ReturnType<typeof useResizePlugin> | null>(null);
  useEffect(() => {
    if (!modelsReady) return;
    try {
      const plugin = require('vision-camera-resize-plugin');
      resizeRef.current = plugin.createResizePlugin();
      setResizeReady(true);
      console.log('[HEIGHT] ✅ Resize plugin initialised');
    } catch (e: any) {
      console.error('[HEIGHT] ❌ Resize plugin failed:', e?.message);
    }
  }, [modelsReady]);
  const resize = resizeRef.current;"""

new_resize_init = """  // ── Resizer (V5) ──
  // Detector: full frame → 224×224 RGB float32
  const detectorResizer = useResizer({
    width: 224, height: 224,
    channelOrder: 'rgb',
    dataType: 'float32',
    pixelLayout: 'planar',
  });"""

content = content.replace(old_resize_init, new_resize_init)
print("CHANGE 2: Resize plugin → useResizer")

# ============================================================
# CHANGE 3: createRunOnJS → runOnJS
# ============================================================
old_runonjs = """  // ── createRunOnJS bindings: stable worklet→JS callbacks ──
  // Using react-native-worklets-core's documented API instead of the
  // undocumented `runOnJS` global (which Metro incorrectly resolves at
  // module scope, causing "ReferenceError: Property 'runOnJS' doesn't exist").
  // Both setDiag (a useState setter) and onResult (now built with an empty
  // dependency array, see above) have stable identities across renders, so
  // this useMemo genuinely only runs once per mount — it will NOT churn
  // every time tilt/language change, which is what previously caused the
  // frame processor to freeze on a stale callback.
  const runOnJSImpl = useMemo(() => {
    return {
      setDiagJS: Worklets.createRunOnJS(setDiag),
      onResultJS: Worklets.createRunOnJS(onResult),
    };
  }, [setDiag, onResult]);"""

new_runonjs = """  // ── runOnJS bindings: stable worklet→JS callbacks (V5) ──
  const runOnJSImpl = useMemo(() => {
    return {
      setDiagJS: runOnJS(setDiag),
      onResultJS: runOnJS(onResult),
    };
  }, [setDiag, onResult]);"""

content = content.replace(old_runonjs, new_runonjs)
print("CHANGE 3: Worklets.createRunOnJS → runOnJS")

# ============================================================
# CHANGE 4: runDetectorJS — still uses Worklets.createRunOnJS internally
# Wait — in V5, runOnJS is the replacement. But the old code uses 
# Worklets.createRunOnJS to create a STABLE callback ref. 
# In V5, runOnJS(fn) also returns a stable workletized function.
# Let me update the runDetectorJS and runLandmarkJS creation.
# ============================================================
old_det = "Worklets.createRunOnJS((detBuf: ArrayBuffer, fw: number, fh: number) => {"
new_det = "runOnJS((detBuf: ArrayBuffer, fullBuf: ArrayBuffer, fw: number, fh: number) => {"
content = content.replace(old_det, new_det)

# Also need to add manual crop+resize for landmark stage
# inside runDetectorJS after setting _gCropRes
# The old code doesn't extract landmark input — it relies on the V4 resize plugin's per-call crop.
# In V5, we need to extract the crop from the full frame buffer and resize to 256×256.

# Let me find the section where _gCropRes is set and add the landmark extraction
# First, update runDetectorJS to also receive fullBuf and do landmark preprocessing

old_det_end = """;\n      } catch { _gCropRes = null; }\n    }),\n    [] // stable: only accesses module-level vars\n  );"""

# We need to add landmark crop+resize logic inside runDetectorJS
# since we now have the full frame buffer
new_det_inner = """        // After detection, extract landmark crop from full frame
        if (_gCropRes) {
          var cx = _gCropRes.cx, cy = _gCropRes.cy, cw = _gCropRes.cw, ch = _gCropRes.ch;
          var origW = fw, origH = fh;
          _glmCropBuf = _extractCropResize(fullBuf, origW, origH, cx, cy, cw, ch, 256, 256);
        } else {
          _glmCropBuf = null;
        }
      } catch { _gCropRes = null; _glmCropBuf = null; }
    }),
    [] // stable: only accesses module-level vars
  );"""

# Wait, this is getting complex. Let me take a different approach.
# Instead of embedding the crop logic inline, I'll:
# 1. Add a helper _extractCropResize at module scope
# 2. Have runDetectorJS set _glmCropBuf as a module-scope var
# 3. Have runLandmarkJS pick up _glmCropBuf instead of receiving a buffer

# Let me find the module-level vars and add _glmCropBuf
old_vars = "var _gCropRes: any = null;"
new_vars = "var _gCropRes: any = null;\nvar _glmCropBuf: ArrayBuffer | null = null;"
content = content.replace(old_vars, new_vars)
print("CHANGE 4a: Added _glmCropBuf module var")

# Find the _toOrientation helper and add crop+resize helper after it
old_to_orient = """function _toOrientation(orient: string): number {
  if (orient === 'portrait' || orient === 'portraitUpsideDown') return 90;
  return 0;
}"""

# Add the manual crop+resize helper
crop_resize_helper = """
// V5: Manual crop + bilinear resize from RGB float32 buffer
// (V5 resizer lacks per-call crop; we do it in JS for landmark stage)
function _extractCropResize(
  buf: ArrayBuffer, srcW: number, srcH: number,
  cx: number, cy: number, cw: number, ch: number,
  outW: number, outH: number
): ArrayBuffer {
  var src = new Float32Array(buf);
  var out = new Float32Array(outW * outH * 3);
  var scaleX = cw / outW;
  var scaleY = ch / outH;
  for (var y = 0; y < outH; y++) {
    for (var x = 0; x < outW; x++) {
      var sx = cx + x * scaleX;
      var sy = cy + y * scaleY;
      var sx0 = Math.floor(sx), sy0 = Math.floor(sy);
      var sx1 = Math.min(sx0 + 1, srcW - 1), sy1 = Math.min(sy0 + 1, srcH - 1);
      var fx = sx - sx0, fy = sy - sy0;
      for (var c = 0; c < 3; c++) {
        var idx = (y * outW + x) * 3 + c;
        var s00 = src[(sy0 * srcW + sx0) * 3 + c];
        var s10 = src[(sy0 * srcW + sx1) * 3 + c];
        var s01 = src[(sy1 * srcW + sx0) * 3 + c];
        var s11 = src[(sy1 * srcW + sx1) * 3 + c];
        out[idx] = s00 * (1 - fx) * (1 - fy) + s10 * fx * (1 - fy) + s01 * (1 - fx) * fy + s11 * fx * fy;
      }
    }
  }
  return out.buffer;
}"""

content = content.replace(old_to_orient, old_to_orient + '\n' + crop_resize_helper)
print("CHANGE 4b: Added _extractCropResize helper")

# Update runDetectorJS to accept fullBuf and extract landmark crop
# Find the inner body of runDetectorJS and update it
old_detector_body = """const m = _gDetModel;
      if (!m || !detBuf) return;
      try {
        const copy = new Float32Array(detBuf);
        var out = m.runSync([copy]);
        var out0 = (out && out[0]) ? out[0] : null;
        if (!out0) { _gCropRes = null; return; }
        var raw = new Float32Array(_asArrayBuffer(out0));
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
      } catch { _gCropRes = null; }"""

new_detector_body = """const m = _gDetModel;
      if (!m || !detBuf) return;
      try {
        const copy = new Float32Array(detBuf);
        var out = m.runSync([copy]);
        var out0 = (out && out[0]) ? out[0] : null;
        if (!out0) { _gCropRes = null; return; }
        var raw = new Float32Array(_asArrayBuffer(out0));
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
        // V5: Extract landmark crop from full frame buffer (manual JS crop+resize)
        if (fullBuf && _gCropRes.cw > 50 && _gCropRes.ch > 50) {
          _glmCropBuf = _extractCropResize(fullBuf, fw, fh, cx0, cy0, _gCropRes.cw, _gCropRes.ch, 256, 256);
        } else {
          _glmCropBuf = null;
        }
      } catch { _gCropRes = null; _glmCropBuf = null; }"""

content = content.replace(old_detector_body, new_detector_body)
print("CHANGE 4c: Updated runDetectorJS body")

# Update runLandmarkJS — use _glmCropBuf instead of receiving a buffer
old_landmark = """const runLandmarkJS = useMemo(
    () => Worklets.createRunOnJS((lmBuf: ArrayBuffer, fw: number, fh: number) => {
      const m = _gLmModel;
      if (!m || !lmBuf) return;
      try {
        const copy = new Float32Array(lmBuf);
        var out = m.runSync([copy]);
        var out0 = (out && out[0]) ? out[0] : null;
        if (!out0) return;
        var raw = new Float32Array(_asArrayBuffer(out0));
        var crop = _gCropRes;
        var cCx = (crop && crop.cx !== undefined) ? crop.cx : 0;
        var cCy = (crop && crop.cy !== undefined) ? crop.cy : 0;
        var cCw = (crop && crop.cw !== undefined) ? crop.cw : 1;
        var cCh = (crop && crop.ch !== undefined) ? crop.ch : 1;
        var cScore = (crop && crop.score !== undefined) ? crop.score : 0.5;
        var landmarks = parseLandmarks(raw, fw, fh, cCx, cCy, cCw, cCh);
        onResult(landmarks, cScore);
      } catch {}
    }),
    [onResult]
  );"""

new_landmark = """const runLandmarkJS = useMemo(
    () => runOnJS(() => {
      const m = _gLmModel;
      var lmBuf = _glmCropBuf;
      if (!m || !lmBuf) return;
      try {
        const copy = new Float32Array(lmBuf);
        var out = m.runSync([copy]);
        var out0 = (out && out[0]) ? out[0] : null;
        if (!out0) return;
        var raw = new Float32Array(_asArrayBuffer(out0));
        var crop = _gCropRes;
        var cCx = (crop && crop.cx !== undefined) ? crop.cx : 0;
        var cCy = (crop && crop.cy !== undefined) ? crop.cy : 0;
        var cCw = (crop && crop.cw !== undefined) ? crop.cw : 1;
        var cCh = (crop && crop.ch !== undefined) ? crop.ch : 1;
        var cScore = (crop && crop.score !== undefined) ? crop.score : 0.5;
        var landmarks = parseLandmarks(raw, 256, 256, 0, 0, 1, 1);
        onResult(landmarks, cScore);
      } catch {}
    }),
    [onResult]
  );"""

content = content.replace(old_landmark, new_landmark)
print("CHANGE 4d: Updated runLandmarkJS")

# ============================================================
# CHANGE 5: useFrameProcessor → useFrameOutput
# ============================================================
old_fp = """  // ── TWO-STAGE FRAME PROCESSOR ──
  // runOnJSImpl is included defensively: it's stable today (see above), but
  // if onResult ever gains a real dependency again in the future, this
  // ensures the frame processor gets rebuilt to match rather than silently
  // going stale a second time.
  const fp = useFrameProcessor((frame) => {
    'worklet';
    if (!resize) return;

    _frameCnt += 1;
    if (_frameCnt === 1) runOnJSImpl.setDiagJS('frame_1');
    if (_frameCnt === 30) runOnJSImpl.setDiagJS('frame_30');

    runAtTargetFps(8, () => {
      try {
        // Stage 1: Detector — resize on worklet, inference on JS thread
        var detInput = resize.resize(frame, {
          scale: { width: 224, height: 224 },
          pixelFormat: 'rgb', dataType: 'float32',
        });
        if (detInput && detInput.length) {
          var detCopy = new Float32Array(detInput);
          runDetectorJS(detCopy.buffer, frame.width, frame.height);
        }

        // Stage 2: Landmark — use crop from detector, resize on worklet, inference on JS thread
        var crop = _gCropRes;
        if (!crop || crop.cw < 50 || crop.ch < 50) return;

        var rotation = _toOrientation(String(frame.orientation || ''));

        var lmInput = resize.resize(frame, {
          crop: { x: Math.round(crop.cx), y: Math.round(crop.cy), width: Math.round(crop.cw), height: Math.round(crop.ch) },
          scale: { width: 256, height: 256 },
          pixelFormat: 'rgb', dataType: 'float32',
          rotation: rotation,
        });
        if (lmInput && lmInput.length) {
          var lmCopy = new Float32Array(lmInput);
          runLandmarkJS(lmCopy.buffer, frame.width, frame.height);
        }
      } catch {
        _consecutiveFails += 1;
        if (_consecutiveFails >= 40) {
          runOnJSImpl.setDiagJS('frame_error');
        }
      }
    });
  }, [resize, runOnJSImpl, runDetectorJS, runLandmarkJS]);"""

new_fp = """  // ── TWO-STAGE FRAME PROCESSOR (V5: useFrameOutput) ──
  // V5 changes:
  // - useFrameProcessor → useFrameOutput with onFrame callback
  // - runAtTargetFps → removed (FPS managed at session level)
  // - V4 resize plugin per-call crop → V5 resizer + manual JS crop
  // - Mandatory frame.dispose() and resized.dispose()
  const frameOutput = useFrameOutput({
    pixelFormat: 'rgb',
    onFrame(frame) {
      'worklet';

      _frameCnt += 1;
      if (_frameCnt === 1) runOnJSImpl.setDiagJS('frame_1');
      if (_frameCnt === 30) runOnJSImpl.setDiagJS('frame_30');

      // Throttle to ~8 FPS
      if (_frameCnt % 4 !== 0) { frame.dispose(); return; }

      try {
        // Stage 1: Detector — GPU resize to 224×224 RGB, dispatch to JS thread
        if (detectorResizer.state === 'ready' && detectorResizer.resizer) {
          var detResized = detectorResizer.resizer.resize(frame);
          var detBuf = detResized.getPixelBuffer();
          var fullBuf = frame.getPixelBuffer();
          var fw = frame.width, fh = frame.height;
          runDetectorJS(detBuf, fullBuf, fw, fh);
          detResized.dispose();
        }

        // Stage 2: Landmark — run on JS thread with pre-extracted crop buffer
        runLandmarkJS();
      } catch {
        _consecutiveFails += 1;
        if (_consecutiveFails >= 40) {
          runOnJSImpl.setDiagJS('frame_error');
        }
      }

      // MANDATORY in V5: dispose the frame
      frame.dispose();
    },
  });"""

content = content.replace(old_fp, new_fp)
print("CHANGE 5: useFrameProcessor → useFrameOutput")

# ============================================================
# CHANGE 6: Camera component — frameProcessor → frameOutput
# ============================================================
content = content.replace(
    "frameProcessor={modelsReady ? fp : undefined}",
    "frameOutput={frameOutput}"
)

# Also update the diag display references
content = content.replace(
    "const resizeReadyRef = resizeReady;",
    "const resizeReadyRef = detectorResizer.state === 'ready';"
)

# Replace other resize references
content = content.replace(
    "const resize = resizeRef.current;",
    "// resize handled by detectorResizer hook"
)

print("CHANGE 6: Camera props updated")

with open('src/screens/HeightMeasureScreen.tsx', 'w') as f:
    f.write(content)

print("\n=== ALL CHANGES APPLIED ===")
