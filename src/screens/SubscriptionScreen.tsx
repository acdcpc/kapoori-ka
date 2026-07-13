// src/screens/SubscriptionScreen.tsx
import React, { useContext, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Linking, ActivityIndicator, Image, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LanguageContext } from '../context/LanguageContext';
import { translations } from '../i18n/translations';
import { useAuth } from '../context/AuthContext';

import { WHATSAPP_NUMBER, ESEWA_QR_URL } from '../constants';

const MONTHLY_PRICE_NPR = 0;
const YEARLY_PRICE_NPR  = 0;

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
  const { subscription, upgradeToPremium, loading: authLoading } = useAuth();
  const isNe = language === 'ne';

  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [showQR, setShowQR] = useState(false);
  const [showTxnModal, setShowTxnModal] = useState(false);
  const [txnId, setTxnId] = useState('');

  const freeFeatures = isNe ? FREE_FEATURES_NE : FREE_FEATURES_EN;
  const paidFeatures = isNe ? PAID_FEATURES_NE : PAID_FEATURES_EN;

  const amount = selectedPlan === 'monthly' ? MONTHLY_PRICE_NPR : YEARLY_PRICE_NPR;

  const handleManualPayment = () => {
    setShowQR(false);
    setTxnId('');
    setShowTxnModal(true);
  };

  const submitTransaction = async () => {
    if (!txnId.trim()) {
      Alert.alert(
        isNe ? 'त्रुटि' : 'Error', 
        isNe ? 'कृपया Transaction ID लेख्नुहोस्' : 'Please enter Transaction ID'
      );
      return;
    }

    try {
      await upgradeToPremium({
        plan: selectedPlan,
        amount: amount,
        method: 'esewa_manual',
        transactionId: txnId.trim()
      });

      Alert.alert(
        isNe ? 'धन्यवाद' : 'Thank You',
        isNe 
          ? 'तपाईंको भुक्तानी विवरण प्राप्त भयो। हामी २४ घण्टाभित्र रुजु गरेर प्रिमियम सक्रिय गर्नेछौं।' 
          : 'Payment details received. We will verify and activate your premium within 24 hours.',
        [
          { 
            text: 'WhatsApp Us', 
            onPress: () => Linking.openURL(`https://wa.me/${WHATSAPP_NUMBER.replace('+', '')}?text=Hi, I just paid NPR ${amount} for Kapoori-ka Premium. My Transaction ID is ${txnId}`) 
          },
          { text: 'OK' }
        ]
      );
    } catch (error) {
      Alert.alert(isNe ? 'त्रुटि' : 'Error', isNe ? 'केही समस्या भयो' : 'Something went wrong');
    }

    setShowTxnModal(false);
    setTxnId('');
  };

  // Transaction Input Modal
  const TransactionModal = () => (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>
          {isNe ? 'eSewa Transaction ID' : 'Enter Transaction ID'}
        </Text>
        <Text style={styles.modalSubtitle}>
          {isNe ? 'भुक्तानी पछिको Transaction ID यहाँ लेख्नुहोस्' : 'Enter your eSewa Transaction ID after payment'}
        </Text>

        <TextInput
          style={styles.input}
          placeholder={isNe ? "Transaction ID लेख्नुहोस्" : "Enter Transaction ID"}
          value={txnId}
          onChangeText={setTxnId}
          autoCapitalize="none"
        />

        <View style={styles.modalButtons}>
          <TouchableOpacity style={styles.cancelButton} onPress={() => setShowTxnModal(false)}>
            <Text style={styles.cancelButtonText}>{isNe ? 'रद्द गर्नुहोस्' : 'Cancel'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.saveButton} onPress={submitTransaction}>
            <Text style={styles.saveButtonText}>{isNe ? 'पेश गर्नुहोस्' : 'Submit'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (authLoading) {
    return <ActivityIndicator size="large" color="#1a73e8" style={{ flex: 1 }} />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 50 }}>
      {/* Active Subscription Status */}
      {subscription?.status === 'active' ? (
        <View style={styles.statusCard}>
          <Ionicons name="checkmark-circle" size={24} color="#1a73e8" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.statusActive}>
              {subscription.plan === 'monthly' ? (isNe ? 'मासिक सदस्यता सक्रिय' : 'Monthly plan active') : (isNe ? 'वार्षिक सदस्यता सक्रिय' : 'Yearly plan active')}
            </Text>
            <Text style={styles.statusExpiry}>
              {isNe ? 'समाप्त मिति' : 'Expires'}: {subscription.endDate instanceof Date ? subscription.endDate.toLocaleDateString() : 'N/A'}
            </Text>
          </View>
        </View>
      ) : subscription?.status === 'pending' ? (
        <View style={[styles.statusCard, { borderColor: '#FF9800', backgroundColor: '#FFF3E0' }]}>
          <Ionicons name="time" size={24} color="#FF9800" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[styles.statusActive, { color: '#E65100' }]}>
              {isNe ? 'भुक्तानी रुजु हुँदैछ' : 'Payment Verification Pending'}
            </Text>
            <Text style={styles.statusExpiry}>
              {isNe ? 'हामी २४ घण्टाभित्र सक्रिय गर्नेछौं' : 'We will activate within 24 hours'}
            </Text>
          </View>
        </View>
      ) : null}

      <Text style={styles.sectionLabel}>{isNe ? ' निःशुल्क,  प्रिमियम?' : "What's Free vs Premium?"}</Text>

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

      {/* Plans Selection */}
      {subscription?.status !== 'active' && (
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
              <Text style={styles.planSaving}>{isNe ? '४४% बचत!' : '44% saving!'}</Text>
            </View>
            <View>
              <View style={[styles.planRadio, selectedPlan === 'yearly' && styles.planRadioActive]} />
              <View style={styles.bestValueBadge}>
                <Text style={styles.bestValueText}>BEST</Text>
              </View>
            </View>
          </TouchableOpacity>

          {!showQR ? (
            <TouchableOpacity style={styles.esewaBtn} onPress={() => setShowQR(true)}>
              <Text style={styles.esewaBtnText}>💚 {isNe ? 'eSewa QR बाट भुक्तानी' : 'Pay via eSewa QR'}</Text>
              <Text style={styles.esewaBtnAmount}>NPR {amount}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.qrContainer}>
              <Text style={styles.qrTitle}>{isNe ? 'यो QR स्क्यान गर्नुहोस्' : 'Scan this QR'}</Text>
              <Image source={{ uri: ESEWA_QR_URL }} style={styles.qrImage} resizeMode="contain" />
              
              <TouchableOpacity style={styles.confirmBtn} onPress={handleManualPayment}>
                <Text style={styles.confirmBtnText}>
                  {isNe ? 'भुक्तानी गरिसकेपछि यहाँ थिच्नुहोस्' : 'I have paid, click here'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowQR(false)}>
                <Text style={styles.cancelBtnText}>{isNe ? 'रद्द गर्नुहोस्' : 'Cancel'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {showTxnModal && <TransactionModal />}

          <Text style={styles.paymentNote}>
            {isNe
              ? '⚠️ भुक्तानी पछि, Transaction ID पेश गर्नुहोस्। २४ घण्टाभित्र सक्रिय गरिनेछ।'
              : '⚠️ After payment, submit your Transaction ID. We will activate within 24 hours.'}
          </Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  statusCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 12, marginTop: 12, marginBottom: 12, backgroundColor: '#E3F2FD', borderRadius: 14, padding: 16, borderWidth: 2, borderColor: '#1a73e8' },
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
  planCardActive: { borderColor: '#1a73e8', backgroundColor: '#F0F7FF' },
  planName: { fontSize: 18, fontWeight: '700', color: '#333' },
  planPrice: { fontSize: 14, color: '#666', marginTop: 2 },
  planSaving: { fontSize: 12, color: '#4CAF50', fontWeight: '700', marginTop: 4 },
  planRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#ccc' },
  planRadioActive: { borderColor: '#1a73e8', backgroundColor: '#1a73e8' },
  bestValueBadge: { position: 'absolute', top: -35, right: -10, backgroundColor: '#FFD700', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  bestValueText: { fontSize: 10, fontWeight: '900', color: '#000' },

  esewaBtn: { marginHorizontal: 12, marginTop: 10, backgroundColor: '#4CAF50', borderRadius: 16, padding: 18, alignItems: 'center', elevation: 3 },
  esewaBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  esewaBtnAmount: { color: 'rgba(255,255,255,0.9)', fontSize: 14, marginTop: 4 },

  qrContainer: { marginHorizontal: 12, marginTop: 10, backgroundColor: '#fff', borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  qrTitle: { fontSize: 16, fontWeight: '700', marginBottom: 15 },
  qrImage: { width: 250, height: 250, marginBottom: 20 },
  confirmBtn: { backgroundColor: '#1a73e8', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, width: '100%', alignItems: 'center' },
  confirmBtnText: { color: '#fff', fontWeight: '700' },
  cancelBtn: { marginTop: 15 },
  cancelBtnText: { color: '#888' },

  paymentNote: { fontSize: 12, color: '#888', textAlign: 'center', marginTop: 15, paddingHorizontal: 20, lineHeight: 18 },

  // Modal Styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '85%',
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  saveButton: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: '#1a73e8',
  },
  cancelButtonText: { fontWeight: '600', color: '#333' },
  saveButtonText: { fontWeight: '600', color: 'white' },
});