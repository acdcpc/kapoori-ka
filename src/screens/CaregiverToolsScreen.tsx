// src/screens/CaregiverToolsScreen.tsx — Explicit shared care, feeding log, clinic visit, and local facility finder.
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { Child, ChildMembership, ClinicFacility } from '../types';
import { createCaregiverCode, listCaregivers, redeemCaregiverCode, revokeCaregiver } from '../lib/caregiverAccess';
import { supabase } from '../lib/supabase';
import { createOfflineMutation, flushOfflineQueue } from '../lib/offlineSync';
import { queueOfflineMutation } from '../lib/featureStorage';

const terracotta = '#B85C38';

export default function CaregiverToolsScreen() {
  const route = useRoute<any>();
  const child: Child | null = route.params?.child ?? null;
  const { user } = useAuth();
  const [members, setMembers] = useState<ChildMembership[]>([]);
  const [invite, setInvite] = useState<{ code: string; expiresAt: string } | null>(null);
  const [redeemCode, setRedeemCode] = useState('');
  const [foods, setFoods] = useState('');
  const [mealType, setMealType] = useState<'breastfeeding' | 'formula' | 'solid_food' | 'snack' | 'water' | 'other'>('solid_food');
  const [clinicName, setClinicName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [facilityQuery, setFacilityQuery] = useState('');
  const [facilities, setFacilities] = useState<ClinicFacility[]>([]);

  const canUseChildTools = Boolean(child?.id && user?.uid);
  useEffect(() => { if (child?.id) listCaregivers(child.id).then(setMembers).catch(() => setMembers([])); }, [child?.id]);
  useEffect(() => {
    const query = facilityQuery.trim();
    if (query.length < 2) { setFacilities([]); return; }
    const timer = setTimeout(() => {
      supabase.from('clinic_facilities').select('*').ilike('name', `%${query}%`).limit(12)
        .then(({ data }) => setFacilities((data || []).map((row: any) => ({ id: row.id, countryCode: row.country_code, name: row.name, district: row.district, ward: row.ward, facilityType: row.facility_type, phone: row.phone, address: row.address, verifiedAt: row.verified_at, sourceUrl: row.source_url }))));
    }, 300);
    return () => clearTimeout(timer);
  }, [facilityQuery]);

  const createCode = async () => {
    if (!child?.id) return Alert.alert('Open a child profile', 'Choose a child before creating a caregiver code.');
    try { setInvite(await createCaregiverCode(child.id, 'editor')); }
    catch (error: any) { Alert.alert('Could not create code', error.message || 'Try again.'); }
  };
  const redeem = async () => {
    try { const result = await redeemCaregiverCode(redeemCode); setRedeemCode(''); Alert.alert('Caregiver access added', `You now have ${result.role} access. Open the child list to view the shared profile.`); }
    catch (error: any) { Alert.alert('Code not accepted', error.message || 'Check the code and try again.'); }
  };
  const saveFeeding = async () => {
    if (!child?.id || !user?.uid) return;
    const payload = { child_id: child.id, recorded_by: user.uid, occurred_at: new Date().toISOString(), meal_type: mealType, foods: foods.split(',').map(x => x.trim()).filter(Boolean) };
    const { error } = await supabase.from('feeding_records').insert(payload);
    if (error) { await queueOfflineMutation(createOfflineMutation('create_feeding_record', payload, user.uid)); Alert.alert('Saved on this device', 'The feeding entry will sync only after you sign back into this same account.'); }
    else { setFoods(''); Alert.alert('Feeding entry saved', 'The care log is updated.'); }
  };
  const saveClinicVisit = async () => {
    if (!child?.id || !user?.uid) return;
    const payload = { child_id: child.id, recorded_by: user.uid, visit_date: new Date().toISOString().slice(0, 10), facility_name: clinicName.trim() || null, purpose: purpose.trim() || null };
    const { error } = await supabase.from('clinic_visits').insert(payload);
    if (error) { await queueOfflineMutation(createOfflineMutation('create_clinic_visit', payload, user.uid)); Alert.alert('Saved on this device', 'The clinic note will sync only after you sign back into this same account.'); }
    else { setClinicName(''); setPurpose(''); Alert.alert('Clinic visit saved', 'You can include it in the clinic summary.'); }
  };
  const activeName = useMemo(() => child?.name || 'a child profile', [child?.name]);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Care team and care log</Text><Text style={styles.nepali}>हेरचाह टोली र हेरचाह रेकर्ड</Text>
      {!canUseChildTools && <View style={styles.warning}><Text style={styles.warningText}>Open this from a child profile to create a code, record food, or save a clinic visit.</Text></View>}
      <Section title="Share with a trusted caregiver">
        <Text style={styles.helper}>Codes give a specific adult view or edit access for seven days. They are single-use, can be revoked, and should never be posted publicly.</Text>
        <TouchableOpacity onPress={createCode} style={styles.primary} accessibilityRole="button"><Text style={styles.primaryText}>Create editor code</Text></TouchableOpacity>
        {invite && <View style={styles.codeBox}><Text style={styles.codeLabel}>Share privately with one trusted adult before it expires</Text><Text selectable style={styles.code}>{invite.code}</Text><Text style={styles.helper}>Expires {new Date(invite.expiresAt).toLocaleString()}</Text></View>}
        {members.map(member => <View key={member.id} style={styles.member}><Text style={styles.memberText}>Caregiver · {member.role}</Text><TouchableOpacity onPress={() => child && revokeCaregiver(child.id, member.userId).then(() => setMembers(members.filter(m => m.id !== member.id))).catch(() => Alert.alert('Could not revoke', 'Try again.'))}><Text style={styles.revoke}>Remove access</Text></TouchableOpacity></View>)}
      </Section>
      <Section title="Join a care team"><TextInput value={redeemCode} onChangeText={setRedeemCode} autoCapitalize="characters" placeholder="Enter caregiver code" style={styles.input} accessibilityLabel="Caregiver code" /><TouchableOpacity onPress={redeem} style={styles.secondary} accessibilityRole="button"><Text style={styles.secondaryText}>Redeem caregiver code</Text></TouchableOpacity></Section>
      <Section title={`Feeding log for ${activeName}`}><Text style={styles.helper}>A memory aid, not a feeding prescription. Enter only what you observed.</Text><View style={styles.chips}>{(['breastfeeding', 'formula', 'solid_food', 'snack', 'water', 'other'] as const).map(type => <TouchableOpacity key={type} onPress={() => setMealType(type)} style={[styles.chip, mealType === type && styles.chipActive]}><Text style={mealType === type ? styles.chipTextActive : styles.chipText}>{type.replace('_', ' ')}</Text></TouchableOpacity>)}</View><TextInput value={foods} onChangeText={setFoods} placeholder="Food or drink, separated by commas" style={styles.input} accessibilityLabel="Food or drink" /><TouchableOpacity disabled={!canUseChildTools} onPress={saveFeeding} style={[styles.primary, !canUseChildTools && styles.disabled]}><Text style={styles.primaryText}>Save feeding entry</Text></TouchableOpacity></Section>
      <Section title="Clinic visit"><TextInput value={clinicName} onChangeText={setClinicName} placeholder="Facility name (optional)" style={styles.input} /><TextInput value={purpose} onChangeText={setPurpose} placeholder="Reason for visit or follow-up (optional)" style={styles.input} /><TouchableOpacity disabled={!canUseChildTools} onPress={saveClinicVisit} style={[styles.primary, !canUseChildTools && styles.disabled]}><Text style={styles.primaryText}>Save clinic visit</Text></TouchableOpacity></Section>
      <Section title="Find a listed facility"><Text style={styles.helper}>Results appear only after verified local directory data is imported. Confirm services and opening hours directly with the facility.</Text><TextInput value={facilityQuery} onChangeText={setFacilityQuery} placeholder="Search facility name" style={styles.input} />{facilities.map(facility => <View key={facility.id} style={styles.facility}><Text style={styles.facilityName}>{facility.name}</Text><Text style={styles.helper}>{[facility.facilityType, facility.ward, facility.district].filter(Boolean).join(' · ') || 'Directory entry'}</Text></View>)}</Section>
      <TouchableOpacity onPress={() => user?.uid ? flushOfflineQueue(user.uid).then(result => Alert.alert('Offline sync', `${result.synced} synced; ${result.remaining} remaining.`)).catch(() => Alert.alert('Sign in required', 'Sign in to the same account before syncing saved entries.')) : Alert.alert('Sign in required', 'Sign in to sync saved entries.')} style={styles.link}><Text style={styles.linkText}>Try syncing saved offline entries</Text></TouchableOpacity>
    </ScrollView>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) { return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>; }
const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: '#FFF8F2' }, content: { padding: 18, paddingBottom: 42 }, title: { fontSize: 25, fontWeight: '800', color: '#4A2B20' }, nepali: { color: '#7D5140', marginBottom: 18 }, section: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#F0DED2' }, sectionTitle: { fontSize: 18, fontWeight: '800', color: '#4A2B20', marginBottom: 8 }, helper: { color: '#6D5A52', lineHeight: 20, marginBottom: 10 }, warning: { backgroundColor: '#FFF2CA', padding: 13, borderRadius: 12, marginBottom: 14 }, warningText: { color: '#6E4E00', lineHeight: 20 }, primary: { minHeight: 48, borderRadius: 12, backgroundColor: terracotta, alignItems: 'center', justifyContent: 'center', marginTop: 6 }, primaryText: { color: '#FFF', fontWeight: '800' }, secondary: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: terracotta, alignItems: 'center', justifyContent: 'center', marginTop: 6 }, secondaryText: { color: terracotta, fontWeight: '800' }, input: { minHeight: 48, borderWidth: 1, borderColor: '#DABDAE', borderRadius: 10, paddingHorizontal: 12, backgroundColor: '#FFFCFA', marginBottom: 10, color: '#3D302B' }, codeBox: { marginTop: 12, backgroundColor: '#FCECE2', borderRadius: 12, padding: 12 }, codeLabel: { color: '#714D3B', fontSize: 13 }, code: { color: '#71381F', letterSpacing: 1.5, fontWeight: '900', fontSize: 20, marginVertical: 8 }, member: { flexDirection: 'row', justifyContent: 'space-between', minHeight: 44, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F5E7DD', marginTop: 10 }, memberText: { color: '#3D302B' }, revoke: { color: '#A52D20', fontWeight: '700' }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 10 }, chip: { minHeight: 38, paddingHorizontal: 10, justifyContent: 'center', borderRadius: 19, borderWidth: 1, borderColor: '#D7BBAA' }, chipActive: { backgroundColor: '#F6D9C9', borderColor: terracotta }, chipText: { color: '#634C40' }, chipTextActive: { color: '#71381F', fontWeight: '700' }, facility: { borderTopWidth: 1, borderTopColor: '#F5E7DD', paddingVertical: 10 }, facilityName: { color: '#4A2B20', fontWeight: '800' }, disabled: { opacity: 0.45 }, link: { minHeight: 44, justifyContent: 'center', alignItems: 'center' }, linkText: { color: terracotta, fontWeight: '800' } });
