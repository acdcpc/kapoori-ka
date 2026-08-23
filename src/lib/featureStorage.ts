// src/lib/featureStorage.ts — Local, privacy-preserving feature preferences.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AccessibilityPreferences, OfflineMutation } from '../types';

const ACCESSIBILITY_KEY = 'kapoori_accessibility_v1';
const OFFLINE_QUEUE_KEY = 'kapoori_offline_queue_v1';

export const DEFAULT_ACCESSIBILITY: AccessibilityPreferences = {
  textScale: 'standard',
  highContrast: false,
  reduceMotion: false,
  voiceGuidance: false,
  literacyMode: false,
};

export async function loadAccessibilityPreferences(): Promise<AccessibilityPreferences> {
  try {
    const raw = await AsyncStorage.getItem(ACCESSIBILITY_KEY);
    return raw ? { ...DEFAULT_ACCESSIBILITY, ...JSON.parse(raw) } : DEFAULT_ACCESSIBILITY;
  } catch {
    return DEFAULT_ACCESSIBILITY;
  }
}

export async function saveAccessibilityPreferences(value: AccessibilityPreferences): Promise<void> {
  await AsyncStorage.setItem(ACCESSIBILITY_KEY, JSON.stringify(value));
}

export async function loadOfflineQueue(): Promise<OfflineMutation[]> {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveOfflineQueue(queue: OfflineMutation[]): Promise<void> {
  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue.slice(-100)));
}

export async function queueOfflineMutation(mutation: OfflineMutation): Promise<void> {
  const queue = await loadOfflineQueue();
  queue.push(mutation);
  await saveOfflineQueue(queue);
}
