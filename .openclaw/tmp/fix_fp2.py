content = open("src/screens/HeightMeasureScreen.tsx", "r").read()

old_start = "  const fp = useFrameProcessor((frame) => {"
old_end = "  }, [resize, runOnJSImpl, runDetectorJS, runLandmarkJS]);"

si = content.find(old_start)
ei = content.find(old_end) + len(old_end)

if si == -1 or ei == -1:
    print("ERROR: cannot find fp block")
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

        var rotation = frame.orientation === 'portrait' ? '0deg'
          : frame.orientation === 'landscape-left' ? '90deg'
          : frame.orientation === 'landscape-right' ? '270deg'
          : '0deg';

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

content = content[:si] + new_fp + content[ei:]
open("src/screens/HeightMeasureScreen.tsx", "w").write(content)
print("SUCCESS")
