# Height Measurement via Pose Estimation — Setup Guide

## Overview
Offline, on-device child height measurement using BlazePose TFLite + accelerometer tilt calibration.
No internet, no depth sensor required. Works on low-end Android (2GB RAM+).

---

## Step 1: Install Dependencies

```bash
cd /path/to/Kapoori-ka
npx expo install react-native-vision-camera
npx expo install react-native-fast-tflite
npx expo install react-native-worklets-core
npx expo install react-native-sensors
```

---

## Step 2: Android build.gradle Changes

Add inside `android/app/build.gradle` → `defaultConfig`:
```groovy
ndk { abiFilters "armeabi-v7a", "arm64-v8a", "x86", "x86_64" }
```

Inside `android` block:
```groovy
aaptOptions { noCompress "tflite" }
```

ProGuard (`android/app/proguard-rules.pro`):
```
-keep class org.tensorflow.lite.** { *; }
-dontwarn org.tensorflow.lite.**
```

---

## Step 3: Download BlazePose Model

From Google MediaPipe (Float16, ~3.2MB):
https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task

Extract the `.tflite` and place at: `assets/models/blazepose_lite_int8.tflite`

---

## Step 4: Rebuild
```bash
npx expo prebuild --clean --platform android
eas build --platform android --profile preview
```
