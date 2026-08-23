// src/context/AccessibilityContext.tsx — User-controlled readability settings.
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as Speech from 'expo-speech';
import { AccessibilityPreferences } from '../types';
import { DEFAULT_ACCESSIBILITY, loadAccessibilityPreferences, saveAccessibilityPreferences } from '../lib/featureStorage';

type AccessibilityContextValue = {
  preferences: AccessibilityPreferences;
  ready: boolean;
  setPreferences: (value: AccessibilityPreferences) => Promise<void>;
  textScale: (size: number) => number;
  speak: (text: string, language: 'en' | 'ne') => void;
};

const AccessibilityContext = createContext<AccessibilityContextValue | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setState] = useState<AccessibilityPreferences>(DEFAULT_ACCESSIBILITY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadAccessibilityPreferences().then(setState).finally(() => setReady(true));
  }, []);

  const value = useMemo<AccessibilityContextValue>(() => ({
    preferences,
    ready,
    setPreferences: async (next) => { setState(next); await saveAccessibilityPreferences(next); },
    textScale: (size) => size * (preferences.textScale === 'extra_large' ? 1.28 : preferences.textScale === 'large' ? 1.14 : 1),
    speak: (text, language) => {
      if (!preferences.voiceGuidance || !text.trim()) return;
      Speech.stop();
      Speech.speak(text, { language: language === 'ne' ? 'ne-NP' : 'en-US', rate: 0.92 });
    },
  }), [preferences, ready]);

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) throw new Error('useAccessibility must be used within AccessibilityProvider');
  return context;
}
