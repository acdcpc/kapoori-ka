/**
 * Premium Feature Guard Hook
 *
 * Provides utilities to check if user has access to premium features
 * and handle upgrade prompts
 */

import { Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';

export interface PremiumFeature {
  name: string;
  requiresPremium: boolean;
  consultationsRequired?: number;
}

export const PREMIUM_FEATURES = {
  ADVANCED_CHARTS: {
    name: 'Advanced Growth Charts',
    requiresPremium: true,
  },
  NUTRITION_TRACKING: {
    name: 'Nutrition Tracking',
    requiresPremium: true,
  },
  MCHAT_SCREENING: {
    name: 'M-CHAT Screening',
    requiresPremium: true,
  },
  PDF_REPORTS: {
    name: 'PDF Report Export',
    requiresPremium: true,
  },
  PUSH_NOTIFICATIONS: {
    name: 'Push Notifications',
    requiresPremium: true,
  },
  ONLINE_CONSULTATION: {
    name: 'Online Consultation',
    requiresPremium: true,
    consultationsRequired: 1,
  },
} as const;

export const usePremiumGuard = () => {
  const { subscription, user } = useAuth();

  /**
   * Check if user can access a premium feature
   */
  const canAccessFeature = (feature: PremiumFeature): boolean => {
    if (!user) return false;
    if (!feature.requiresPremium) return true;
    if (subscription?.plan === 'premium') {
      // Check consultations if needed
      if (feature.consultationsRequired) {
        return (subscription.consultationsRemaining ?? 0) >= (feature.consultationsRequired ?? 1);
      }
      return true;
    }
    return false;
  };

  /**
   * Check if user is premium
   */
  const isPremium = (): boolean => {
    return subscription?.plan === 'premium' && subscription?.status === 'active';
  };

  /**
   * Check if subscription is active
   */
  const isSubscriptionActive = (): boolean => {
    return subscription?.status === 'active';
  };

  /**
   * Get remaining consultations
   */
  const getRemainingConsultations = (): number => {
    return subscription?.consultationsRemaining ?? 0;
  };

  /**
   * Guard a feature and show upgrade prompt if needed
   */
  const guardFeature = (feature: PremiumFeature, onUpgrade?: () => void): boolean => {
    if (canAccessFeature(feature)) {
      return true;
    }

    // Show upgrade prompt
    Alert.alert(
      'Premium Feature',
      `${feature.name} is only available for premium users. Upgrade now for Rs 850/year.`,
      [
        {
          text: 'Cancel',
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: 'Upgrade',
          onPress: onUpgrade,
        },
      ]
    );

    return false;
  };

  /**
   * Check consultation limit
   */
  const checkConsultationLimit = (): boolean => {
    if (!isPremium()) return false;
    return getRemainingConsultations() > 0;
  };

  /**
   * Decrement consultation count
   */
  const useConsultation = (): void => {
    if (subscription) {
      subscription.consultationsRemaining = Math.max(
        0,
        (subscription.consultationsRemaining ?? 0) - 1
      );
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
