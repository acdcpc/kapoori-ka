// src/screens/ImmunizationScreen.tsx
import React, { useContext, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, Modal, FlatList, Platform,
} from 'react-native';
import { ThemeContext } from '../context/ThemeContext';
import { Palette } from '../theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import { LanguageContext } from '../context/LanguageContext';
import { RootStackParamList } from '../navigation/types';
import { translations } from '../i18n/translations';
import { VaccineRecord } from '../types';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import InfoBubble from '../components/InfoBubble';
import { PremiumGuard } from '../components/PremiumGuard';
import { supabase } from '../lib/supabase';
import ConfettiCannon from 'react-native-confetti-cannon';
import * as Speech from 'expo-speech';
import NepaliDate from 'nepali-date-converter';
import { scheduleVaccineReminders } from '../utils/notifications';
import { useAuth } from '../context/AuthContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Immunization'>;

interface NIPEntry {
  id: string; name: string; nameNe: string; ageLabel: string; ageLabelNe: string;
  ageInDays: number; diseases: string; diseasesNe: string; route: string; routeNe: string; dose: string; doseNe: string;
  isSupplement?: boolean;
}

const NIP_SCHEDULE: NIPEntry[] = [
  { id:'bcg', ageInDays:0, ageLabel:'At Birth', ageLabelNe:'जन्मदा', name:'BCG', nameNe:'बीसीजी', diseases:'Tuberculosis', diseasesNe:'क्षयरोग', route:'Intradermal', routeNe:'छालामुनि', dose:'0.05 ml', doseNe:'०.०५ मिली' },
  { id:'penta1', ageInDays:42, ageLabel:'6 Weeks', ageLabelNe:'६ हप्ता', name:'Penta 1', nameNe:'पेन्टा १', diseases:'DPT, HepB, Hib', diseasesNe:'डीपीटी, हेपबी, हिब', route:'IM', routeNe:'मांसपेशीमा', dose:'0.5 ml', doseNe:'०.५ मिली' },
  { id:'opv1', ageInDays:42, ageLabel:'6 Weeks', ageLabelNe:'६ हप्ता', name:'OPV 1', nameNe:'ओपीभी १', diseases:'Polio', diseasesNe:'पोलियो', route:'Oral', routeNe:'मुखबाट', dose:'2 drops', doseNe:'२ थोपा' },
  { id:'pcv1', ageInDays:42, ageLabel:'6 Weeks', ageLabelNe:'६ हप्ता', name:'PCV 1', nameNe:'पीसीभी १', diseases:'Pneumonia', diseasesNe:'निमोनिया', route:'IM', routeNe:'मांसपेशीमा', dose:'0.5 ml', doseNe:'०.५ मिली' },
  { id:'rota1', ageInDays:42, ageLabel:'6 Weeks', ageLabelNe:'६ हप्ता', name:'Rota 1', nameNe:'रोटा १', diseases:'Diarrhea', diseasesNe:'झाडापखाला', route:'Oral', routeNe:'मुखबाट', dose:'0.5 ml', doseNe:'०.५ मिली' },
  { id:'penta2', ageInDays:70, ageLabel:'10 Weeks', ageLabelNe:'१० हप्ता', name:'Penta 2', nameNe:'पेन्टा २', diseases:'DPT, HepB, Hib', diseasesNe:'डीपीटी, हेपबी, हिब', route:'IM', routeNe:'मांसपेशीमा', dose:'0.5 ml', doseNe:'०.५ मिली' },
  { id:'opv2', ageInDays:70, ageLabel:'10 Weeks', ageLabelNe:'१० हप्ता', name:'OPV 2', nameNe:'ओपीभी २', diseases:'Polio', diseasesNe:'पोलियो', route:'Oral', routeNe:'मुखबाट', dose:'2 drops', doseNe:'२ थोपा' },
  { id:'pcv2', ageInDays:70, ageLabel:'10 Weeks', ageLabelNe:'१० हप्ता', name:'PCV 2', nameNe:'पीसीभी २', diseases:'Pneumonia', diseasesNe:'निमोनिया', route:'IM', routeNe:'मांसपेशीमा', dose:'0.5 ml', doseNe:'०.५ मिली' },
  { id:'rota2', ageInDays:70, ageLabel:'10 Weeks', ageLabelNe:'१० हप्ता', name:'Rota 2', nameNe:'रोटा २', diseases:'Diarrhea', diseasesNe:'झाडापखाला', route:'Oral', routeNe:'मुखबाट', dose:'0.5 ml', doseNe:'०.५ मिली' },
  { id:'penta3', ageInDays:98, ageLabel:'14 Weeks', ageLabelNe:'१४ हप्ता', name:'Penta 3', nameNe:'पेन्टा ३', diseases:'DPT, HepB, Hib', diseasesNe:'डीपीटी, हेपबी, हिब', route:'IM', routeNe:'मांसपेशीमा', dose:'0.5 ml', doseNe:'०.५ मिली' },
  { id:'opv3', ageInDays:98, ageLabel:'14 Weeks', ageLabelNe:'१४ हप्ता', name:'OPV 3', nameNe:'ओपीभी ३', diseases:'Polio', diseasesNe:'पोलियो', route:'Oral', routeNe:'मुखबाट', dose:'2 drops', doseNe:'२ थोपा' },
  { id:'fipv1', ageInDays:98, ageLabel:'14 Weeks', ageLabelNe:'१४ हप्ता', name:'fIPV 1', nameNe:'fIPV १', diseases:'Polio', diseasesNe:'पोलियो', route:'ID', routeNe:'छालामुनि', dose:'0.1 ml', doseNe:'०.१ मिली' },
  { id:'mr1', ageInDays:274, ageLabel:'9 Months', ageLabelNe:'९ महिना', name:'MR 1', nameNe:'एमआर १', diseases:'Measles', diseasesNe:'दादुरा-रुबेला', route:'SC', routeNe:'छालामुनि', dose:'0.5 ml', doseNe:'०.५ मिली' },
  { id:'pcv3', ageInDays:274, ageLabel:'9 Months', ageLabelNe:'९ महिना', name:'PCV 3', nameNe:'पीसीभी ३', diseases:'Pneumonia', diseasesNe:'निमोनिया', route:'IM', routeNe:'मांसपेशीमा', dose:'0.5 ml', doseNe:'०.५ मिली' },
  { id:'fipv2', ageInDays:274, ageLabel:'9 Months', ageLabelNe:'९ महिना', name:'fIPV 2', nameNe:'fIPV २', diseases:'Polio', diseasesNe:'पोलियो', route:'ID', routeNe:'छालामुनि', dose:'0.1 ml', doseNe:'०.१ मिली' },
  { id:'je', ageInDays:365, ageLabel:'12 Months', ageLabelNe:'१२ महिना', name:'JE', nameNe:'जेई (दिमागी ज्वरो)', diseases:'Encephalitis', diseasesNe:'दिमागी ज्वरो', route:'SC', routeNe:'छालामुनि', dose:'0.5 ml', doseNe:'०.५ मिली' },
  { id:'mr2', ageInDays:456, ageLabel:'15 Months', ageLabelNe:'१५ महिना', name:'MR 2', nameNe:'एमआर २', diseases:'Measles', diseasesNe:'दादुरा-रुबेला', route:'SC', routeNe:'छालामुनि', dose:'0.5 ml', doseNe:'०.५ मिली' },
  { id:'typhoid', ageInDays:456, ageLabel:'15 Months', ageLabelNe:'१५ महिना', name:'Typhoid', nameNe:'टाइफाइड', diseases:'Typhoid', diseasesNe:'टाइफाइड ज्वरो', route:'IM', routeNe:'मांसपेशीमा', dose:'0.5 ml', doseNe:'०.५ मिली' },
  // Vitamin A Supplementation — Nepal NIP 2024, MoHP, GoN
  { id:'vitA-6m',  ageInDays:183,  ageLabel:'6 Months',  ageLabelNe:'६ महिना',  name:'Vitamin A (1st)',  nameNe:'भिटामिन ए (पहिलो)',  diseases:'Night blindness prevention', diseasesNe:'रतन्धो रोकथाम', route:'Oral', routeNe:'मुखबाट', dose:'100,000 IU', doseNe:'१ लाख IU', isSupplement:true },
  { id:'vitA-12m', ageInDays:365,  ageLabel:'12 Months', ageLabelNe:'१२ महिना', name:'Vitamin A', nameNe:'भिटामिन ए', diseases:'Night blindness prevention', diseasesNe:'रतन्धो रोकथाम', route:'Oral', routeNe:'मुखबाट', dose:'200,000 IU', doseNe:'२ लाख IU', isSupplement:true },
  { id:'vitA-18m', ageInDays:548,  ageLabel:'18 Months', ageLabelNe:'१८ महिना', name:'Vitamin A', nameNe:'भिटामिन ए', diseases:'Night blindness prevention', diseasesNe:'रतन्धो रोकथाम', route:'Oral', routeNe:'मुखबाट', dose:'200,000 IU', doseNe:'२ लाख IU', isSupplement:true },
  { id:'vitA-24m', ageInDays:730,  ageLabel:'24 Months', ageLabelNe:'२४ महिना', name:'Vitamin A', nameNe:'भिटामिन ए', diseases:'Night blindness prevention', diseasesNe:'रतन्धो रोकथाम', route:'Oral', routeNe:'मुखबाट', dose:'200,000 IU', doseNe:'२ लाख IU', isSupplement:true },
  { id:'vitA-30m', ageInDays:913,  ageLabel:'30 Months', ageLabelNe:'३० महिना', name:'Vitamin A', nameNe:'भिटामिन ए', diseases:'Night blindness prevention', diseasesNe:'रतन्धो रोकथाम', route:'Oral', routeNe:'मुखबाट', dose:'200,000 IU', doseNe:'२ लाख IU', isSupplement:true },
  { id:'vitA-36m', ageInDays:1095, ageLabel:'36 Months', ageLabelNe:'३६ महिना', name:'Vitamin A', nameNe:'भिटामिन ए', diseases:'Night blindness prevention', diseasesNe:'रतन्धो रोकथाम', route:'Oral', routeNe:'मुखबाट', dose:'200,000 IU', doseNe:'२ लाख IU', isSupplement:true },
  { id:'vitA-42m', ageInDays:1278, ageLabel:'42 Months', ageLabelNe:'४२ महिना', name:'Vitamin A', nameNe:'भिटामिन ए', diseases:'Night blindness prevention', diseasesNe:'रतन्धो रोकथाम', route:'Oral', routeNe:'मुखबाट', dose:'200,000 IU', doseNe:'२ लाख IU', isSupplement:true },
  { id:'vitA-48m', ageInDays:1461, ageLabel:'48 Months', ageLabelNe:'४८ महिना', name:'Vitamin A', nameNe:'भिटामिन ए', diseases:'Night blindness prevention', diseasesNe:'रतन्धो रोकथाम', route:'Oral', routeNe:'मुखबाट', dose:'200,000 IU', doseNe:'२ लाख IU', isSupplement:true },
  { id:'vitA-54m', ageInDays:1643, ageLabel:'54 Months', ageLabelNe:'५४ महिना', name:'Vitamin A', nameNe:'भिटामिन ए', diseases:'Night blindness prevention', diseasesNe:'रतन्धो रोकथाम', route:'Oral', routeNe:'मुखबाट', dose:'200,000 IU', doseNe:'२ लाख IU', isSupplement:true },
  { id:'vitA-60m', ageInDays:1826, ageLabel:'60 Months', ageLabelNe:'६० महिना', name:'Vitamin A', nameNe:'भिटामिन ए', diseases:'Night blindness prevention', diseasesNe:'रतन्धो रोकथाम', route:'Oral', routeNe:'मुखबाट', dose:'200,000 IU', doseNe:'२ लाख IU', isSupplement:true },
];

