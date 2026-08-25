// src/screens/CaregiverToolsScreen.tsx — Explicit shared care, feeding log, clinic visit, and local facility finder.
import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
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
  const { language } = useContext(LanguageContext);
  const isNepali = language === 'ne';
  const tr = (ne: string, en: string) => isNepali ? ne : en;
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
    if (!child?.id) return Alert.alert(tr('बच्चाको प्रोफाइल खोल्नुहोस्', 'Open a child profile'), tr('हेरचाहकर्ता कोड बनाउनुअघि एउटा बच्चाको प्रोफाइल छान्नुहोस्।', 'Select a child profile before creating a caregiver code.'));
    try { setInvite(await createCaregiverCode(child.id, 'editor')); }
    catch (error: any) { Alert.alert(tr('कोड बनाउन सकिएन', 'Could not create the code'), error.message || tr('फेरि प्रयास गर्नुहोस्।', 'Please try again.')); }
  };
  const redeem = async () => {
    try { const result = await redeemCaregiverCode(redeemCode); setRedeemCode(''); const role = result.role === 'editor' ? tr('सम्पादन', 'editing') : tr('हेर्ने', 'viewing'); Alert.alert(tr('हेरचाह टोलीमा थपिनुभयो', 'Added to the care team'), tr(`तपाईंलाई ${role} पहुँच दिइएको छ। साझा प्रोफाइल हेर्न बच्चाको सूची खोल्नुहोस्।`, `You now have ${role} access. Open the child list to view the shared profile.`)); }
    catch (error: any) { Alert.alert(tr('कोड स्वीकार भएन', 'Code was not accepted'), error.message || tr('कोड जाँच गरी फेरि प्रयास गर्नुहोस्।', 'Check the code and try again.')); }
  };
  const saveFeeding = async () => {
    if (!child?.id || !user?.uid) return;
    const payload = { child_id: child.id, recorded_by: user.uid, occurred_at: new Date().toISOString(), meal_type: mealType, foods: foods.split(',').map(x => x.trim()).filter(Boolean) };
    const { error } = await supabase.from('feeding_records').insert(payload);
    if (error) { await queueOfflineMutation(createOfflineMutation('create_feeding_record', payload, user.uid)); Alert.alert(tr('यो उपकरणमा सुरक्षित भयो', 'Saved on this device'), tr('इन्टरनेट जोडिएपछि खानेकुराको विवरण आफैँ समक्रमण हुनेछ।', 'The feeding record will sync when the internet is available.')); }
    else { setFoods(''); Alert.alert(tr('खुवाएको विवरण सुरक्षित भयो', 'Feeding record saved'), tr('हेरचाह रेकर्ड अद्यावधिक भयो।', 'The care record was updated.')); }
  };
  const saveClinicVisit = async () => {
    if (!child?.id || !user?.uid) return;
    const payload = { child_id: child.id, recorded_by: user.uid, visit_date: new Date().toISOString().slice(0, 10), facility_name: clinicName.trim() || null, purpose: purpose.trim() || null };
    const { error } = await supabase.from('clinic_visits').insert(payload);
    if (error) { await queueOfflineMutation(createOfflineMutation('create_clinic_visit', payload, user.uid)); Alert.alert(tr('यो उपकरणमा सुरक्षित भयो', 'Saved on this device'), tr('इन्टरनेट जोडिएपछि स्वास्थ्य संस्था भ्रमणको विवरण आफैँ समक्रमण हुनेछ।', 'The clinic visit will sync when the internet is available.')); }
    else { setClinicName(''); setPurpose(''); Alert.alert(tr('स्वास्थ्य संस्था भ्रमण सुरक्षित भयो', 'Clinic visit saved'), tr('यसलाई स्वास्थ्य संस्था सारांशमा समावेश गर्न सकिन्छ।', 'It can be included in the clinic summary.')); }
  };
  const activeName = useMemo(() => child?.name || tr('बच्चाको प्रोफाइल', 'Child profile'), [child?.name, language]);
  const mealTypeLabels: Record<typeof mealType, string> = isNepali
    ? { breastfeeding: 'स्तनपान', formula: 'फर्मुला दूध', solid_food: 'ठोस खाना', snack: 'खाजा', water: 'पानी', other: 'अन्य' }
    : { breastfeeding: 'Breastfeeding', formula: 'Formula milk', solid_food: 'Solid food', snack: 'Snack', water: 'Water', other: 'Other' };
  const roleLabels: Record<string, string> = isNepali
    ? { viewer: 'हेर्ने', editor: 'सम्पादन गर्ने', owner: 'मुख्य हेरचाहकर्ता' }
    : { viewer: 'Viewer', editor: 'Editor', owner: 'Primary caregiver' };

  const syncOffline = async () => {
    if (!user?.uid) {
      Alert.alert(tr('सत्र आवश्यक छ', 'Session required'), tr('अफलाइन रेकर्ड समक्रमण गर्न फेरि लगइन गर्नुहोस्।', 'Please sign in again to sync offline records.'));
      return;
    }
    const result = await flushOfflineQueue(user.uid);
    Alert.alert(tr('अफलाइन समक्रमण', 'Offline sync'), tr(`${result.synced} वटा समक्रमण भयो; ${result.remaining} वटा बाँकी छन्।`, `${result.synced} synced; ${result.remaining} remaining.`));
  };
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>{tr('हेरचाह टोली र रेकर्ड', 'Care team and records')}</Text><Text style={styles.nepali}>{tr('बच्चाको हेरचाहमा विश्वासिलो परिवार वा हेरचाहकर्तालाई जोड्नुहोस्।', 'Invite a trusted family member or caregiver to help with this child’s care.')}</Text>
      {!canUseChildTools && <View style={styles.warning}><Text style={styles.warningText}>{tr('कोड बनाउन, खुवाएको विवरण वा स्वास्थ्य संस्था भ्रमण सुरक्षित गर्न बच्चाको प्रोफाइलबाट यो पृष्ठ खोल्नुहोस्।', 'Open this page from a child profile to create codes or save feeding and clinic-visit records.')}</Text></View>}
      <Section title={tr('विश्वासिलो हेरचाहकर्तासँग साझेदारी गर्नुहोस्', 'Share with a trusted caregiver')}>
        <Text style={styles.helper}>{tr('यो कोडले एक जना विश्वासिलो वयस्कलाई सात दिनसम्म हेर्ने वा सम्पादन गर्ने पहुँच दिन्छ। कोड एकपटक मात्र प्रयोग हुन्छ, पहुँच हटाउन सकिन्छ, र सार्वजनिक रूपमा साझा गर्नु हुँदैन।', 'This code gives one trusted adult viewing or editing access for seven days. It works once, can be revoked, and must not be shared publicly.')}</Text>
        <TouchableOpacity onPress={createCode} style={styles.primary} accessibilityRole="button"><Text style={styles.primaryText}>{tr('सम्पादन गर्ने कोड बनाउनुहोस्', 'Create editing code')}</Text></TouchableOpacity>
        {invite && <View style={styles.codeBox}><Text style={styles.codeLabel}>{tr('म्याद सकिनुअघि एक जना विश्वासिलो वयस्कसँग निजी रूपमा साझा गर्नुहोस्', 'Share privately with one trusted adult before it expires')}</Text><Text selectable style={styles.code}>{invite.code}</Text><Text style={styles.helper}>{tr('म्याद', 'Expires')}: {new Date(invite.expiresAt).toLocaleString(isNepali ? 'ne-NP' : 'en-US')}</Text></View>}
        {members.map(member => <View key={member.id} style={styles.member}><Text style={styles.memberText}>{tr('हेरचाहकर्ता', 'Caregiver')} · {roleLabels[member.role] || member.role}</Text><TouchableOpacity onPress={() => child && revokeCaregiver(child.id, member.userId).then(() => setMembers(members.filter(m => m.id !== member.id))).catch(() => Alert.alert(tr('पहुँच हटाउन सकिएन', 'Could not remove access'), tr('फेरि प्रयास गर्नुहोस्।', 'Please try again.')))}><Text style={styles.revoke}>{tr('पहुँच हटाउनुहोस्', 'Remove access')}</Text></TouchableOpacity></View>)}
      </Section>
      <Section title={tr('हेरचाह टोलीमा जोडिनुहोस्', 'Join a care team')}><TextInput value={redeemCode} onChangeText={setRedeemCode} autoCapitalize="characters" placeholder={tr('हेरचाहकर्ता कोड लेख्नुहोस्', 'Enter caregiver code')} style={styles.input} accessibilityLabel={tr('हेरचाहकर्ता कोड', 'Caregiver code')} /><TouchableOpacity onPress={redeem} style={styles.secondary} accessibilityRole="button"><Text style={styles.secondaryText}>{tr('हेरचाहकर्ता कोड प्रयोग गर्नुहोस्', 'Redeem caregiver code')}</Text></TouchableOpacity></Section>
      <Section title={tr(`${activeName} का लागि खुवाएको रेकर्ड`, `Feeding record for ${activeName}`)}><Text style={styles.helper}>{tr('यो सम्झनाका लागि राखिने रेकर्ड हो, खुवाउने चिकित्सकीय निर्देशन होइन। तपाईंले देखेको कुरा मात्र लेख्नुहोस्।', 'This is a memory aid, not medical feeding advice. Record only what you observed.')}</Text><View style={styles.chips}>{(['breastfeeding', 'formula', 'solid_food', 'snack', 'water', 'other'] as const).map(type => <TouchableOpacity key={type} onPress={() => setMealType(type)} style={[styles.chip, mealType === type && styles.chipActive]} accessibilityRole="button" accessibilityLabel={tr(`${mealTypeLabels[type]} छान्नुहोस्`, `Select ${mealTypeLabels[type]}`)}><Text style={mealType === type ? styles.chipTextActive : styles.chipText}>{mealTypeLabels[type]}</Text></TouchableOpacity>)}</View><TextInput value={foods} onChangeText={setFoods} placeholder={tr('खाना वा पेय पदार्थ, अल्पविरामले छुट्याएर लेख्नुहोस्', 'Enter foods or drinks separated by commas')} style={styles.input} accessibilityLabel={tr('खाना वा पेय पदार्थ', 'Food or drink')} /><TouchableOpacity disabled={!canUseChildTools} onPress={saveFeeding} style={[styles.primary, !canUseChildTools && styles.disabled]}><Text style={styles.primaryText}>{tr('खुवाएको विवरण सुरक्षित गर्नुहोस्', 'Save feeding record')}</Text></TouchableOpacity></Section>
      <Section title={tr('स्वास्थ्य संस्था भ्रमण', 'Clinic visit')}><TextInput value={clinicName} onChangeText={setClinicName} placeholder={tr('स्वास्थ्य संस्थाको नाम (ऐच्छिक)', 'Facility name (optional)')} style={styles.input} accessibilityLabel={tr('स्वास्थ्य संस्थाको नाम', 'Facility name')} /><TextInput value={purpose} onChangeText={setPurpose} placeholder={tr('भ्रमणको कारण वा फलो-अप (ऐच्छिक)', 'Visit reason or follow-up (optional)')} style={styles.input} accessibilityLabel={tr('भ्रमणको कारण वा फलो-अप', 'Visit reason or follow-up')} /><TouchableOpacity disabled={!canUseChildTools} onPress={saveClinicVisit} style={[styles.primary, !canUseChildTools && styles.disabled]}><Text style={styles.primaryText}>{tr('स्वास्थ्य संस्था भ्रमण सुरक्षित गर्नुहोस्', 'Save clinic visit')}</Text></TouchableOpacity></Section>
      <Section title={tr('सूचीमा रहेको स्वास्थ्य संस्था खोज्नुहोस्', 'Find a listed health facility')}><Text style={styles.helper}>{tr('प्रमाणित स्थानीय निर्देशिका विवरण आयात भएपछि मात्र नतिजा देखिन्छ। सेवा र खुल्ने समय स्वास्थ्य संस्थासँगै प्रत्यक्ष पुष्टि गर्नुहोस्।', 'Results appear only after a verified local directory is imported. Confirm services and opening hours directly with the facility.')}</Text><TextInput value={facilityQuery} onChangeText={setFacilityQuery} placeholder={tr('स्वास्थ्य संस्थाको नाम खोज्नुहोस्', 'Search facility name')} style={styles.input} accessibilityLabel={tr('स्वास्थ्य संस्थाको नाम खोज्नुहोस्', 'Search facility name')} />{facilities.map(facility => <View key={facility.id} style={styles.facility}><Text style={styles.facilityName}>{facility.name}</Text><Text style={styles.helper}>{[facility.facilityType, facility.ward, facility.district].filter(Boolean).join(' · ') || tr('निर्देशिका विवरण', 'Directory details')}</Text></View>)}</Section>
      <TouchableOpacity onPress={syncOffline} style={styles.link} accessibilityRole="button"><Text style={styles.linkText}>{tr('अफलाइन सुरक्षित भएका विवरण समक्रमण गर्नुहोस्', 'Sync records saved offline')}</Text></TouchableOpacity>
    </ScrollView>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) { return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>; }
