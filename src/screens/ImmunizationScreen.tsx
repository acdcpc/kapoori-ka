// src/screens/ImmunizationScreen.tsx
import React, { useContext, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
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
import { scheduleVaccineReminders } from '../utils/notifications';

type Props = NativeStackScreenProps<RootStackParamList, 'Immunization'>;

interface NIPEntry {
  id: string;
  name: string;
  nameNe: string;
  ageLabel: string;
  ageLabelNe: string;
  ageInDays: number;
  diseases: string;
  diseasesNe: string;
  route: string;
  routeNe: string;
  dose: string;
  doseNe: string;
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
  { label: 'At Birth', labelNe: 'जन्मदा', ageInDays: 0, color: '#1a73e8' },
  { label: '6 Weeks', labelNe: '६ हप्ता', ageInDays: 42, color: '#4CAF50' },
  { label: '10 Weeks', labelNe: '१० हप्ता', ageInDays: 70, color: '#FF9800' },
  { label: '14 Weeks', labelNe: '१४ हप्ता', ageInDays: 98, color: '#9C27B0' },
  { label: '9 Months', labelNe: '९ महिना', ageInDays: 274, color: '#F44336' },
  { label: '12 Months', labelNe: '१२ महिना', ageInDays: 365, color: '#E91E63' },
  { label: '15 Months', labelNe: '१५ महिना', ageInDays: 456, color: '#673AB7' },
];

type VaccineStatus = 'given' | 'due' | 'upcoming' | 'missed';

interface ComputedVaccine extends NIPEntry {
  scheduledDate: string;
  status: VaccineStatus;
  daysUntilDue: number;
}

function computeSchedule(dob: string, givenIds: Set<string>, missedIds: Set<string>): ComputedVaccine[] {
  const today = dayjs().startOf('day');
  return NIP_SCHEDULE.map(v => {
    const scheduledDate = dayjs(dob).add(v.ageInDays, 'day').startOf('day');
    const daysUntilDue = scheduledDate.diff(today, 'day');
    const isGiven = givenIds.has(v.id);
    const isMissed = missedIds.has(v.id);
    let status: VaccineStatus;
    if (isGiven) status = 'given';
    else if (isMissed) status = 'missed';
    else if (daysUntilDue < 0) status = 'missed';
    else if (daysUntilDue <= 14) status = 'due';
    else status = 'upcoming';
    return { ...v, scheduledDate: scheduledDate.format('YYYY-MM-DD'), status, daysUntilDue };
  });
}

const STATUS_COLOR: Record<VaccineStatus, string> = { given: '#4CAF50', due: '#F44336', upcoming: '#1a73e8', missed: '#FF5722' };
const STATUS_ICON: Record<VaccineStatus, string> = { given: '✅', due: '⚠️', upcoming: '📅', missed: '❗' };
const STATUS_LABEL_EN: Record<VaccineStatus, string> = { given: 'Given', due: 'Due Now', upcoming: 'Upcoming', missed: 'Missed' };
const STATUS_LABEL_NE: Record<VaccineStatus, string> = { given: 'दिइयो', due: 'दिनुपर्छ', upcoming: 'आउँदो', missed: 'छुट्यो' };

function formatDateNe(dateStr: string): string {
  try {
    const d = dayjs(dateStr, 'YYYY-MM-DD');
    if (!d.isValid()) return dateStr;
    const months = ['माघ','फाल्गुन','चैत','बैशाख','जेठ','असार','श्रावण','भदौ','असोज','कार्तिक','मंसिर','पुष'];
    const ne = (n: number) => {
      if (isNaN(n)) return '';
      return n.toString().split('').map(c => '०१२३४५६७८९'[parseInt(c)] ?? c).join('');
    };
    const day = ne(d.date());
    const month = months[d.month()];
    const year = ne(d.year());
    return `${day} ${month} ${year}`;
  } catch (e) {
    return dateStr;
  }
}

export default function ImmunizationScreen({ route }: Props) {
  const { child } = route.params;
  const { language } = useContext(LanguageContext);
  const t = translations[language];
  const isNe = language === 'ne';

  const [vaccineRecords, setVaccineRecords] = useState<VaccineRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tracker' | 'schedule'>('tracker');
  const [trackerFilter, setTrackerFilter] = useState<'all' | 'upcoming' | 'missed'>('all');

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

  const setStatus = async (vaccine: ComputedVaccine, status: 'given' | 'missed') => {
    try {
      const user = auth.currentUser;
      const docId = `${child.id}_${vaccine.id}`;
      await setDoc(doc(db, 'vaccinations', docId), {
        childId: child.id,
        ownerId: user?.uid || 'anonymous',
        vaccineName: vaccine.id,
        vaccineNameNepali: vaccine.nameNe,
        scheduledDate: vaccine.scheduledDate,
        givenDate: status === 'given' ? dayjs().format('YYYY-MM-DD') : null,
        isGiven: status === 'given',
        isMissed: status === 'missed'
      });
      await loadRecords();
      if (status === 'given') {
        const givenIds2 = new Set([...Array.from(new Set(vaccineRecords.filter(v => v.isGiven).map(v => v.vaccineName))), vaccine.id]);
        const missedIds2 = new Set(vaccineRecords.filter(v => v.isMissed).map(v => v.vaccineName));
        const updated = computeSchedule(child.dateOfBirth, givenIds2, missedIds2);
        await scheduleVaccineReminders(child.name, updated, language);
      }
    } catch { Alert.alert('Error', 'Could not save.'); }
  };

  if (loading) return <ActivityIndicator size="large" color="#1a73e8" style={{ flex: 1 }} />;

  const givenIds = new Set(vaccineRecords.filter(v => v.isGiven).map(v => v.vaccineName));
  const missedIds = new Set(vaccineRecords.filter(v => v.isMissed).map(v => v.vaccineName));
  const computed = computeSchedule(child.dateOfBirth, givenIds, missedIds);
  const childAgeMonths = dayjs().diff(dayjs(child.dateOfBirth), 'month');
  
  const nextDue = computed.find(v => v.status === 'due' || v.status === 'upcoming');

  return (
    <View style={styles.container}>
      {nextDue && (
        <View style={[styles.nextVaccineBanner, { borderLeftColor: nextDue.status === 'due' ? '#F44336' : '#1a73e8' }]}>
          <Ionicons name="notifications" size={18} color={nextDue.status === 'due' ? '#F44336' : '#1a73e8'} />
          <Text style={[styles.nextVaccineText, { color: nextDue.status === 'due' ? '#c62828' : '#1a73e8' }]}>
            {isNe
              ? `अर्को खोप: ${nextDue.nameNe} (${nextDue.ageLabelNe}) — ${formatDateNe(nextDue.scheduledDate)} — ${STATUS_LABEL_NE[nextDue.status]}`
              : `Next vaccine: ${nextDue.name} (${nextDue.ageLabel}) — ${nextDue.scheduledDate} — ${STATUS_LABEL_EN[nextDue.status]}`}
          </Text>
        </View>
      )}

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
          <View style={styles.filterRow}>
            {['all', 'upcoming', 'missed'].map((f) => (
              <TouchableOpacity key={f} style={[styles.filterBtn, trackerFilter === f && styles.filterBtnActive]} onPress={() => setTrackerFilter(f as any)}>
                <Text style={[styles.filterBtnText, trackerFilter === f && styles.filterBtnTextActive]}>
                  {f === 'all' ? (isNe ? 'सबै' : 'All') : f === 'upcoming' ? (isNe ? 'आउँदो' : 'Upcoming') : (isNe ? 'छुट्यो' : 'Missed')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 50 }}>
            {childAgeMonths >= 16 && (
              <View style={styles.noMoreCard}>
                <Text style={styles.noMoreText}>{isNe ? '१५ महिनापछि अब कुनै राष्ट्रिय खोप छैन' : 'No more national vaccine after 15 months'}</Text>
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
                <View key={group.label} style={styles.ageGroup}>
                  <View style={[styles.ageHeader, { backgroundColor: group.color }]}>
                    <Text style={styles.ageHeaderText}>{isNe ? group.labelNe : group.label}</Text>
                  </View>
                  {filtered.map(v => (
                    <View key={v.id} style={styles.vItem}>
                      <View style={styles.vMain}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.vName}>{isNe ? v.nameNe : v.name}</Text>
                          <Text style={styles.vDisease}>{isNe ? v.diseasesNe : v.diseases}</Text>
                          <Text style={styles.vDate}>
                            {isNe ? formatDateNe(v.scheduledDate) : v.scheduledDate}
                          </Text>
                        </View>
                        <View style={[styles.sBadge, { backgroundColor: STATUS_COLOR[v.status] }]}>
                          <Text style={styles.sText}>
                            {STATUS_ICON[v.status]} {isNe ? STATUS_LABEL_NE[v.status] : STATUS_LABEL_EN[v.status]}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.aRow}>
                        <TouchableOpacity style={[styles.aBtn, v.status === 'given' && styles.bgGiven]} onPress={() => setStatus(v, 'given')}>
                          <Ionicons name={v.status === 'given' ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={v.status === 'given' ? '#fff' : '#4CAF50'} />
                          <Text style={[styles.aBtnText, v.status === 'given' && styles.cWhite]}>{isNe ? 'दिइयो ✓' : 'Given'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.aBtn, v.status === 'missed' && styles.bgMissed]} onPress={() => setStatus(v, 'missed')}>
                          <Ionicons name={v.status === 'missed' ? 'close-circle' : 'ellipse-outline'} size={16} color={v.status === 'missed' ? '#fff' : '#f44336'} />
                          <Text style={[styles.aBtnText, v.status === 'missed' && styles.cWhite]}>{isNe ? 'छुट्यो ✗' : 'Missed'}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
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
                <View key={v.id} style={[styles.tableRow, idx % 2 === 1 && { backgroundColor: '#f9f9f9' }]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  nextVaccineBanner: {
    marginHorizontal: 10, marginTop: 8, marginBottom: 2,
    backgroundColor: '#fff', borderRadius: 10, padding: 10,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderLeftWidth: 4, elevation: 1,
  },
  nextVaccineText: { fontSize: 12, fontWeight: '600', flex: 1 },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', padding: 4, margin: 10, borderRadius: 8 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
  activeTab: { backgroundColor: '#1a73e8' },
  tabText: { fontWeight: '600', color: '#666' },
  activeTabText: { color: '#fff' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 10, gap: 8, marginBottom: 10 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd' },
  filterBtnActive: { backgroundColor: '#1a73e8', borderColor: '#1a73e8' },
  filterBtnText: { fontSize: 12, color: '#666' },
  filterBtnTextActive: { color: '#fff', fontWeight: 'bold' },
  content: { flex: 1, paddingHorizontal: 10 },
  ageGroup: { marginBottom: 15, backgroundColor: '#fff', borderRadius: 10, overflow: 'hidden', elevation: 2 },
  ageHeader: { padding: 8 },
  ageHeaderText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  vItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  vMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  vName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  vDisease: { fontSize: 11, color: '#888', marginTop: 1 },
  vDate: { fontSize: 11, color: '#888', marginTop: 2 },
  sBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  sText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  aRow: { flexDirection: 'row', gap: 8 },
  aBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#eee', gap: 4 },
  bgGiven: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  bgMissed: { backgroundColor: '#f44336', borderColor: '#f44336' },
  aBtnText: { fontSize: 11, color: '#666', fontWeight: 'bold' },
  cWhite: { color: '#fff' },
  noMoreCard: { backgroundColor: '#E8F5E9', padding: 12, borderRadius: 8, marginBottom: 15, alignItems: 'center', borderLeftWidth: 4, borderLeftColor: '#4CAF50' },
  noMoreText: { color: '#2E7D32', fontWeight: 'bold', fontSize: 13 },
  tableWrapper: { backgroundColor: '#fff', marginVertical: 10, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#eee', minWidth: 640 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#1a73e8', borderBottomWidth: 1, borderBottomColor: '#eee' },
  hText: { color: '#fff', fontWeight: 'bold', textAlign: 'center' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee' },
  cell: { padding: 10, fontSize: 11, color: '#333', borderRightWidth: 1, borderRightColor: '#eee', justifyContent: 'center' },
  wAge: { width: 100 },
  wName: { width: 120 },
  wDisease: { width: 200 },
  wRoute: { width: 180 },
});