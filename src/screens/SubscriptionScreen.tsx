// src/screens/SubscriptionScreen.tsx
import React, { useContext, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Linking, ActivityIndicator } from 'react-native';
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';
import dayjs from 'dayjs';
import { auth, db } from '../../firebase.ts';
import { LanguageContext } from '../context/LanguageContext';
import { translations } from '../i18n/translations';
import { SubscriptionStatus } from '../types';
import { Ionicons } from '@expo/vector-icons';

const BETA_END_DATE     = '2026-07-07';
const MONTHLY_PRICE_NPR = 100;
const YEARLY_PRICE_NPR  = 750;
const WHATSAPP_NUMBER   = '9779840516603';

const FREE_FEATURES_EN = [
  { icon: '👶', text: '1 child profile' },
  { icon: '📈', text: 'Basic growth chart (weight & height)' },
  { icon: '💉', text: 'Full immunization tracker & schedule' },
  { icon: '🔔', text: 'Vaccine reminders (2 days before)' },
  { icon: '🥦', text: 'Nutrition guide (all age groups)' },
];
const FREE_FEATURES_NE = [
  { icon: '👶', text: '१ बच्चाको प्रोफाइल' },
  { icon: '📈', text: 'आधारभूत वृद्धि चार्ट (तौल र उचाइ)' },
  { icon: '💉', text: 'पूर्ण खोप ट्र्याकर र तालिका' },
  { icon: '🔔', text: 'खोप रिमाइन्डर (२ दिन अगाडि)' },
  { icon: '🥦', text: 'पोषण गाइड (सबै उमेर समूह)' },
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
  const t = translations[language];
  const isNe = language === 'ne';

  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const isBetaActive = dayjs().isBefore(dayjs(BETA_END_DATE));

  const freeFeatures = isNe ? FREE_FEATURES_NE : FREE_FEATURES_EN;
  const paidFeatures = isNe ? PAID_FEATURES_NE : PAID_FEATURES_EN;

  useEffect(() => { loadSubscription(); }, []);

  const loadSubscription = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const q = query(collection(db, 'subscriptions'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        setSubscription(snapshot.docs[0].data() as SubscriptionStatus);
      } else if (isBetaActive) {
        const betaSub: Omit<SubscriptionStatus, 'id'> = {
          userId: user.uid, plan: 'beta_free',
          startDate: dayjs().format('YYYY-MM-DD'), endDate: BETA_END_DATE, isActive: true,
        };
        await addDoc(collection(db, 'subscriptions'), betaSub);
        setSubscription({ ...betaSub, isActive: true } as SubscriptionStatus);
      }
    } catch (e) { console.error('Subscription load error:', e); }
    finally { setLoading(false); }
  };

  const initiateEsewaPayment = async (plan: 'monthly' | 'yearly') => {
    const amount = plan === 'monthly' ? MONTHLY_PRICE_NPR : YEARLY_PRICE_NPR;
    const txnId = `SK_${Date.now()}`;
    const esewaUrl = `esewa://pay?amount=${amount}&txnId=${txnId}&productId=setokitab_${plan}`;
    const canOpen = await Linking.canOpenURL(esewaUrl);
    if (canOpen) {
      await Linking.openURL(esewaUrl);
      Alert.alert(
        isNe ? 'भुक्तानी पूरा गर्नुहोस्' : 'Complete Payment',
        isNe
          ? `eSewa मा NPR ${amount} भुक्तानी गर्नुहोस्, त्यसपछि Transaction ID: ${txnId} सहित ${WHATSAPP_NUMBER} मा WhatsApp गर्नुहोस्।`
          : `Complete NPR ${amount} in eSewa, then WhatsApp us at ${WHATSAPP_NUMBER} with Transaction ID: ${txnId}.`,
        [{ text: isNe ? 'ठीक छ' : 'OK' }]
      );
    } else {
      Alert.alert(
        isNe ? 'eSewa इनस्टल छैन' : 'eSewa Not Installed',
        isNe
          ? `कृपया eSewa इनस्टल गर्नुहोस् वा सिधै WhatsApp: ${WHATSAPP_NUMBER}`
          : `Please install eSewa or contact: WhatsApp ${WHATSAPP_NUMBER}`,
        [
          { text: isNe ? 'रद्द' : 'Cancel', style: 'cancel' },
          { text: 'eSewa Website', onPress: () => Linking.openURL('https://esewa.com.np') },
        ]
      );
    }
  };

  if (loading) return <ActivityIndicator size="large" color="#1a73e8" style={{ flex: 1 }} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 50 }}>
      {/* Beta Banner */}
      {isBetaActive && (
        <View style={styles.betaBanner}>
          <Text style={styles.betaEmoji}>🎉</Text>
          <View style={styles.betaText}>
            <Text style={styles.betaTitle}>{isNe ? 'बिटा — सबै सुविधा निःशुल्क!' : 'Beta — All Features Free!'}</Text>
            <Text style={styles.betaDesc}>
              {isNe
                ? 'अहिले सबै प्रिमियम सुविधाहरू निःशुल्क छन्। यो प्रस्ताव सीमित समयका लागि हो।'
                : 'All premium features are free during beta. Enjoy unlimited access for now!'}
            </Text>
            <Text style={styles.betaExpiry}>
              {isNe ? 'बिटा समाप्त' : 'Beta ends'}: {dayjs(BETA_END_DATE).format('DD MMM YYYY')}
            </Text>
          </View>
        </View>
      )}

      {/* Active Subscription Card */}
      {subscription?.isActive && (
        <View style={styles.statusCard}>
          <Ionicons name="checkmark-circle" size={24} color="#1a73e8" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.statusActive}>
              {subscription.plan === 'beta_free'
                ? (isNe ? 'बिटा — निःशुल्क पहुँच' : 'Beta — Free Access')
                : subscription.plan === 'monthly'
                ? (isNe ? 'मासिक सदस्यता सक्रिय' : 'Monthly plan active')
                : (isNe ? 'वार्षिक सदस्यता सक्रिय' : 'Yearly plan active')}
            </Text>
            <Text style={styles.statusExpiry}>
              {isNe ? 'समाप्त मिति' : 'Expires'}: {subscription.endDate}
            </Text>
          </View>
        </View>
      )}

      {/* Free vs Paid Side-by-Side */}
      <Text style={styles.sectionLabel}>{isNe ? 'के निःशुल्क, के प्रिमियम?' : "What's Free vs Premium?"}</Text>

      <View style={styles.featuresRow}>
        {/* Free column */}
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

        {/* Paid column */}
        <View style={[styles.featureCard, styles.featureCardPremium]}>
          <View style={[styles.featureCardHeader, { backgroundColor: '#1a73e8' }]}>
            <Text style={[styles.featureCardTitle, { color: '#fff' }]}>⭐ {isNe ? 'प्रिमियम' : 'Premium'}</Text>
          </View>
          {paidFeatures.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={[styles.featureText, { color: '#1a73e8' }]}>{f.text}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Plans — only show when beta is over */}
      {!isBetaActive && (
        <>
          <Text style={styles.sectionLabel}>{isNe ? 'आफ्नो योजना छान्नुहोस्' : 'Choose Your Plan'}</Text>

          <TouchableOpacity
            style={[styles.planCard, selectedPlan === 'monthly' && styles.planCardActive]}
            onPress={() => setSelectedPlan('monthly')}
          >
            <View>
              <Text style={styles.planName}>{isNe ? 'मासिक' : 'Monthly'}</Text>
              <Text style={styles.planPrice}>NPR {MONTHLY_PRICE_NPR} / {isNe ? 'महिना' : 'month'}</Text>
            </View>
            <View style={[styles.planRadio, selectedPlan === 'monthly' && styles.planRadioActive]} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.planCard, selectedPlan === 'yearly' && styles.planCardActive]}
            onPress={() => setSelectedPlan('yearly')}
          >
            <View>
              <Text style={styles.planName}>{isNe ? 'वार्षिक' : 'Yearly'}</Text>
              <Text style={styles.planPrice}>NPR {YEARLY_PRICE_NPR} / {isNe ? 'वर्ष' : 'year'}</Text>
              <Text style={styles.planSaving}>
                {isNe ? '३७.५% बचत!' : '37.5% saving!'}
              </Text>
            </View>
            <View>
              <View style={[styles.planRadio, selectedPlan === 'yearly' && styles.planRadioActive]} />
              <View style={styles.bestValueBadge}>
                <Text style={styles.bestValueText}>BEST</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.esewaBtn} onPress={() => initiateEsewaPayment(selectedPlan)}>
            <Text style={styles.esewaBtnText}>💚 {isNe ? 'eSewa बाट भुक्तानी' : 'Pay via eSewa'}</Text>
            <Text style={styles.esewaBtnAmount}>NPR {selectedPlan === 'monthly' ? MONTHLY_PRICE_NPR : YEARLY_PRICE_NPR}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.khaltiBtn}
            onPress={() => {
              const amount = selectedPlan === 'monthly' ? MONTHLY_PRICE_NPR : YEARLY_PRICE_NPR;
              Alert.alert(
                'Khalti',
                isNe
                  ? `Khalti नम्बर ${WHATSAPP_NUMBER} मा NPR ${amount} "SetoKitab ${selectedPlan}" सन्देश सहित पठाउनुहोस्।`
                  : `Send NPR ${amount} to Khalti ${WHATSAPP_NUMBER} with note "SetoKitab ${selectedPlan}". WhatsApp screenshot to activate.`
              );
            }}
          >
            <Text style={styles.khaltiBtnText}>💜 {isNe ? 'Khalti बाट भुक्तानी' : 'Pay via Khalti'}</Text>
            <Text style={styles.khaltiBtnAmount}>NPR {selectedPlan === 'monthly' ? MONTHLY_PRICE_NPR : YEARLY_PRICE_NPR}</Text>
          </TouchableOpacity>

          <Text style={styles.paymentNote}>
            {isNe
              ? '⚠️ भुक्तानी पछि, स्क्रिनशट WhatsApp गर्नुहोस्। २४ घण्टाभित्र सक्रिय गरिनेछ।'
              : '⚠️ After payment, WhatsApp your screenshot to activate within 24 hours.'}
          </Text>
        </>
      )}

      {isBetaActive && (
        <View style={styles.betaFooter}>
          <Text style={styles.betaFooterText}>
            {isNe
              ? `📅 बिटा ${dayjs(BETA_END_DATE).format('DD MMM YYYY')} मा समाप्त भएपछि NPR १००/महिना वा NPR ७५०/वर्षमा जारी राख्न सकिन्छ।`
              : `📅 After beta ends on ${dayjs(BETA_END_DATE).format('DD MMM YYYY')}, continue at NPR ${MONTHLY_PRICE_NPR}/month or NPR ${YEARLY_PRICE_NPR}/year.`}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  betaBanner: { margin: 12, backgroundColor: '#E8F5E9', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'flex-start', borderWidth: 2, borderColor: '#4CAF50' },
  betaEmoji: { fontSize: 36, marginRight: 12 },
  betaText: { flex: 1 },
  betaTitle: { fontSize: 16, fontWeight: '700', color: '#2E7D32', marginBottom: 4 },
  betaDesc: { fontSize: 13, color: '#388E3C', lineHeight: 18, marginBottom: 4 },
  betaExpiry: { fontSize: 12, color: '#666' },
  statusCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 12, marginBottom: 12, backgroundColor: '#E3F2FD', borderRadius: 14, padding: 16, borderWidth: 2, borderColor: '#1a73e8' },
  statusActive: { fontSize: 15, fontWeight: '700', color: '#1565C0' },
  statusExpiry: { fontSize: 12, color: '#666', marginTop: 2 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#888', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  featuresRow: { flexDirection: 'row', marginHorizontal: 12, gap: 10, marginBottom: 8 },
  featureCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', elevation: 2 },
  featureCardPremium: { borderWidth: 1.5, borderColor: '#1a73e8' },
  featureCardHeader: { backgroundColor: '#f5f5f5', padding: 10, alignItems: 'center' },
  featureCardTitle: { fontSize: 13, fontWeight: '800', color: '#333' },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', gap: 6 },
  featureIcon: { fontSize: 14, width: 22 },
  featureText: { flex: 1, fontSize: 11, color: '#555', lineHeight: 16 },
  planCard: { marginHorizontal: 12, marginBottom: 10, backgroundColor: '#fff', borderRadius: 14, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 2, borderColor: '#e0e0e0', elevation: 1 },
  planCardActive: { borderColor: '#1a73e8', backgroundColor: '#F0F4FF' },
  planName: { fontSize: 15, fontWeight: '700', color: '#222', marginBottom: 2 },
  planPrice: { fontSize: 18, color: '#1a73e8', fontWeight: '700' },
  planSaving: { fontSize: 12, color: '#4CAF50', fontWeight: '600', marginTop: 2 },
  planRadio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#ccc' },
  planRadioActive: { borderColor: '#1a73e8', backgroundColor: '#1a73e8' },
  bestValueBadge: { backgroundColor: '#4CAF50', borderRadius: 4, padding: 2, marginTop: 4, alignItems: 'center' },
  bestValueText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  esewaBtn: { marginHorizontal: 12, backgroundColor: '#60BB46', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, elevation: 2 },
  esewaBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  esewaBtnAmount: { color: '#fff', fontWeight: '700', fontSize: 16 },
  khaltiBtn: { marginHorizontal: 12, backgroundColor: '#5C2D91', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, elevation: 2 },
  khaltiBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  khaltiBtnAmount: { color: '#fff', fontWeight: '700', fontSize: 16 },
  paymentNote: { marginHorizontal: 12, fontSize: 12, color: '#888', textAlign: 'center', lineHeight: 18, marginTop: 4 },
  betaFooter: { margin: 12, backgroundColor: '#FFF8E1', borderRadius: 12, padding: 14 },
  betaFooterText: { fontSize: 13, color: '#555', lineHeight: 20 },
});
