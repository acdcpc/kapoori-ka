// src/screens/HeightMeasureScreen.tsx
// ─────────────────────────────────────────────────────────
// Rebuilt — UI preserved, AI pipeline rewritten to match
// the actual vision-camera-resize-plugin and react-native-fast-tflite APIs.
//
// Pipeline:
//   VisionCamera → Resize Plugin → 192×192 float32 tensor
//   → Fast TFLite → 33 landmarks → heightEstimator → UI
// ─────────────────────────────────────────────────────────

import React, { useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, Dimensions, StatusBar, Animated, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  useCameraDevice,
  useCameraPermission,
  useFrameProcessor,
  Camera,
  runAtTargetFps,
} from 'react-native-vision-camera';
// declare global worklet function (injected by VisionCamera at runtime)
declare function runOnJS<Args extends unknown[], R>(fn: (...args: Args) => R): (...args: Args) => void;
import { useTensorflowModel } from 'react-native-fast-tflite';
import { useResizePlugin } from 'vision-camera-resize-plugin';
import { Accelerometer } from 'expo-sensors';
import { LanguageContext } from '../context/LanguageContext';
import type { PoseLandmark, TiltState, MeasureState } from '../ai/PoseTypes';
import {
  estimateHeight,
  calculateTilt,
  getTiltMessage,
  getMeasureStatusMessage,
} from '../ai/heightEstimator';

// ── Layout constants ──
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BOX_HEIGHT_PX = SCREEN_HEIGHT * 0.7;
const BOX_TOP_Y = (SCREEN_HEIGHT - BOX_HEIGHT_PX) / 2;
const BOX_BOTTOM_Y = BOX_TOP_Y + BOX_HEIGHT_PX;
const BOX_WIDTH_PX = SCREEN_WIDTH * 0.85;
const BOX_LEFT_X = (SCREEN_WIDTH - BOX_WIDTH_PX) / 2;

// ── Tilt Indicator ──
function TiltIndicator({ tilt }: { tilt: TiltState }) {
  const { language } = useContext(LanguageContext);
  const bubbleOffset = Math.max(-40, Math.min(40, tilt.rollDeg * 8));
  const tiltColor = tilt.isUpright
    ? '#4CAF50'
    : Math.abs(tilt.pitchDeg) < 5
      ? '#FF9800'
      : '#F44336';
  const msg = getTiltMessage(tilt, language as 'en' | 'ne');

  return (
    <View style={styles.tiltContainer}>
      <View style={styles.tiltBar}>
        <View style={[styles.tiltBarBg, { borderColor: tiltColor }]}>
          <View
            style={[
              styles.tiltBubble,
              { backgroundColor: tiltColor, transform: [{ translateX: bubbleOffset }] },
            ]}
          />
        </View>
        <View style={styles.tiltCenterLine} />
      </View>
      <Text style={[styles.tiltText, { color: tiltColor }]}>{msg}</Text>
    </View>
  );
}