const AGE_GROUPS = [
  { label: 'At Birth', labelNe: 'जन्मदा', ageInDays: 0 },
  { label: '6 Weeks', labelNe: '६ हप्ता', ageInDays: 42 },
  { label: '10 Weeks', labelNe: '१० हप्ता', ageInDays: 70 },
  { label: '14 Weeks', labelNe: '१४ हप्ता', ageInDays: 98 },
  { label: '9 Months', labelNe: '९ महिना', ageInDays: 274 },
  { label: '12 Months', labelNe: '१२ महिना', ageInDays: 365 },
  { label: '15 Months', labelNe: '१५ महिना', ageInDays: 456 },
];

type VaccineStatus = 'given' | 'due' | 'upcoming' | 'missed';

interface ComputedVaccine extends NIPEntry {
  isSupplement?: boolean;
  scheduledDate: string; givenDate?: string; status: VaccineStatus; daysUntilDue: number;
}

function computeSchedule(dob: string, givenIds: Set<string>, missedIds: Set<string>, records: VaccineRecord[]): ComputedVaccine[] {
  const today = dayjs().startOf('day');
  const recordMap = new Map(records.map(r => [r.vaccineName, r]));
  return NIP_SCHEDULE.map(v => {
    const record = recordMap.get(v.id);
    const scheduledDate = record?.scheduledDate
      ? dayjs(record.scheduledDate).startOf('day')
      : dayjs(dob).add(v.ageInDays, 'day').startOf('day');
    const daysUntilDue = scheduledDate.diff(today, 'day');
    const isGiven = givenIds.has(v.id), isMissed = missedIds.has(v.id);
    let status: VaccineStatus;
    if (isGiven) status = 'given';
    else if (isMissed) status = 'missed';
    else if (daysUntilDue < 0) status = 'missed';
    else if (daysUntilDue <= 14) status = 'due';
    else status = 'upcoming';
    return { ...v, scheduledDate: scheduledDate.format('YYYY-MM-DD'), givenDate: record?.givenDate, status, daysUntilDue, isSupplement: v.isSupplement || false };
  });
}

