// src/screens/SubscriptionScreen.tsx
// v3 (sideload distribution): in-app payment submission — QR + eSewa/Khalti
// reference, straight to the submit-payment Edge Function; status check and
// automatic code redemption after the owner approves. The web payment page
// remains as a fallback channel.
import React, { useContext, useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert,
  ActivityIndicator, TextInput, Image, Modal, Platform,
} from 'react-native';
import { ThemeContext } from '../context/ThemeContext';
import { Palette } from '../theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LanguageContext } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabase';
import * as ImagePicker from 'expo-image-picker';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ESEWA_QR = require('../../assets/esewa-qr.png');

const MONTHLY_PRICE_NPR = 100;
const YEARLY_PRICE_NPR = 500;

// Plans shown for purchase (Nepal pricing, 2026-09)
const PLANS = [
  { id: '6months' as const, labelNe: '६ महिना', labelEn: '6 Months', priceNPR: 650, perMonth: 108, tag: null as string | null },
  { id: 'yearly' as const, labelNe: 'वार्षिक', labelEn: 'Yearly', priceNPR: 850, perMonth: 71, tag: 'BEST VALUE — सर्वोत्तम' },
];

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
  { icon: '📊', title: 'See what the numbers mean', text: 'Your child\u2019s weight, height and head size mapped onto WHO charts — with clear, calm guidance on every measurement.' },
  { icon: '📈', title: 'Beautiful growth charts', text: 'Watch your child\u2019s own curve grow against the WHO standard — perfect to bring to every check-up.' },
  { icon: '📄', title: 'Doctor-ready PDF reports', text: 'One tap creates a professional health report with charts and interpretation, ready to share with any pediatrician.' },
  { icon: '🧠', title: 'Full milestone tracking', text: 'Track every developmental milestone, with guidance on what comes next and when to ask for help.' },
  { icon: '🔍', title: 'M-CHAT autism screening', text: 'A validated early screening tool built into the app — early awareness changes lives.' },
  { icon: '💬', title: 'Priority WhatsApp support', text: 'Stuck or worried? Message the team that built the app and get a real answer.' },
];

const PAID_FEATURES_NE = [
  { icon: '📊', title: 'अंकको अर्थ बुझ्नुहोस्', text: 'तपाईंको बच्चाको तौल, उचाइ र टाउकोको नाप WHO चार्टमा — हरेक मापनसँग स्पष्ट, शान्त मार्गदर्शन।' },
  { icon: '📈', title: 'सुन्दर वृद्धि चार्ट', text: 'WHO मापदण्डसँग तुलना गर्दै बच्चाको आफ्नै वृद्धि रेखा हेर्नुहोस् — हरेक जाँचमा लैजान मिल्ने।' },
  { icon: '📄', title: 'डाक्टर-तयार PDF रिपोर्ट', text: 'एक ट्यापमा चार्ट र व्याख्यासहित पेशेवर स्वास्थ्य रिपोर्ट — जुनसुकै बाल रोग विशेषज्ञसँग सेयर गर्न मिल्छ।' },
  { icon: '🧠', title: 'पूर्ण विकास ट्र्याकिङ', text: 'हरेक विकास चरण ट्र्याक गर्नुहोस् — के अपेक्षा गर्ने र कहिले सहयोग माग्ने भन्ने मार्गदर्शनसहित।' },
  { icon: '🔍', title: 'M-CHAT अटिजम स्क्रिनिङ', text: 'एपभित्रै प्रमाणित सुरुवाती जाँच — समयमै चेतनाले जीवन बदल्छ।' },
  { icon: '💬', title: 'प्राथमिकता WhatsApp सहयोग', text: 'अड्किनुभयो वा चिन्ता छ? सिधै हामीलाई म्यासेज गर्नुहोस् — एप बनाउने टिमबाटै जवाफ।' },
];

