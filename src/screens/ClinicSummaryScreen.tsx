// src/screens/ClinicSummaryScreen.tsx — Caregiver-triggered, minimal, auditable clinic hand-off export.
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { Child, GrowthRecord, VaccineRecord } from '../types';
import { supabase } from '../lib/supabase';
import { queueOfflineMutation } from '../lib/featureStorage';
import { createOfflineMutation } from '../lib/offlineSync';
import { CLINICAL_SAFETY_NOTICE, getGrowthTrendFlags } from '../lib/clinicalSafety';

const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c] || c));

export default function ClinicSummaryScreen() {
  const route = useRoute<any>();
  const child: Child = route.params.child;
  const { user } = useAuth();
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
    const flags = getGrowthTrendFlags(growth, 'en');
    const fields = ['child name', 'date of birth', 'sex', 'last five growth measurements', 'immunization status', 'caregiver-entered clinic notes'];
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;color:#35251e;padding:24px}h1{color:#9f4d2e}h2{font-size:16px;margin-top:22px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #d9c3b7;padding:7px;text-align:left}small{color:#6d5a52}</style></head><body><h1>Kapoori Ka clinic summary</h1><p><strong>${escapeHtml(child.name)}</strong> · Date of birth: ${escapeHtml(child.dateOfBirth)} · Sex: ${escapeHtml(child.sex)}</p><p><small>Created by caregiver on ${new Date().toLocaleString()}. Share only with the chosen health professional.</small></p><h2>Recent growth measurements</h2><table><tr><th>Date</th><th>Weight</th><th>Height</th></tr>${growth.map(r => `<tr><td>${escapeHtml(r.date)}</td><td>${escapeHtml(r.weight)} kg</td><td>${r.height ? `${escapeHtml(r.height)} cm` : '—'}</td></tr>`).join('') || '<tr><td colspan="3">No saved measurements</td></tr>'}</table><h2>Immunization record</h2><table><tr><th>Vaccine</th><th>Scheduled</th><th>Status</th></tr>${vaccines.map(v => `<tr><td>${escapeHtml(v.vaccineName)}</td><td>${escapeHtml(v.scheduledDate)}</td><td>${v.isGiven ? `Given ${escapeHtml(v.givenDate || '')}` : v.isMissed ? 'Needs review' : 'Planned'}</td></tr>`).join('') || '<tr><td colspan="3">No saved immunization records</td></tr>'}</table>${flags.length ? `<h2>Caregiver observations to discuss</h2><ul>${flags.map(flag => `<li>${escapeHtml(flag.message)}</li>`).join('')}</ul>` : ''}<p><small>${CLINICAL_SAFETY_NOTICE.en}</small></p></body></html>`;
    try {
      const result = await Print.printToFileAsync({ html });
      if (user?.uid) {
        const payload = { child_id: child.id, actor_id: user.uid, export_type: 'clinic_summary', fields_included: fields };
        const { error } = await supabase.from('record_export_audit').insert(payload);
        if (error) await queueOfflineMutation(createOfflineMutation('record_export_audit', payload, user.uid));
      }
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(result.uri, { mimeType: 'application/pdf', dialogTitle: 'Share clinic summary' });
      else Alert.alert('Summary created', `Saved at ${result.uri}`);
    } catch { Alert.alert('Could not create summary', 'Please try again when your device has enough free storage.'); }
  };
  return <ScrollView style={styles.page} contentContainerStyle={styles.content}>{loading ? <ActivityIndicator color="#B85C38" /> : <><Text style={styles.title}>Clinic summary</Text><Text style={styles.nepali}>क्लिनिक सारांश</Text><View style={styles.notice}><Text style={styles.noticeText}>This export includes only selected records. It is created only when you press the button and the action is recorded in the child’s export history.</Text></View><View style={styles.card}><Text style={styles.cardTitle}>{child.name}</Text><Text style={styles.detail}>Date of birth: {child.dateOfBirth}</Text><Text style={styles.detail}>{growth.length} recent growth measurement(s) · {vaccines.filter(v => v.isGiven).length}/{vaccines.length} immunizations marked given</Text></View><TouchableOpacity onPress={exportPdf} style={styles.primary} accessibilityRole="button"><Text style={styles.primaryText}>Create and share clinic summary PDF</Text></TouchableOpacity><Text style={styles.disclaimer}>{CLINICAL_SAFETY_NOTICE.en}</Text></>}</ScrollView>;
}
const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: '#FFF8F2' }, content: { padding: 18, paddingBottom: 42 }, title: { fontSize: 25, fontWeight: '800', color: '#4A2B20' }, nepali: { color: '#7D5140', marginBottom: 18 }, notice: { backgroundColor: '#FFF2CA', borderRadius: 12, padding: 13, marginBottom: 14 }, noticeText: { color: '#6E4E00', lineHeight: 20 }, card: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#F0DED2', padding: 16, borderRadius: 16, marginBottom: 14 }, cardTitle: { color: '#4A2B20', fontSize: 20, fontWeight: '800', marginBottom: 5 }, detail: { color: '#6D5A52', lineHeight: 20 }, primary: { minHeight: 50, borderRadius: 12, backgroundColor: '#B85C38', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 }, primaryText: { color: '#FFF', fontWeight: '800', textAlign: 'center' }, disclaimer: { color: '#6D5A52', lineHeight: 20, fontSize: 13, marginTop: 18 } });
