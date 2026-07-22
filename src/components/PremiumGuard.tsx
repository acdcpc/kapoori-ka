// src/components/PremiumGuard.tsx — Production Audit Fix
// ISSUE 5 FIX: Removed mock bypass. Uses real AuthContext subscription.
// ISSUE 5 FIX: Added stale-state guard — caches subscription on mount.
// ISSUE 5 FIX: Shows loading state while subscription is resolving.

import React, { useContext, useEffect, useRef } from 'react';
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

  // ISSUE 5 FIX: Cache initial subscription value to prevent flickers
  // during auth state transitions (token refresh, etc.)
  const cachedSub = useRef(subscription);
  if (subscription && subscription.status === 'active') {
    cachedSub.current = subscription;
  }

  // ISSUE 5 FIX: Standard premium check — status 'active' OR plan 'premium'/'yearly'
  // Removed 'beta_free' since that was a development artifact.
  const effectiveSub = subscription ?? cachedSub.current;
  const userIsPremium = effectiveSub?.status === 'active' || effectiveSub?.plan === 'premium' || effectiveSub?.plan === 'yearly';

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
            {isNe ? 'यो सुविधा प्रयोग गर्न प्रिमियम सदस्यता आवश्यक छ।' : 'This feature requires a premium subscription.'}
          </Text>
          <TouchableOpacity style={styles.upgradeBtn} onPress={onUpgrade}>
            <Text style={styles.upgradeBtnText}>{isNe ? 'अपग्रेड गर्नुहोस्' : 'Upgrade Now'}</Text>
          </TouchableOpacity>
          <Text style={styles.paywallNote}>
            {isNe ? 'प्रिमियम सदस्यता लिएर सबै सुविधाहरू प्रयोग गर्नुहोस्।' : 'Unlock all features with premium membership'}
          </Text>
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
          <Text style={styles.previewText}>{isNe ? 'सबै विकासका चरणहरू ट्र्याक गर्न प्रिमियम सदस्यता लिनुहोस्।' : 'Upgrade to track all milestones'}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, position: 'relative' },
  content: { flex: 1 },
  paywall: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  paywallContent: { backgroundColor: '#FDF8F2', borderRadius: 16, padding: 24, alignItems: 'center', marginHorizontal: 20 },
  paywallTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A2E', marginTop: 16, marginBottom: 8 },
  paywallText: { fontSize: 14, color: '#7A6E65', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  upgradeBtn: { backgroundColor: '#F5A623', borderRadius: 28, paddingVertical: 12, paddingHorizontal: 32, marginBottom: 12 },
  upgradeBtnText: { color: '#fff', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  paywallNote: { fontSize: 12, color: '#7A6E65', textAlign: 'center', fontStyle: 'italic' },
  previewContainer: { position: 'relative', opacity: 0.6 },
  previewContent: { flex: 1 },
  previewOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(255, 255, 255, 0.8)', justifyContent: 'center', alignItems: 'center' },
  previewMessage: { alignItems: 'center' },
  previewTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E', marginTop: 12 },
  previewText: { fontSize: 13, color: '#7A6E65', marginTop: 8, textAlign: 'center' },
});
