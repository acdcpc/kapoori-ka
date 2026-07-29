// src/components/Onboarding.tsx
import React, { useContext, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LanguageContext } from '../context/LanguageContext';

const { width, height } = Dimensions.get('window');

const ONBOARDING_KEY = 'onboarding_step';

const STEPS = [
  { messageEn: 'Tap here to add your child', messageNe: 'यहाँ थिचेर आफ्नो बच्चा थप्नुहोस्', top: height - 160, left: width - 80 },
  { messageEn: 'Track your child growth chart here', messageNe: 'यहाँ बच्चाको वृद्धि चार्ट हेर्नुहोस्', top: 340, left: width / 2 - 120 },
  { messageEn: 'Check your child health summary at a glance', messageNe: 'यहाँ बच्चाको स्वास्थ्य अवस्था हेर्नुहोस्', top: 130, left: width / 2 - 130 },
];

interface OnboardingProps {
  onComplete: () => void;
  screen: 'home' | 'dashboard';
}

export default function Onboarding({ onComplete, screen }: OnboardingProps) {
  const { language } = useContext(LanguageContext);
  const isNe = language === 'ne';
  const [step, setStep] = useState(0);
  const [initialized, setInitialized] = useState(false);

  // Resume from AsyncStorage on mount (survives force-quit)
  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then(val => {
      const savedStep = val ? parseInt(val, 10) : 0;
      if (isNaN(savedStep) || savedStep < 0) {
        setStep(0);
      } else if (savedStep >= 3) {
        // Already completed previously
        onComplete();
        return;
      } else {
        // Use max of saved position and screen-appropriate starting step
        const screenStart = screen === 'home' ? 0 : 1;
        setStep(Math.max(savedStep, screenStart));
      }
      setInitialized(true);
    });
  }, []);

  // Persist step on every change (survives force-quit)
  const advanceStep = async (nextStep: number) => {
    await AsyncStorage.setItem(ONBOARDING_KEY, String(nextStep));
    setStep(nextStep);
  };

  const handleNext = async () => {
    if (step < 2) {
      await advanceStep(step + 1);
    } else {
      // Mark completed — distinct value from 'skipped'
      await AsyncStorage.setItem(ONBOARDING_KEY, 'completed');
      onComplete();
    }
  };

  const handleSkip = async () => {
    // Distinguishable skip value
    await AsyncStorage.setItem(ONBOARDING_KEY, 'skipped');
    onComplete();
  };

  if (!initialized) return null;

  const current = STEPS[step];
  if (!current) {
    onComplete();
    return null;
  }

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <View style={styles.dimBackground} />
      <View style={[styles.spotlight, { top: current.top - 30, left: current.left - 30 }]}>
        <View style={styles.spotlightInner} />
      </View>
      <View style={[styles.tooltip, { top: current.top + 40, left: Math.min(current.left - 12, width - 210) }]}>
        <Text style={styles.tooltipText}>{isNe ? current.messageNe : current.messageEn}</Text>
        <View style={styles.tooltipBtns}>
          <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
            <Text style={styles.skipBtnText}>{isNe ? 'छोड्नुहोस्' : 'Skip'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleNext} style={styles.nextBtn}>
            <Text style={styles.nextBtnText}>{step < 2 ? (isNe ? 'अर्को' : 'Next') : (isNe ? 'सकियो' : 'Done')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, elevation: 999 },
  dimBackground: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.65)' },
  spotlight: { position: 'absolute', width: 80, height: 80, borderRadius: 40, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' },
  spotlightInner: { width: 70, height: 70, borderRadius: 35, borderWidth: 3, borderColor: '#E8602C' },
  tooltip: { position: 'absolute', backgroundColor: '#FDF8F2', borderRadius: 12, padding: 16, width: 220, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 10 },
  tooltipText: { fontSize: 14, fontWeight: '600', color: '#1A1A2E', marginBottom: 12, lineHeight: 20 },
  tooltipBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  skipBtn: { paddingVertical: 6, paddingHorizontal: 12 },
  skipBtnText: { color: '#7A6E65', fontWeight: '600', fontSize: 13 },
  nextBtn: { backgroundColor: '#E8602C', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20 },
  nextBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
