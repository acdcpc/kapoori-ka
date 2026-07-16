// src/screens/HeightMeasureScreen.tsx
// ─────────────────────────────────────────────────────────────────
// Child Height Measurement Screen
// Uses: Camera (VisionCamera) + BlazePose TFLite + Accelerometer
// Fully offline, no depth sensor required.
// ─────────────────────────────────────────────────────────────────

import React, { useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, Dimensions, StatusBar, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';

// ── Language ──
import { LanguageContext } from '../context/LanguageContext';

// ── Height Calculation Engine ──
import {
  calculateTilt,
  getTiltMessage,
  evaluateMeasureState,
  type TiltState,
  type MeasureState,
  type PoseLandmark,
} from '../utils/heightCalculation';

// ── Types (Firestore save omitted for now; add to growth_records) ──
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────
// VISUAL OVERLAY CONSTANTS
// ─────────────────────────────────────────────────────────
/** The bounding box occupies 70% of screen height, centered vertically */
const BOX_HEIGHT_PX = SCREEN_HEIGHT * 0.7;
const BOX_TOP_Y = (SCREEN_HEIGHT - BOX_HEIGHT_PX) / 2;
const BOX_BOTTOM_Y = BOX_TOP_Y + BOX_HEIGHT_PX;
const BOX_WIDTH_PX = SCREEN_WIDTH * 0.85;
const BOX_LEFT_X = (SCREEN_WIDTH - BOX_WIDTH_PX) / 2;

// ─────────────────────────────────────────────────────────
// TILT INDICATOR — spirit level bubble
// ─────────────────────────────────────────────────────────
function TiltIndicator({ tilt }: { tilt: TiltState }) {
  const { language } = useContext(LanguageContext);
  const isNe = language === 'ne';

  // Bubble position: centers at 0°, moves left/right with roll
  const bubbleOffset = Math.max(-40, Math.min(40, tilt.roll * 8));

  // Color gradient: red (bad) → yellow (close) → green (good)
  const tiltColor = tilt.isUpright
    ? '#4CAF50'
    : Math.abs(tilt.pitchDegrees) < 5
      ? '#FF9800'
      : '#F44336';

  const message = getTiltMessage(
    tilt,
    language as 'en' | 'ne',
  );

  return (
    <View style={styles.tiltContainer}>
      {/* Spirit level bar */}
      <View style={styles.tiltBar}>
        <View style={[styles.tiltBarBg, { borderColor: tiltColor }]}>
          <View
            style={[
              styles.tiltBubble,
              {
                backgroundColor: tiltColor,
                transform: [{ translateX: bubbleOffset }],
              },
            ]}
          />
        </View>
        {/* Center line */}
        <View style={styles.tiltCenterLine} />
      </View>
      <Text style={[styles.tiltText, { color: tiltColor }]}>{message}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────
// INSTRUCTION OVERLAY — step-by-step guidance
// ─────────────────────────────────────────────────────────
function InstructionOverlay({ state }: { state: MeasureState }) {
  const { language } = useContext(LanguageContext);
  const isNe = language === 'ne';

  const steps = useMemo(() => {
    const base = isNe
      ? [
          { key: 'angle', label: 'फोन सीधा राख्नुहोस्', icon: '📱' },
          { key: 'frame', label: 'बच्चा बाकस भित्र राख्नुहोस्', icon: '👶' },
          { key: 'still', label: 'स्थिर रहनुहोस्', icon: '⏸️' },
        ]
      : [
          { key: 'angle', label: 'Keep phone straight', icon: '📱' },
          { key: 'frame', label: 'Fit child in box', icon: '👶' },
          { key: 'still', label: 'Hold still', icon: '⏸️' },
        ];

    return base.map(s => ({
      ...s,
      done:
        s.key === 'angle' ? state.tiltOk
          : s.key === 'frame' ? state.childInBox
          : s.key === 'still' ? state.canMeasure
          : false,
    }));
  }, [state, isNe]);

  return (
    <View style={styles.instructionOverlay}>
      {steps.map((step, i) => (
        <View
          key={step.key}
          style={[
            styles.stepItem,
            step.done && styles.stepItemDone,
          ]}
        >
          <Text style={styles.stepIcon}>{step.done ? '✅' : step.icon}</Text>
          <Text style={[styles.stepLabel, step.done && styles.stepLabelDone]}>
            {step.label}
          </Text>
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

  // ── State ──
  const [hasPermission, setHasPermission] = useState(false);
  const [tilt, setTilt] = useState<TiltState>({
    pitch: 0, roll: 0, isUpright: false, pitchDegrees: 0,
  });
  const [measureState, setMeasureState] = useState<MeasureState>({
    canMeasure: false,
    statusMessage: isNe ? 'फोन सीधा राख्नुहोस्' : 'Keep phone straight',
    tiltOk: false,
    landmarksVisible: false,
    childInBox: false,
    estimatedHeightCm: null,
    confidence: 0,
  });
  const [capturedHeight, setCapturedHeight] = useState<number | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showGuide, setShowGuide] = useState(true);

  // ── Animated values ──
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (measureState.canMeasure) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [measureState.canMeasure]);

  // ── Simulated accelerometer (real impl uses react-native-sensors) ──
  // In production, replace this with:
  //   import { accelerometer } from 'react-native-sensors';
  //   useEffect(() => {
  //     const sub = accelerometer.subscribe(({ x, y, z }) => {
  //       setTilt(calculateTilt(x, y, z));
  //     });
  //     return () => sub.unsubscribe(); // MEMORY LEAK PREVENTION
  //   }, []);
  useEffect(() => {
    // DEMO: simulate tilt data changing over time
    const interval = setInterval(() => {
      const t = Date.now() / 1000;
      const simulatedPitch = 1.5 + Math.sin(t * 0.5) * 1.5; // oscillates near 1.5°
      const simulatedRoll = Math.sin(t * 0.3) * 0.5;
      setTilt(
        calculateTilt(
          Math.sin(simulatedRoll * Math.PI / 180),
          Math.cos(simulatedPitch * Math.PI / 180) * 9.8,
          Math.sin(simulatedPitch * Math.PI / 180) * 9.8,
        ),
      );
    }, 200);

    // MEMORY LEAK PREVENTION: always clean up intervals/subscriptions
    return () => clearInterval(interval);
  }, []);

  // ── Simulated pose detection (real impl uses VisionCamera + TFLite) ──
  // In production, the frame processor runs on the camera feed:
  //   const frameProcessor = useFrameProcessor((frame) => {
  //     'worklet';
  //     runAtTargetFps(5, () => {
  //       const result = model.runSync([frame]);
  //       const landmarks = parseLandmarks(result, frame.width, frame.height);
  //       // Update React state via runOnJS
  //       runOnJS(updateLandmarks)(landmarks);
  //     });
  //   }, []);
  useEffect(() => {
    if (!tilt.isUpright) return;

    const interval = setInterval(() => {
      // Simulate landmarks that gradually appear and stabilize
      const t = Date.now() / 1000;
      const simVisibility = Math.min(1, (t % 5) / 3); // ramps up over 3s

      if (simVisibility > 0.6) {
        // Create synthetic valid landmarks
        const landmarks: PoseLandmark[] = Array.from(
          { length: 33 },
          (_, i) => ({
            x: (i % 6) * 0.05 + 0.3,
            y: 0.15 + (i / 33) * 0.55,
            z: 0,
            visibility: i === 0 || i === 27 || i === 28 ? simVisibility : 0.9,
          }),
        );

        const state = evaluateMeasureState(
          landmarks,
          tilt,
          BOX_TOP_Y,
          BOX_BOTTOM_Y,
          language as 'en' | 'ne',
        );
        setMeasureState(state);
      }
    }, 500);

    return () => clearInterval(interval); // MEMORY LEAK PREVENTION
  }, [tilt.isUpright]);

  // ── Capture Height ──
  const handleCapture = useCallback(() => {
    if (!measureState.canMeasure || !measureState.estimatedHeightCm) return;

    setIsCapturing(true);
    // Brief flash animation would go here

    setTimeout(() => {
      setCapturedHeight(measureState.estimatedHeightCm);
      setIsCapturing(false);
      setShowGuide(false);
    }, 500);
  }, [measureState.canMeasure, measureState.estimatedHeightCm]);

  // ── Retake ──
  const handleRetake = useCallback(() => {
    setCapturedHeight(null);
    setShowGuide(true);
  }, []);

  // ── Save to Firestore ──
  const handleSave = useCallback(async () => {
    if (!capturedHeight) return;
    // TODO: Save to firestore growth_records
    // await addDoc(collection(db, 'growth_records'), {
    //   childId: route.params.child.id,
    //   ownerId: auth.currentUser?.uid,
    //   height: capturedHeight,
    //   date: dayjs().format('YYYY-MM-DD'),
    //   measurementMethod: 'pose_estimation',
    //   createdAt: dayjs().toISOString(),
    // });
    Alert.alert(
      isNe ? 'सफल' : 'Success',
      isNe
        ? `${capturedHeight} सेमी रेकर्ड गरियो!`
        : `${capturedHeight} cm recorded!`,
      [{ text: 'OK' }],
    );
  }, [capturedHeight]);

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* ======================== */}
      {/* CAMERA PREVIEW (simulated) */}
      {/* ======================== */}
      <View style={styles.cameraPreview}>
        {/* Simulated camera viewfinder */}
        <View style={styles.cameraSimulated}>
          <Text style={styles.cameraSimText}>📷</Text>
          <Text style={styles.cameraSimSub}>
            {isNe ? 'क्यामेरा प्रिभ्यु' : 'Camera Preview'}
          </Text>
        </View>

        {/* ========== BOUNDING BOX OVERLAY ========== */}
        <View
          style={[
            styles.boundingBox,
            {
              top: BOX_TOP_Y,
              left: BOX_LEFT_X,
              width: BOX_WIDTH_PX,
              height: BOX_HEIGHT_PX,
              borderColor:
                measureState.childInBox && measureState.tiltOk
                  ? '#4CAF50'
                  : '#FF9800',
            },
          ]}
        >
          {/* Top reference line */}
          <View style={[styles.refLine, styles.refLineTop]}>
            <Text style={styles.refLabel}>
              {isNe ? 'टाउको' : 'Head'}
            </Text>
          </View>

          {/* Bottom reference line */}
          <View style={[styles.refLine, styles.refLineBottom]}>
            <Text style={styles.refLabel}>
              {isNe ? 'खुट्टा' : 'Feet'}
            </Text>
          </View>

          {/* Corner markers */}
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>

        {/* ========== TILT INDICATOR ========== */}
        <TiltIndicator tilt={tilt} />

        {/* ========== INSTRUCTION STEPS ========== */}
        {showGuide && !capturedHeight && (
          <InstructionOverlay state={measureState} />
        )}
      </View>

      {/* ======================== */}
      {/* BOTTOM CONTROLS */}
      {/* ======================== */}
      <View style={styles.bottomBar}>
        {capturedHeight ? (
          // === RESULT VIEW ===
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
                {Math.round(measureState.confidence * 100)}%
              </Text>
            </View>

            <View style={styles.resultActions}>
              <TouchableOpacity
                style={styles.retakeBtn}
                onPress={handleRetake}
              >
                <Ionicons name="refresh" size={20} color="#666" />
                <Text style={styles.retakeBtnText}>
                  {isNe ? 'फेरि नाप्नुहोस्' : 'Retake'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSave}
              >
                <Ionicons name="checkmark" size={24} color="#fff" />
                <Text style={styles.saveBtnText}>
                  {isNe ? 'सेभ गर्नुहोस्' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          // === CAPTURE BUTTON ===
          <View style={styles.captureArea}>
            <Text style={styles.captureStatus}>
              {measureState.statusMessage}
            </Text>

            <Animated.View
              style={[
                styles.captureBtnOuter,
                {
                  transform: [{ scale: pulseAnim }],
                  opacity: measureState.canMeasure ? 1 : 0.4,
                },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.captureBtn,
                  !measureState.canMeasure && styles.captureBtnDisabled,
                ]}
                onPress={handleCapture}
                disabled={!measureState.canMeasure}
                activeOpacity={0.7}
              >
                {isCapturing ? (
                  <ActivityIndicator color="#fff" size="large" />
                ) : (
                  <Ionicons
                    name={measureState.canMeasure ? 'camera' : 'lock-closed'}
                    size={36}
                    color={measureState.canMeasure ? '#fff' : '#999'}
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

  // Camera preview
  cameraPreview: { flex: 1, position: 'relative' },
  cameraSimulated: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  cameraSimText: { fontSize: 60, opacity: 0.5 },
  cameraSimSub: { fontSize: 14, color: '#666', marginTop: 8 },

  // Bounding box
  boundingBox: {
    position: 'absolute', borderWidth: 2.5, borderRadius: 8,
    borderStyle: 'solid',
  },
  refLine: {
    position: 'absolute', left: -60, right: -60, height: 2,
    backgroundColor: '#FF9800', flexDirection: 'row', alignItems: 'center',
  },
  refLineTop: { top: 0 },
  refLineBottom: { bottom: 0 },
  refLabel: {
    color: '#FF9800', fontSize: 10, fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 4, overflow: 'hidden',
  },
  corner: {
    position: 'absolute', width: 20, height: 20,
    borderColor: 'rgba(255,255,255,0.8)', borderWidth: 2,
  },
  cornerTL: { top: -1, left: -1, borderBottomWidth: 0, borderRightWidth: 0 },
  cornerTR: { top: -1, right: -1, borderBottomWidth: 0, borderLeftWidth: 0 },
  cornerBL: { bottom: -1, left: -1, borderTopWidth: 0, borderRightWidth: 0 },
  cornerBR: { bottom: -1, right: -1, borderTopWidth: 0, borderLeftWidth: 0 },

  // Tilt indicator
  tiltContainer: {
    position: 'absolute', top: 60, left: 20, right: 20,
    alignItems: 'center',
  },
  tiltBar: {
    width: 200, height: 30, justifyContent: 'center', alignItems: 'center',
  },
  tiltBarBg: {
    width: '100%', height: 8, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1, justifyContent: 'center',
  },
  tiltBubble: {
    width: 16, height: 16, borderRadius: 8,
    position: 'absolute', top: -4,
  },
  tiltCenterLine: {
    position: 'absolute', top: 0, bottom: 0, width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  tiltText: {
    fontSize: 13, fontWeight: '600', marginTop: 4,
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 10, overflow: 'hidden',
  },

  // Instruction overlay
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

  // Bottom bar
  bottomBar: {
    backgroundColor: '#111', paddingTop: 16, paddingBottom: 32,
    paddingHorizontal: 20, alignItems: 'center',
  },
  captureArea: { alignItems: 'center' },
  captureStatus: {
    color: '#ccc', fontSize: 14, fontWeight: '600', marginBottom: 12,
    textAlign: 'center', paddingHorizontal: 20,
  },
  captureBtnOuter: {
    width: 84, height: 84, borderRadius: 42,
    borderWidth: 3, borderColor: '#4CAF50', justifyContent: 'center', alignItems: 'center',
  },
  captureBtn: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center',
  },
  captureBtnDisabled: { backgroundColor: '#333' },

  // Result
  resultContainer: { width: '100%', paddingHorizontal: 10 },
  resultCard: {
    backgroundColor: '#1a1a2e', borderRadius: 14, padding: 20,
    alignItems: 'center', borderWidth: 1, borderColor: '#4CAF50',
  },
  resultLabel: { fontSize: 13, color: '#888', fontWeight: '600', textTransform: 'uppercase' },
  resultValue: { fontSize: 48, fontWeight: '800', color: '#4CAF50', marginTop: 4 },
  resultUnit: { fontSize: 18, color: '#666', fontWeight: '400' },
  resultConfidence: { fontSize: 12, color: '#666', marginTop: 8 },
  resultActions: { flexDirection: 'row', marginTop: 14, gap: 12 },
  retakeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 14, borderRadius: 10, backgroundColor: '#222', gap: 8,
  },
  retakeBtnText: { color: '#ccc', fontWeight: '600' },
  saveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 14, borderRadius: 10, backgroundColor: '#4CAF50', gap: 8,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