const makeStatusPill = (pal: Palette): Record<VaccineStatus, { bg: string; text: string; labelEn: string; labelNe: string }> => ({
  given: { bg: pal.greenLight, text: pal.greenDark, labelEn: 'Given', labelNe: 'दिइयो' },
  due: { bg: pal.amberLight, text: pal.amberDark, labelEn: 'Due Now', labelNe: 'दिनुपर्छ' },
  upcoming: { bg: pal.border, text: pal.muted, labelEn: 'Upcoming', labelNe: 'आउँदो' },
  missed: { bg: pal.redLight, text: pal.redDark, labelEn: 'Missed', labelNe: 'छुट्यो' },
});

const neMonths = ['बैशाख','जेठ','असार','साउन','भदौ','असोज','कार्तिक','मंसिर','पुष','माघ','फागुन','चैत्र'];
const neDigits = (n: number) => String(n).split('').map(c => '०१२३४५६७८९'[parseInt(c)] ?? c).join('');

function formatDateNe(dateStr: string): string {
  try {
    const d = dayjs(dateStr, 'YYYY-MM-DD');
    if (!d.isValid()) return dateStr;
    const bs = new NepaliDate(new Date(d.year(), d.month(), d.date()));
    return `${neDigits(bs.getDate())} ${neMonths[bs.getMonth()]} ${neDigits(bs.getYear())}`;
  } catch { return dateStr; }
}

const BS_YEARS = Array.from({ length: 10 }, (_, i) => 2081 + i);
const BS_MONTHS_LIST = Array.from({ length: 12 }, (_, i) => i + 1);
const AD_YEARS = Array.from({ length: 5 }, (_, i) => 2024 + i);
const AD_MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

function bsToAdStr(bsYear: number, bsMonth: number, bsDay: number): string {
  try { return dayjs(new NepaliDate(bsYear, bsMonth - 1, bsDay).toJsDate()).format('YYYY-MM-DD'); }
  catch { return dayjs().format('YYYY-MM-DD'); }
}

function bsDaysInMonth(bsYear: number, bsMonth: number): number {
  try { return Math.round((new NepaliDate(bsYear, bsMonth, 1).toJsDate().getTime() - new NepaliDate(bsYear, bsMonth - 1, 1).toJsDate().getTime()) / 86400000); }
  catch { return 30; }
}

