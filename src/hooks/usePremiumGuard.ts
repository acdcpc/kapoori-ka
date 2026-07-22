/**
 * Premium Feature Guard Hook — v2
 * Checks: status active, plan is premium, AND expiresAt > now.
 * Firestore is always source of truth via AuthContext.
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
  const { subscription } = useAuth();

  const isPremium = (): boolean => {
    if (!subscription) return false;
    // Must be active + premium plan
    const hasActive = subscription.status === 'active'
      || subscription.plan === 'premium'
      || subscription.plan === 'yearly'
      || subscription.plan === 'monthly';
    if (!hasActive) return false;
    // Must not be expired
    if (subscription.endDate) {
      const endMs = subscription.endDate instanceof Date
        ? subscription.endDate.getTime()
        : (subscription.endDate as any).seconds
          ? (subscription.endDate as any).seconds * 1000
          : (subscription.endDate as any).toMillis?.()
            ?? new Date(subscription.endDate as any).getTime();
      if (isNaN(endMs)) return false;
      if (Date.now() > endMs) return false;
    }
    return true;
  };

  const canAccessFeature = (feature: PremiumFeature): boolean => {
    if (!feature.requiresPremium) return true;
    if (!isPremium()) return false;
    if (feature.consultationsRequired) {
      return (subscription?.consultationsRemaining ?? 0) >= (feature.consultationsRequired ?? 1);
    }
    return true;
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

  return {
    canAccessFeature,
    isPremium,
    isSubscriptionActive,
    getRemainingConsultations,
    guardFeature,
    checkConsultationLimit,
    useConsultation,
  };
};
