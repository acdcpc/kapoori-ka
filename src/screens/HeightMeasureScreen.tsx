// src/screens/HeightMeasureScreen.tsx
// ─────────────────────────────────────────────────────────
// Two-stage BlazePose pipeline — matches Google's architecture.
//
//   Stage 1: Detector (224×224 input → bounding boxes)
//   Stage 2: Landmark (256×256 crop → 39 GHUM landmarks)
//
// Height estimated from landmarks with EMA smoothing,
// multi-signal confidence (detector × visibility × completeness × tilt × jitter),
// and camera distance estimation.
// ─────────────────────────────────────────────────────────

import React, { useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, Dimensions, StatusBar, Animated, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  useCameraDevice, useCameraPermission, useFrameProcessor,
  Camera, runAtTargetFps,
} from 'react-native-vision-camera';

import { Asset } from 'expo-asset';
import { useResizePlugin } from 'vision-camera-resize-plugin';
import { Accelerometer } from 'expo-sensors';
import { LanguageContext } from '../context/LanguageContext';
import type { PoseLandmark, TiltState, MeasureState } from '../ai/PoseTypes';
import {
  parseDetections, parseLandmarks, parseWorldLandmarks,
} from '../ai/BlazePoseEngine';
import {
  estimateHeight, calculateTilt, getTiltMessage, getMeasureStatusMessage,
  smoothHeight, resetAll, qualityTier, updateLock, unlockMeasurement,
} from '../ai/heightEstimator';
// TODO: Future calibration — allow user to input known reference height
// e.g., measure against a doorframe, credit card, or A4 paper
// to derive a per-device BOX_REAL_HEIGHT_CM correction factor

// declare runOnJS (injected by VisionCamera in worklet scope)
declare function runOnJS<Args extends unknown[], R>(fn: (...args: Args) => R): (...args: Args) => void;

// ── Layout ──
const { width: SW, height: SH } = Dimensions.get('window');
const BOX_H = SH * 0.7;
const BOX_TOP = (SH - BOX_H) / 2;
const BOX_BOT = BOX_TOP + BOX_H;
const BOX_W = SW * 0.85;
const BOX_L = (SW - BOX_W) / 2;

// ── TiltIndicator ──
function TiltIndicator({ tilt }: { tilt: TiltState }) {
  const { language } = useContext(LanguageContext);
  const off = Math.max(-40, Math.min(40, tilt.rollDeg * 8));
  const c = tilt.isUpright ? '#4CAF50' : Math.abs(tilt.pitchDeg) < 5 ? '#FF9800' : '#F44336';
  return (
    <View style={S.tiltC}>
      <View style={S.tiltBar}>
        <View style={[S.tiltBg, { borderColor: c }]}>
          <View style={[S.tiltBubble, { backgroundColor: c, transform: [{ translateX: off }] }]} />
        </View>
        <View style={S.tiltCL} />
      </View>
      <Text style={[S.tiltT, { color: c }]}>{getTiltMessage(tilt, language as 'en' | 'ne')}</Text>
    </View>
  );
}