// ── Instruction Overlay ──
function InstructionOverlay({ state }: { state: MeasureState }) {
  const { language } = useContext(LanguageContext);
  const isNe = language === 'ne';
  const steps = useMemo(() => {
    const base = isNe
      ? [
          { key: 'angle', label: 'फोन सीधा', icon: '📱' },
          { key: 'frame', label: 'बच्चा बाकस भित्र', icon: '👶' },
          { key: 'still', label: 'स्थिर', icon: '⏸️' },
        ]
      : [
          { key: 'angle', label: 'Phone straight', icon: '📱' },
          { key: 'frame', label: 'Fit in box', icon: '👶' },
          { key: 'still', label: 'Hold still', icon: '⏸️' },
        ];
    return base.map((s) => ({
      ...s,
      done:
        s.key === 'angle'
          ? state.tiltOk
          : s.key === 'frame'
            ? state.childInBox
            : state.canMeasure,
    }));
  }, [state, isNe]);

  return (
    <View style={styles.instructionOverlay}>
      {steps.map((s) => (
        <View key={s.key} style={[styles.stepItem, s.done && styles.stepItemDone]}>
          <Text style={styles.stepIcon}>{s.done ? '✅' : s.icon}</Text>
          <Text style={[styles.stepLabel, s.done && styles.stepLabelDone]}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Web Placeholder ──
function WebPlaceholder() {
  const { language } = useContext(LanguageContext);
  const isNe = language === 'ne';
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.permissionGate}>
        <Ionicons name="phone-portrait-outline" size={64} color="#4CAF50" />
        <Text style={styles.permissionTitle}>
          {isNe ? 'मोबाइल उपकरण आवश्यक' : 'Mobile Device Required'}
        </Text>
        <Text style={styles.permissionDesc}>
          {isNe
            ? 'उचाइ नाप्ने सुविधा Android र iOS मा मात्र उपलब्ध छ।'
            : 'Height measurement is only available on Android and iOS.'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────
export default function HeightMeasureScreen() {
  const { language } = useContext(LanguageContext);
  const isNe = language === 'ne';

  // Web guard — render placeholder, skip VisionCamera hooks
  if (Platform.OS === 'web') return <WebPlaceholder />;

  // ── Camera ──
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');

  // ── TFLite model ──
  const modelHook = useTensorflowModel(
    require('../../assets/models/blazepose_lite_int8.tflite'),
    [],
  );
  const modelReady = modelHook.state === 'loaded';
  const actualModel = modelReady ? modelHook.model : undefined;

  // ── Resize plugin ──
  const resizePlugin = useResizePlugin();

  // ── Tilt ──
  const [tilt, setTilt] = useState<TiltState>({
    pitchDeg: 0,
    rollDeg: 0,
    isUpright: true,
  });

  useEffect(() => {
    let sub: { remove: () => void } | null = null;
    Accelerometer.isAvailableAsync().then((ok: boolean) => {
      if (!ok) return;
      Accelerometer.setUpdateInterval(100);
      sub = Accelerometer.addListener(
        ({ x, y, z }: { x: number; y: number; z: number }) => {
          setTilt(calculateTilt(x, y, z));
        },
      );
    });
    return () => sub?.remove();
  }, []);

  // ── Measure state ──
  const [measure, setMeasure] = useState<MeasureState>({
    canMeasure: false,
    statusMessage: isNe ? 'क्यामेरा सुरु गर्दै...' : 'Starting camera...',
    tiltOk: true,
    landmarksVisible: false,
    childInBox: false,
    estimatedHeightCm: null,
    confidence: 0,
  });
  const [capturedHeight, setCapturedHeight] = useState<number | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Store latest landmarks from worklet
  const landmarksRef = useRef<PoseLandmark[]>([]);

  // ── JS-side callback invoked by the worklet ──
  const onDetection = useCallback(
    (landmarks: PoseLandmark[]) => {
      landmarksRef.current = landmarks;
      const result = estimateHeight(landmarks, tilt, BOX_TOP_Y, BOX_BOTTOM_Y);
      const childInBox = result.heightCm !== null;
      const landmarksVisible = landmarks.some((l) => l.visibility >= 0.7);
      const statusMsg = getMeasureStatusMessage(result, tilt, language as 'en' | 'ne');

      setMeasure({
        canMeasure: childInBox && tilt.isUpright && result.confidence >= 0.4,
        statusMessage: statusMsg,
        tiltOk: tilt.isUpright,
        landmarksVisible,
        childInBox,
        estimatedHeightCm: result.heightCm,
        confidence: result.confidence,
      });
    },
    [tilt, language],
  );

  // Merge tilt into measure state
  useEffect(() => {
    setMeasure((prev) => {
      if (!tilt.isUpright) {
        const msg = getTiltMessage(tilt, language as 'en' | 'ne');
        return { ...prev, tiltOk: false, canMeasure: false, statusMessage: msg };
      }
      return { ...prev, tiltOk: true };
    });
  }, [tilt.isUpright]);

  // Pulse animation
  useEffect(() => {
    if (measure.canMeasure) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]),
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [measure.canMeasure]);

  // ── Frame processor ──
  const frameProcessor = useFrameProcessor(
    (frame) => {
      'worklet';
      if (!actualModel || !resizePlugin) return;

      runAtTargetFps(5, () => {
        try {
          // 1. Resize → 192×192 float32 RGB tensor
          const tensor = resizePlugin.resize(frame, {
            scale: { width: 192, height: 192 },
            pixelFormat: 'rgb',
            dataType: 'float32',
          });

          if (!tensor || tensor.length === 0) return;

          // 2. Run BlazePose inference
          const outputs = actualModel.runSync([tensor as any]);
          if (!outputs || !outputs[0]) return;

          // 3. Parse raw output → PoseLandmark[]
          const out0: any = outputs[0];
          const raw = Array.isArray(out0)
            ? new Float32Array(out0)
            : new Float32Array(out0 as unknown as ArrayBuffer);
          const landmarks: PoseLandmark[] = [];
          for (let i = 0; i < 33; i++) {
            const o = i * 4;
            landmarks.push({
              x: raw[o] * frame.width,
              y: raw[o + 1] * frame.height,
              z: raw[o + 2],
              visibility: Math.max(0, Math.min(1, raw[o + 3])),
            });
          }

          // 4. Push to JS thread
          runOnJS(onDetection)(landmarks);
        } catch {
          // Ignore per-frame errors to avoid crashing the feed
        }
      });
    },
    [actualModel, resizePlugin],
  );

  // ── Capture ──
  const handleCapture = useCallback(() => {
    if (!measure.canMeasure || !measure.estimatedHeightCm) return;
    setCapturing(true);
    setTimeout(() => {
      setCapturedHeight(measure.estimatedHeightCm);
      setCapturing(false);
      setShowGuide(false);
    }, 400);
  }, [measure.canMeasure, measure.estimatedHeightCm]);

  const handleRetake = useCallback(() => {
    setCapturedHeight(null);
    setShowGuide(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!capturedHeight) return;
    Alert.alert(
      isNe ? 'सफल' : 'Success',
      isNe
        ? `${capturedHeight} सेमी रेकर्ड गरियो!`
        : `${capturedHeight} cm recorded!`,
      [{ text: 'OK' }],
    );
  }, [capturedHeight, isNe]);

  // ── Permission gate ──
  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionGate}>
          <Ionicons name="camera-outline" size={64} color="#4CAF50" />
          <Text style={styles.permissionTitle}>
            {isNe ? 'क्यामेरा अनुमति आवश्यक' : 'Camera Permission Needed'}
          </Text>
          <Text style={styles.permissionDesc}>
            {isNe
              ? 'बच्चाको उचाइ नाप्न क्यामेरा आवश्यक छ।'
              : 'Camera access is needed to measure height.'}
          </Text>
          <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
            <Text style={styles.permissionBtnText}>
              {isNe ? 'अनुमति दिनुहोस्' : 'Grant Permission'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!device) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionGate}>
          <Ionicons name="alert-circle-outline" size={64} color="#FF9800" />
          <Text style={styles.permissionTitle}>
            {isNe ? 'क्यामेरा उपलब्ध छैन' : 'No Camera Found'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!modelReady) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionGate}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.permissionTitle}>
            {isNe ? 'AI मोडल लोड हुँदै...' : 'Loading AI model...'}
          </Text>
          <Text style={styles.permissionDesc}>
            {isNe
              ? 'पोज डिटेक्सन मोडल तयार हुँदैछ। कृपया पर्खनुहोस्।'
              : 'Preparing pose detection model. Please wait.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <View style={styles.cameraPreview}>
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={true}
          frameProcessor={frameProcessor}
          fps={30}
        />

        {/* Bounding Box */}
        <View
          style={[
            styles.boundingBox,
            {
              top: BOX_TOP_Y,
              left: BOX_LEFT_X,
              width: BOX_WIDTH_PX,
              height: BOX_HEIGHT_PX,
              borderColor:
                measure.childInBox && measure.tiltOk ? '#4CAF50' : '#FF9800',
            },
          ]}
        >
          <View style={[styles.refLine, styles.refLineTop]}>
            <Text style={styles.refLabel}>{isNe ? 'टाउको' : 'Head'}</Text>
          </View>
          <View style={[styles.refLine, styles.refLineBottom]}>
            <Text style={styles.refLabel}>{isNe ? 'खुट्टा' : 'Feet'}</Text>
          </View>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>

        <TiltIndicator tilt={tilt} />

        {showGuide && !capturedHeight && <InstructionOverlay state={measure} />}
      </View>

      {/* Bottom Controls */}
      <View style={styles.bottomBar}>
        {capturedHeight ? (
          <View style={styles.resultContainer}>
            <View style={styles.resultCard}>
              <Text style={styles.resultLabel}>
                {isNe ? 'नापिएको उचाइ' : 'Measured Height'}
              </Text>
              <Text style={styles.resultValue}>
                {capturedHeight}
                <Text style={styles.resultUnit}> cm / सेमी</Text>
              </Text>
              <Text style={styles.resultConfidence}>
                {isNe ? 'विश्वसनीयता' : 'Confidence'}:{' '}
                {Math.round(measure.confidence * 100)}%
              </Text>
            </View>
            <View style={styles.resultActions}>
              <TouchableOpacity style={styles.retakeBtn} onPress={handleRetake}>
                <Ionicons name="refresh" size={20} color="#666" />
                <Text style={styles.retakeBtnText}>
                  {isNe ? 'फेरि नाप्नुहोस्' : 'Retake'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Ionicons name="checkmark" size={24} color="#fff" />
                <Text style={styles.saveBtnText}>{isNe ? 'सेभ गर्नुहोस्' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.captureArea}>
            <Text style={styles.captureStatus}>{measure.statusMessage}</Text>
            <Animated.View
              style={[
                styles.captureBtnOuter,
                {
                  transform: [{ scale: pulseAnim }],
                  opacity: measure.canMeasure ? 1 : 0.4,
                },
              ]}
            >
              <TouchableOpacity
                style={[styles.captureBtn, !measure.canMeasure && styles.captureBtnDisabled]}
                onPress={handleCapture}
                disabled={!measure.canMeasure}
                activeOpacity={0.7}
              >
                {capturing ? (
                  <ActivityIndicator color="#fff" size="large" />
                ) : (
                  <Ionicons
                    name={measure.canMeasure ? 'camera' : 'lock-closed'}
                    size={36}
                    color={measure.canMeasure ? '#fff' : '#999'}
                  />
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  cameraPreview: { flex: 1, position: 'relative' },

  permissionGate: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: 32, backgroundColor: '#111',
  },
  permissionTitle: {
    fontSize: 20, fontWeight: '700', color: '#fff',
    marginTop: 16, textAlign: 'center',
  },
  permissionDesc: {
    fontSize: 14, color: '#999', marginTop: 8,
    textAlign: 'center', lineHeight: 20,
  },
  permissionBtn: {
    marginTop: 24, backgroundColor: '#4CAF50',
    paddingHorizontal: 32, paddingVertical: 14, borderRadius: 10,
  },
  permissionBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  boundingBox: { position: 'absolute', borderWidth: 2.5, borderRadius: 8 },
  refLine: {
    position: 'absolute', left: -60, right: -60, height: 2,
    backgroundColor: '#FF9800', flexDirection: 'row', alignItems: 'center',
  },
  refLineTop: { top: 0 },
  refLineBottom: { bottom: 0 },
  refLabel: {
    color: '#FF9800', fontSize: 10, fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 6,
    paddingVertical: 2, borderRadius: 4,
  },
  corner: {
    position: 'absolute', width: 20, height: 20,
    borderColor: 'rgba(255,255,255,0.8)', borderWidth: 2,
  },
  cornerTL: { top: -1, left: -1, borderBottomWidth: 0, borderRightWidth: 0 },
  cornerTR: { top: -1, right: -1, borderBottomWidth: 0, borderLeftWidth: 0 },
  cornerBL: { bottom: -1, left: -1, borderTopWidth: 0, borderRightWidth: 0 },
  cornerBR: { bottom: -1, right: -1, borderTopWidth: 0, borderLeftWidth: 0 },

  tiltContainer: {
    position: 'absolute', top: 60, left: 20, right: 20, alignItems: 'center',
  },
  tiltBar: { width: 200, height: 30, justifyContent: 'center', alignItems: 'center' },
  tiltBarBg: {
    width: '100%', height: 8, borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 1, justifyContent: 'center',
  },
  tiltBubble: { width: 16, height: 16, borderRadius: 8, position: 'absolute', top: -4 },
  tiltCenterLine: {
    position: 'absolute', top: 0, bottom: 0,
    width: 1, backgroundColor: 'rgba(255,255,255,0.3)',
  },
  tiltText: {
    fontSize: 13, fontWeight: '600', marginTop: 4,
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10,
    paddingVertical: 3, borderRadius: 10,
  },

  instructionOverlay: {
    position: 'absolute', bottom: 20, left: 20, right: 20,
    flexDirection: 'row', justifyContent: 'space-around',
  },
  stepItem: {
    alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
  },
  stepItemDone: { backgroundColor: 'rgba(76,175,80,0.3)' },
  stepIcon: { fontSize: 20 },
  stepLabel: { fontSize: 11, color: '#ccc', marginTop: 2, fontWeight: '600' },
  stepLabelDone: { color: '#4CAF50' },

  bottomBar: {
    backgroundColor: '#111', paddingTop: 16, paddingBottom: 32,
    paddingHorizontal: 20, alignItems: 'center',
  },
  captureArea: { alignItems: 'center' },
  captureStatus: {
    color: '#ccc', fontSize: 14, fontWeight: '600',
    marginBottom: 12, textAlign: 'center', paddingHorizontal: 20,
  },
  captureBtnOuter: {
    width: 84, height: 84, borderRadius: 42, borderWidth: 3,
    borderColor: '#4CAF50', justifyContent: 'center', alignItems: 'center',
  },
  captureBtn: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center',
  },
  captureBtnDisabled: { backgroundColor: '#333' },

  resultContainer: { width: '100%', paddingHorizontal: 10 },
  resultCard: {
    backgroundColor: '#1a1a2e', borderRadius: 14, padding: 20,
    alignItems: 'center', borderWidth: 1, borderColor: '#4CAF50',
  },
  resultLabel: {
    fontSize: 13, color: '#888', fontWeight: '600', textTransform: 'uppercase',
  },
  resultValue: { fontSize: 48, fontWeight: '800', color: '#4CAF50', marginTop: 4 },
  resultUnit: { fontSize: 18, color: '#666', fontWeight: '400' },
  resultConfidence: { fontSize: 12, color: '#666', marginTop: 8 },
  resultActions: { flexDirection: 'row', marginTop: 14, gap: 12 },
  retakeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', padding: 14, borderRadius: 10,
    backgroundColor: '#222', gap: 8,
  },
  retakeBtnText: { color: '#ccc', fontWeight: '600' },
  saveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', padding: 14, borderRadius: 10,
    backgroundColor: '#4CAF50', gap: 8,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