const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: '#FFF8F2' }, content: { padding: 18, paddingBottom: 42 }, title: { fontSize: 25, fontWeight: '800', color: '#4A2B20' }, nepali: { color: '#7D5140', marginBottom: 18 }, section: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#F0DED2' }, sectionTitle: { fontSize: 18, fontWeight: '800', color: '#4A2B20', marginBottom: 8 }, helper: { color: '#6D5A52', lineHeight: 20, marginBottom: 10 }, warning: { backgroundColor: '#FFF2CA', padding: 13, borderRadius: 12, marginBottom: 14 }, warningText: { color: '#6E4E00', lineHeight: 20 }, primary: { minHeight: 48, borderRadius: 12, backgroundColor: terracotta, alignItems: 'center', justifyContent: 'center', marginTop: 6 }, primaryText: { color: '#FFF', fontWeight: '800' }, secondary: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: terracotta, alignItems: 'center', justifyContent: 'center', marginTop: 6 }, secondaryText: { color: terracotta, fontWeight: '800' }, input: { minHeight: 48, borderWidth: 1, borderColor: '#DABDAE', borderRadius: 10, paddingHorizontal: 12, backgroundColor: '#FFFCFA', marginBottom: 10, color: '#3D302B' }, codeBox: { marginTop: 12, backgroundColor: '#FCECE2', borderRadius: 12, padding: 12 }, codeLabel: { color: '#714D3B', fontSize: 13 }, code: { color: '#71381F', letterSpacing: 1.5, fontWeight: '900', fontSize: 20, marginVertical: 8 }, member: { flexDirection: 'row', justifyContent: 'space-between', minHeight: 44, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F5E7DD', marginTop: 10 }, memberText: { color: '#3D302B' }, revoke: { color: '#A52D20', fontWeight: '700' }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 10 }, chip: { minHeight: 38, paddingHorizontal: 10, justifyContent: 'center', borderRadius: 19, borderWidth: 1, borderColor: '#D7BBAA' }, chipActive: { backgroundColor: '#F6D9C9', borderColor: terracotta }, chipText: { color: '#634C40' }, chipTextActive: { color: '#71381F', fontWeight: '700' }, facility: { borderTopWidth: 1, borderTopColor: '#F5E7DD', paddingVertical: 10 }, facilityName: { color: '#4A2B20', fontWeight: '800' }, disabled: { opacity: 0.45 }, link: { minHeight: 44, justifyContent: 'center', alignItems: 'center' }, linkText: { color: terracotta, fontWeight: '800' } });
