// src/components/PremiumGuard.tsx - Enhanced with Granular Paywall Logic
import React, { useContext } from 'react';
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

// Feature Access Matrix
const FEATURE_ACCESS: Record<FeatureType, 'free' | 'premium'> = {
  immunization: 'free',           // Free base, tabs gated in-screen
  growth_report: 'premium',       // Paid feature
  milestone_tracker: 'premium',   // Premium to mark achieved, free to view
  nutrition: 'premium',           // Premium feature
  autism_screening: 'premium',    // Premium only
};

// Mock subscription check (replace with actual auth context)


export const PremiumGuard: React.FC<PremiumGuardProps> = ({ 
  children, 
  feature = 'immunization',
  onUpgrade 
}) => {
  const { language } = useContext(LanguageContext);
  const isNe = language === 'ne';
  const isPremiumFeature = FEATURE_ACCESS[feature] === 'premium';
  // Use auth context to check premium
  const { subscription } = useAuth();
  const userIsPremium = subscription?.status === 'active' || subscription?.plan === 'premium';

  // If it's a free feature or user is premium, show content
  if (!isPremiumFeature || userIsPremium) {
    return <>{children}</>;
  }

  // Show paywall for premium features
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {children}
      </View>
      <View style={styles.paywall}>
        <View style={styles.paywallContent}>
          <Ionicons name="lock-closed" size={48} color="#FFB300" />
          <Text style={styles.paywallTitle}>
            {isNe ? 'प्रीमियम सुविधा' : 'Premium Feature'}
          </Text>
          <Text style={styles.paywallText}>
            {isNe
              ? 'यो सुविधा प्रयोग गर्न प्रिमियम सदस्यता आवश्यक छ।'
              : 'This feature requires a premium subscription.'}
          </Text>
          <TouchableOpacity style={styles.upgradeBtn} onPress={onUpgrade}>
            <Text style={styles.upgradeBtnText}>
              {isNe ? 'अपग्रेड गर्नुहोस्' : 'Upgrade Now'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.paywallNote}>
            {isNe
              ? 'प्रिमियम सदस्यता लिएर सबै सुविधाहरू प्रयोग गर्नुहोस्।'
              : 'Unlock all features with premium membership'}
          </Text>
        </View>
      </View>
    </View>
  );
};

// Preview component for milestone tracker (show partial content)
export const MilestonePreview: React.FC<{ children: React.ReactNode; isLocked?: boolean }> = ({ 
  children, 
  isLocked = false 
}) => {
  const { language } = useContext(LanguageContext);
  const isNe = language === 'ne';

  if (!isLocked) {
    return <>{children}</>;
  }

  return (
    <View style={styles.previewContainer}>
      <View style={styles.previewContent}>
        {children}
      </View>
      <View style={styles.previewOverlay}>
        <View style={styles.previewMessage}>
          <Ionicons name="star" size={32} color="#FFB300" />
          <Text style={styles.previewTitle}>
            {isNe ? 'प्रीमियम सुविधा' : 'Premium Feature'}
          </Text>
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
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginHorizontal: 20,
  },
  paywallTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  paywallText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  upgradeBtn: {
    backgroundColor: '#FFB300',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
    marginBottom: 12,
  },
  upgradeBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  paywallNote: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  previewContainer: { position: 'relative', opacity: 0.6 },
  previewContent: { flex: 1 },
  previewOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewMessage: {
    alignItems: 'center',
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginTop: 12,
  },
  previewText: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
});
