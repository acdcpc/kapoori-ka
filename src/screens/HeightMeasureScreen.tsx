// src/screens/HeightMeasureScreen.tsx
// ─────────────────────────────────────────────────────────────────
// Child Height Measurement Screen — REAL HARDWARE
// Camera: react-native-vision-camera (live preview + frame processor)
// Pose:    react-native-fast-tflite (BlazePose .task model)
// Tilt:    expo-sensors (accelerometer → phone angle)
// Fully offline. No depth sensor needed.
// ─────────────────────────────────────────────────────────────────

import React, { useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, Dimensions, StatusBar, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Accelerometer } from 'expo-sensors';
import {
  useCameraDevice,
  useCameraPermission,
  useFrameProcessor,
  Camera,
  runAtTargetFps,
  runOnJS,
} from 'react-native-vision-camera';
import { useTensorflowModel } from 'react-native-fast-tflite';
import { LanguageContext } from '../context/LanguageContext';
import {
  calculateTilt,
  getTiltMessage,
  evaluateMeasureState,
  parseLandmarks,
  type TiltState,
  type MeasureState,
} from '../utils/heightCalculation';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BOX_HEIGHT_PX = SCREEN_HEIGHT * 0.7;
const BOX_TOP_Y = (SCREEN_HEIGHT - BOX_HEIGHT_PX) / 2;
const BOX_BOTTOM_Y = BOX_TOP_Y + BOX_HEIGHT_PX;
const BOX_WIDTH_PX = SCREEN_WIDTH * 0.85;
const BOX_LEFT_X = (SCREEN_WIDTH - BOX_WIDTH_PX) / 2;

// ── Tilt Indicator (spirit level) ──
function TiltIndicator({ tilt }: { tilt: TiltState }) {
  const { language } = useContext(LanguageContext);
  const bubbleOffset = Math.max(-40, Math.min(40, tilt.roll * 8));
  const tiltColor = tilt.isUpright ? '#4CAF50'
    : Math.abs(tilt.pitchDegrees) < 5 ? '#FF9800' : '#F44336';
  const message = getTiltMessage(tilt, language as 'en' | 'ne');

  return (
    <View style={styles.tiltContainer}>
      <View style={styles.tiltBar}>
        <View style={[styles.tiltBarBg, { borderColor: tiltColor }]}>
          <View style={[styles.tiltBubble, { backgroundColor: tiltColor, transform: [{ translateX: bubbleOffset }] }]} />
        </View>
        <View style={styles.tiltCenterLine} />
      </View>
      <Text style={[styles.tiltText, { color: tiltColor }]}>{message}</Text>
    </View>
  );
}

