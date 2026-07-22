// src/screens/SubscriptionScreen.tsx
// Web-based payment flow: User pays on the web payment page, admin sends back
// an activation code, user enters it here to activate premium.
import React, { useContext, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert,
  Linking, ActivityIndicator, Image, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LanguageContext } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { WHATSAPP_NUMBER, ESEWA_QR_URL, PAYMENT_WEB_URL } from '../constants';

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
  { icon: '👨‍👩‍👧‍👦', text: 'Unlimited children profiles' },
  { icon: '📊', text: 'Full WHO growth diagnostics (Stunted/Wasted/Obese)' },
  { icon: '📄', text: 'PDF growth & health reports' },
  { icon: '🧠', text: 'Full developmental milestone tracker' },
  { icon: '🔍', text: 'M-CHAT autism screening' },
  { icon: '📱', text: 'Priority WhatsApp support' },
  { icon: '🩺', text: 'Doctor referral guidance' },
];

const PAID_FEATURES_NE = [
  { icon: '👨‍👩‍👧‍👦', text: 'असीमित बच्चाको प्रोफाइल' },
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

  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [showQR, setShowQR] = useState(false);
  const [redemptionCode, setRedemptionCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);

  const freeFeatures = isNe ? FREE_FEATURES_NE : FREE_FEATURES_EN;
  const paidFeatures = isNe ? PAID_FEATURES_NE : PAID_FEATURES_EN;
  const amount = selectedPlan === 'monthly' ? MONTHLY_PRICE_NPR : YEARLY_PRICE_NPR;

  const openPaymentPage = () => {
    Linking.openURL(PAYMENT_WEB_URL);
  };

  const openWhatsApp = () => {
    const planLabel = selectedPlan === 'yearly'
      ? (isNe ? 'वार्षिक' : 'Yearly')
      : (isNe ? 'मासिक' : 'Monthly');
    const msg = encodeURIComponent(
      `Hello, I have paid NPR ${amount} for the ${planLabel} plan via eSewa.\nMy Transaction ID is: [Please enter your eSewa Transaction ID here]`
    );
    Linking.openURL(`https://wa.me/${WHATSAPP_NUMBER.replace('+', '')}?text=${msg}`);
  };

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
      setShowQR(false);
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
      {subscription?.status === 'active' ? (
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
                : 'N/A'}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Free vs Premium */}
      <Text style={styles.sectionLabel}>
        {isNe ? '🆓 निःशुल्क  vs  ⭐ प्रिमियम' : "🆓 What's Free vs ⭐ Premium?"}
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

      {/* Plans & Payment — only if not already active */}
      {subscription?.status !== 'active' && (
        <>
          <Text style={styles.sectionLabel}>
            {isNe ? 'आफ्नो योजना छान्नुहोस्' : 'Choose Your Plan'}
          </Text>

          <TouchableOpacity
            style={[styles.planCard, selectedPlan === 'monthly' && styles.planCardActive]}
            onPress={() => setSelectedPlan('monthly')}
          >
            <View>
              <Text style={styles.planName}>{isNe ? 'मासिक' : 'Monthly'}</Text>
              <Text style={styles.planPrice}>
                NPR {MONTHLY_PRICE_NPR} / {isNe ? 'महिना' : 'month'}
              </Text>
            </View>
            <View style={[styles.planRadio, selectedPlan === 'monthly' && styles.planRadioActive]} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.planCard, selectedPlan === 'yearly' && styles.planCardActive]}
            onPress={() => setSelectedPlan('yearly')}
          >
            <View>
              <Text style={styles.planName}>{isNe ? 'वार्षिक' : 'Yearly'}</Text>
              <Text style={styles.planPrice}>
                NPR {YEARLY_PRICE_NPR} / {isNe ? 'वर्ष' : 'year'}
              </Text>
              <Text style={styles.planSaving}>
                {isNe ? '५८% बचत!' : '58% saving!'}
              </Text>
            </View>
            <View>
              <View style={[styles.planRadio, selectedPlan === 'yearly' && styles.planRadioActive]} />
              <View style={styles.bestValueBadge}>
                <Text style={styles.bestValueText}>BEST</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Payment Instructions */}
          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsTitle}>
              {isNe ? '📋 भुक्तानी गर्ने तरिका' : '📋 How to Pay'}
            </Text>

            <View style={styles.instructionStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.stepText}>
                {isNe
                  ? `हाम्रो वेबसाइटमा जानुहोस् र eSewa QR स्क्यान गरेर NPR ${amount} भुक्तानी गर्नुहोस्`
                  : `Visit our payment page and scan the eSewa QR to pay NPR ${amount}`}
              </Text>
            </View>

            <TouchableOpacity style={styles.webBtn} onPress={openPaymentPage}>
              <Ionicons name="globe-outline" size={20} color="#fff" />
              <Text style={styles.webBtnText}>
                {isNe ? 'भुक्तानी पेज खोल्नुहोस्' : 'Open Payment Page'}
              </Text>
            </TouchableOpacity>

            {!showQR ? (
              <TouchableOpacity style={styles.qrToggle} onPress={() => setShowQR(true)}>
                <Ionicons name="qr-code-outline" size={18} color="#E8602C" />
                <Text style={styles.qrToggleText}>
                  {isNe ? 'QR कोड हेर्नुहोस्' : 'View QR Code'}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.qrBox}>
                <Image
                  source={{ uri: ESEWA_QR_URL }}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
                <TouchableOpacity onPress={() => setShowQR(false)}>
                  <Text style={styles.qrHide}>
                    {isNe ? 'लुकाउनुहोस्' : 'Hide QR'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.instructionStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={styles.stepText}>
                {isNe
                  ? 'eSewa बाट भुक्तानी गरेपछि Transaction ID सहित WhatsApp मा सम्पर्क गर्नुहोस्'
                  : 'After paying via eSewa, WhatsApp us with your Transaction ID'}
              </Text>
            </View>

            <TouchableOpacity style={styles.waBtn} onPress={openWhatsApp}>
              <Ionicons name="logo-whatsapp" size={20} color="#fff" />
              <Text style={styles.waBtnText}>
                {isNe ? 'WhatsApp मा सम्पर्क गर्नुहोस्' : 'Contact on WhatsApp'}
              </Text>
            </TouchableOpacity>

            <View style={styles.instructionStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={styles.stepText}>
                {isNe
                  ? 'हामीले तपाईंलाई एक्टिभेसन कोड पठाउनेछौं। त्यो कोड तल लेखेर प्रिमियम सक्रिय गर्नुहोस्।'
                  : 'We will send you an activation code. Enter it below to activate premium.'}
              </Text>
            </View>
          </View>

          {/* Redemption Code Input */}
          <Text style={styles.sectionLabel}>
            {isNe ? '🔑 एक्टिभेसन कोड' : '🔑 Activation Code'}
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
                {isNe ? 'सक्रिय गर्नुहोस्' : 'Activate'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.paymentNote}>
            {isNe
              ? '💡 भुक्तानी पेजमा गएर eSewa बाट भुक्तानी गर्नुहोस् → WhatsApp मा Transaction ID पठाउनुहोस् → हामीले एक्टिभेसन कोड पठाउनेछौं → कोड लेखेर प्रिमियम सक्रिय गर्नुहोस्।'
              : '💡 Pay via eSewa on our payment page → WhatsApp us your Transaction ID → We send you an activation code → Enter it here to activate premium.'}
          </Text>
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

  planCard: {
    marginHorizontal: 12, marginBottom: 10, backgroundColor: '#fff',
    borderRadius: 14, padding: 18, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 2, borderColor: '#EDE0D4', elevation: 1,
  },
  planCardActive: { borderColor: '#E8602C', backgroundColor: '#FFF5F0' },
  planName: { fontSize: 18, fontWeight: '700', color: '#333' },
  planPrice: { fontSize: 14, color: '#666', marginTop: 2 },
  planSaving: { fontSize: 12, color: '#4CAF50', fontWeight: '700', marginTop: 4 },
  planRadio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#ccc' },
  planRadioActive: { borderColor: '#E8602C', backgroundColor: '#E8602C' },
  bestValueBadge: {
    position: 'absolute', top: -35, right: -10,
    backgroundColor: '#FFD700', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  bestValueText: { fontSize: 10, fontWeight: '900', color: '#000' },

  // Payment Instructions
  instructionsCard: {
    marginHorizontal: 12, marginTop: 12, backgroundColor: '#fff',
    borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#EDE0D4',
  },
  instructionsTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 16 },
  instructionStep: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 10 },
  stepNumber: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#E8602C', alignItems: 'center', justifyContent: 'center',
    marginTop: 2,
  },
  stepNumberText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  stepText: { flex: 1, fontSize: 13, color: '#555', lineHeight: 20 },

  webBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#E8602C', borderRadius: 12, padding: 14, marginBottom: 10, gap: 8,
  },
  webBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  qrToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 10, gap: 6,
  },
  qrToggleText: { color: '#E8602C', fontWeight: '600', fontSize: 14 },
  qrBox: {
    alignItems: 'center', backgroundColor: '#FDF8F2',
    borderRadius: 12, padding: 16, marginVertical: 8,
  },
  qrImage: { width: 200, height: 200, marginBottom: 8 },
  qrHide: { color: '#C4956A', fontSize: 12, marginTop: 4 },

  waBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#25D366', borderRadius: 12, padding: 14, marginTop: 4, gap: 8,
  },
  waBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Redemption
  redeemBox: {
    flexDirection: 'row', marginHorizontal: 12,
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

  paymentNote: {
    fontSize: 12, color: '#C4956A', textAlign: 'center',
    marginTop: 12, paddingHorizontal: 20, lineHeight: 18,
  },
});
