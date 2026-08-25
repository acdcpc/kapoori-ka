// src/screens/PreferencesScreen.tsx — Warm Nepali-first readability, privacy, caregiver, and offline-sync controls; keep ownership and consent boundaries unchanged.
import React, { useContext, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import { useAccessibility } from '../context/AccessibilityContext';
import { PrivacyPreferences } from '../types';
import { loadPrivacyPreferences, savePrivacyPreferences } from '../lib/featureAnalytics';
import { createOfflineMutation, flushOfflineQueue } from '../lib/offlineSync';
import { queueOfflineMutation } from '../lib/featureStorage';

const terracotta = '#B85C38';

export default function PreferencesScreen() {
  const { user } = useAuth();
  const { language } = useContext(LanguageContext);
  const { preferences, setPreferences, textScale, speak } = useAccessibility();
  const isNe = language === 'ne';
  const tr = (ne: string, en: string) => (isNe ? ne : en);
  const [privacy, setPrivacy] = useState<PrivacyPreferences>({ analyticsOptIn: false, shareCrashDiagnostics: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    loadPrivacyPreferences(user.uid).then(setPrivacy).catch(() => undefined);
  }, [user?.uid]);

  const updateAccessibility = async (patch: Partial<typeof preferences>) => {
    const next = { ...preferences, ...patch };
    await setPreferences(next);
    if (next.voiceGuidance) speak(tr('तपाईंको पहुँच सेटिङ अपडेट भयो।', 'Your accessibility settings have been updated.'), isNe ? 'ne' : 'en');
  };

  const updatePrivacy = async (patch: Partial<PrivacyPreferences>) => {
    if (!user?.uid) return;
    const next = { ...privacy, ...patch };
    setPrivacy(next);
    try { await savePrivacyPreferences(user.uid, next); }
    catch {
      await queueOfflineMutation(createOfflineMutation('update_privacy_preferences', { user_id: user.uid, analytics_opt_in: next.analyticsOptIn, share_crash_diagnostics: next.shareCrashDiagnostics }, user.uid));
      Alert.alert(tr('यो उपकरणमा सुरक्षित भयो', 'Saved on this device'), tr('तपाईंको गोपनीयता रोजाइ यही खातामा फेरि साइन इन गरेपछि मात्र पुनः पठाइनेछ।', 'Your privacy choice will be retried only after you sign back into this same account.'));
    }
  };

  const syncNow = async () => {
    setSaving(true);
    try {
      if (!user?.uid) throw new Error('Sign in required');
      const result = await flushOfflineQueue(user.uid);
      Alert.alert(tr('सिङ्क पूरा भयो', 'Sync complete'), result.remaining ? tr(`${result.synced} वटा सुरक्षित गरियो; ${result.remaining} पछि फेरि प्रयास हुनेछ।`, `${result.synced} item(s) synced; ${result.remaining} will retry later.`) : tr(`${result.synced} वटा सुरक्षित विवरण सुरक्षित रूपमा सिङ्क गरियो।`, `${result.synced} saved item(s) synced safely.`));
    } catch { Alert.alert(tr('सिङ्क गर्न सकिएन', 'Sync could not be completed'), tr('इन्टरनेट जडान जाँच गरी फेरि प्रयास गर्नुहोस्।', 'Check your connection and try again.')); }
    finally { setSaving(false); }
  };

  return (
    <ScrollView style={[styles.page, preferences.highContrast && styles.highContrast]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { fontSize: textScale(25) }]}>{tr('सेटिङ र गोपनीयता', 'Settings and privacy')}</Text>
      <Text style={[styles.nepali, { fontSize: textScale(15) }]}>{tr('तपाईंको पढाइ, साझा गर्ने र व्यक्तिगत विवरणसम्बन्धी रोजाइ', 'Control readability, sharing, and personal-data choices')}</Text>

      <Section title={tr('पढ्न सजिलो र पहुँच', 'Readability and access')}>
        <Text style={styles.label}>{tr('अक्षरको आकार', 'Text size')}</Text>
        <View style={styles.choiceRow} accessibilityRole="radiogroup">
          {(['standard', 'large', 'extra_large'] as const).map(size => {
            const label = size === 'standard' ? tr('सामान्य', 'Standard') : size === 'large' ? tr('ठूलो', 'Large') : tr('अझ ठूलो', 'Extra large');
            return <TouchableOpacity key={size} accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ selected: preferences.textScale === size }} onPress={() => updateAccessibility({ textScale: size })} style={[styles.choice, preferences.textScale === size && styles.choiceActive]}><Text style={[styles.choiceText, preferences.textScale === size && styles.choiceTextActive]}>{label}</Text></TouchableOpacity>;
          })}
        </View>
        <Toggle label={tr('उच्च कन्ट्रास्ट', 'High contrast')} value={preferences.highContrast} onValueChange={(highContrast) => updateAccessibility({ highContrast })} />
        <Toggle label={tr('चलायमान प्रभाव घटाउनुहोस्', 'Reduce motion')} value={preferences.reduceMotion} onValueChange={(reduceMotion) => updateAccessibility({ reduceMotion })} />
        <Toggle label={tr('मुख्य निर्देशन ठूलो स्वरमा पढ्नुहोस्', 'Read key guidance aloud')} value={preferences.voiceGuidance} onValueChange={(voiceGuidance) => updateAccessibility({ voiceGuidance })} />
        <Toggle label={tr('सरल भाषाका लेबल प्रयोग गर्नुहोस्', 'Simple-language labels')} value={preferences.literacyMode} onValueChange={(literacyMode) => updateAccessibility({ literacyMode })} />
      </Section>

      <Section title={tr('हेरचाह र साझा पहुँच', 'Care and sharing')}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={tr('हेरचाहकर्ता पहुँच र हेरचाह रेकर्ड खोल्नुहोस्', 'Open caregiver access and care log')} onPress={() => Alert.alert(tr('बच्चाको प्रोफाइल खोल्नुहोस्', 'Open a child profile'), tr('पहिले बच्चाको प्रोफाइल खोल्नुहोस्, त्यसपछि “हेरचाह टोली र हेरचाह रेकर्ड” छानेर पहुँच व्यवस्थापन गर्नुहोस् वा रेकर्ड थप्नुहोस्।', 'Open a child profile, then select “Care team & care log” to manage caregiver access or care entries.'))} style={styles.action}>
          <Text style={styles.actionTitle}>{tr('हेरचाहकर्ता पहुँच र हेरचाह रेकर्ड', 'Caregiver access and care log')}</Text>
          <Text style={styles.actionText}>{tr('विश्वासिलो वयस्कसँग मात्र साझा गर्नुहोस्; पहुँच जुनसुकै बेला हटाउन सकिन्छ।', 'Share only with a trusted adult; access can be revoked at any time.')}</Text>
        </TouchableOpacity>
        <Text style={styles.helper}>{tr('हेरचाहकर्ता कोड बनाउन वा खुवाइ तथा क्लिनिकका टिपोट थप्न पहिले बच्चाको प्रोफाइल खोल्नुहोस्।', 'Open a child profile first to create a caregiver code or add feeding and clinic notes.')}</Text>
      </Section>

      <Section title={tr('गोपनीयता रोजाइ', 'Privacy choices')}>
        <Text style={styles.helper}>{tr('ऐच्छिक प्रयोगसम्बन्धी सङ्ख्याले एप सुधार्न मद्दत गर्छ। यसमा बच्चाको नाम, बच्चाको ID, टिपोट, मापन, फोटो वा ठ्याक्कै स्थान समावेश हुँदैन।', 'Optional usage counts improve the app. They never include child names, child IDs, notes, measurements, photos, or precise location.')}</Text>
        <Toggle label={tr('नाम नखुलेका सुविधा-प्रयोग सङ्ख्या साझा गर्नुहोस्', 'Share anonymous feature-use counts')} value={privacy.analyticsOptIn} onValueChange={(analyticsOptIn) => updatePrivacy({ analyticsOptIn })} />
        <Toggle label={tr('एपसम्बन्धी समस्या पत्ता लगाउने विवरण साझा गर्नुहोस्', 'Share crash diagnostics')} value={privacy.shareCrashDiagnostics} onValueChange={(shareCrashDiagnostics) => updatePrivacy({ shareCrashDiagnostics })} />
      </Section>

      <Section title={tr('अफलाइन सुरक्षित विवरण', 'Offline records')}>
        <Text style={styles.helper}>{tr('इन्टरनेट नभएको बेला थपिएका विवरण साइन इन गरेपछि सिङ्क रोजेसम्म यही उपकरणमा मात्र रहन्छन्। सिङ्क गर्नुअघि एप अनइन्स्टल नगर्नुहोस्।', 'Entries made without a connection stay only on this device until you choose to sync after signing in. Do not uninstall the app before syncing.')}</Text>
        <TouchableOpacity disabled={saving} onPress={syncNow} style={[styles.primary, saving && styles.disabled]} accessibilityRole="button" accessibilityLabel={tr('सुरक्षित विवरण अहिले सिङ्क गर्नुहोस्', 'Sync saved entries now')}>
          <Text style={styles.primaryText}>{saving ? tr('सिङ्क हुँदैछ…', 'Syncing…') : tr('सुरक्षित विवरण अहिले सिङ्क गर्नुहोस्', 'Sync saved entries now')}</Text>
        </TouchableOpacity>
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) { return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>; }
function Toggle({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (value: boolean) => void }) { return <View style={styles.toggle}><Text style={styles.label}>{label}</Text><Switch accessibilityLabel={label} value={value} onValueChange={onValueChange} trackColor={{ false: '#C8B9A8', true: '#D89777' }} thumbColor={value ? terracotta : '#fff'} /></View>; }
const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: '#FFF8F2' }, content: { padding: 18, paddingBottom: 40 }, highContrast: { backgroundColor: '#FFF' }, title: { color: '#4A2B20', fontWeight: '800' }, nepali: { color: '#7D5140', marginTop: 2, marginBottom: 18 }, section: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#F0DED2' }, sectionTitle: { fontSize: 18, fontWeight: '800', color: '#4A2B20', marginBottom: 10 }, label: { flex: 1, color: '#3D302B', fontSize: 16 }, helper: { color: '#6D5A52', lineHeight: 20, marginBottom: 12 }, toggle: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 }, choiceRow: { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' }, choice: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#D7BBAA' }, choiceActive: { backgroundColor: terracotta, borderColor: terracotta }, choiceText: { color: '#4A2B20', fontWeight: '700' }, choiceTextActive: { color: '#FFF' }, action: { backgroundColor: '#FCECE2', borderRadius: 12, padding: 14, marginBottom: 8 }, actionTitle: { color: '#71381F', fontWeight: '800', fontSize: 16 }, actionText: { color: '#714D3B', marginTop: 5, lineHeight: 19 }, primary: { minHeight: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: terracotta }, primaryText: { color: '#FFF', fontWeight: '800' }, disabled: { opacity: 0.6 } });