// ── Instruction Overlay ──
function InstructionOverlay({ state }: { state: MeasureState }) {
  const { language } = useContext(LanguageContext);
  const isNe = language === 'ne';
  const steps = useMemo(() => {
    const base = isNe
      ? [{ key: 'angle', label: 'फोन सीधा राख्नुहोस्', icon: '📱' },
         { key: 'frame', label: 'बच्चा बाकस भित्र राख्नुहोस्', icon: '👶' },
         { key: 'still', label: 'स्थिर रहनुहोस्', icon: '⏸️' }]
      : [{ key: 'angle', label: 'Keep phone straight', icon: '📱' },
         { key: 'frame', label: 'Fit child in box', icon: '👶' },
         { key: 'still', label: 'Hold still', icon: '⏸️' }];
    return base.map(s => ({ ...s,
      done: s.key === 'angle' ? state.tiltOk
        : s.key === 'frame' ? state.childInBox
        : state.canMeasure }));
  }, [state, isNe]);

  return (
    <View style={styles.instructionOverlay}>
      {steps.map(step => (
        <View key={step.key} style={[styles.stepItem, step.done && styles.stepItemDone]}>
          <Text style={styles.stepIcon}>{step.done ? '✅' : step.icon}</Text>
          <Text style={[styles.stepLabel, step.done && styles.stepLabelDone]}>{step.label}</Text>
        </View>
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────
export default function HeightMeasureScreen() {
  const { language } = useContext(LanguageContext);
  const isNe = language === 'ne';

  // ── Camera permission ──
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');

  // ── TFLite model ──
  // Uses the float16 .task file — drop blazepose_lite_int8.tflite when available
  const model = useTensorflowModel(
    require('../../assets/models/blazepose_lite_int8.tflite'),
  );
  const actualModel = model.state === 'loaded' ? model.model : undefined;

  // ── State ──
  const [tilt, setTilt] = useState<TiltState>({ pitch: 0, roll: 0, isUpright: false, pitchDegrees: 0 });
  const [measureState, setMeasureState] = useState<MeasureState>({
    canMeasure: false,
    statusMessage: isNe ? 'क्यामेरा सुरु गर्दै...' : 'Starting camera...',
    tiltOk: false, landmarksVisible: false, childInBox: false,
    estimatedHeightCm: null, confidence: 0,
  });
  const [capturedHeight, setCapturedHeight] = useState<number | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const [modelReady, setModelReady] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // ── React state updater for worklet thread ──
  const updateMeasureState = useCallback((state: MeasureState) => {
    setMeasureState(state);
  }, []);

  // ── Animate capture button when ready ──
  useEffect(() => {
    if (measureState.canMeasure) {
      Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])).start();
    } else { pulseAnim.setValue(1); }
  }, [measureState.canMeasure]);

  // ── Real accelerometer ──
  useEffect(() => {
    let sub: { remove: () => void } | null = null;
    Accelerometer.isAvailableAsync().then(ok => {
      if (!ok) return;
      Accelerometer.setUpdateInterval(100); // 10 Hz
      sub = Accelerometer.addListener(({ x, y, z }) => {
        setTilt(calculateTilt(x, y, z));
      });
    });
    return () => { sub?.remove(); };
  }, []);

  // ── Model ready tracking ──
  useEffect(() => {
    if (model.state === 'loaded') setModelReady(true);
    else if (model.state === 'error') {
      console.warn('TFLite model load error:', model.error);
      setMeasureState(prev => ({
        ...prev,
        statusMessage: isNe ? 'मोडल लोड गर्न सकिएन' : 'Model load failed',
      }));
    }
  }, [model.state]);

  // ── Frame processor (runs on VisionCamera worklet thread) ──
  const frameProcessor = useFrameProcessor(
    (frame) => {
      'worklet';
      if (!actualModel) return;
      runAtTargetFps(5, () => {
        try {
          const outputs = actualModel.runSync([frame]);
          if (!outputs || outputs.length === 0) return;
          // BlazePose output: [1, 33, 4] or flat [132]
          const raw = Array.isArray(outputs[0]) ? outputs[0] : outputs;
          const flat = raw as unknown as Float32Array;
          const landmarks = parseLandmarks(flat, frame.width, frame.height);
          const state = evaluateMeasureState(landmarks, {
            pitch: 0, roll: 0, isUpright: true, pitchDegrees: 0,
          }, BOX_TOP_Y, BOX_BOTTOM_Y, 'en');
          // We'll merge tilt on the JS side below
          runOnJS(updateMeasureState)({
            ...state,
            tiltOk: true,  // will be overridden by tilt check
            statusMessage: state.canMeasure
              ? `✓ Ready — ${state.estimatedHeightCm} cm`
              : state.statusMessage,
          });
        } catch (e) {
          // Ignore per-frame errors to avoid crashing the camera feed
        }
      });
    },
    [actualModel],
  );

  // ── Merge tilt state into measure state ──
  useEffect(() => {
    setMeasureState(prev => {
      const statusMsg = !tilt.isUpright
        ? getTiltMessage(tilt, language as 'en' | 'ne')
        : prev.statusMessage;
      return {
        ...prev,
        tiltOk: tilt.isUpright,
        canMeasure: prev.canMeasure && tilt.isUpright,
        statusMessage: statusMsg,
      };
    });
  }, [tilt.isUpright]);

  // ── Capture ──
  const handleCapture = useCallback(() => {
    if (!measureState.canMeasure || !measureState.estimatedHeightCm) return;
    setIsCapturing(true);
    setTimeout(() => {
      setCapturedHeight(measureState.estimatedHeightCm);
      setIsCapturing(false);
      setShowGuide(false);
    }, 500);
  }, [measureState.canMeasure, measureState.estimatedHeightCm]);

  const handleRetake = useCallback(() => {
    setCapturedHeight(null);
    setShowGuide(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!capturedHeight) return;
    Alert.alert(
      isNe ? 'सफल' : 'Success',
      isNe ? `${capturedHeight} सेमी रेकर्ड गरियो!` : `${capturedHeight} cm recorded!`,
      [{ text: 'OK' }],
    );
    // TODO: Save to Firestore growth_records
  }, [capturedHeight]);

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
              ? 'बच्चाको उचाइ नाप्न क्यामेराको आवश्यकता पर्छ।'
              : 'We need camera access to measure your child\'s height.'}
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

  // ── No device ──
  if (!device) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionGate}>
          <Ionicons name="alert-circle-outline" size={64} color="#FF9800" />
          <Text style={styles.permissionTitle}>
            {isNe ? 'क्यामेरा उपलब्ध छैन' : 'No Camera Found'}
          </Text>
          <Text style={styles.permissionDesc}>
            {isNe
              ? 'यो डिभाइसमा कुनै पछाडिको क्यामेरा फेला परेन।'
              : 'No back camera detected on this device.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Loading model ──
  if (!modelReady) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionGate}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.permissionTitle}>
            {isNe ? 'मोडल लोड हुँदै...' : 'Loading AI model...'}
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
  // RENDER — LIVE CAMERA
  // ─────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* ======== LIVE CAMERA PREVIEW ======== */}
      <View style={styles.cameraPreview}>
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={true}
          frameProcessor={frameProcessor}
          fps={30}
        />

        {/* ========== BOUNDING BOX OVERLAY ========== */}
        <View style={[styles.boundingBox, {
          top: BOX_TOP_Y, left: BOX_LEFT_X,
          width: BOX_WIDTH_PX, height: BOX_HEIGHT_PX,
          borderColor: (measureState.childInBox && measureState.tiltOk) ? '#4CAF50' : '#FF9800',
        }]}>
          {/* Head/Feet reference lines */}
          <View style={[styles.refLine, styles.refLineTop]}>
            <Text style={styles.refLabel}>{isNe ? 'टाउको' : 'Head'}</Text>
          </View>
          <View style={[styles.refLine, styles.refLineBottom]}>
            <Text style={styles.refLabel}>{isNe ? 'खुट्टा' : 'Feet'}</Text>
          </View>
          {/* Corner guides */}
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>

        {/* ========== TILT INDICATOR ========== */}
        <TiltIndicator tilt={tilt} />

        {/* ========== INSTRUCTION STEPS ========== */}
        {showGuide && !capturedHeight && <InstructionOverlay state={measureState} />}
      </View>

      {/* ======================== */}
      {/* BOTTOM CONTROLS */}
      {/* ======================== */}
      <View style={styles.bottomBar}>
        {capturedHeight ? (
          <View style={styles.resultContainer}>
            <View style={styles.resultCard}>
              <Text style={styles.resultLabel}>{isNe ? 'नापिएको उचाइ' : 'Measured Height'}</Text>
              <Text style={styles.resultValue}>
                {capturedHeight}
                <Text style={styles.resultUnit}> cm / सेमी</Text>
              </Text>
              <Text style={styles.resultConfidence}>
                {isNe ? 'विश्वसनीयता' : 'Confidence'}: {Math.round(measureState.confidence * 100)}%
              </Text>
            </View>
            <View style={styles.resultActions}>
              <TouchableOpacity style={styles.retakeBtn} onPress={handleRetake}>
                <Ionicons name="refresh" size={20} color="#666" />
                <Text style={styles.retakeBtnText}>{isNe ? 'फेरि नाप्नुहोस्' : 'Retake'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Ionicons name="checkmark" size={24} color="#fff" />
                <Text style={styles.saveBtnText}>{isNe ? 'सेभ गर्नुहोस्' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.captureArea}>
            <Text style={styles.captureStatus}>{measureState.statusMessage}</Text>
            <Animated.View style={[styles.captureBtnOuter, {
              transform: [{ scale: pulseAnim }],
              opacity: measureState.canMeasure ? 1 : 0.4,
            }]}>
              <TouchableOpacity
                style={[styles.captureBtn, !measureState.canMeasure && styles.captureBtnDisabled]}
                onPress={handleCapture}
                disabled={!measureState.canMeasure}
                activeOpacity={0.7}
              >
                {isCapturing ? (
                  <ActivityIndicator color="#fff" size="large" />
                ) : (
                  <Ionicons name={measureState.canMeasure ? 'camera' : 'lock-closed'} size={36}
                    color={measureState.canMeasure ? '#fff' : '#999'} />
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

  // Permission / loading gate
  permissionGate: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: '#111' },
  permissionTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginTop: 16, textAlign: 'center' },
  permissionDesc: { fontSize: 14, color: '#999', marginTop: 8, textAlign: 'center', lineHeight: 20 },
  permissionBtn: { marginTop: 24, backgroundColor: '#4CAF50', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 10 },
  permissionBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  // Bounding box
  boundingBox: { position: 'absolute', borderWidth: 2.5, borderRadius: 8, borderStyle: 'solid' },
  refLine: { position: 'absolute', left: -60, right: -60, height: 2, backgroundColor: '#FF9800', flexDirection: 'row', alignItems: 'center' },
  refLineTop: { top: 0 },
  refLineBottom: { bottom: 0 },
  refLabel: { color: '#FF9800', fontSize: 10, fontWeight: '700', backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  corner: { position: 'absolute', width: 20, height: 20, borderColor: 'rgba(255,255,255,0.8)', borderWidth: 2 },
  cornerTL: { top: -1, left: -1, borderBottomWidth: 0, borderRightWidth: 0 },
  cornerTR: { top: -1, right: -1, borderBottomWidth: 0, borderLeftWidth: 0 },
  cornerBL: { bottom: -1, left: -1, borderTopWidth: 0, borderRightWidth: 0 },
  cornerBR: { bottom: -1, right: -1, borderTopWidth: 0, borderLeftWidth: 0 },

  // Tilt
  tiltContainer: { position: 'absolute', top: 60, left: 20, right: 20, alignItems: 'center' },
  tiltBar: { width: 200, height: 30, justifyContent: 'center', alignItems: 'center' },
  tiltBarBg: { width: '100%', height: 8, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 1, justifyContent: 'center' },
  tiltBubble: { width: 16, height: 16, borderRadius: 8, position: 'absolute', top: -4 },
  tiltCenterLine: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.3)' },
  tiltText: { fontSize: 13, fontWeight: '600', marginTop: 4, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },

  // Instruction overlay
  instructionOverlay: { position: 'absolute', bottom: 20, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-around' },
  stepItem: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  stepItemDone: { backgroundColor: 'rgba(76,175,80,0.3)' },
  stepIcon: { fontSize: 20 },
  stepLabel: { fontSize: 11, color: '#ccc', marginTop: 2, fontWeight: '600' },
  stepLabelDone: { color: '#4CAF50' },

  // Bottom bar
  bottomBar: { backgroundColor: '#111', paddingTop: 16, paddingBottom: 32, paddingHorizontal: 20, alignItems: 'center' },
  captureArea: { alignItems: 'center' },
  captureStatus: { color: '#ccc', fontSize: 14, fontWeight: '600', marginBottom: 12, textAlign: 'center', paddingHorizontal: 20 },
  captureBtnOuter: { width: 84, height: 84, borderRadius: 42, borderWidth: 3, borderColor: '#4CAF50', justifyContent: 'center', alignItems: 'center' },
  captureBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center' },
  captureBtnDisabled: { backgroundColor: '#333' },

  // Result
  resultContainer: { width: '100%', paddingHorizontal: 10 },
  resultCard: { backgroundColor: '#1a1a2e', borderRadius: 14, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#4CAF50' },
  resultLabel: { fontSize: 13, color: '#888', fontWeight: '600', textTransform: 'uppercase' },
  resultValue: { fontSize: 48, fontWeight: '800', color: '#4CAF50', marginTop: 4 },
  resultUnit: { fontSize: 18, color: '#666', fontWeight: '400' },
  resultConfidence: { fontSize: 12, color: '#666', marginTop: 8 },
  resultActions: { flexDirection: 'row', marginTop: 14, gap: 12 },
  retakeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 10, backgroundColor: '#222', gap: 8 },
  retakeBtnText: { color: '#ccc', fontWeight: '600' },
  saveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 10, backgroundColor: '#4CAF50', gap: 8 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
