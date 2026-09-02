// src/screens/ClinicSummaryScreen.tsx — Warm Nepali-first clinic hand-off export; preserve auditable, caregiver-triggered behavior.
import React, { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ThemeContext } from '../context/ThemeContext';
import { Palette } from '../theme';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import { Child, GrowthRecord, VaccineRecord } from '../types';
import { supabase } from '../lib/supabase';
import { queueOfflineMutation } from '../lib/featureStorage';
import { createOfflineMutation } from '../lib/offlineSync';
import { CLINICAL_SAFETY_NOTICE, getGrowthTrendFlags } from '../lib/clinicalSafety';

const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c] || c));

export default function ClinicSummaryScreen() {
  const { palette: t } = useContext(ThemeContext);
  const styles = makeStyles(t);
  const route = useRoute<any>();
  const child: Child = route.params.child;
  const { user } = useAuth();
  const { language } = useContext(LanguageContext);
  const isNe = language === 'ne';
  const tr = (ne: string, en: string) => (isNe ? ne : en);
  const [growth, setGrowth] = useState<GrowthRecord[]>([]);
  const [vaccines, setVaccines] = useState<VaccineRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [child.id]);

  const load = async () => {
    setLoading(true);
    const [growthResult, vaccineResult] = await Promise.all([
      supabase.from('growth_records').select('*').eq('child_id', child.id).order('date', { ascending: false }).limit(5),
      supabase.from('vaccinations').select('*').eq('child_id', child.id).order('scheduled_date', { ascending: true }),
    ]);
    setGrowth((growthResult.data || []).map((r: any) => ({ id: r.id, childId: r.child_id, ownerId: r.user_id, date: r.date, weight: Number(r.weight), height: r.height ? Number(r.height) : undefined, headCircumference: r.head_circumference ? Number(r.head_circumference) : undefined, notes: r.notes })));
    setVaccines((vaccineResult.data || []).map((r: any) => ({ id: r.id, childId: r.child_id, ownerId: r.user_id, vaccineName: r.vaccine_name, vaccineNameNepali: r.vaccine_name_nepali, scheduledDate: r.scheduled_date, givenDate: r.given_date, isGiven: r.is_given, isMissed: r.is_missed, batchNumber: r.batch_number, notes: r.notes })));
    setLoading(false);
  };

  const exportPdf = async () => {
    const flags = getGrowthTrendFlags(growth, isNe ? 'ne' : 'en');
    const fields = ['child name', 'date of birth', 'sex', 'last five growth measurements', 'immunization status', 'caregiver-entered clinic notes'];
    const labels = isNe ? {
      heading: 'कपूरी क क्लिनिक सारांश', dob: 'जन्म मिति', sex: 'लिङ्ग', created: 'हेरचाहकर्ताले तयार गर्नुभएको', share: 'छानिएको स्वास्थ्यकर्मीसँग मात्र साझा गर्नुहोस्।', growth: 'हालका वृद्धि मापन', date: 'मिति', weight: 'तौल', height: 'उचाइ', noGrowth: 'वृद्धि मापन सुरक्षित गरिएको छैन', immunization: 'खोप विवरण', vaccine: 'खोप', scheduled: 'निर्धारित मिति', status: 'स्थिति', given: 'दिइयो', review: 'समीक्षा आवश्यक', planned: 'योजना गरिएको', noVaccines: 'खोप विवरण सुरक्षित गरिएको छैन', observations: 'हेरचाहकर्ताले छलफल गर्नुपर्ने अवलोकन', shareTitle: 'क्लिनिक सारांश साझा गर्नुहोस्', createdTitle: 'सारांश तयार भयो', storageError: 'सारांश बनाउन सकिएन', storageHelp: 'उपकरणमा पर्याप्त खाली ठाउँ भएपछि फेरि प्रयास गर्नुहोस्।', kg: 'केजी', cm: 'सेमी', safety: CLINICAL_SAFETY_NOTICE.ne,
    } : {
      heading: 'Kapoori Ka clinic summary', dob: 'Date of birth', sex: 'Sex', created: 'Created by caregiver on', share: 'Share only with the chosen health professional.', growth: 'Recent growth measurements', date: 'Date', weight: 'Weight', height: 'Height', noGrowth: 'No saved measurements', immunization: 'Immunization record', vaccine: 'Vaccine', scheduled: 'Scheduled', status: 'Status', given: 'Given', review: 'Needs review', planned: 'Planned', noVaccines: 'No saved immunization records', observations: 'Caregiver observations to discuss', shareTitle: 'Share clinic summary', createdTitle: 'Summary created', storageError: 'Could not create summary', storageHelp: 'Please try again when your device has enough free storage.', kg: 'kg', cm: 'cm', safety: CLINICAL_SAFETY_NOTICE.en,
    };
    const html = `<!doctype html><html lang="${isNe ? 'ne' : 'en'}"><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;color:#35251e;padding:24px}h1{color:#9f4d2e}h2{font-size:16px;margin-top:22px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #d9c3b7;padding:7px;text-align:left}small{color:#6d5a52}</style></head><body><h1>${labels.heading}</h1><p><strong>${escapeHtml(child.name)}</strong> · ${labels.dob}: ${escapeHtml(child.dateOfBirth)} · ${labels.sex}: ${escapeHtml(child.sex)}</p><p><small>${labels.created} ${new Date().toLocaleString(isNe ? 'ne-NP' : 'en-US')}. ${labels.share}</small></p><h2>${labels.growth}</h2><table><tr><th>${labels.date}</th><th>${labels.weight}</th><th>${labels.height}</th></tr>${growth.map(r => `<tr><td>${escapeHtml(r.date)}</td><td>${escapeHtml(r.weight)} ${labels.kg}</td><td>${r.height ? `${escapeHtml(r.height)} ${labels.cm}` : '—'}</td></tr>`).join('') || `<tr><td colspan="3">${labels.noGrowth}</td></tr>`}</table><h2>${labels.immunization}</h2><table><tr><th>${labels.vaccine}</th><th>${labels.scheduled}</th><th>${labels.status}</th></tr>${vaccines.map(v => `<tr><td>${escapeHtml(isNe ? (v.vaccineNameNepali || v.vaccineName) : v.vaccineName)}</td><td>${escapeHtml(v.scheduledDate)}</td><td>${v.isGiven ? `${labels.given} ${escapeHtml(v.givenDate || '')}` : v.isMissed ? labels.review : labels.planned}</td></tr>`).join('') || `<tr><td colspan="3">${labels.noVaccines}</td></tr>`}</table>${flags.length ? `<h2>${labels.observations}</h2><ul>${flags.map(flag => `<li>${escapeHtml(flag.message)}</li>`).join('')}</ul>` : ''}<p><small>${labels.safety}</small></p></body></html>`;
    try {
      const result = await Print.printToFileAsync({ html });
      if (user?.uid) {
        const payload = { child_id: child.id, actor_id: user.uid, export_type: 'clinic_summary', fields_included: fields };
        const { error } = await supabase.from('record_export_audit').insert(payload);
        if (error) await queueOfflineMutation(createOfflineMutation('record_export_audit', payload, user.uid));
      }
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(result.uri, { mimeType: 'application/pdf', dialogTitle: labels.shareTitle });
      else Alert.alert(labels.createdTitle, `${tr('यहाँ सुरक्षित भयो', 'Saved at')} ${result.uri}`);
    } catch { Alert.alert(labels.storageError, labels.storageHelp); }
  };

  return <ScrollView style={styles.page} contentContainerStyle={styles.content}>{loading ? <ActivityIndicator color={t.terracotta} accessibilityLabel={tr('लोड हुँदैछ', 'Loading')} /> : <><Text style={styles.title}>{tr('क्लिनिक सारांश', 'Clinic summary')}</Text><Text style={styles.nepali}>{tr('तपाईंले स्वास्थ्यकर्मीसँग साझा गर्न रोज्नुभएको छोटो विवरण', 'A short record you choose to share with a health professional')}</Text><View style={styles.notice}><Text style={styles.noticeText}>{tr('यसमा छानिएका विवरण मात्र समावेश हुन्छन्। तपाईंले बटन थिचेपछि मात्र फाइल बन्छ र कार्य बच्चाको निर्यात इतिहासमा सुरक्षित हुन्छ।', 'This export includes only selected records. It is created only when you press the button and the action is recorded in the child’s export history.')}</Text></View><View style={styles.card}><Text style={styles.cardTitle}>{child.name}</Text><Text style={styles.detail}>{tr('जन्म मिति', 'Date of birth')}: {child.dateOfBirth}</Text><Text style={styles.detail}>{tr(`${growth.length} वटा हालका वृद्धि मापन · ${vaccines.filter(v => v.isGiven).length}/${vaccines.length} खोप दिइएको`, `${growth.length} recent growth measurement(s) · ${vaccines.filter(v => v.isGiven).length}/${vaccines.length} immunizations marked given`)}</Text></View><TouchableOpacity onPress={exportPdf} style={styles.primary} accessibilityRole="button" accessibilityLabel={tr('क्लिनिक सारांश PDF बनाएर साझा गर्नुहोस्', 'Create and share clinic summary PDF')}><Text style={styles.primaryText}>{tr('क्लिनिक सारांश PDF बनाएर साझा गर्नुहोस्', 'Create and share clinic summary PDF')}</Text></TouchableOpacity><Text style={styles.disclaimer}>{isNe ? CLINICAL_SAFETY_NOTICE.ne : CLINICAL_SAFETY_NOTICE.en}</Text></>}</ScrollView>;
}

const makeStyles = (t: Palette) => StyleSheet.create({ page: { flex: 1, backgroundColor: t.bgWarm }, content: { padding: 18, paddingBottom: 42 }, title: { fontSize: 25, fontWeight: '800', color: t.titleInk }, nepali: { color: t.subInk, marginBottom: 18 }, notice: { backgroundColor: t.amberLight, borderRadius: 12, padding: 13, marginBottom: 14 }, noticeText: { color: t.amberDark, lineHeight: 20 }, card: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, padding: 16, borderRadius: 16, marginBottom: 14 }, cardTitle: { color: t.titleInk, fontSize: 20, fontWeight: '800', marginBottom: 5 }, detail: { color: t.muted2, lineHeight: 20 }, primary: { minHeight: 50, borderRadius: 12, backgroundColor: t.terracotta, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 }, primaryText: { color: t.onAccent, fontWeight: '800', textAlign: 'center' }, disclaimer: { color: t.muted2, lineHeight: 20, fontSize: 13, marginTop: 18 } });
