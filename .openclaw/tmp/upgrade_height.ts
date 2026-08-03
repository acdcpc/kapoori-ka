// This script rewrites HeightMeasureScreen.tsx for V5
// Breaking changes applied:
// 1. useFrameProcessor → useFrameOutput with onFrame callback
// 2. runAtTargetFps → removed (FPS managed by camera session)
// 3. vision-camera-resize-plugin → react-native-vision-camera-resizer
// 4. useResizePlugin → useResizer
// 5. resize.resize(frame, opts) → resizer.resize(frame), getPixelBuffer(), dispose()
// 6. Worklets.createRunOnJS → runOnJS from 'react-native-worklets'
// 7. Frame disposal mandatory: frame.dispose(), resized.dispose()
// 8. Camera prop: frameProcessor → frameOutput
// 9. Import from react-native-vision-camera updated
// 10. Babel plugin updated separately

print("This file is documentation, not executable.")
print("The actual migration will be done by editing HeightMeasureScreen.tsx directly.")
