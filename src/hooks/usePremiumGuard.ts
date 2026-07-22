/**
 * Premium Feature Guard Hook — Production Audit Fix
 * ISSUE 5 FIX: Removed hardcoded `return true` bypass.
 * Now properly checks subscription status from AuthContext.
 */

import { Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';

export interface PremiumFeature {
  name: string;
  requiresPremium: boolean;
  consultationsRequired?: number;
}

export const PREMIUM_FEATURES = {
  ADVANCED_CHARTS:    { name: 'Advanced Growth Charts', requiresPremium: true },
  NUTRITION_TRACKING:  { name: 'Nutrition Tracking', requiresPremium: true },
  MCHAT_SCREENING:    { name: 'M-CHAT Screening', requiresPremium: true },
  PDF_REPORTS:        { name: 'PDF Report Export', requiresPremium: true },
  PUSH_NOTIFICATIONS: { name: 'Push Notifications', requiresPremium: true },
  ONLINE_CONSULTATION:{ name: 'Online Consultation', requiresPremium: true, consultationsRequired: 1 },
} as const;

export const usePremiumGuard = () => {
  const { subscription, user } = useAuth();

  const canAccessFeature = (feature: PremiumFeature): boolean => {
    if (!user) return false;
    if (!feature.requiresPremium) return true;
    // ISSUE 5 FIX: Check both status and plan
    if (subscription?.status === 'active' || subscription?.plan === 'premium' || subscription?.plan === 'yearly') {
      if (feature.consultationsRequired) {
        return (subscription.consultationsRemaining ?? 0) >= (feature.consultationsRequired ?? 1);
      }
      return true;
    }
    return false;
  };

  const isPremium = (): boolean => {
    // ISSUE 5 FIX: Real check — no bypass
    return (subscription?.status === 'active' || subscription?.plan === 'premium' || subscription?.plan === 'yearly');
  };

  const isSubscriptionActive = (): boolean => {
    return subscription?.status === 'active';
  };

  const getRemainingConsultations = (): number => {
    return subscription?.consultationsRemaining ?? 0;
  };

  const guardFeature = (feature: PremiumFeature, onUpgrade?: () => void): boolean => {
    if (canAccessFeature(feature)) return true;
    Alert.alert(
      'Premium Feature',
      `${feature.name} is only available for premium users.`,
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Upgrade', onPress: onUpgrade }]
    );
    return false;
  };

  const checkConsultationLimit = (): boolean => {
    if (!isPremium()) return false;
    return getRemainingConsultations() > 0;
  };

  const useConsultation = (): void => {
    if (subscription) {
      subscription.consultationsRemaining = Math.max(0, (subscription.consultationsRemaining ?? 0) - 1);
    }
  };

  return { canAccessFeature, isPremium, isSubscriptionActive, getRemainingConsultations, guardFeature, checkConsultationLimit, useConsultation };
};
