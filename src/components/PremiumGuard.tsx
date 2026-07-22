// src/components/PremiumGuard.tsx — v2
// Checks BOTH active status AND expiry date.
// Uses Firestore as source of truth; local cache drives optimistic UI only.

import React, { useContext, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LanguageContext } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

export type FeatureType = 'immunization' | 'growth_report' | 'milestone_tracker' | 'nutrition' | 'autism_screening';

interface PremiumGuardProps {
  children: React.ReactNode;
  feature?: FeatureType;
  onUpgrade?: () => void;
}

const FEATURE_ACCESS: Record<FeatureType, 'free' | 'premium'> = {
  immunization: 'free',
  growth_report: 'premium',
  milestone_tracker: 'premium',
  nutrition: 'premium',
  autism_screening: 'premium',
};

export const PremiumGuard: React.FC<PremiumGuardProps> = ({ children, feature = 'immunization', onUpgrade }) => {
  const { language } = useContext(LanguageContext);
  const isNe = language === 'ne';
  const isPremiumFeature = FEATURE_ACCESS[feature] === 'premium';
  const { subscription } = useAuth();

  // Check active AND not expired
  const userIsPremium = useMemo(() => {
    if (!subscription) return false;
    const hasActiveStatus = subscription.status === 'active'
      || subscription.plan === 'premium'
      || subscription.plan === 'yearly'
      || subscription.plan === 'monthly';
    if (!hasActiveStatus) return false;

    // Also check expiry
    if (subscription.endDate) {
      const endMs = subscription.endDate instanceof Date
        ? subscription.endDate.getTime()
        : (subscription.endDate as any).seconds
          ? (subscription.endDate as any).seconds * 1000
          : (subscription.endDate as any).toMillis?.()
            ?? new Date(subscription.endDate as any).getTime();
      if (!isNaN(endMs) && Date.now() > endMs) return false;
    }

    return true;
  }, [subscription]);

  if (!isPremiumFeature || userIsPremium) {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>{children}</View>
      <View style={styles.paywall}>
        <View style={styles.paywallContent}>
          <Ionicons name="lock-closed" size={48} color="#F5A623" />
          <Text style={styles.paywallTitle}>{isNe ? 'प्रीमियम सुविधा' : 'Premium Feature'}</Text>
          <Text style={styles.paywallText}>
            {isNe
              ? 'यो सुविधा प्रयोग गर्न प्रिमियम सदस्यता आवश्यक छ।'
              : 'This feature requires a premium subscription.'}
          </Text>
          <TouchableOpacity style={styles.upgradeBtn} onPress={onUpgrade}>
            <Text style={styles.upgradeBtnText}>
              {isNe ? 'थप जानकारी' : 'Learn More'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export const MilestonePreview: React.FC<{ children: React.ReactNode; isLocked?: boolean }> = ({ children, isLocked = false }) => {
  const { language } = useContext(LanguageContext);
  const isNe = language === 'ne';
  if (!isLocked) return <>{children}</>;
  return (
    <View style={styles.previewContainer}>
      <View style={styles.previewContent}>{children}</View>
      <View style={styles.previewOverlay}>
        <View style={styles.previewMessage}>
          <Ionicons name="star" size={32} color="#F5A623" />
          <Text style={styles.previewTitle}>{isNe ? 'प्रीमियम सुविधा' : 'Premium Feature'}</Text>
          <Text style={styles.previewText}>
            {isNe
              ? 'सबै विकासका चरणहरू ट्र्याक गर्न प्रिमियम सदस्यता लिनुहोस्।'
              : 'Upgrade to track all milestones'}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, position: 'relative' },
  content: { flex: 1 },
  paywall: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paywallContent: {
    backgroundColor: '#FDF8F2', borderRadius: 16, padding: 24,
    alignItems: 'center', marginHorizontal: 20,
  },
  paywallTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A2E', marginTop: 16, marginBottom: 8 },
  paywallText: { fontSize: 14, color: '#7A6E65', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  upgradeBtn: {
    backgroundColor: '#E8602C', borderRadius: 28, paddingVertical: 12,
    paddingHorizontal: 32, marginBottom: 8,
  },
  upgradeBtnText: { color: '#fff', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  previewContainer: { position: 'relative', opacity: 0.6 },
  previewContent: { flex: 1 },
  previewOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center', alignItems: 'center',
  },
  previewMessage: { alignItems: 'center' },
  previewTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E', marginTop: 12 },
  previewText: { fontSize: 13, color: '#7A6E65', marginTop: 8, textAlign: 'center' },
});
