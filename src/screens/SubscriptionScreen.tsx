// src/screens/SubscriptionScreen.tsx
// v2: Google Play compliant — NO payment links, buttons, or instructions in-app.
// Shows premium benefits + status (Locked / Pending / Active).
// Activation code redemption for the web-based payment flow.
import React, { useContext, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert,
  ActivityIndicator, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LanguageContext } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

const MONTHLY_PRICE_NPR = 100;
const YEARLY_PRICE_NPR = 500;

const FREE_FEATURES_EN = [
  { icon: '👶', text: '1 child profile' },
  { icon: '📈', text: 'Basic growth chart (weight & height)' },
  { icon: '💉', text: 'Immunization tracker & schedule (All tab)' },
  { icon: '🧠', text: 'View all milestone cards' },
  { icon: '🥦', text: 'Full nutrition guide (all ages)' },
];

const FREE_FEATURES_NE = [
  { icon: '👶', text: '१ बच्चाको प्रोफाइल' },
  { icon: '📈', text: 'आधारभूत वृद्धि चार्ट (तौल र उचाइ)' },
  { icon: '💉', text: 'खोप ट्र्याकर र तालिका (सबै ट्याब)' },
  { icon: '🧠', text: 'सबै विकासका चरणहरू हेर्न पाइने' },
  { icon: '🥦', text: 'पूर्ण पोषण गाइड (सबै उमेर)' },
];

const PAID_FEATURES_EN = [
  { icon: '👨👩👧👦', text: 'Unlimited children profiles' },
  { icon: '📊', text: 'Full WHO growth diagnostics (Stunted/Wasted/Obese)' },
  { icon: '📄', text: 'PDF growth & health reports' },
  { icon: '🧠', text: 'Full developmental milestone tracker' },
  { icon: '🔍', text: 'M-CHAT autism screening' },
  { icon: '📱', text: 'Priority WhatsApp support' },
  { icon: '🩺', text: 'Doctor referral guidance' },
];

const PAID_FEATURES_NE = [
  { icon: '👨👩👧👦', text: 'असीमित बच्चाको प्रोफाइल' },
  { icon: '📊', text: 'पूर्ण WHO वृद्धि निदान (Stunted/Wasted/Obese)' },
  { icon: '📄', text: 'PDF वृद्धि र स्वास्थ्य रिपोर्ट' },
  { icon: '🧠', text: 'पूर्ण विकास मापदण्ड ट्र्याकर' },
  { icon: '🔍', text: 'M-CHAT अटिजम स्क्रिनिङ' },
  { icon: '📱', text: 'प्राथमिकता WhatsApp सहायता' },
  { icon: '🩺', text: 'चिकित्सक रेफरल मार्गदर्शन' },
];