export default function ImmunizationScreen({ route, navigation }: Props) {
  const { palette: pal } = useContext(ThemeContext);
  const statusPill = makeStatusPill(pal);
  const styles = makeStyles(pal);
  const { child } = route.params;
  const { language } = useContext(LanguageContext);
  const { subscription, user } = useAuth();
  const t = translations[language];
  const isNe = language === 'ne';
  const isPremium = subscription?.status === 'active' || subscription?.plan === 'premium' || subscription?.plan === 'yearly' || subscription?.plan === 'monthly';

  const [vaccineRecords, setVaccineRecords] = useState<VaccineRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tracker' | 'schedule'>('tracker');
  const [trackerFilter, setTrackerFilter] = useState<'all' | 'upcoming' | 'missed'>('all');

  const [showConfetti, setShowConfetti] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pendingVaccine, setPendingVaccine] = useState<ComputedVaccine | null>(null);
  const [bsYear, setBsYear] = useState(2081);
  const [bsMonth, setBsMonth] = useState(4);
  const [bsDay, setBsDay] = useState(1);
  const [selectedADDate, setSelectedADDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  const loadRecords = async () => {
    try {
      if (!user?.uid || !child?.id) { setVaccineRecords([]); return; }
      const { data, error: sbError } = await supabase
        .from('vaccinations')
        .select('*')
        .eq('child_id', child.id);
      if (sbError) throw sbError;
      console.log('[IMMUN] loadRecords got', data?.length || 0, 'records');
      if (data?.length) {
        data.slice(0, 3).forEach((d: any) => {
          console.log('[IMMUN] DB record:', { name: d.vaccine_name, given: d.is_given, givenDate: d.given_date, scheduledDate: d.scheduled_date });
        });
      }
      const loaded: VaccineRecord[] = (data || []).map((d: any) => ({
        id: d.id,
        childId: d.child_id,
        ownerId: d.user_id,
        vaccineName: d.vaccine_name,
        vaccineNameNepali: d.vaccine_name_nepali,
        scheduledDate: d.scheduled_date,
        givenDate: d.given_date,
        isGiven: d.is_given,
        isMissed: d.is_missed,
      }));
      setVaccineRecords(loaded);
    } catch (e: any) {
      console.error('Load vaccine records error:', e?.message || e);
      Alert.alert('Error', 'Could not load records.');
    }
    finally { setLoading(false); }
  };

  useEffect(() => { loadRecords().then(() => syncDobBasedDates()); }, []);
  useEffect(() => {
    return () => { Speech.stop(); };
  }, []);

  useEffect(() => {
    if (vaccineRecords.length > 0) {
      const givenIds2 = new Set(vaccineRecords.filter(v => v.isGiven).map(v => v.vaccineName));
      const missedIds2 = new Set(vaccineRecords.filter(v => v.isMissed).map(v => v.vaccineName));
      const childName = child.name || (language === 'ne' ? 'तपाईंको बच्चा' : 'Your Child');
      scheduleVaccineReminders(childName, computeSchedule(child.dateOfBirth, givenIds2, missedIds2, vaccineRecords), language).catch((err: any) => {
        console.error('Failed to schedule vaccine reminders:', err?.message || err);
      });
    }
  }, [vaccineRecords.length, isPremium]);

  const handleSetStatus = (vaccine: ComputedVaccine, status: 'given' | 'missed') => {
    // Premium gate: free users cannot set status for upcoming/missed vaccines
    if (!isPremium && (vaccine.status === 'upcoming' || vaccine.status === 'missed')) {
      setShowPremiumModal(true);
      return;
    }
    if (status === 'given') {
      setPendingVaccine(vaccine); setShowDatePicker(true); setSelectedADDate(dayjs().format('YYYY-MM-DD'));
      if (isNe) { try { const bs = new NepaliDate(new Date()); setBsYear(bs.getYear()); setBsMonth(bs.getMonth() + 1); setBsDay(bs.getDay()); } catch {} }
    } else { confirmSetStatus(vaccine, 'missed', dayjs().format('YYYY-MM-DD')); }
  };

  const confirmSetStatus = async (vaccine: ComputedVaccine, status: 'given' | 'missed', givenDate: string) => {
    console.log('[IMMUN] confirmSetStatus called:', { vaccineId: vaccine.id, status, givenDate, scheduledDate: vaccine.scheduledDate, userId: user?.uid?.substring(0, 8), childId: child.id });
    try {
      const record = {
        child_id: child.id,
        user_id: user?.uid || '',
        vaccine_name: vaccine.id,
        vaccine_name_nepali: vaccine.nameNe,
        scheduled_date: vaccine.scheduledDate,
        given_date: status === 'given' ? givenDate : null,
        is_given: status === 'given',
        is_missed: status === 'missed',
      };
      console.log('[IMMUN] record to upsert:', JSON.stringify(record));

      // Idempotent upsert keyed on (child_id, vaccine_name) — no select-then-write race
      const { error: upErr } = await supabase
        .from('vaccinations')
        .upsert(record, { onConflict: 'child_id,vaccine_name' });
      console.log('[IMMUN] upsert result:', { error: upErr?.message, code: (upErr as any)?.code });
      if (upErr) throw upErr;

      console.log('[IMMUN] saved', vaccine.id, 'as', status, 'on', givenDate);
      await loadRecords();
      // Do not automatically derive a catch-up series from a recorded dose.
      // A health worker must confirm any delayed-dose plan for the child.
      await syncDobBasedDates();
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
    } catch (e: any) {
      console.error('[IMMUN] Save vaccine error:', e?.message || e, 'code:', e?.code);
      Alert.alert(isNe ? 'त्रुटि' : 'Error', (e?.message) || (isNe ? 'सुरक्षित गर्न सकिएन।' : 'Could not save.'));
    }
  };

  // Sync 9-month, 12-month, 15-month vaccine dates from DOB.
  // These are always DOB-based, not derived from the 6/10/14-week chain.
  const syncDobBasedDates = async () => {
    if (!child?.dateOfBirth) return;
    const dob = dayjs(child.dateOfBirth);
    const dobBased: Record<string, string> = {
      mr1: dob.add(274, 'day').format('YYYY-MM-DD'),       // 9 months
      pcv3: dob.add(274, 'day').format('YYYY-MM-DD'),       // 9 months
      fipv2: dob.add(274, 'day').format('YYYY-MM-DD'),      // 9 months
      je: dob.add(365, 'day').format('YYYY-MM-DD'),          // 12 months
      mr2: dob.add(456, 'day').format('YYYY-MM-DD'),         // 15 months
      typhoid: dob.add(456, 'day').format('YYYY-MM-DD'),     // 15 months
    };
    try {
      // Only insert if not already present — never overwrite user-set dates
      for (const [vid, date] of Object.entries(dobBased)) {
        const { data: existing } = await supabase
          .from('vaccinations')
          .select('id, scheduled_date, given_date')
          .eq('child_id', child.id)
          .eq('vaccine_name', vid)
          .maybeSingle();
        
        if (!existing) {
          // No record exists → create with DOB-derived date
          await supabase.from('vaccinations').insert({
            child_id: child.id,
            user_id: user?.uid || '',
            vaccine_name: vid,
            scheduled_date: date,
          });
        }
        // If record exists, leave the scheduled_date as-is (user may have customized it)
      }
    } catch (e: any) {
      console.error('syncDobBasedDates error:', e?.message || e);
    }
  };


  if (loading) return <ActivityIndicator size="large" color={pal.clay} style={{ flex: 1, backgroundColor: pal.bg }} />;

  const givenIds = new Set(vaccineRecords.filter(v => v.isGiven).map(v => v.vaccineName));
  const missedIds = new Set(vaccineRecords.filter(v => v.isMissed).map(v => v.vaccineName));
  const computed = computeSchedule(child.dateOfBirth, givenIds, missedIds, vaccineRecords);
  const missedVaccines = computed.filter(v => v.status === 'missed' && !v.isSupplement);
  const childAgeMonths = dayjs().diff(dayjs(child.dateOfBirth), 'month');
  const nextDue = computed.find(v => v.status === 'due' || v.status === 'upcoming');
  return (
    <View style={styles.container}>
      {showConfetti && Platform.OS !== 'web' && <ConfettiCannon count={40} origin={{ x: -10, y: 0 }} fadeOut autoStart explosionSpeed={250} fallSpeed={2000} />}
      {nextDue && (
        <View style={[styles.nextBanner, { borderLeftColor: nextDue.status === 'due' ? pal.red : pal.clay }]}>
          <Ionicons name="notifications" size={18} color={nextDue.status === 'due' ? pal.red : pal.clay} />
          <Text style={[styles.nextBannerText, { color: nextDue.status === 'due' ? pal.redDark : pal.amberDark }]}>
            {isNe
              ? `अर्को खोप: ${nextDue.nameNe} (${nextDue.ageLabelNe}) — ${formatDateNe(nextDue.scheduledDate)} — ${statusPill[nextDue.status].labelNe}`
              : `Next vaccine: ${nextDue.name} (${nextDue.ageLabel}) — ${nextDue.scheduledDate} — ${statusPill[nextDue.status].labelEn}`}
          </Text>
        </View>
      )}

      {/* Tabs — underline style */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tab, activeTab === 'tracker' && styles.activeTab]} onPress={() => setActiveTab('tracker')}>
          <Text style={[styles.tabText, activeTab === 'tracker' && styles.activeTabText]}>{isNe ? 'ट्र्याकर' : 'Tracker'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'schedule' && styles.activeTab]} onPress={() => setActiveTab('schedule')}>
          <Text style={[styles.tabText, activeTab === 'schedule' && styles.activeTabText]}>{isNe ? 'तालिका' : 'Schedule'}</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'tracker' ? (
        <View style={{ flex: 1 }}>
          {/* Filter pills */}
          <View style={styles.filterRow}>
            <TouchableOpacity style={[styles.filterPill, trackerFilter === 'all' && styles.filterPillActive]} onPress={() => setTrackerFilter('all')}>
              <Text style={[styles.filterPillText, trackerFilter === 'all' && styles.filterPillTextActive]}>
                {isNe ? 'सबै' : 'All'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.filterPill, !isPremium && styles.filterPillOutline]} onPress={() => isPremium ? setTrackerFilter('upcoming') : setShowPremiumModal(true)}>
              <Text style={[styles.filterPillText, (!isPremium || trackerFilter !== 'upcoming') ? undefined : styles.filterPillTextActive]}>
                {isNe ? 'आउँदो' : 'Upcoming'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.filterPill, !isPremium && styles.filterPillOutline]} onPress={() => isPremium ? setTrackerFilter('missed') : setShowPremiumModal(true)}>
              <Text style={[styles.filterPillText, (!isPremium || trackerFilter !== 'missed') ? undefined : styles.filterPillTextActive]}>
                {isNe ? 'छुट्यो' : 'Missed'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 50 }}>

            {missedVaccines.length > 0 && (
              <View style={styles.catchUpNotice} accessibilityRole="alert">
                <Ionicons name="medical-outline" size={20} color={pal.amberDark} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.catchUpTitle}>{isNe ? 'छुटेको खोपका लागि सहयोग' : 'Support for missed vaccines'}</Text>
                  <Text style={styles.catchUpText}>
                    {isNe
                      ? 'छुटेको खोप देखिएको छ। सही क्याच-अप मिति बालबालिकाको उमेर, पहिलेका खोप र स्थानीय मार्गदर्शनमा निर्भर हुन्छ। नजिकको स्वास्थ्यकर्मी वा खोप केन्द्रसँग पुष्टि गर्नुहोस्।'
                      : 'A missed vaccine is shown. This is not an automated catch-up plan: the correct date depends on age, previous doses, and local guidance. Please confirm the plan with a health worker or immunization clinic.'}
                  </Text>
                </View>
              </View>
            )}

            {AGE_GROUPS.map(group => {
              const vaccines = computed.filter(v => v.ageLabel === group.label && !v.isSupplement);
              const filtered = vaccines.filter(v => {
                if (trackerFilter === 'upcoming') return v.status === 'upcoming' || v.status === 'due';
                if (trackerFilter === 'missed') return v.status === 'missed';
                return true;
              });
              if (filtered.length === 0) return null;

              return (
                <View key={group.label} style={styles.groupSection}>
                  {/* Group Header — horizontal rule style */}
                  <View style={styles.groupHeader}>
                    <View style={styles.groupLine} />
                    <Text style={styles.groupHeaderText}>{isNe ? group.labelNe : group.label}</Text>
                    <View style={styles.groupLine} />
                  </View>

                  {filtered.map(v => {
                    const pill = statusPill[v.status];
                    return (
                      <View key={v.id} style={styles.timelineRow}>
                        {/* Timeline left column */}
                        <View style={styles.timelineLeft}>
                          <View style={styles.timelineLine} />
                          <View style={[styles.timelineDot,
                            v.status === 'given' && styles.timelineDotGiven,
                            (v.status === 'missed' || v.status === 'due') && styles.timelineDotMissed,
                            v.status === 'upcoming' && styles.timelineDotUpcoming,
                          ]} />
                        </View>

                        {/* Vaccine card */}
                        <View style={styles.vaccineCard}>
                          <View style={styles.vaccineCardTop}>
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={styles.vaccineName}>{isNe ? v.nameNe : v.name}</Text>
                                <TouchableOpacity onPress={(e: any) => { e.stopPropagation?.(); Speech.speak(isNe ? v.nameNe : v.name); }}>
                                  <Ionicons name="volume-high" size={16} color={pal.muted} />
                                </TouchableOpacity>
                              </View>
                              <Text style={styles.vaccineSubtitle}>{isNe ? v.diseasesNe : v.diseases} · {isNe ? v.routeNe : v.route} · {isNe ? v.doseNe : v.dose}</Text>
                              <Text style={styles.vaccineDate}>{isNe ? formatDateNe(v.status === 'given' && v.givenDate ? v.givenDate : v.scheduledDate) : (v.status === 'given' && v.givenDate ? v.givenDate : v.scheduledDate)}</Text>
                            </View>
                            <View style={[styles.statusPill, { backgroundColor: pill.bg }]}>
                              <Text style={[styles.statusPillText, { color: pill.text }]}>{isNe ? pill.labelNe : pill.labelEn}</Text>
                            </View>
                          </View>
                          <View style={styles.actionRow}>
                            <TouchableOpacity style={[styles.actionBtn, v.status === 'given' && styles.actionBtnGiven]} onPress={() => handleSetStatus(v, 'given')}>
                              <Ionicons name={v.status === 'given' ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={v.status === 'given' ? pal.onAccent : pal.green} />
                              <Text style={[styles.actionBtnText, v.status === 'given' && styles.actionBtnTextActive]}>{isNe ? 'दिइयो' : 'Given'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.actionBtn, v.status === 'missed' && styles.actionBtnMissed]} onPress={() => handleSetStatus(v, 'missed')}>
                              <Ionicons name={v.status === 'missed' ? 'close-circle' : 'ellipse-outline'} size={16} color={v.status === 'missed' ? pal.onAccent : pal.red} />
                              <Text style={[styles.actionBtnText, v.status === 'missed' && styles.actionBtnTextActive]}>{isNe ? 'छुट्यो' : 'Missed'}</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </ScrollView>
        </View>
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 50 }}>
          <View style={styles.scheduleSourceNotice}>
            <Ionicons name="shield-checkmark-outline" size={18} color={pal.green} />
            <Text style={styles.scheduleSourceText}>
              {isNe
                ? 'नेपालको तालिका देखाइँदैछ। अन्य देशको तालिका चिकित्सकीय समीक्षा भएको संस्करण उपलब्ध भएपछि मात्र प्रयोग गरिनेछ।'
                : 'The Nepal schedule is shown. Another country schedule will be used only after a clinician-reviewed version is available.'}
            </Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.tableWrapper}>
              <View style={styles.tableHeader}>
                <Text style={[styles.cell, styles.wAge, styles.hText]}>{isNe ? 'उमेर' : 'Age'}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'center', width: 120 }}><Text style={[styles.cell, styles.wName, { width: 80 }]}></Text></View>
                <Text style={[styles.cell, styles.wDisease, styles.hText]}>{isNe ? 'बचाउने रोग' : 'Prevents'}</Text>
                <Text style={[styles.cell, styles.wRoute, styles.hText]}>{isNe ? 'विधि' : 'Route'}</Text>
              </View>
              {NIP_SCHEDULE.map((v, idx) => (
                <View key={v.id} style={[styles.tableRow, idx % 2 === 1 && { backgroundColor: pal.surface }]}>
                  <Text style={[styles.cell, styles.wAge]}>{isNe ? v.ageLabelNe : v.ageLabel}</Text>
                  <Text style={[styles.cell, styles.wName, { fontWeight: 'bold' }]}>{isNe ? v.nameNe : v.name}</Text>
                  <Text style={[styles.cell, styles.wDisease]}>{isNe ? v.diseasesNe : v.diseases}</Text>
                  <Text style={[styles.cell, styles.wRoute]}>{isNe ? v.routeNe : v.route} ({isNe ? v.doseNe : v.dose})</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </ScrollView>
      )}

      {/* Premium Modal — shown when free users tap Upcoming/Missed */}
      <Modal visible={showPremiumModal} transparent animationType="fade" onRequestClose={() => setShowPremiumModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { alignItems: 'center' }]}>
            <Ionicons name="diamond-outline" size={48} color={pal.clay} style={{ marginBottom: 12 }} />
            <Text style={styles.modalTitle}>{isNe ? 'प्रिमियम सुविधा' : 'Premium Feature'}</Text>
            <Text style={[styles.modalSubtitle, { marginBottom: 20, lineHeight: 22 }]}>
              {isNe
                ? 'आउँदो र छुटेका खोपहरूको विस्तृत ट्र्याकिङ्ग प्रिमियम सदस्यता सहित उपलब्ध छ।'
                : 'Upcoming & missed vaccine tracking with detailed schedules is available with a premium subscription.'}
            </Text>
            <TouchableOpacity style={[styles.modalConfirmBtn, { width: '100%' }]} onPress={() => setShowPremiumModal(false)}>
              <Text style={styles.modalConfirmBtnText}>{isNe ? 'बुझें' : 'Got it'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalConfirmBtn, { width: '100%', backgroundColor: pal.clay, marginTop: 10 }]} onPress={() => { setShowPremiumModal(false); }}>
              <Text style={[styles.modalConfirmBtnText, { color: pal.onAccent }]}>{isNe ? 'प्रिमियम लिनुहोस्' : 'Upgrade to Premium'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Date Picker Modal */}
      <Modal visible={showDatePicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{isNe ? 'खोप दिएको मिति छान्नुहोस्' : 'Select Date Vaccine Given'}</Text>
            <Text style={styles.modalSubtitle}>{isNe ? `${pendingVaccine?.nameNe || ''} — ${pendingVaccine?.ageLabelNe || ''}` : `${pendingVaccine?.name || ''} — ${pendingVaccine?.ageLabel || ''}`}</Text>
            {isNe ? (
              <View style={styles.pickerRow}>
                <View style={styles.pickerCol}><FlatList data={BS_YEARS.map(y => ({ label: neDigits(y), value: y }))} keyExtractor={i => String(i.value)} style={{ maxHeight: 180 }} getItemLayout={(_, i) => ({ length: 40, offset: 40 * i, index: i })} renderItem={({ item }) => (<TouchableOpacity style={[styles.pickerItem, item.value === bsYear && styles.pickerItemSel]} onPress={() => setBsYear(item.value)}><Text style={[styles.pickerItemTxt, item.value === bsYear && styles.pickerItemTxtSel]}>{item.label}</Text></TouchableOpacity>)} /></View>
                <View style={styles.pickerCol}><FlatList data={BS_MONTHS_LIST.map(m => ({ label: neMonths[m - 1], value: m }))} keyExtractor={i => String(i.value)} style={{ maxHeight: 180 }} getItemLayout={(_, i) => ({ length: 40, offset: 40 * i, index: i })} renderItem={({ item }) => (<TouchableOpacity style={[styles.pickerItem, item.value === bsMonth && styles.pickerItemSel]} onPress={() => setBsMonth(item.value)}><Text style={[styles.pickerItemTxt, item.value === bsMonth && styles.pickerItemTxtSel]}>{item.label}</Text></TouchableOpacity>)} /></View>
                <View style={styles.pickerCol}><FlatList data={Array.from({ length: bsDaysInMonth(bsYear, bsMonth) }, (_, i) => ({ label: neDigits(i + 1), value: i + 1 }))} keyExtractor={i => String(i.value)} style={{ maxHeight: 180 }} getItemLayout={(_, i) => ({ length: 40, offset: 40 * i, index: i })} renderItem={({ item }) => (<TouchableOpacity style={[styles.pickerItem, item.value === bsDay && styles.pickerItemSel]} onPress={() => setBsDay(item.value)}><Text style={[styles.pickerItemTxt, item.value === bsDay && styles.pickerItemTxtSel]}>{item.label}</Text></TouchableOpacity>)} /></View>
              </View>
            ) : (
              <View style={styles.pickerRow}>
                <View style={styles.pickerCol}><FlatList data={AD_YEARS.map(y => ({ label: String(y), value: y }))} keyExtractor={i => String(i.value)} style={{ maxHeight: 180 }} getItemLayout={(_, i) => ({ length: 40, offset: 40 * i, index: i })} renderItem={({ item }) => (<TouchableOpacity style={[styles.pickerItem, item.value === dayjs(selectedADDate).year() && styles.pickerItemSel]} onPress={() => setSelectedADDate(dayjs(selectedADDate).year(item.value).format('YYYY-MM-DD'))}><Text style={[styles.pickerItemTxt, item.value === dayjs(selectedADDate).year() && styles.pickerItemTxtSel]}>{item.label}</Text></TouchableOpacity>)} /></View>
                <View style={styles.pickerCol}><FlatList data={AD_MONTHS.map(m => ({ label: dayjs().month(m - 1).format('MMM'), value: m }))} keyExtractor={i => String(i.value)} style={{ maxHeight: 180 }} getItemLayout={(_, i) => ({ length: 40, offset: 40 * i, index: i })} renderItem={({ item }) => (<TouchableOpacity style={[styles.pickerItem, item.value === dayjs(selectedADDate).month() + 1 && styles.pickerItemSel]} onPress={() => setSelectedADDate(dayjs(selectedADDate).month(item.value - 1).format('YYYY-MM-DD'))}><Text style={[styles.pickerItemTxt, item.value === dayjs(selectedADDate).month() + 1 && styles.pickerItemTxtSel]}>{item.label}</Text></TouchableOpacity>)} /></View>
                <View style={styles.pickerCol}><FlatList data={Array.from({ length: dayjs(selectedADDate).daysInMonth() }, (_, i) => ({ label: String(i + 1), value: i + 1 }))} keyExtractor={i => String(i.value)} style={{ maxHeight: 180 }} getItemLayout={(_, i) => ({ length: 40, offset: 40 * i, index: i })} renderItem={({ item }) => (<TouchableOpacity style={[styles.pickerItem, item.value === dayjs(selectedADDate).date() && styles.pickerItemSel]} onPress={() => setSelectedADDate(dayjs(selectedADDate).date(item.value).format('YYYY-MM-DD'))}><Text style={[styles.pickerItemTxt, item.value === dayjs(selectedADDate).date() && styles.pickerItemTxtSel]}>{item.label}</Text></TouchableOpacity>)} /></View>
              </View>
            )}
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowDatePicker(false)}><Text style={styles.modalCancelBtnText}>{isNe ? 'रद्द' : 'Cancel'}</Text></TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={() => { const finalDate = isNe ? bsToAdStr(bsYear, bsMonth, bsDay) : selectedADDate; setShowDatePicker(false); if (pendingVaccine) confirmSetStatus(pendingVaccine, 'given', finalDate); }}>
                <Text style={styles.modalConfirmBtnText}>{isNe ? 'पुष्टि' : 'Confirm'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (pal: Palette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: pal.bg },
  nextBanner: { marginHorizontal: 10, marginTop: 8, marginBottom: 2, backgroundColor: pal.amberLight, borderRadius: 8, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8, borderLeftWidth: 4, elevation: 1 },
  nextBannerText: { fontSize: 12, fontWeight: '600', flex: 1 },

  tabBar: { flexDirection: 'row', backgroundColor: pal.surface, paddingHorizontal: 16, margin: 10, marginBottom: 4, borderRadius: 0, borderBottomWidth: 1, borderBottomColor: pal.border },
  tab: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: pal.clay },
  tabText: { fontWeight: '600', color: pal.muted, fontSize: 14 },
  activeTabText: { color: pal.clay },

  filterRow: { flexDirection: 'row', paddingHorizontal: 10, gap: 8, marginBottom: 10, alignItems: 'center', flexWrap: 'wrap' },
  filterPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: pal.border, backgroundColor: pal.surface },
  filterPillActive: { backgroundColor: pal.clay, borderColor: pal.clay },
  filterPillText: { fontSize: 12, color: pal.muted, fontWeight: '600' },
  filterPillTextActive: { color: pal.onAccent, fontWeight: 'bold' },
  filterPillOutline: { backgroundColor: pal.surface, borderColor: pal.border },

  content: { flex: 1, paddingHorizontal: 10 },
  catchUpNotice: { flexDirection: 'row', gap: 10, backgroundColor: pal.amberLight, borderLeftWidth: 4, borderLeftColor: pal.amberDark, padding: 12, marginBottom: 14, borderRadius: 8 },
  catchUpTitle: { color: pal.amberDark, fontWeight: '700', fontSize: 13, marginBottom: 3 },
  catchUpText: { color: pal.muted2, fontSize: 12, lineHeight: 18 },
  scheduleSourceNotice: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: pal.greenLight, borderLeftWidth: 4, borderLeftColor: pal.green, padding: 11, marginTop: 10, marginBottom: 2, borderRadius: 8 },
  scheduleSourceText: { flex: 1, color: pal.greenDark, fontSize: 12, lineHeight: 17 },
  noMoreCard: { backgroundColor: pal.greenLight, padding: 12, borderRadius: 8, marginBottom: 15, alignItems: 'center', borderLeftWidth: 4, borderLeftColor: pal.green },
  noMoreText: { color: pal.greenDark, fontWeight: 'bold', fontSize: 13 },

  groupSection: { marginBottom: 8 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, paddingHorizontal: 4, gap: 8 },
  groupLine: { flex: 1, height: 1, backgroundColor: pal.border },
  groupHeaderText: { fontSize: 11, color: pal.muted, letterSpacing: 1.1, fontWeight: '700', textTransform: 'uppercase' },

  timelineRow: { flexDirection: 'row', marginBottom: 10 },
  timelineLeft: { width: 24, alignItems: 'center', marginRight: 8 },
  timelineLine: { flex: 1, width: 2, backgroundColor: pal.border },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: pal.border, borderWidth: 2, borderColor: pal.bg, position: 'absolute', top: 8 },
  timelineDotGiven: { backgroundColor: pal.green, borderColor: pal.green },
  timelineDotMissed: { backgroundColor: pal.red, borderColor: pal.red },
  timelineDotUpcoming: { backgroundColor: 'transparent', borderColor: pal.border, borderWidth: 2 },

  vaccineCard: { flex: 1, backgroundColor: pal.surface, borderRadius: 12, padding: 12, shadowColor: pal.shadow, shadowOpacity: 0.08, shadowOffset: { width: 0, height: 1 }, shadowRadius: 6, elevation: 1 },
  vaccineCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  vaccineName: { fontSize: 15, fontWeight: '700', color: pal.text },
  vaccineSubtitle: { fontSize: 12, color: pal.muted, marginTop: 1 },
  vaccineDate: { fontSize: 12, color: pal.muted, marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusPillText: { fontSize: 10, fontWeight: 'bold' },

  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 7, borderRadius: 8, borderWidth: 1.5, borderColor: pal.border, backgroundColor: pal.surface, gap: 4 },
  actionBtnGiven: { backgroundColor: pal.green, borderColor: pal.green },
  actionBtnMissed: { backgroundColor: pal.red, borderColor: pal.red },
  actionBtnText: { fontSize: 11, color: pal.muted, fontWeight: 'bold' },
  actionBtnTextActive: { color: pal.onAccent },

  tableWrapper: { backgroundColor: pal.surface, marginVertical: 10, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: pal.border, minWidth: 640 },
  tableHeader: { flexDirection: 'row', backgroundColor: pal.clay, borderBottomWidth: 1, borderBottomColor: pal.border },
  hText: { color: pal.onAccent, fontWeight: 'bold', textAlign: 'center' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: pal.border },
  cell: { padding: 10, fontSize: 11, color: pal.text, borderRightWidth: 1, borderRightColor: pal.border, justifyContent: 'center' },
  wAge: { width: 100 },
  wName: { width: 120 },
  wDisease: { width: 200 },
  wRoute: { width: 180 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: pal.surface, width: '92%', borderRadius: 16, padding: 20, maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: pal.text, textAlign: 'center', marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: pal.clay, textAlign: 'center', marginBottom: 16, fontWeight: '600' },
  pickerRow: { flexDirection: 'row', height: 200, gap: 4 },
  pickerCol: { flex: 1 },
  pickerItem: { height: 40, justifyContent: 'center', paddingHorizontal: 8, borderRadius: 6 },
  pickerItemSel: { backgroundColor: '#E8602C20' },
  pickerItemTxt: { fontSize: 14, color: pal.muted, textAlign: 'center' },
  pickerItemTxtSel: { color: pal.clay, fontWeight: '700' },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  modalCancelBtn: { flex: 1, padding: 12, borderRadius: 28, backgroundColor: pal.bg, alignItems: 'center' },
  modalCancelBtnText: { color: pal.muted, fontWeight: '600' },
  modalConfirmBtn: { flex: 1, padding: 12, borderRadius: 28, backgroundColor: pal.clay, alignItems: 'center' },
  modalConfirmBtnText: { color: pal.onAccent, fontWeight: '700' },
});
