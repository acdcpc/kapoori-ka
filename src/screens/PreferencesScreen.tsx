// src/screens/PreferencesScreen.tsx — Caregiver-controlled readability, privacy, and offline-sync controls.
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useAccessibility } from '../context/AccessibilityContext';
import { PrivacyPreferences } from '../types';
import { loadPrivacyPreferences, savePrivacyPreferences } from '../lib/featureAnalytics';
import { createOfflineMutation, flushOfflineQueue } from '../lib/offlineSync';
import { queueOfflineMutation } from '../lib/featureStorage';

const terracotta = '#B85C38';

export default function PreferencesScreen() {
  const { user } = useAuth();
  const { preferences, setPreferences, textScale, speak } = useAccessibility();
  const [privacy, setPrivacy] = useState<PrivacyPreferences>({ analyticsOptIn: false, shareCrashDiagnostics: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    loadPrivacyPreferences(user.uid).then(setPrivacy).catch(() => undefined);
  }, [user?.uid]);

  const updateAccessibility = async (patch: Partial<typeof preferences>) => {
    const next = { ...preferences, ...patch };
    await setPreferences(next);
    if (next.voiceGuidance) speak('Your accessibility settings have been updated.', 'en');
  };

  const updatePrivacy = async (patch: Partial<PrivacyPreferences>) => {
    if (!user?.uid) return;
    const next = { ...privacy, ...patch };
    setPrivacy(next);
    try { await savePrivacyPreferences(user.uid, next); }
    catch {
      await queueOfflineMutation(createOfflineMutation('update_privacy_preferences', {
        user_id: user.uid,
        analytics_opt_in: next.analyticsOptIn,
        share_crash_diagnostics: next.shareCrashDiagnostics,
      }, user.uid));
      Alert.alert('Saved on this device', 'Your privacy choice will be retried only after you sign back into this same account.');
    }
  };

  const syncNow = async () => {
    setSaving(true);
    try {
      if (!user?.uid) throw new Error('Sign in required');
      const result = await flushOfflineQueue(user.uid);
      Alert.alert('Sync complete', result.remaining ? `${result.synced} item(s) synced; ${result.remaining} will retry later.` : `${result.synced} saved item(s) synced safely.`);
    } finally { setSaving(false); }
  };

  return (
    <ScrollView style={[styles.page, preferences.highContrast && styles.highContrast]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { fontSize: textScale(25) }]}>Settings and privacy</Text>
      <Text style={[styles.nepali, { fontSize: textScale(15) }]}>सेटिङ र गोपनीयता</Text>

      <Section title="Readability and access">
        <Text style={styles.label}>Text size</Text>
        <View style={styles.choiceRow}>
          {(['standard', 'large', 'extra_large'] as const).map(size => (
            <TouchableOpacity key={size} accessibilityRole="radio" accessibilityState={{ selected: preferences.textScale === size }} onPress={() => updateAccessibility({ textScale: size })} style={[styles.choice, preferences.textScale === size && styles.choiceActive]}>
              <Text style={[styles.choiceText, preferences.textScale === size && styles.choiceTextActive]}>{size === 'standard' ? 'Standard' : size === 'large' ? 'Large' : 'Extra large'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Toggle label="High contrast" value={preferences.highContrast} onValueChange={(highContrast) => updateAccessibility({ highContrast })} />
        <Toggle label="Reduce motion" value={preferences.reduceMotion} onValueChange={(reduceMotion) => updateAccessibility({ reduceMotion })} />
        <Toggle label="Read key guidance aloud" value={preferences.voiceGuidance} onValueChange={(voiceGuidance) => updateAccessibility({ voiceGuidance })} />
        <Toggle label="Simple-language labels" value={preferences.literacyMode} onValueChange={(literacyMode) => updateAccessibility({ literacyMode })} />
      </Section>

      <Section title="Care and sharing">
        <TouchableOpacity accessibilityRole="button" onPress={() => Alert.alert('Open a child profile', 'Open a child profile, then select “Care team & care log” to manage caregiver access or care entries.')} style={styles.action}>
          <Text style={styles.actionTitle}>Caregiver access and care log</Text>
          <Text style={styles.actionText}>Share only with a trusted adult; access can be revoked at any time.</Text>
        </TouchableOpacity>
        <Text style={styles.helper}>Open a child profile first to create a caregiver code or add feeding and clinic notes.</Text>
      </Section>

      <Section title="Privacy choices">
        <Text style={styles.helper}>Optional usage counts improve the app. They never include child names, child IDs, notes, measurements, photos, or precise location.</Text>
        <Toggle label="Share anonymous feature-use counts" value={privacy.analyticsOptIn} onValueChange={(analyticsOptIn) => updatePrivacy({ analyticsOptIn })} />
        <Toggle label="Share crash diagnostics" value={privacy.shareCrashDiagnostics} onValueChange={(shareCrashDiagnostics) => updatePrivacy({ shareCrashDiagnostics })} />
      </Section>

      <Section title="Offline records">
        <Text style={styles.helper}>Entries made without a connection stay only on this device until you choose to sync after signing in. Do not uninstall the app before syncing.</Text>
        <TouchableOpacity disabled={saving} onPress={syncNow} style={[styles.primary, saving && styles.disabled]} accessibilityRole="button">
          <Text style={styles.primaryText}>{saving ? 'Syncing…' : 'Sync saved entries now'}</Text>
        </TouchableOpacity>
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>;
}
function Toggle({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (value: boolean) => void }) {
  return <View style={styles.toggle}><Text style={styles.label}>{label}</Text><Switch value={value} onValueChange={onValueChange} trackColor={{ false: '#C8B9A8', true: '#D89777' }} thumbColor={value ? terracotta : '#fff'} /></View>;
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FFF8F2' }, content: { padding: 18, paddingBottom: 40 }, highContrast: { backgroundColor: '#FFF' },
  title: { color: '#4A2B20', fontWeight: '800' }, nepali: { color: '#7D5140', marginTop: 2, marginBottom: 18 },
  section: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#F0DED2' }, sectionTitle: { fontSize: 18, fontWeight: '800', color: '#4A2B20', marginBottom: 10 },
  label: { flex: 1, color: '#3D302B', fontSize: 16 }, helper: { color: '#6D5A52', lineHeight: 20, marginBottom: 12 }, toggle: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  choiceRow: { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' }, choice: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#D7BBAA' }, choiceActive: { backgroundColor: terracotta, borderColor: terracotta }, choiceText: { color: '#4A2B20', fontWeight: '700' }, choiceTextActive: { color: '#FFF' },
  action: { backgroundColor: '#FCECE2', borderRadius: 12, padding: 14, marginBottom: 8 }, actionTitle: { color: '#71381F', fontWeight: '800', fontSize: 16 }, actionText: { color: '#714D3B', marginTop: 5, lineHeight: 19 },
  primary: { minHeight: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: terracotta }, primaryText: { color: '#FFF', fontWeight: '800' }, disabled: { opacity: 0.6 },
});
