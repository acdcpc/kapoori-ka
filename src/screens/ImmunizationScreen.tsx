// src/screens/ImmunizationScreen.tsx
import React, { useContext, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, Modal, FlatList,
} from 'react-native';
import { collection, getDocs, query, where, doc, setDoc } from 'firebase/firestore';
import dayjs from 'dayjs';
import { db, auth } from '../../firebase';
import { LanguageContext } from '../context/LanguageContext';
import { RootStackParamList } from '../navigation/types';
import { translations } from '../i18n/translations';
import { VaccineRecord } from '../types';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import NepaliDate from 'nepali-date-converter';
import { scheduleVaccineReminders } from '../utils/notifications';
import { useAuth } from '../context/AuthContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Immunization'>;

interface NIPEntry {
  id: string; name: string; nameNe: string; ageLabel: string; ageLabelNe: string;
  ageInDays: number; diseases: string; diseasesNe: string; route: string; routeNe: string; dose: string; doseNe: string;
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
  scheduledDate: string; status: VaccineStatus; daysUntilDue: number;
}

function computeSchedule(dob: string, givenIds: Set<string>, missedIds: Set<string>): ComputedVaccine[] {
  const today = dayjs().startOf('day');
  return NIP_SCHEDULE.map(v => {
    const scheduledDate = dayjs(dob).add(v.ageInDays, 'day').startOf('day');
    const daysUntilDue = scheduledDate.diff(today, 'day');
    const isGiven = givenIds.has(v.id), isMissed = missedIds.has(v.id);
    let status: VaccineStatus;
    if (isGiven) status = 'given';
    else if (isMissed) status = 'missed';
    else if (daysUntilDue < 0) status = 'missed';
    else if (daysUntilDue <= 14) status = 'due';
    else status = 'upcoming';
    return { ...v, scheduledDate: scheduledDate.format('YYYY-MM-DD'), status, daysUntilDue };
  });
}