export default function SubscriptionScreen() {
  const { palette: t } = useContext(ThemeContext);
  const styles = makeStyles(t);
  const { language } = useContext(LanguageContext);
  const { subscription, redeemCode, refreshUserData, loading: authLoading } = useAuth();
  const isNe = language === 'ne';

  const [redemptionCode, setRedemptionCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);

  // In-app payment submission
  const [paySheetVisible, setPaySheetVisible] = useState(false);
  const [payPlan, setPayPlan] = useState<'6months' | 'yearly'>('yearly');
  const [txnId, setTxnId] = useState('');
  const [mobile, setMobile] = useState('');
  const [screenshot, setScreenshot] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const freeFeatures = isNe ? FREE_FEATURES_NE : FREE_FEATURES_EN;
  const paidFeatures = isNe ? PAID_FEATURES_NE : PAID_FEATURES_EN;

  const isActive = subscription?.status === 'active';
  const isPending = subscription?.status === 'pending';

  const authHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error(isNe ? 'कृपया पहिले लगइन गर्नुहोस्।' : 'Please sign in first.');
    return { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` };
  };

  const checkPaymentStatus = useCallback(async () => {
    if (isActive) return;
    setCheckingStatus(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/my-activation-code`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: '{}',
      });
      const json = await res.json();
      if (json?.status === 'approved' && json?.code) {
        await redeemCode(json.code);
        if (refreshUserData) await refreshUserData();
        Alert.alert(
          isNe ? 'सफल!' : 'Success!',
          isNe ? 'भुक्तानी पुष्टि भयो — प्रिमियम सक्रिय भयो! 🎉' : 'Payment verified — Premium is now active! 🎉',
        );
      } else if (json?.status === 'pending') {
        Alert.alert(
          isNe ? 'जाँच हुँदैछ' : 'Still verifying',
          isNe ? 'तपाईंको भुक्तानी अझै जाँचिँदैछ। केही समयपछि फेरि प्रयास गर्नुहोस्।' : 'Your payment is still being verified. Please check again shortly.',
        );
      }
    } catch (err: any) {
      Alert.alert(isNe ? 'त्रुटि' : 'Error', err?.message || (isNe ? 'जाँच गर्न सकिएन।' : 'Could not check status.'));
    } finally {
      setCheckingStatus(false);
    }
  }, [isActive, isNe, redeemCode, refreshUserData]);

  useEffect(() => {
    // Auto-fetch + redeem once the owner approves (no code typing).
    if (!isActive && !isPending) checkPaymentStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickScreenshot = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(isNe ? 'अनुमति चाहियो' : 'Permission needed', isNe ? 'ग्यालेरी पहुँच अनुमति दिनुहोस्।' : 'Please allow gallery access.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsMultipleSelection: false });
    if (!res.canceled && res.assets?.[0]) setScreenshot(res.assets[0]);
  };

  const submitPayment = async () => {
    const ref = txnId.trim();
    if (ref.length < 6) {
      Alert.alert(isNe ? 'त्रुटि' : 'Error', isNe ? 'eSewa/Khalti Transaction ID पूरा लेख्नुहोस्।' : 'Enter the full eSewa/Khalti transaction ID.');
      return;
    }
    setSubmitting(true);
    try {
      const headers = await authHeaders();
      const form = new FormData();
      const { data: { user } } = await supabase.auth.getUser();
      form.append('name', user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Parent');
      form.append('email', user?.email ?? '');
      form.append('mobile', mobile.trim());
      form.append('plan', payPlan);
      form.append('transaction_id', ref);
      if (screenshot) {
        const uri = screenshot.uri;
        const ext = (uri.split('.').pop() || 'jpg').toLowerCase();
        form.append('screenshot', { uri: Platform.OS === 'ios' && uri.startsWith('file:') ? uri.replace('file://', '') : uri, name: `receipt.${ext}`, type: screenshot.mimeType || 'image/jpeg' } as any);
      }
      const res = await fetch(`${SUPABASE_URL}/functions/v1/submit-payment`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'multipart/form-data' },
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || (isNe ? 'पठाउन सकिएन।' : 'Submission failed.'));
      Alert.alert(
        isNe ? 'पठाइयो' : 'Submitted',
        isNe ? 'तपाईंको भुक्तानी विवरण पठाइयो। स्वीकृत भएपछि एप आफैँ सक्रिय हुनेछ।' : 'Your payment details were submitted. The app will activate automatically once approved.',
      );
      setPaySheetVisible(false); setTxnId(''); setMobile(''); setScreenshot(null);
    } catch (err: any) {
      Alert.alert(isNe ? 'त्रुटि' : 'Error', err?.message || (isNe ? 'पठाउन सकिएन।' : 'Submission failed.'));
    } finally {
      setSubmitting(false);
    }
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
    return <ActivityIndicator size="large" color={t.clay} style={{ flex: 1 }} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }}>
      {/* Active Subscription Status */}
      {isActive && (
        <View style={styles.statusCard}>
          <Ionicons name="checkmark-circle" size={28} color={t.green} />
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
          <Ionicons name="time-outline" size={28} color={t.gold} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.pendingTitle}>
              {isNe ? 'भुक्तानी जाँच हुँदैछ' : 'Payment Being Verified'}
            </Text>
            <Text style={styles.pendingText}>
              {isNe
                ? 'तपाईंको भुक्तानी जाँच भइरहेको छ। यसले केहि घण्टा लिन सक्छ।'
                : 'Your payment is being verified. This usually takes a few hours.'}
            </Text>
            <TouchableOpacity onPress={checkPaymentStatus} disabled={checkingStatus}
              style={{ marginTop: 10, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: t.border }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: t.text }}>
                {checkingStatus ? (isNe ? 'जाँच हुँदैछ…' : 'Checking…') : (isNe ? 'स्थिति जाँच्नुहोस्' : 'Check status now')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* What you unlock */}
      {!isActive && (
        <>
          <View style={styles.valueHeader}>
            <Text style={styles.valueTitle}>{isNe ? '⭐ प्रिमियममा के-के खुल्छ?' : '⭐ What you unlock with Premium'}</Text>
            <Text style={styles.valueSub}>{isNe ? 'एकपटक भुक्तानी — कहिल्यै अटो-चार्ज हुँदैन। हरेक सुविधा तपाईंको बच्चाको स्वास्थ्य यात्राका लागि बनेको।' : 'Pay once — never auto-charged. Every feature is built for your child\u2019s health journey.'}</Text>
          </View>

          {paidFeatures.map((f, i) => (
            <View key={i} style={styles.benefitRow}>
              <View style={styles.benefitIconBox}><Text style={styles.benefitIcon}>{f.icon}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.benefitTitle}>{f.title}</Text>
                <Text style={styles.benefitText}>{f.text}</Text>
              </View>
            </View>
          ))}

          <Text style={styles.sectionLabel}>{isNe ? 'योजना छान्नुहोस्' : 'Choose your plan'}</Text>
          {PLANS.map((plan) => (
            <TouchableOpacity key={plan.id} style={[styles.planCard, payPlan === plan.id && styles.planCardActive]} onPress={() => setPayPlan(plan.id)} activeOpacity={0.8}>
              {!!plan.tag && (
                <View style={styles.planTag}><Text style={styles.planTagText}>{plan.tag}</Text></View>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.planName}>{isNe ? plan.labelNe : plan.labelEn}</Text>
                  <Text style={styles.planPer}>{isNe ? 'मासिक औसत' : 'averages'} NPR {plan.perMonth}/{isNe ? 'महिना' : 'month'}</Text>
                </View>
                <Text style={styles.planPrice}>NPR {plan.priceNPR}</Text>
              </View>
              <TouchableOpacity style={styles.planPayBtn} onPress={() => { setPayPlan(plan.id); setPaySheetVisible(true); }} accessibilityRole="button">
                <Text style={styles.planPayBtnText}>{isNe ? 'अहिले तिर्नुहोस्' : 'Pay now'}</Text>
                <Ionicons name="arrow-forward" size={16} color={t.onAccent} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}

          <View style={styles.trustStrip}>
            <Text style={styles.trustItem}>🔒 {isNe ? 'एकपटक भुक्तानी' : 'One-time payment'}</Text>
            <Text style={styles.trustItem}>🚫 {isNe ? 'अटो-चार्ज छैन' : 'No auto-charge'}</Text>
            <Text style={styles.trustItem}>📴 {isNe ? 'अफलाइन पनि' : 'Works offline'}</Text>
          </View>

          <Text style={styles.sectionLabel}>{isNe ? 'कसरी काम गर्छ?' : 'How it works'}</Text>
          {[
            ['1', isNe ? 'योजना छान्नुहोस्' : 'Choose a plan', isNe ? '६ महिना वा वार्षिक — तपाईंको रोजाइ।' : '6 months or yearly — your choice.'],
            ['2', isNe ? 'QR स्क्यान गरी तिर्नुहोस्' : 'Pay via the QR', isNe ? 'eSewa/खल्तीबाट तिरी Transaction ID यहाँ राख्नुहोस्।' : 'Pay with eSewa/Khalti and enter the transaction ID here.'],
            ['3', isNe ? 'एप आफैँ सक्रिय हुन्छ' : 'Premium activates itself', isNe ? 'हामी पुष्टि गरेपछि एप आफैँ प्रिमियम बन्छ — कोड टाइप गर्नै पर्दैन।' : 'Once we verify, the app upgrades itself — no code typing.'],
          ].map(([n, ttl, txt]) => (
            <View key={n} style={styles.stepRow}>
              <View style={styles.stepNum}><Text style={styles.stepNumText}>{n}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>{ttl}</Text>
                <Text style={styles.stepText}>{txt}</Text>
              </View>
            </View>
          ))}
        </>
      )}

      {!isActive && (<>
      {/* Activation Code Redemption */}
          <Text style={styles.sectionLabel}>
            {isNe ? '🔑 एक्टिभेसन कोड छ? सक्रिय गर्नुहोस्' : '🔑 Have an activation code? Redeem it'}
          </Text>

          <View style={styles.redeemBox}>
            <TextInput
              style={styles.redeemInput}
              placeholder={isNe ? 'एक्टिभेसन कोड लेख्नुहोस्' : 'Enter your activation code'}
              placeholderTextColor={t.shadow}
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
      {/* ── In-app payment sheet ── */}
      <Modal visible={paySheetVisible} transparent animationType="slide" onRequestClose={() => setPaySheetVisible(false)}>
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.sheetTitle}>{isNe ? 'भुक्तानी गर्नुहोस्' : 'Complete your payment'}</Text>
              <Text style={styles.sheetAmount}>
                {(() => { const plan = PLANS.find(pl => pl.id === payPlan)!; return `${isNe ? plan.labelNe : plan.labelEn} — NPR ${plan.priceNPR}`; })()}
              </Text>
              <Image source={ESEWA_QR} style={styles.qr} resizeMode="contain" />
              <Text style={styles.sheetStep}>
                {isNe
                  ? '१. eSewa/खल्ती/बैंकको एप खोल्नुहोस् र माथिको QR स्क्यान गरी रकम पठाउनुहोस्।'
                  : '1. Open your eSewa/Khalti/bank app and scan this QR to send the amount.'}
              </Text>
              <Text style={styles.sheetStep}>
                {isNe
                  ? '२. तल तपाईंको Transaction ID लेखी पठाउनुहोस् — स्वीकृत भएपछि एप आफैँ सक्रिय हुनेछ।'
                  : '2. Enter the transaction ID below — the app activates automatically once approved.'}
              </Text>

              <Text style={styles.fieldLabel}>{isNe ? 'Transaction ID (eSewa/खल्ती) *' : 'Transaction ID (eSewa/Khalti) *'}</Text>
              <TextInput style={styles.sheetInput} placeholder="e.g. 004A1B2C3D" placeholderTextColor={t.shadow}
                value={txnId} onChangeText={setTxnId} autoCapitalize="characters" autoCorrect={false} />
              <Text style={styles.fieldLabel}>{isNe ? 'मोबाइल (ऐच्छिक)' : 'Mobile (optional)'}</Text>
              <TextInput style={styles.sheetInput} placeholder="9800000000" placeholderTextColor={t.shadow}
                value={mobile} onChangeText={setMobile} keyboardType="phone-pad" />
              <TouchableOpacity style={styles.pickBtn} onPress={pickScreenshot}>
                <Ionicons name="image-outline" size={18} color={t.clay} />
                <Text style={styles.pickBtnText}>
                  {screenshot ? (isNe ? 'स्क्रिनसट छानिएको ✓' : 'Screenshot attached ✓') : (isNe ? 'स्क्रिनसट थप्नुहोस् (ऐच्छिक)' : 'Attach screenshot (optional)')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.submitBtn, submitting && styles.redeemBtnDisabled]} onPress={submitPayment} disabled={submitting}>
                {submitting
                  ? <ActivityIndicator color={t.onAccent} />
                  : <Text style={styles.submitBtnText}>{isNe ? 'भुक्तानी विवरण पठाउनुहोस्' : 'Submit payment details'}</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setPaySheetVisible(false)}>
                <Text style={styles.cancelBtnText}>{isNe ? 'रद्द गर्नुहोस्' : 'Cancel'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (t: Palette) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: t.surface },
  container: { flex: 1, backgroundColor: t.surface },
  statusCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 12, marginTop: 16, marginBottom: 8,
    backgroundColor: t.greenLight, borderRadius: 14, padding: 16,
    borderWidth: 1.5, borderColor: t.green,
  },
  statusActive: { fontSize: 16, fontWeight: '700', color: t.greenDark },
  statusExpiry: { fontSize: 12, color: t.muted, marginTop: 4 },
  pendingCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 12, marginTop: 16, marginBottom: 8,
    backgroundColor: t.amberLight, borderRadius: 14, padding: 16,
    borderWidth: 1.5, borderColor: t.gold,
  },
  pendingTitle: { fontSize: 16, fontWeight: '700', color: t.amberDark },
  pendingText: { fontSize: 13, color: t.muted, marginTop: 4, lineHeight: 18 },

  sectionLabel: {
    fontSize: 13, fontWeight: '700', color: t.shadow,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
    textTransform: 'uppercase', letterSpacing: 1,
  },

  featuresRow: { flexDirection: 'row', marginHorizontal: 12, gap: 10, marginBottom: 8 },
  featureCard: {
    flex: 1, backgroundColor: t.surface, borderRadius: 14,
    overflow: 'hidden', elevation: 2, shadowColor: t.shadow,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
  },
  featureCardPremium: { borderWidth: 1.5, borderColor: t.clay },
  featureCardHeader: { backgroundColor: t.bg, padding: 10, alignItems: 'center' },
  featureCardTitle: { fontSize: 13, fontWeight: '800', color: t.text },
  featureRow: {
    flexDirection: 'row', alignItems: 'flex-start', padding: 8,
    borderBottomWidth: 1, borderBottomColor: t.border, gap: 6,
  },
  featureIcon: { fontSize: 14, width: 22 },
  featureText: { flex: 1, fontSize: 11, color: t.text, lineHeight: 16 },

  // Pricing
  pricingRow: { flexDirection: 'row', marginHorizontal: 12, gap: 10, marginBottom: 16 },
  priceCard: {
    flex: 1, backgroundColor: t.surface, borderRadius: 14,
    padding: 16, alignItems: 'center',
    borderWidth: 2, borderColor: t.border,
  },
  priceCardBest: {
    borderColor: t.clay, backgroundColor: t.surfaceWarm,
  },
  bestBadge: {
    position: 'absolute', top: -10, backgroundColor: '#FFD700',
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8,
  },
  bestBadgeText: { fontSize: 10, fontWeight: '900', color: '#000' },
  pricePlan: { fontSize: 14, fontWeight: '600', color: t.muted, marginBottom: 6 },
  priceAmount: { fontSize: 24, fontWeight: '800', color: t.text },
  pricePeriod: { fontSize: 12, color: t.muted, marginTop: 2 },
  priceSave: { fontSize: 12, color: t.green, fontWeight: '700', marginTop: 6 },

  // Compliance note — no links, no URLs
  complianceNote: {
    flexDirection: 'row', alignItems: 'flex-start',
    marginHorizontal: 12, marginTop: 8, marginBottom: 4,
    backgroundColor: t.bg, borderRadius: 12, padding: 14, gap: 8,
  },
  complianceText: { flex: 1, fontSize: 13, color: t.shadow, lineHeight: 18 },

  // Redemption
  redeemBox: {
    flexDirection: 'row', marginHorizontal: 12, marginTop: 8,
    backgroundColor: t.surface, borderRadius: 14, padding: 8,
    borderWidth: 1.5, borderColor: t.clay, gap: 8,
  },
  redeemInput: {
    flex: 1, fontSize: 16, color: t.text,
    paddingHorizontal: 12, paddingVertical: 12,
    letterSpacing: 2, fontWeight: '600',
  },
  redeemBtn: {
    backgroundColor: t.clay, borderRadius: 10,
    paddingHorizontal: 24, justifyContent: 'center',
  },
  redeemBtnDisabled: { backgroundColor: t.border },
  redeemBtnText: { color: t.onAccent, fontWeight: '700', fontSize: 15 },

  payBtn: { minHeight: 50, borderRadius: 12, backgroundColor: t.clay, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 12 },
  payBtnYearly: { backgroundColor: t.green },
  payBtnText: { color: t.onAccent, fontWeight: '800', fontSize: 14 },
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: t.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%', paddingHorizontal: 18, paddingTop: 20, paddingBottom: 30 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: t.titleInk, textAlign: 'center' },
  sheetAmount: { fontSize: 16, fontWeight: '700', color: t.clay, textAlign: 'center', marginTop: 6 },
  qr: { width: 220, height: 220, alignSelf: 'center', marginVertical: 14, borderRadius: 12 },
  sheetStep: { fontSize: 13, color: t.muted2, lineHeight: 19, marginBottom: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: t.labelInk, marginTop: 8, marginBottom: 4 },
  sheetInput: { borderWidth: 1.5, borderColor: t.border, borderRadius: 10, backgroundColor: t.bg, paddingHorizontal: 12, minHeight: 46, fontSize: 15, color: t.text },
  pickBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingVertical: 10 },
  pickBtnText: { color: t.clay, fontWeight: '700', fontSize: 14 },
  submitBtn: { minHeight: 52, borderRadius: 12, backgroundColor: t.clay, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  submitBtnText: { color: t.onAccent, fontWeight: '800', fontSize: 15 },
  cancelBtn: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  cancelBtnText: { color: t.muted2, fontWeight: '700' },

  valueHeader: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  valueTitle: { fontSize: 20, fontWeight: '800', color: t.text },
  valueSub: { fontSize: 13, color: t.muted2, marginTop: 4, lineHeight: 19 },
  benefitRow: { flexDirection: 'row', gap: 12, marginHorizontal: 12, marginBottom: 12, backgroundColor: t.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: t.border },
  benefitIconBox: { width: 42, height: 42, borderRadius: 21, backgroundColor: t.actionBg, alignItems: 'center', justifyContent: 'center' },
  benefitIcon: { fontSize: 20 },
  benefitTitle: { fontSize: 15, fontWeight: '800', color: t.text },
  benefitText: { fontSize: 12.5, color: t.muted2, lineHeight: 18, marginTop: 3 },
  planCard: { marginHorizontal: 12, marginBottom: 14, borderRadius: 18, padding: 16, borderWidth: 2, borderColor: t.border, backgroundColor: t.surface },
  planCardActive: { borderColor: t.clay, backgroundColor: t.actionBg },
  planTag: { position: 'absolute', top: -10, right: 14, backgroundColor: t.clay, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  planTagText: { color: t.onAccent, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  planName: { fontSize: 17, fontWeight: '800', color: t.text },
  planPer: { fontSize: 12, color: t.muted2, marginTop: 2 },
  planPrice: { fontSize: 22, fontWeight: '900', color: t.clay },
  planPayBtn: { minHeight: 46, borderRadius: 10, backgroundColor: t.clay, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 },
  planPayBtnText: { color: t.onAccent, fontWeight: '800', fontSize: 14 },
  trustStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginHorizontal: 12, marginVertical: 10, justifyContent: 'center' },
  trustItem: { fontSize: 12, fontWeight: '700', color: t.muted2 },
  stepRow: { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginBottom: 12, alignItems: 'flex-start' },
  stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: t.clay, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { color: t.onAccent, fontWeight: '900', fontSize: 12 },
  stepTitle: { fontWeight: '800', color: t.text, fontSize: 14 },
  stepText: { fontSize: 12.5, color: t.muted2, lineHeight: 18, marginTop: 2 },
});