export default function SubscriptionScreen() {
  const { language } = useContext(LanguageContext);
  const { subscription, redeemCode, refreshUserData, loading: authLoading } = useAuth();
  const isNe = language === 'ne';

  const [redemptionCode, setRedemptionCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);

  const freeFeatures = isNe ? FREE_FEATURES_NE : FREE_FEATURES_EN;
  const paidFeatures = isNe ? PAID_FEATURES_NE : PAID_FEATURES_EN;

  const isActive = subscription?.status === 'active';
  const isPending = subscription?.status === 'pending';

  const handleRedeem = async () => {
    if (!redemptionCode.trim()) {
      Alert.alert(
        isNe ? 'त्रुटि' : 'Error',
        isNe ? 'कृपया एक्टिभेसन कोड लेख्नुहोस्' : 'Please enter an activation code',
      );
      return;
    }

    setRedeeming(true);
    try {
      await redeemCode(redemptionCode.trim());
      Alert.alert(
        isNe ? 'सफल!' : 'Success!',
        isNe ? 'प्रिमियम सक्रिय भयो! 🎉' : 'Premium activated successfully! 🎉',
      );
      setRedemptionCode('');
      if (refreshUserData) await refreshUserData();
    } catch (err: any) {
      let msg = isNe ? 'कोड रिडिम गर्न सकिएन' : 'Failed to redeem code';
      if (err?.code === 'not-found' || err?.message?.includes('invalid'))
        msg = isNe ? 'अमान्य एक्टिभेसन कोड' : 'Invalid activation code';
      else if (err?.code === 'already-claimed' || err?.message?.includes('already'))
        msg = isNe ? 'यो कोड पहिले नै प्रयोग भइसकेको छ' : 'This code has already been used';
      Alert.alert(isNe ? 'त्रुटि' : 'Error', msg);
    } finally {
      setRedeeming(false);
    }
  };

  if (authLoading || redeeming) {
    return <ActivityIndicator size="large" color="#E8602C" style={{ flex: 1 }} />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }}>
      {/* Active Subscription Status */}
      {isActive && (
        <View style={styles.statusCard}>
          <Ionicons name="checkmark-circle" size={28} color="#4CAF50" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.statusActive}>
              {subscription.plan === 'monthly'
                ? (isNe ? 'मासिक सदस्यता सक्रिय' : 'Monthly Plan Active')
                : (isNe ? 'वार्षिक सदस्यता सक्रिय' : 'Yearly Plan Active')}
            </Text>
            <Text style={styles.statusExpiry}>
              {isNe ? 'समाप्त मिति' : 'Expires'}:{' '}
              {subscription.endDate instanceof Date
                ? subscription.endDate.toLocaleDateString()
                : subscription.endDate
                  ? new Date(subscription.endDate as any).toLocaleDateString()
                  : 'N/A'}
            </Text>
          </View>
        </View>
      )}

      {/* Pending Verification Status */}
      {isPending && (
        <View style={styles.pendingCard}>
          <Ionicons name="time-outline" size={28} color="#FF9800" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.pendingTitle}>
              {isNe ? 'भुक्तानी जाँच हुँदैछ' : 'Payment Being Verified'}
            </Text>
            <Text style={styles.pendingText}>
              {isNe
                ? 'तपाईंको भुक्तानी जाँच भइरहेको छ। यसले केहि घण्टा लिन सक्छ।'
                : 'Your payment is being verified. This usually takes a few hours.'}
            </Text>
          </View>
        </View>
      )}

      {/* Free vs Premium */}
      <Text style={styles.sectionLabel}>
        {isNe ? '🆓 निःशुल्क  vs  ⭐ प्रिमियम' : "🆓 What's Free vs ⭐ Premium"}
      </Text>

      <View style={styles.featuresRow}>
        <View style={styles.featureCard}>
          <View style={styles.featureCardHeader}>
            <Text style={styles.featureCardTitle}>🆓 {isNe ? 'निःशुल्क' : 'Free'}</Text>
          </View>
          {freeFeatures.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.featureCard, styles.featureCardPremium]}>
          <View style={[styles.featureCardHeader, { backgroundColor: '#E8602C' }]}>
            <Text style={[styles.featureCardTitle, { color: '#fff' }]}>
              ⭐ {isNe ? 'प्रिमियम' : 'Premium'}
            </Text>
          </View>
          {paidFeatures.map((f, i) => (
            <View key={i} style={[styles.featureRow, { borderBottomColor: '#F7F1EB' }]}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={[styles.featureText, { color: '#E8602C' }]}>{f.text}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Pricing */}
      {!isActive && (
        <>
          <Text style={styles.sectionLabel}>
            {isNe ? 'मूल्य' : 'Pricing'}
          </Text>

          <View style={styles.pricingRow}>
            <View style={styles.priceCard}>
              <Text style={styles.pricePlan}>{isNe ? 'मासिक' : 'Monthly'}</Text>
              <Text style={styles.priceAmount}>NPR 100</Text>
              <Text style={styles.pricePeriod}>/ {isNe ? 'महिना' : 'month'}</Text>
            </View>
            <View style={[styles.priceCard, styles.priceCardBest]}>
              <View style={styles.bestBadge}>
                <Text style={styles.bestBadgeText}>{isNe ? 'सर्वोत्तम' : 'BEST'}</Text>
              </View>
              <Text style={styles.pricePlan}>{isNe ? 'वार्षिक' : 'Yearly'}</Text>
              <Text style={[styles.priceAmount, { color: '#E8602C' }]}>NPR 500</Text>
              <Text style={styles.pricePeriod}>/ {isNe ? 'वर्ष' : 'year'}</Text>
              <Text style={styles.priceSave}>
                {isNe ? '५८% बचत!' : '58% saving!'}
              </Text>
            </View>
          </View>

          {/* Neutral compliance message — no links, no URLs, no payment instructions */}
          <View style={styles.complianceNote}>
            <Ionicons name="information-circle-outline" size={20} color="#C4956A" />
            <Text style={styles.complianceText}>
              {isNe
                ? 'प्रिमियम हाल हाम्रो आधिकारिक माध्यमहरू मार्फत उपलब्ध छ।'
                : 'Premium is currently available through our official channels.'}
            </Text>
          </View>

          {/* Activation Code Redemption (neutral — not a payment solicitation) */}
          <Text style={styles.sectionLabel}>
            {isNe ? '🔑 एक्टिभेसन कोड छ? सक्रिय गर्नुहोस्' : '🔑 Have an activation code? Redeem it'}
          </Text>

          <View style={styles.redeemBox}>
            <TextInput
              style={styles.redeemInput}
              placeholder={isNe ? 'एक्टिभेसन कोड लेख्नुहोस्' : 'Enter your activation code'}
              placeholderTextColor="#C4956A"
              value={redemptionCode}
              onChangeText={setRedemptionCode}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[styles.redeemBtn, !redemptionCode.trim() && styles.redeemBtnDisabled]}
              onPress={handleRedeem}
              disabled={!redemptionCode.trim()}
            >
              <Text style={styles.redeemBtnText}>
                {isNe ? 'सक्रिय' : 'Redeem'}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF8F2' },
  statusCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 12, marginTop: 16, marginBottom: 8,
    backgroundColor: '#E8F5E9', borderRadius: 14, padding: 16,
    borderWidth: 1.5, borderColor: '#4CAF50',
  },
  statusActive: { fontSize: 16, fontWeight: '700', color: '#2E7D32' },
  statusExpiry: { fontSize: 12, color: '#666', marginTop: 4 },
  pendingCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 12, marginTop: 16, marginBottom: 8,
    backgroundColor: '#FFF8E1', borderRadius: 14, padding: 16,
    borderWidth: 1.5, borderColor: '#FF9800',
  },
  pendingTitle: { fontSize: 16, fontWeight: '700', color: '#E65100' },
  pendingText: { fontSize: 13, color: '#666', marginTop: 4, lineHeight: 18 },

  sectionLabel: {
    fontSize: 13, fontWeight: '700', color: '#C4956A',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
    textTransform: 'uppercase', letterSpacing: 1,
  },

  featuresRow: { flexDirection: 'row', marginHorizontal: 12, gap: 10, marginBottom: 8 },
  featureCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14,
    overflow: 'hidden', elevation: 2, shadowColor: '#C4956A',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
  },
  featureCardPremium: { borderWidth: 1.5, borderColor: '#E8602C' },
  featureCardHeader: { backgroundColor: '#F7F1EB', padding: 10, alignItems: 'center' },
  featureCardTitle: { fontSize: 13, fontWeight: '800', color: '#333' },
  featureRow: {
    flexDirection: 'row', alignItems: 'flex-start', padding: 8,
    borderBottomWidth: 1, borderBottomColor: '#EDE0D4', gap: 6,
  },
  featureIcon: { fontSize: 14, width: 22 },
  featureText: { flex: 1, fontSize: 11, color: '#555', lineHeight: 16 },

  // Pricing
  pricingRow: { flexDirection: 'row', marginHorizontal: 12, gap: 10, marginBottom: 16 },
  priceCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14,
    padding: 16, alignItems: 'center',
    borderWidth: 2, borderColor: '#EDE0D4',
  },
  priceCardBest: {
    borderColor: '#E8602C', backgroundColor: '#FFF5F0',
  },
  bestBadge: {
    position: 'absolute', top: -10, backgroundColor: '#FFD700',
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8,
  },
  bestBadgeText: { fontSize: 10, fontWeight: '900', color: '#000' },
  pricePlan: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 6 },
  priceAmount: { fontSize: 24, fontWeight: '800', color: '#333' },
  pricePeriod: { fontSize: 12, color: '#999', marginTop: 2 },
  priceSave: { fontSize: 12, color: '#4CAF50', fontWeight: '700', marginTop: 6 },

  // Compliance note — no links, no URLs
  complianceNote: {
    flexDirection: 'row', alignItems: 'flex-start',
    marginHorizontal: 12, marginTop: 8, marginBottom: 4,
    backgroundColor: '#F7F1EB', borderRadius: 12, padding: 14, gap: 8,
  },
  complianceText: { flex: 1, fontSize: 13, color: '#C4956A', lineHeight: 18 },

  // Redemption
  redeemBox: {
    flexDirection: 'row', marginHorizontal: 12, marginTop: 8,
    backgroundColor: '#fff', borderRadius: 14, padding: 8,
    borderWidth: 1.5, borderColor: '#E8602C', gap: 8,
  },
  redeemInput: {
    flex: 1, fontSize: 16, color: '#333',
    paddingHorizontal: 12, paddingVertical: 12,
    letterSpacing: 2, fontWeight: '600',
  },
  redeemBtn: {
    backgroundColor: '#E8602C', borderRadius: 10,
    paddingHorizontal: 24, justifyContent: 'center',
  },
  redeemBtnDisabled: { backgroundColor: '#EDE0D4' },
  redeemBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