// ── Instructions ──
function Instructions({ ms }: { ms: MeasureState }) {
  const { language } = useContext(LanguageContext);
  const n = language === 'ne';
  const steps = useMemo(() => {
    const b = n
      ? [{ k: 'angle', l: 'फोन सीधा', i: '📱' }, { k: 'frame', l: 'बच्चा भित्र', i: '👶' }, { k: 'still', l: 'स्थिर', i: '⏸️' }]
      : [{ k: 'angle', l: 'Straight', i: '📱' }, { k: 'frame', l: 'In box', i: '👶' }, { k: 'still', l: 'Still', i: '⏸️' }];
    return b.map(s => ({ ...s, done: s.k === 'angle' ? ms.tiltOk : s.k === 'frame' ? ms.childInBox : ms.canMeasure }));
  }, [ms, n]);

  return (
    <View style={S.instr}>
      {steps.map(s => (
        <View key={s.k} style={[S.step, s.done && S.stepDone]}>
          <Text style={S.stepI}>{s.done ? '✅' : s.i}</Text>
          <Text style={[S.stepL, s.done && S.stepLdone]}>{s.l}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Web ──
function WebOnly() {
  const { language } = useContext(LanguageContext);
  const n = language === 'ne';
  return (
    <SafeAreaView style={S.ct}>
      <View style={S.gate}>
        <Ionicons name="phone-portrait-outline" size={64} color="#4CAF50" />
        <Text style={S.gateTitle}>{n ? 'मोबाइलमा मात्र' : 'Mobile Only'}</Text>
        <Text style={S.gateDesc}>{n ? 'उचाइ नाप्ने सुविधा Android र iOS मा मात्र उपलब्ध छ।' : 'Height measurement is only on Android & iOS.'}</Text>
      </View>
    </SafeAreaView>
  );
}

// ── Worklet-compatible module-level counters (captured by closure) ──
let _frameCnt = 0;
let _detCnt = 0;
let _lmLogged = false;

// ── Model loading phases ──
type ModelPhase = 'idle' | 'resolving_assets' | 'downloading_assets' | 'loading_detector' | 'loading_landmark' | 'verifying' | 'ready' | 'error';

// ─────────────────────────────────────────────────────────
export default function HeightMeasureScreen() {
  const { language } = useContext(LanguageContext);
  const n = language === 'ne';
  if (Platform.OS === 'web') return <WebOnly />;

  // ── Camera ──
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');

  // ── Models ──
  // Use expo-asset to resolve to a file:// URI that HybridAssetLoader can handle.
  // require() alone returns an Android resource identifier (e.g. 'assets_models_...')
  // which is not a valid URL — HybridAssetLoader.kt uses URL(path).readBytes().
  const [detUrl, setDetUrl] = useState<string | null>(null);
  const [lmUrl, setLmUrl] = useState<string | null>(null);

  // ── STEP 1: Resolve assets via expo-asset (with timeout + full logging) ──
  useEffect(() => {
    (async () => {
      try {
        console.log('[HEIGHT] ═══ STEP 1: Asset resolution starting ═══');
        setModelPhase('resolving_assets');

        const detModule = require('../../assets/models/blazepose_detector_fp16.tflite');
        const lmModule  = require('../../assets/models/blazepose_landmark_lite_fp16.tflite');

        console.log('[HEIGHT] require() results:');
        console.log('[HEIGHT]   detModule:', typeof detModule, '=', detModule);
        console.log('[HEIGHT]   lmModule:', typeof lmModule, '=', lmModule);

        const detAsset = Asset.fromModule(detModule);
        const lmAsset  = Asset.fromModule(lmModule);

        console.log('[HEIGHT] Asset.fromModule() BEFORE downloadAsync:');
        console.log('[HEIGHT]   detAsset:', JSON.stringify({
          name: detAsset.name, type: detAsset.type, hash: detAsset.hash,
          uri: detAsset.uri, localUri: detAsset.localUri,
          width: detAsset.width, height: detAsset.height, downloaded: detAsset.downloaded,
        }));
        console.log('[HEIGHT]   lmAsset:', JSON.stringify({
          name: lmAsset.name, type: lmAsset.type, hash: lmAsset.hash,
          uri: lmAsset.uri, localUri: lmAsset.localUri,
          width: lmAsset.width, height: lmAsset.height, downloaded: lmAsset.downloaded,
        }));

        // If localUri exists, skip downloadAsync entirely
        if (detAsset.localUri && lmAsset.localUri) {
          console.log('[HEIGHT] ✅ Both assets already have localUri — skipping downloadAsync');
          console.log('[HEIGHT]   det localUri:', detAsset.localUri);
          console.log('[HEIGHT]   lm localUri:', lmAsset.localUri);
          setDetUrl(detAsset.localUri);
          setLmUrl(lmAsset.localUri);
          setModelPhase('downloading_assets');
          return;
        }

        // Otherwise, run downloadAsync with 5-second timeout
        setModelPhase('downloading_assets');
        console.log('[HEIGHT] ── Calling downloadAsync() ──');

        const downloadWithTimeout = (asset: Asset, label: string): Promise<Asset> => {
          console.log(`[HEIGHT] downloadAsync(${label}) START`);
          return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
              console.error(`[HEIGHT] ❌ downloadAsync(${label}) TIMEOUT after 5s`);
              reject(new Error(`downloadAsync(${label}) timed out after 5 seconds`));
            }, 5000);

            asset.downloadAsync()
              .then((result: Asset) => {
                clearTimeout(timer);
                console.log(`[HEIGHT] downloadAsync(${label}) COMPLETED`);
                console.log(`[HEIGHT]   byteLength: ${(result as any).byteLength || 'N/A'}`);
                console.log(`[HEIGHT]   localUri: ${result.localUri}`);
                console.log(`[HEIGHT]   uri: ${result.uri}`);
                console.log(`[HEIGHT]   downloaded: ${result.downloaded}`);
                resolve(result);
              })
              .catch((err: Error) => {
                clearTimeout(timer);
                console.error(`[HEIGHT] ❌ downloadAsync(${label}) FAILED:`, err?.message || err, err?.stack);
                reject(err);
              });
          });
        };

        const [detResult, lmResult] = await Promise.all([
          downloadWithTimeout(detAsset, 'detector'),
          downloadWithTimeout(lmAsset, 'landmark'),
        ]);

        const detUri = detResult.localUri || detResult.uri;
        const lmUri = lmResult.localUri || lmResult.uri;

        console.log('[HEIGHT] Final URIs for TFLite loader:');
        console.log('[HEIGHT]   detUri:', detUri);
        console.log('[HEIGHT]   lmUri:', lmUri);

        // Verify file existence + size using expo-file-system
        try {
          const FileSystem = require('expo-file-system');
          const [detInfo, lmInfo] = await Promise.all([
            FileSystem.getInfoAsync(detUri, { size: true }),
            FileSystem.getInfoAsync(lmUri, { size: true }),
          ]);
          console.log('[HEIGHT] FileSystem.getInfoAsync:');
          console.log('[HEIGHT]   detector:', JSON.stringify(detInfo));
          console.log('[HEIGHT]   landmark:', JSON.stringify(lmInfo));
          if (!detInfo.exists) console.error('[HEIGHT] ❌ Detector file does NOT exist at:', detUri);
          if (!lmInfo.exists) console.error('[HEIGHT] ❌ Landmark file does NOT exist at:', lmUri);
          if (detInfo.size !== 2959078) console.error('[HEIGHT] ⚠️ Detector size MISMATCH:', detInfo.size, 'expected 2959078');
          if (lmInfo.size !== 2818390) console.error('[HEIGHT] ⚠️ Landmark size MISMATCH:', lmInfo.size, 'expected 2818390');
        } catch (fsErr) {
          console.error('[HEIGHT] ❌ FileSystem.getInfoAsync failed:', fsErr);
        }

        setDetUrl(detUri);
        setLmUrl(lmUri);

        console.log('[HEIGHT] ═══ STEP 1 COMPLETE: Assets resolved ═══');
      } catch (e: any) {
        console.error('[HEIGHT] ❌ STEP 1 FAILED:', e?.message || e, e?.stack);
        setModelPhase('error');
        setModelError(`Asset resolution: ${e?.message || e}`);
      }
    })();
  }, []);

  // ── Model loading state (driven manually, not by useTensorflowModel hook) ──
  // We avoid useTensorflowModel() because it would fire with null before URIs resolve.
  // Instead we call loadTensorflowModel directly after Asset.downloadAsync() completes.
  const [modelPhase, setModelPhase] = useState<ModelPhase>('idle');
  const detModelRef = useRef<any>(null);
  const lmModelRef = useRef<any>(null);
  const [modelError, setModelError] = useState<string | null>(null);

  // ── STEP 2: Sequential model loading (driven purely by detUrl/lmUrl, no deadlock guard) ──
  useEffect(() => {
    if (!detUrl || !lmUrl) {
      console.log('[HEIGHT] STEP 2: Waiting for asset URIs (detUrl=', !!detUrl, 'lmUrl=', !!lmUrl, ')');
      return;
    }
    if (modelPhase === 'ready' || modelPhase === 'error') {
      console.log('[HEIGHT] STEP 2: Already', modelPhase, '— skipping');
      return;
    }
    if (modelPhase === 'loading_detector' || modelPhase === 'loading_landmark' || modelPhase === 'verifying') {
      console.log('[HEIGHT] STEP 2: Already in progress (', modelPhase, ') — skipping');
      return;
    }

    const { loadTensorflowModel: loadTF } = require('react-native-fast-tflite');

    (async () => {
      try {
        // Phase 1: Load detector
        setModelPhase('loading_detector');
        console.log('[HEIGHT] ═══ STEP 2a: Loading detector from:', detUrl, '═══');
        const detModel = await loadTF({ url: detUrl }, []);
        detModelRef.current = detModel;
        console.log('[HEIGHT] ✅ Detector loaded');
        console.log('[HEIGHT] Detector metadata:', JSON.stringify({
          inputs: (detModel as any).inputs,
          outputs: (detModel as any).outputs,
        }));

        // Phase 2: Load landmark
        setModelPhase('loading_landmark');
        console.log('[HEIGHT] ═══ STEP 2b: Loading landmark from:', lmUrl, '═══');
        const lmModel = await loadTF({ url: lmUrl }, []);
        lmModelRef.current = lmModel;
        console.log('[HEIGHT] ✅ Landmark loaded');
        console.log('[HEIGHT] Landmark metadata:', JSON.stringify({
          inputs: (lmModel as any).inputs,
          outputs: (lmModel as any).outputs,
        }));

        // Phase 3: Verify with dummy inference
        setModelPhase('verifying');
        console.log('[HEIGHT] ═══ STEP 3: Dummy inference verification ═══');

        // ── Detector dummy inference ──
        const dup224 = 224 * 224 * 3;
        const dummyDetInput = new Float32Array(dup224);
        dummyDetInput.fill(0.5);
        const detOutput = await detModel.run([dummyDetInput]);
        console.log('[HEIGHT] Detector dummy run OK:', detOutput.length, 'outputs');
        detOutput.forEach((o: any, i: number) => {
          const arr = new Float32Array(o as ArrayBuffer);
          console.log(`[HEIGHT]   det_out[${i}]: len=${arr.length}, first5=[${Array.from(arr.slice(0,5)).map(v=>v.toFixed(4)).join(',')}]`);
        });

        // ── Landmark dummy inference ──
        const dup256 = 256 * 256 * 3;
        const dummyLmInput = new Float32Array(dup256);
        dummyLmInput.fill(0.5);
        const lmOutput = await lmModel.run([dummyLmInput]);
        console.log('[HEIGHT] Landmark dummy run OK:', lmOutput.length, 'outputs');
        lmOutput.forEach((o: any, i: number) => {
          const arr = new Float32Array(o as ArrayBuffer);
          console.log(`[HEIGHT]   lm_out[${i}]: len=${arr.length}, first5=[${Array.from(arr.slice(0,5)).map(v=>v.toFixed(4)).join(',')}]`);
        });

        setModelPhase('ready');
        console.log('[HEIGHT] 🎉 ALL PHASES COMPLETE — models ready');
      } catch (e: any) {
        console.error('[HEIGHT] ❌ Model loading failed at phase:', modelPhase, e?.message || e);
        setModelPhase('error');
        setModelError(`${modelPhase}: ${e?.message || e}`);
      }
    })();
  }, [detUrl, lmUrl, modelPhase]);

  const modelsLoading = !detUrl || !lmUrl || modelPhase !== 'ready';
  const modelsReady = modelPhase === 'ready';
  const detModel = modelPhase === 'ready' ? detModelRef.current : undefined;
  const lmModel = modelPhase === 'ready' ? lmModelRef.current : undefined;

  // ── Resize plugin ──
  const resize = useResizePlugin();

  // ── Tilt ──
  const [tilt, setTilt] = useState<TiltState>({ pitchDeg: 0, rollDeg: 0, isUpright: true });
  useEffect(() => {
    let sub: { remove: () => void } | null = null;
    Accelerometer.isAvailableAsync().then((ok: boolean) => {
      if (!ok) return;
      Accelerometer.setUpdateInterval(100);
      sub = Accelerometer.addListener(({ x, y, z }: { x: number; y: number; z: number }) => setTilt(calculateTilt(x, y, z)));
    });
    return () => sub?.remove();
  }, []);

  // ── State ──
  const [ms, setMs] = useState<MeasureState>({
    canMeasure: false, statusMessage: n ? 'क्यामेरा सुरु गर्दै...' : 'Starting camera...',
    tiltOk: true, landmarksVisible: false, childInBox: false, estimatedHeightCm: null, confidence: 0,
  });
  const [diag, setDiag] = useState<string>('init');
  const [capturedH, setCapturedH] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [lockedHt, setLockedHt] = useState<number | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const pulse = useRef(new Animated.Value(1)).current;

  // Store last detection score for confidence blend
  const lastDetScore = useRef(0.8);
  const landmarksRef = useRef<PoseLandmark[]>([]);

  // JS callback from worklet
  const firstResultLogged = useRef(false);

  // JS callback from worklet
  const onResult = useCallback((landmarks: PoseLandmark[], detScore: number) => {
    if (!firstResultLogged.current) {
      firstResultLogged.current = true;
      console.log('[HEIGHT] ✅ First result reached JS! Landmarks:', landmarks.length, 'Score:', detScore);
      setDiag('result_ok');
    }
    landmarksRef.current = landmarks;
    lastDetScore.current = detScore;
    const r = estimateHeight(landmarks, tilt, BOX_TOP, BOX_BOT, detScore, SH);
    const inBox = r.heightCm !== null;
    const vis = landmarks.some(l => l.visibility >= 0.7);

    // Check measurement lock
    if (r.heightCm !== null) {
      const lockState = updateLock(r.heightCm, r.confidence);
      if (lockState.locked && lockState.measurement && !locked) {
        setLocked(true);
        setLockedHt(lockState.measurement.heightCm);
        setCapturedH(lockState.measurement.heightCm);
        setShowGuide(false);
      }
    }

    setMs({
      canMeasure: inBox && tilt.isUpright && r.confidence >= 0.4,
      statusMessage: getMeasureStatusMessage(r, tilt, language as 'en' | 'ne'),
      tiltOk: tilt.isUpright, landmarksVisible: vis, childInBox: inBox,
      estimatedHeightCm: r.heightCm, confidence: r.confidence,
    });
  }, [tilt, language]);

  // Merge tilt
  useEffect(() => {
    setMs(p => {
      if (!tilt.isUpright) {
        return { ...p, tiltOk: false, canMeasure: false, statusMessage: getTiltMessage(tilt, language as 'en' | 'ne') };
      }
      return { ...p, tiltOk: true };
    });
  }, [tilt.isUpright]);

  // Pulse
  useEffect(() => {
    if (ms.canMeasure) {
      Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue: 1.1, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])).start();
    } else pulse.setValue(1);
  }, [ms.canMeasure]);

  // ── DIAGNOSTIC: log when pipeline is live ──
  useEffect(() => {
    if (modelsReady && device && hasPermission) {
      console.log('[HEIGHT] ✅ Pipeline ready — camera + models OK, starting frame processor');
      setDiag('pipeline_started');
    }
  }, [modelsReady, device, hasPermission]);

  // ── TWO-STAGE FRAME PROCESSOR ──
  const fp = useFrameProcessor((frame) => {
    'worklet';
    if (!detModel || !lmModel || !resize) return;

    // Count frames (log first few via runOnJS)
    _frameCnt += 1;
    if (_frameCnt === 1) runOnJS(setDiag)('frame_1');
    if (_frameCnt === 30) runOnJS(setDiag)('frame_30');

    runAtTargetFps(8, () => {
      try {
        // ── STAGE 1: Detector ──
        const detInput = resize.resize(frame, {
          scale: { width: 224, height: 224 },
          pixelFormat: 'rgb', dataType: 'float32',
        });
        if (!detInput || detInput.length === 0) return;

        const detOut = detModel.runSync([detInput as any]);
        if (!detOut || !detOut[0]) return;
        const detRaw = new Float32Array(detOut[0] as unknown as ArrayBuffer);

        const detections = parseDetections(detRaw);
        if (detections.length === 0) return;

        // Log first detection
        if (_detCnt === 0) {
          _detCnt += 1;
          runOnJS(setDiag)('det_ok');
        }

        const best = detections[0];
        const { bbox, score } = best;

        // ── Crop & expand ROI slightly ──
        const margin = 0.15;
        const cx = Math.max(0, bbox.x - bbox.w * margin) * frame.width;
        const cy = Math.max(0, bbox.y - bbox.h * margin) * frame.height;
        const cw = Math.min(frame.width - cx, bbox.w * (1 + margin * 2) * frame.width);
        const ch = Math.min(frame.height - cy, bbox.h * (1 + margin * 2) * frame.height);

        if (cw < 50 || ch < 50) return;

        // ── STAGE 2: Landmark model ──
        // Apply frame orientation via rotation (VisionCamera may rotate frames)
        const rotation = (frame as any).orientation === 'portrait' ? '0deg'
          : (frame as any).orientation === 'landscape-left' ? '90deg'
          : (frame as any).orientation === 'landscape-right' ? '270deg'
          : '0deg';

        const lmInput = resize.resize(frame, {
          crop: {
            x: Math.round(cx), y: Math.round(cy),
            width: Math.round(cw), height: Math.round(ch),
          },
          scale: { width: 256, height: 256 },
          pixelFormat: 'rgb', dataType: 'float32',
          rotation,
        });
        if (!lmInput || lmInput.length === 0) return;

        const lmOut = lmModel.runSync([lmInput as any]);
        if (!lmOut || !lmOut[0]) return;

        // Log landmark success
        if (!_lmLogged) {
          _lmLogged = true;
          runOnJS(setDiag)('lm_ok');
        }

        // Landmark output is the first output (Identity)
        const lmRaw = new Float32Array(lmOut[0] as unknown as ArrayBuffer);
        const landmarks = parseLandmarks(lmRaw, frame.width, frame.height, cx, cy, cw, ch);

        runOnJS(onResult)(landmarks, score);
      } catch {
        // silent per-frame errors
      }
    });
  }, [detModel, lmModel, resize]);

  // ── Actions ──
  const capture = useCallback(() => {
    if (!ms.canMeasure || !ms.estimatedHeightCm) return;
    setCapturing(true);
    setTimeout(() => {
      setCapturedH(ms.estimatedHeightCm);
      setCapturing(false);
      setShowGuide(false);
      resetAll();
      unlockMeasurement();
    }, 400);
  }, [ms.canMeasure, ms.estimatedHeightCm]);

  const retake = useCallback(() => {
    setCapturedH(null);
    setLocked(false);
    setLockedHt(null);
    setShowGuide(true);
    resetAll();
  }, []);

  const save = useCallback(async () => {
    if (!capturedH) return;
    Alert.alert(n ? 'सफल' : 'Success', n ? `${capturedH} सेमी रेकर्ड गरियो!` : `${capturedH} cm recorded!`, [{ text: 'OK' }]);
  }, [capturedH, n]);

  // ── Gates ──
  if (!hasPermission) return (
    <SafeAreaView style={S.ct}><View style={S.gate}>
      <Ionicons name="camera-outline" size={64} color="#4CAF50" />
      <Text style={S.gateTitle}>{n ? 'क्यामेरा अनुमति चाहिन्छ' : 'Camera Permission Needed'}</Text>
      <Text style={S.gateDesc}>{n ? 'बच्चाको उचाइ नाप्न क्यामेरा चाहिन्छ।' : 'Camera access is needed.'}</Text>
      <TouchableOpacity style={S.gateBtn} onPress={requestPermission}><Text style={S.gateBtnT}>{n ? 'अनुमति दिनुहोस्' : 'Grant'}</Text></TouchableOpacity>
    </View></SafeAreaView>
  );

  if (!device) return (
    <SafeAreaView style={S.ct}><View style={S.gate}>
      <Ionicons name="alert-circle-outline" size={64} color="#FF9800" />
      <Text style={S.gateTitle}>{n ? 'क्यामेरा भेटिएन' : 'No Camera'}</Text>
    </View></SafeAreaView>
  );

  if (modelPhase === 'error') return (
    <SafeAreaView style={S.ct}><View style={S.gate}>
      <Ionicons name="warning-outline" size={64} color="#FF5252" />
      <Text style={S.gateTitle}>{n ? 'मोडल लोड त्रुटि' : 'Model Load Error'}</Text>
      <Text style={S.gateDesc}>{n ? 'AI मोडल लोड गर्न सकिएन। एप पुनः सुरु गर्नुहोस्।' : 'Failed to load AI models. Please restart the app.'}</Text>
      <Text style={{color: '#666', fontSize: 11, marginTop: 8}}>{modelError || ''}</Text>
    </View></SafeAreaView>
  );
  // Diagnostic: log model state while loading
  useEffect(() => {
    if (modelsLoading) {
      console.log('[HEIGHT] Model phase:', modelPhase, 'detUrl:', !!detUrl, 'lmUrl:', !!lmUrl);
    }
  }, [modelsLoading, modelPhase, detUrl, lmUrl]);

  if (modelsLoading) return (

    <SafeAreaView style={S.ct}><View style={S.gate}>
      <ActivityIndicator size="large" color="#4CAF50" />
      <Text style={S.gateTitle}>{n ? 'AI मोडल लोड हुँदै...' : 'Loading AI...'}</Text>
      <Text style={S.gateDesc}>{`Phase: ${modelPhase}`}</Text>
    </View></SafeAreaView>
  );

  // ─────────────────────────────────────────────────
  return (
    <SafeAreaView style={S.ct}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={S.preview}>
        <Camera style={StyleSheet.absoluteFill} device={device} isActive frameProcessor={fp} fps={30} />
        <View style={[S.box, { top: BOX_TOP, left: BOX_L, width: BOX_W, height: BOX_H, borderColor: ms.childInBox && ms.tiltOk ? '#4CAF50' : '#FF9800' }]}>
          <View style={[S.rl, S.rlT]}><Text style={S.rlL}>{n ? 'टाउको' : 'Head'}</Text></View>
          <View style={[S.rl, S.rlB]}><Text style={S.rlL}>{n ? 'खुट्टा' : 'Feet'}</Text></View>
          <View style={[S.cor, S.corTL]} /><View style={[S.cor, S.corTR]} /><View style={[S.cor, S.corBL]} /><View style={[S.cor, S.corBR]} />
        </View>
        <TiltIndicator tilt={tilt} />
        {showGuide && !capturedH && <Instructions ms={ms} />}
        <Text style={S.diagT}>{diag}</Text>
      </View>

      <View style={S.bb}>
        {capturedH ? (
          <View style={S.rc}>
            <View style={[S.rcard, locked && { borderColor: '#4CAF50', borderWidth: 2 }]}>
              {locked && <Text style={S.lockedBanner}>{n ? '🔒 मापन पूरा' : '🔒 Measurement Complete'}</Text>}
              <Text style={S.rlbl}>{n ? 'नापिएको उचाइ' : 'Measured Height'}</Text>
              <Text style={S.rv}>{lockedHt ?? capturedH}<Text style={S.ru}> cm</Text></Text>
              <Text style={S.rconf}>{n ? 'विश्वसनीयता' : 'Confidence'}: {Math.round(ms.confidence * 100)}%</Text>
              <Text style={S.rtier}>{qualityTier(ms.confidence, language as 'en' | 'ne')}</Text>
            </View>
            <View style={S.ra}>
              <TouchableOpacity style={S.rbtn} onPress={retake}><Ionicons name="refresh" size={20} color="#666" /><Text style={S.rbtnT}>{n ? 'फेरि' : 'Retake'}</Text></TouchableOpacity>
              <TouchableOpacity style={S.sbtn} onPress={save}><Ionicons name="checkmark" size={24} color="#fff" /><Text style={S.sbtnT}>{n ? 'सेभ' : 'Save'}</Text></TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={S.ca}>
            <Text style={S.cs}>{ms.statusMessage}</Text>
            <Animated.View style={[S.cbo, { transform: [{ scale: pulse }], opacity: ms.canMeasure ? 1 : 0.4 }]}>
              <TouchableOpacity style={[S.cb, !ms.canMeasure && S.cbd]} onPress={capture} disabled={!ms.canMeasure}>
                {capturing ? <ActivityIndicator color="#fff" size="large" /> : <Ionicons name={ms.canMeasure ? 'camera' : 'lock-closed'} size={36} color={ms.canMeasure ? '#fff' : '#999'} />}
              </TouchableOpacity>
            </Animated.View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

// ── Styles (abbreviated keys for brevity) ──
const S = StyleSheet.create({
  ct: { flex: 1, backgroundColor: '#000' }, preview: { flex: 1, position: 'relative' },
  gate: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: '#111' },
  gateTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginTop: 16, textAlign: 'center' },
  gateDesc: { fontSize: 14, color: '#999', marginTop: 8, textAlign: 'center', lineHeight: 20 },
  gateBtn: { marginTop: 24, backgroundColor: '#4CAF50', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 10 },
  gateBtnT: { color: '#fff', fontWeight: '700', fontSize: 16 },
  box: { position: 'absolute', borderWidth: 2.5, borderRadius: 8 },
  rl: { position: 'absolute', left: -60, right: -60, height: 2, backgroundColor: '#FF9800', flexDirection: 'row', alignItems: 'center' },
  rlT: { top: 0 }, rlB: { bottom: 0 },
  rlL: { color: '#FF9800', fontSize: 10, fontWeight: '700', backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  cor: { position: 'absolute', width: 20, height: 20, borderColor: 'rgba(255,255,255,0.8)', borderWidth: 2 },
  corTL: { top: -1, left: -1, borderBottomWidth: 0, borderRightWidth: 0 },
  corTR: { top: -1, right: -1, borderBottomWidth: 0, borderLeftWidth: 0 },
  corBL: { bottom: -1, left: -1, borderTopWidth: 0, borderRightWidth: 0 },
  corBR: { bottom: -1, right: -1, borderTopWidth: 0, borderLeftWidth: 0 },
  tiltC: { position: 'absolute', top: 60, left: 20, right: 20, alignItems: 'center' },
  tiltBar: { width: 200, height: 30, justifyContent: 'center', alignItems: 'center' },
  tiltBg: { width: '100%', height: 8, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 1, justifyContent: 'center' },
  tiltBubble: { width: 16, height: 16, borderRadius: 8, position: 'absolute', top: -4 },
  tiltCL: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.3)' },
  tiltT: { fontSize: 13, fontWeight: '600', marginTop: 4, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  instr: { position: 'absolute', bottom: 20, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-around' },
  step: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  stepDone: { backgroundColor: 'rgba(76,175,80,0.3)' }, stepI: { fontSize: 20 },
  stepL: { fontSize: 11, color: '#ccc', marginTop: 2, fontWeight: '600' }, stepLdone: { color: '#4CAF50' },
  bb: { backgroundColor: '#111', paddingTop: 16, paddingBottom: 32, paddingHorizontal: 20, alignItems: 'center' },
  ca: { alignItems: 'center' },
  cs: { color: '#ccc', fontSize: 14, fontWeight: '600', marginBottom: 12, textAlign: 'center', paddingHorizontal: 20 },
  cbo: { width: 84, height: 84, borderRadius: 42, borderWidth: 3, borderColor: '#4CAF50', justifyContent: 'center', alignItems: 'center' },
  cb: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center' },
  cbd: { backgroundColor: '#333' },
  rc: { width: '100%', paddingHorizontal: 10 },
  rcard: { backgroundColor: '#1a1a2e', borderRadius: 14, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#4CAF50' },
  rlbl: { fontSize: 13, color: '#888', fontWeight: '600', textTransform: 'uppercase' },
  rv: { fontSize: 48, fontWeight: '800', color: '#4CAF50', marginTop: 4 },
  ru: { fontSize: 18, color: '#666', fontWeight: '400' },
  rconf: { fontSize: 12, color: '#666', marginTop: 8 },
  ra: { flexDirection: 'row', marginTop: 14, gap: 12 },
  rbtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 10, backgroundColor: '#222', gap: 8 },
  rbtnT: { color: '#ccc', fontWeight: '600' },
  sbtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 10, backgroundColor: '#4CAF50', gap: 8 },
  sbtnT: { color: '#fff', fontWeight: '700', fontSize: 16 },
  rtier: { fontSize: 14, fontWeight: '700', marginTop: 8, letterSpacing: 0.5 },
  diagT: { position: 'absolute', top: 4, left: 8, color: '#0f0', fontSize: 9, fontFamily: 'monospace', backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  lockedBanner: { fontSize: 13, fontWeight: '800', color: '#4CAF50', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
});
