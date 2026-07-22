// src/components/PremiumGuard.tsx — v3
// Four-state rendering per addendum: Free / Locked / Pending / Active
// NO buttons, NO links, NO "Upgrade"/"Unlock"/"Learn More" anywhere.
// Locked state sells the benefit, not the purchase process.
import React, { useContext, useMemo, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { LanguageContext } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

export type FeatureType = 'immunization' | 'growth_report' | 'milestone_tracker' | 'nutrition' | 'autism_screening';

interface PremiumGuardProps {
  children: React.ReactNode;
  feature?: FeatureType;
}

const FEATURE_ACCESS: Record<FeatureType, 'free' | 'premium'> = {
  immunization: 'free',
  growth_report: 'premium',
  milestone_tracker: 'premium',
  nutrition: 'premium',
  autism_screening: 'premium',
};

const FEATURE_BENEFITS: Record<FeatureType, { en: string; ne: string; icon: string }> = {
  immunization: {
    en: 'Track upcoming & missed vaccines with smart reminders',
    ne: 'स्मार्ट रिमाइन्डरको साथ आउने र छुटेका खोपहरू ट्र्याक गर्नुहोस्',
    icon: '💉',
  },
  growth_report: {
    en: 'WHO percentile charts with stunting/wasting/obesity diagnostics',
    ne: 'स्टन्टिङ्ग/वेस्टिङ्ग/ओबेसिटी निदान सहित WHO प्रतिशत चार्टहरू',
    icon: '📊',
  },
  milestone_tracker: {
    en: 'Track 100+ developmental milestones across 5 domains (WHO standards)',
    ne: '५ क्षेत्रका १००+ विकास चरणहरू ट्र्याक गर्नुहोस् (WHO मापदण्ड)',
    icon: '🧠',
  },
  nutrition: {
    en: 'Age-specific meal plans, traditional weaning foods, and myth-busting guides',
    ne: 'उमेर अनुसारको खाना योजना, परम्परागत सर्बोत्तम पिठो, र गलत-धारणा गाइडहरू',
    icon: '🥦',
  },
  autism_screening: {
    en: 'M-CHAT-R/F screening tool for early autism detection (16–30 months)',
    ne: 'प्रारम्भिक अटिजम पहिचानको लागि M-CHAT-R/F स्क्रिनिङ (१६–३० महिना)',
    icon: '🔍',
  },
};

export const PremiumGuard: React.FC<PremiumGuardProps> = ({ children, feature = 'immunization' }) => {
  const { language } = useContext(LanguageContext);
  const isNe = language === 'ne';
  const isPremiumFeature = FEATURE_ACCESS[feature] === 'premium';
  const { subscription, user } = useAuth();

  // Pending payment check
  const [hasPendingPayment, setHasPendingPayment] = useState(false);

  const checkPending = useCallback(async () => {
    if (!user || !isPremiumFeature) return;
    try {
      const q = query(
        collection(db, 'payments'),
        where('userId', '==', user.uid),
        where('status', '==', 'pending'),
        limit(1),
      );
      const snap = await getDocs(q);
      setHasPendingPayment(!snap.empty);
    } catch {
      setHasPendingPayment(false);
    }
  }, [user, isPremiumFeature]);

  useEffect(() => { checkPending(); }, [checkPending]);

  // Revalidate on app foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkPending();
    });
    return () => sub.remove();
  }, [checkPending]);

  // Premium state resolution
  const premiumState = useMemo<'free' | 'locked' | 'pending' | 'active'>(() => {
    if (!isPremiumFeature) return 'free';

    if (subscription) {
      const hasActive = subscription.status === 'active'
        || subscription.plan === 'premium'
        || subscription.plan === 'yearly'
        || subscription.plan === 'monthly';
      if (hasActive) {
        let expired = false;
        if (subscription.endDate) {
          const endMs = subscription.endDate instanceof Date
            ? subscription.endDate.getTime()
            : (subscription.endDate as any).seconds
              ? (subscription.endDate as any).seconds * 1000
              : (subscription.endDate as any).toMillis?.()
                ?? new Date(subscription.endDate as any).getTime();
          if (!isNaN(endMs) && Date.now() > endMs) expired = true;
        }
        if (!expired) return 'active';
      }
    }

    if (subscription?.status === 'pending' || hasPendingPayment) return 'pending';
    return 'locked';
  }, [subscription, isPremiumFeature, hasPendingPayment]);

  if (premiumState === 'free' || premiumState === 'active') {
    return <>{children}</>;
  }

  const benefit = FEATURE_BENEFITS[feature];

  // Pending — informational only
  if (premiumState === 'pending') {
    return (
      <View style={styles.container}>
        <View style={styles.pendingOverlay}>
          <View style={styles.pendingCard}>
            <Ionicons name="time-outline" size={40} color="#FF9800" />
            <Text style={styles.pendingTitle}>
              {isNe ? 'प्रिमियम जाँच हुँदैछ' : 'Premium Being Verified'}
            </Text>
            <Text style={styles.pendingText}>
              {isNe
                ? 'तपाईंको भुक्तानी जाँच भइरहेको छ। यसले केहि घण्टा लिन सक्छ।'
                : 'Your payment is being verified. This usually takes a few hours.'}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // Locked — benefit + visual badge only, NO buttons
  return (
    <View style={styles.container}>
      <View style={styles.dimmedContent}>{children}</View>
      <View style={styles.lockedOverlay}>
        <View style={styles.lockedCard}>
          <Text style={styles.lockedIcon}>{benefit.icon}</Text>
          <Text style={styles.lockedTitle}>
            {isNe ? 'प्रिमियम सुविधा' : 'Premium Feature'}
          </Text>
          <Text style={styles.lockedBenefit}>
            {isNe ? benefit.ne : benefit.en}
          </Text>
          <View style={styles.premiumBadge}>
            <Ionicons name="diamond-outline" size={14} color="#E8602C" />
            <Text style={styles.premiumBadgeText}>PREMIUM</Text>
          </View>
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
              ? 'सबै विकासका चरणहरू ट्र्याक गर्न प्रिमियम सदस्यता आवश्यक छ।'
              : 'A premium subscription is required to track all milestones.'}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, position: 'relative' },
  dimmedContent: { flex: 1, opacity: 0.4 },

  lockedOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  lockedCard: {
    backgroundColor: '#FDF8F2', borderRadius: 20, padding: 28, alignItems: 'center',
    maxWidth: 320, width: '100%', borderWidth: 1.5, borderColor: '#EDE0D4',
    shadowColor: '#C4956A', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
  },
  lockedIcon: { fontSize: 40, marginBottom: 12 },
  lockedTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 8 },
  lockedBenefit: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  premiumBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFF5F0', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: '#E8602C',
  },
  premiumBadgeText: { fontSize: 11, fontWeight: '800', color: '#E8602C', letterSpacing: 2 },

  pendingOverlay: {
    ...StyleSheet.absoluteFill, justifyContent: 'center', alignItems: 'center',
    padding: 20, backgroundColor: 'rgba(255,255,255,0.9)',
  },
  pendingCard: {
    backgroundColor: '#FFF8E1', borderRadius: 20, padding: 28, alignItems: 'center',
    maxWidth: 320, width: '100%', borderWidth: 2, borderColor: '#FF9800',
  },
  pendingTitle: { fontSize: 18, fontWeight: '700', color: '#E65100', marginTop: 12, marginBottom: 8 },
  pendingText: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20 },

  previewContainer: { position: 'relative', opacity: 0.6 },
  previewContent: { flex: 1 },
  previewOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(255,255,255,0.8)', justifyContent: 'center', alignItems: 'center' },
  previewMessage: { alignItems: 'center' },
  previewTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E', marginTop: 12 },
  previewText: { fontSize: 13, color: '#7A6E65', marginTop: 8, textAlign: 'center' },
});