const STATUS_PILL: Record<VaccineStatus, { bg: string; text: string; labelEn: string; labelNe: string }> = {
  given: { bg: '#D1FAE5', text: '#065F46', labelEn: 'Given', labelNe: 'दिइयो' },
  due: { bg: '#FEF3C7', text: '#92400E', labelEn: 'Due Now', labelNe: 'दिनुपर्छ' },
  upcoming: { bg: '#EDE0D4', text: '#7A6E65', labelEn: 'Upcoming', labelNe: 'आउँदो' },
  missed: { bg: '#FEE2E2', text: '#991B1B', labelEn: 'Missed', labelNe: 'छुट्यो' },
};

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
  const { child } = route.params;
  const { language } = useContext(LanguageContext);
  const { subscription } = useAuth();
  const t = translations[language];
  const isNe = language === 'ne';
  const isPremium = subscription?.status === 'active' || subscription?.plan === 'premium';

  const [vaccineRecords, setVaccineRecords] = useState<VaccineRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tracker' | 'schedule'>('tracker');
  const [trackerFilter, setTrackerFilter] = useState<'all' | 'upcoming' | 'missed'>('all');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pendingVaccine, setPendingVaccine] = useState<ComputedVaccine | null>(null);
  const [bsYear, setBsYear] = useState(2081);
  const [bsMonth, setBsMonth] = useState(4);
  const [bsDay, setBsDay] = useState(1);
  const [selectedADDate, setSelectedADDate] = useState(dayjs().format('YYYY-MM-DD'));

  const loadRecords = async () => {
    try {
      const user = auth.currentUser;
      const q = query(collection(db, 'vaccinations'), where('childId', '==', child.id), where('ownerId', '==', user?.uid || 'anonymous'));
      const snap = await getDocs(q);
      const records: VaccineRecord[] = [];
      snap.forEach(d => records.push({ id: d.id, ...d.data() } as VaccineRecord));
      setVaccineRecords(records);
    } catch { Alert.alert('Error', 'Could not load records.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadRecords(); }, []);

  useEffect(() => {
    if (vaccineRecords.length > 0 && isPremium) {
      const givenIds2 = new Set(vaccineRecords.filter(v => v.isGiven).map(v => v.vaccineName));
      const missedIds2 = new Set(vaccineRecords.filter(v => v.isMissed).map(v => v.vaccineName));
      scheduleVaccineReminders(child.name, computeSchedule(child.dateOfBirth, givenIds2, missedIds2), language).catch(() => {});
    }
  }, [vaccineRecords.length, isPremium]);

  const handleSetStatus = (vaccine: ComputedVaccine, status: 'given' | 'missed') => {
    if (status === 'given') {
      setPendingVaccine(vaccine); setShowDatePicker(true); setSelectedADDate(dayjs().format('YYYY-MM-DD'));
      if (isNe) { try { const bs = new NepaliDate(new Date()); setBsYear(bs.getYear()); setBsMonth(bs.getMonth() + 1); setBsDay(bs.getDay()); } catch {} }
    } else { confirmSetStatus(vaccine, 'missed', dayjs().format('YYYY-MM-DD')); }
  };

  const confirmSetStatus = async (vaccine: ComputedVaccine, status: 'given' | 'missed', givenDate: string) => {
    try {
      const user = auth.currentUser;
      await setDoc(doc(db, 'vaccinations', `${child.id}_${vaccine.id}`), {
        childId: child.id, ownerId: user?.uid || 'anonymous', vaccineName: vaccine.id, vaccineNameNepali: vaccine.nameNe,
        scheduledDate: vaccine.scheduledDate, givenDate: status === 'given' ? givenDate : null, customGivenDate: status === 'given' ? givenDate : null,
        isGiven: status === 'given', isMissed: status === 'missed',
      });
      await loadRecords();
    } catch { Alert.alert('Error', 'Could not save.'); }
  };

  if (loading) return <ActivityIndicator size="large" color="#E8602C" style={{ flex: 1, backgroundColor: '#F7F1EB' }} />;

  const givenIds = new Set(vaccineRecords.filter(v => v.isGiven).map(v => v.vaccineName));
  const missedIds = new Set(vaccineRecords.filter(v => v.isMissed).map(v => v.vaccineName));
  const computed = computeSchedule(child.dateOfBirth, givenIds, missedIds);
  const childAgeMonths = dayjs().diff(dayjs(child.dateOfBirth), 'month');
  const nextDue = computed.find(v => v.status === 'due' || v.status === 'upcoming');
  const filterTabs: string[] = ['all'];
  if (isPremium) { filterTabs.push('upcoming', 'missed'); }

  return (
    <View style={styles.container}>
      {nextDue && (
        <View style={[styles.nextBanner, { borderLeftColor: nextDue.status === 'due' ? '#C0392B' : '#E8602C' }]}>
          <Ionicons name="notifications" size={18} color={nextDue.status === 'due' ? '#C0392B' : '#E8602C'} />
          <Text style={[styles.nextBannerText, { color: nextDue.status === 'due' ? '#991B1B' : '#92400E' }]}>
            {isNe
              ? `अर्को खोप: ${nextDue.nameNe} (${nextDue.ageLabelNe}) — ${formatDateNe(nextDue.scheduledDate)} — ${STATUS_PILL[nextDue.status].labelNe}`
              : `Next vaccine: ${nextDue.name} (${nextDue.ageLabel}) — ${nextDue.scheduledDate} — ${STATUS_PILL[nextDue.status].labelEn}`}
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
            {filterTabs.map((f) => (
              <TouchableOpacity key={f} style={[styles.filterPill, trackerFilter === f && styles.filterPillActive]} onPress={() => setTrackerFilter(f as any)}>
                <Text style={[styles.filterPillText, trackerFilter === f && styles.filterPillTextActive]}>
                  {f === 'all' ? (isNe ? 'सबै' : 'All') : f === 'upcoming' ? (isNe ? 'आउँदो' : 'Upcoming') : (isNe ? 'छुट्यो' : 'Missed')}
                </Text>
              </TouchableOpacity>
            ))}
            {!isPremium && (
              <TouchableOpacity style={styles.upgradePill} onPress={() => {
                Alert.alert(isNe ? 'प्रिमियम सुविधा' : 'Premium Feature', isNe ? 'आउँदो र छुटेको खोप ट्याबहरू प्रिमियमको लागि मात्र।' : 'Upcoming & Missed tabs are premium only.',
                  [{ text: isNe ? 'पछि' : 'Later' }, { text: isNe ? 'अपग्रेड' : 'Upgrade', onPress: () => navigation.navigate('Subscription') }]);
              }}>
                <Text style={styles.upgradePillText}>{isNe ? 'अपग्रेड' : 'Upgrade'}</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 50 }}>
            {childAgeMonths >= 16 && (
              <View style={styles.noMoreCard}>
                <Text style={styles.noMoreText}>{isNe ? '१५ महिनापछि कुनै राष्ट्रिय खोप छैन' : 'No more national vaccines after 15 months'}</Text>
              </View>
            )}

            {AGE_GROUPS.map(group => {
              const vaccines = computed.filter(v => v.ageLabel === group.label);
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
                    const pill = STATUS_PILL[v.status];
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
                              <Text style={styles.vaccineName}>{isNe ? v.nameNe : v.name}</Text>
                              <Text style={styles.vaccineSubtitle}>{isNe ? v.diseasesNe : v.diseases} · {isNe ? v.routeNe : v.route} · {isNe ? v.doseNe : v.dose}</Text>
                              <Text style={styles.vaccineDate}>{isNe ? formatDateNe(v.scheduledDate) : v.scheduledDate}</Text>
                            </View>
                            <View style={[styles.statusPill, { backgroundColor: pill.bg }]}>
                              <Text style={[styles.statusPillText, { color: pill.text }]}>{isNe ? pill.labelNe : pill.labelEn}</Text>
                            </View>
                          </View>
                          <View style={styles.actionRow}>
                            <TouchableOpacity style={[styles.actionBtn, v.status === 'given' && styles.actionBtnGiven]} onPress={() => handleSetStatus(v, 'given')}>
                              <Ionicons name={v.status === 'given' ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={v.status === 'given' ? '#fff' : '#3D8B5E'} />
                              <Text style={[styles.actionBtnText, v.status === 'given' && styles.actionBtnTextActive]}>{isNe ? 'दिइयो' : 'Given'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.actionBtn, v.status === 'missed' && styles.actionBtnMissed]} onPress={() => handleSetStatus(v, 'missed')}>
                              <Ionicons name={v.status === 'missed' ? 'close-circle' : 'ellipse-outline'} size={16} color={v.status === 'missed' ? '#fff' : '#C0392B'} />
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
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.tableWrapper}>
              <View style={styles.tableHeader}>
                <Text style={[styles.cell, styles.wAge, styles.hText]}>{isNe ? 'उमेर' : 'Age'}</Text>
                <Text style={[styles.cell, styles.wName, styles.hText]}>{isNe ? 'खोप' : 'Vaccine'}</Text>
                <Text style={[styles.cell, styles.wDisease, styles.hText]}>{isNe ? 'बचाउने रोग' : 'Prevents'}</Text>
                <Text style={[styles.cell, styles.wRoute, styles.hText]}>{isNe ? 'विधि' : 'Route'}</Text>
              </View>
              {NIP_SCHEDULE.map((v, idx) => (
                <View key={v.id} style={[styles.tableRow, idx % 2 === 1 && { backgroundColor: '#FDF8F2' }]}>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F1EB' },
  nextBanner: { marginHorizontal: 10, marginTop: 8, marginBottom: 2, backgroundColor: '#FEF3C7', borderRadius: 8, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8, borderLeftWidth: 4, elevation: 1 },
  nextBannerText: { fontSize: 12, fontWeight: '600', flex: 1 },

  tabBar: { flexDirection: 'row', backgroundColor: '#FDF8F2', paddingHorizontal: 16, margin: 10, marginBottom: 4, borderRadius: 0, borderBottomWidth: 1, borderBottomColor: '#EDE0D4' },
  tab: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#E8602C' },
  tabText: { fontWeight: '600', color: '#7A6E65', fontSize: 14 },
  activeTabText: { color: '#E8602C' },

  filterRow: { flexDirection: 'row', paddingHorizontal: 10, gap: 8, marginBottom: 10, alignItems: 'center', flexWrap: 'wrap' },
  filterPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: '#EDE0D4', backgroundColor: '#FDF8F2' },
  filterPillActive: { backgroundColor: '#E8602C', borderColor: '#E8602C' },
  filterPillText: { fontSize: 12, color: '#7A6E65', fontWeight: '600' },
  filterPillTextActive: { color: '#fff', fontWeight: 'bold' },
  upgradePill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F5A623' },
  upgradePillText: { fontSize: 12, color: '#fff', fontWeight: '700' },

  content: { flex: 1, paddingHorizontal: 10 },
  noMoreCard: { backgroundColor: '#D1FAE5', padding: 12, borderRadius: 8, marginBottom: 15, alignItems: 'center', borderLeftWidth: 4, borderLeftColor: '#3D8B5E' },
  noMoreText: { color: '#065F46', fontWeight: 'bold', fontSize: 13 },

  groupSection: { marginBottom: 8 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, paddingHorizontal: 4, gap: 8 },
  groupLine: { flex: 1, height: 1, backgroundColor: '#EDE0D4' },
  groupHeaderText: { fontSize: 11, color: '#7A6E65', letterSpacing: 1.1, fontWeight: '700', textTransform: 'uppercase' },

  timelineRow: { flexDirection: 'row', marginBottom: 10 },
  timelineLeft: { width: 24, alignItems: 'center', marginRight: 8 },
  timelineLine: { flex: 1, width: 2, backgroundColor: '#EDE0D4' },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EDE0D4', borderWidth: 2, borderColor: '#F7F1EB', position: 'absolute', top: 8 },
  timelineDotGiven: { backgroundColor: '#3D8B5E', borderColor: '#3D8B5E' },
  timelineDotMissed: { backgroundColor: '#C0392B', borderColor: '#C0392B' },
  timelineDotUpcoming: { backgroundColor: 'transparent', borderColor: '#EDE0D4', borderWidth: 2 },

  vaccineCard: { flex: 1, backgroundColor: '#FDF8F2', borderRadius: 12, padding: 12, shadowColor: '#C4956A', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 1 }, shadowRadius: 6, elevation: 1 },
  vaccineCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  vaccineName: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  vaccineSubtitle: { fontSize: 12, color: '#7A6E65', marginTop: 1 },
  vaccineDate: { fontSize: 12, color: '#7A6E65', marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusPillText: { fontSize: 10, fontWeight: 'bold' },

  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 7, borderRadius: 8, borderWidth: 1.5, borderColor: '#EDE0D4', backgroundColor: '#FDF8F2', gap: 4 },
  actionBtnGiven: { backgroundColor: '#3D8B5E', borderColor: '#3D8B5E' },
  actionBtnMissed: { backgroundColor: '#C0392B', borderColor: '#C0392B' },
  actionBtnText: { fontSize: 11, color: '#7A6E65', fontWeight: 'bold' },
  actionBtnTextActive: { color: '#fff' },

  tableWrapper: { backgroundColor: '#FDF8F2', marginVertical: 10, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#EDE0D4', minWidth: 640 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#E8602C', borderBottomWidth: 1, borderBottomColor: '#EDE0D4' },
  hText: { color: '#fff', fontWeight: 'bold', textAlign: 'center' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#EDE0D4' },
  cell: { padding: 10, fontSize: 11, color: '#1A1A2E', borderRightWidth: 1, borderRightColor: '#EDE0D4', justifyContent: 'center' },
  wAge: { width: 100 },
  wName: { width: 120 },
  wDisease: { width: 200 },
  wRoute: { width: 180 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FDF8F2', width: '92%', borderRadius: 16, padding: 20, maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A2E', textAlign: 'center', marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: '#E8602C', textAlign: 'center', marginBottom: 16, fontWeight: '600' },
  pickerRow: { flexDirection: 'row', height: 200, gap: 4 },
  pickerCol: { flex: 1 },
  pickerItem: { height: 40, justifyContent: 'center', paddingHorizontal: 8, borderRadius: 6 },
  pickerItemSel: { backgroundColor: '#E8602C20' },
  pickerItemTxt: { fontSize: 14, color: '#7A6E65', textAlign: 'center' },
  pickerItemTxtSel: { color: '#E8602C', fontWeight: '700' },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  modalCancelBtn: { flex: 1, padding: 12, borderRadius: 28, backgroundColor: '#F7F1EB', alignItems: 'center' },
  modalCancelBtnText: { color: '#7A6E65', fontWeight: '600' },
  modalConfirmBtn: { flex: 1, padding: 12, borderRadius: 28, backgroundColor: '#E8602C', alignItems: 'center' },
  modalConfirmBtnText: { color: '#fff', fontWeight: '700' },
});
