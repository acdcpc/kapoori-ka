// src/components/Onboarding.tsx
import React, { useContext, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { ThemeContext } from '../context/ThemeContext';
import { Palette } from '../theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LanguageContext } from '../context/LanguageContext';

const ONBOARDING_KEY = 'hasSeenOnboarding';

type IoniconName = keyof typeof Ionicons.glyphMap;

interface Step {
  icon: IoniconName;
  color: string;
  titleEn: string;
  titleNe: string;
  descEn: string;
  descNe: string;
}

const makeSteps = (t: Palette): Step[] => ([
  {
    icon: 'happy-outline',
    color: t.clay,
    titleEn: 'Welcome to Kapoori Ka!',
    titleNe: 'कपूरी कामा स्वागत छ!',
    descEn: "Add your child's profile and photo to get started.",
    descNe: 'आफ्नो बच्चाको प्रोफाइल र फोटो थपेर सुरु गर्नुहोस्।',
  },
  {
    icon: 'medkit-outline',
    color: '#1E88E5',
    titleEn: 'Immunization Tracker',
    titleNe: 'खोप ट्र्याकर',
    descEn: "Stay on track with Nepal's National Immunization Programme and never miss a vaccine.",
    descNe: 'नेपालको राष्ट्रिय खोप कार्यक्रम अनुसार ट्र्याक राख्नुहोस् र कुनै पनि खोप नछुटाउनुहोस्।',
  },
  {
    icon: 'sparkles-outline',
    color: '#8E24AA',
    titleEn: 'Milestones & M-CHAT',
    titleNe: 'विकास चरण र M-CHAT',
    descEn: 'Monitor developmental milestones and autism screening to ensure healthy growth.',
    descNe: 'विकासका चरणहरू र अटिज्म जाँचको निगरानी गरी स्वस्थ वृद्धि सुनिश्चित गर्नुहोस्।',
  },
  {
    icon: 'diamond-outline',
    color: t.green,
    titleEn: 'Settings & Premium',
    titleNe: 'सेटिङ र प्रिमियम',
    descEn: 'Manage your account, switch languages (Nepali/English), and unlock premium features via subscription codes.',
    descNe: 'आफ्नो खाता व्यवस्थापन गर्नुहोस्, भाषा (नेपाली/अंग्रेजी) परिवर्तन गर्नुहोस्, र सदस्यता कोडद्वारा प्रिमियम सुविधाहरू अनलक गर्नुहोस्।',
  },
]);

interface OnboardingProps {
  onComplete: () => void;
  screen?: 'home' | 'dashboard';
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const { palette: t } = useContext(ThemeContext);
  const steps = makeSteps(t);
  const styles = makeStyles(t);
  const { language } = useContext(LanguageContext);
  const isNe = language === 'ne';
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const seen = await AsyncStorage.getItem(ONBOARDING_KEY);
      if (!mounted) return;
      if (seen === 'true') {
        onComplete();
      } else {
        setVisible(true);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const finish = async () => {
    try { await AsyncStorage.setItem(ONBOARDING_KEY, 'true'); } catch {}
    onComplete();
  };

  const handleNext = () => {
    if (step < steps.length - 1) setStep(step + 1);
    else finish();
  };

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={finish}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={finish}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.skipText}>{isNe ? 'छोड्नुहोस्' : 'Skip'}</Text>
          </TouchableOpacity>

          <View style={[styles.iconCircle, { backgroundColor: current.color + '1A' }]}>
            <Ionicons name={current.icon} size={58} color={current.color} />
          </View>

          <Text style={styles.title}>{isNe ? current.titleNe : current.titleEn}</Text>
          <Text style={styles.desc}>{isNe ? current.descNe : current.descEn}</Text>

          <View style={styles.dots}>
            {steps.map((_, i) => (
              <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
            ))}
          </View>

          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: current.color }]}
            onPress={handleNext}
            activeOpacity={0.85}
          >
            <Text style={styles.nextText}>
              {isLast ? (isNe ? 'सुरु गर्नुहोस्' : 'Get Started') : (isNe ? 'अर्को' : 'Next')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (t: Palette) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.62)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: t.surface,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    position: 'relative',
  },
  skipBtn: {
    position: 'absolute',
    top: 14,
    right: 18,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  skipText: { color: t.muted, fontWeight: '600', fontSize: 14 },
  iconCircle: {
    width: 108,
    height: 108,
    borderRadius: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: t.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  desc: {
    fontSize: 14.5,
    color: t.muted2,
    textAlign: 'center',
    lineHeight: 21,
    minHeight: 63,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 22,
    marginBottom: 22,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: t.border,
  },
  dotActive: {
    backgroundColor: t.clay,
    width: 22,
  },
  nextBtn: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
  },
  nextText: { color: t.onAccent, fontWeight: '700', fontSize: 16 },
});
