// src/screens/GrowthChartScreen.tsx
import React, { useContext, useEffect, useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator,
  Dimensions, Modal, FlatList,
} from 'react-native';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import dayjs from 'dayjs';
import {
  VictoryChart, VictoryLine, VictoryAxis, VictoryScatter,
  VictoryTheme, VictoryArea, VictoryVoronoiContainer,
} from 'victory-native';
import { db, auth } from '../../firebase.ts';
import { LanguageContext } from '../context/LanguageContext';
import { translations } from '../i18n/translations';
import { GrowthRecord } from '../types';
import { getAgeInMonths } from '../utils/growthCalculations';
import { scheduleGrowthAlert } from '../utils/notifications';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { WHO_HFA_BOYS, WHO_HFA_GIRLS } from '../data/whoHFA';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<RootStackParamList, 'GrowthChart'>;

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 24;
const CHART_HEIGHT = 280;

const WHO_WFA_BOYS: number[][] = [
  [0, 2.1, 2.5, 3.3, 4.4, 5.0], [6, 5.9, 6.4, 7.9, 9.8, 10.9], [12, 7.7, 8.6, 10.2, 12.3, 13.3],
  [24, 9.4, 10.1, 12.2, 15.0, 16.4], [36, 11.3, 12.2, 14.3, 17.8, 19.7], [48, 12.7, 13.8, 16.3, 20.8, 23.1], [60, 14.1, 15.3, 18.3, 24.1, 27.9]
];
const WHO_WFA_GIRLS: number[][] = [
  [0, 2.0, 2.4, 3.2, 4.2, 4.8], [6, 5.3, 5.8, 7.3, 9.3, 10.6], [12, 7.0, 7.7, 9.6, 11.5, 12.8],
  [24, 9.0, 9.2, 11.5, 14.8, 17.0], [36, 10.8, 11.3, 13.9, 18.1, 21.0], [48, 12.3, 13.0, 16.1, 21.2, 24.8], [60, 13.7, 14.6, 18.2, 24.3, 28.5]
];

function getIdealRanges(ageMonths: number, sex: 'male' | 'female', metric: 'weight' | 'height') {
  const curves = metric === 'weight' 
    ? (sex === 'male' ? WHO_WFA_BOYS : WHO_WFA_GIRLS)
    : (sex === 'male' ? WHO_HFA_BOYS : WHO_HFA_GIRLS);
  
  let closest = curves[0];
  for (const curve of curves) {
    if (Math.abs(curve[0] - ageMonths) < Math.abs(closest[0] - ageMonths)) {
      closest = curve;
    }
  }
  
  return {
    age: closest[0],
    lowest: closest[1],
    ideal: closest[3],
    highest: closest[5],
  };
}

// WHO Nutritional Status logic with full diagnostic categories
// Based on WHO Child Growth Standards (Z-scores):
// Weight-for-age: <-3SD = Severely Underweight, <-2SD = Underweight, >+2SD = Overweight
// Height-for-age: <-3SD = Severely Stunted, <-2SD = Stunted
// Weight-for-height: <-3SD = Severely Wasted, <-2SD = Wasted, >+2SD = Obese
interface StatusResult {
  label: string;
  labelNe: string;
  color: string;
  description: string;
  descriptionNe: string;
  needsDoctor: boolean;
  category: string;
  categoryNe: string;
}

function getNutritionalStatus(val: number, ranges: any, isNe: boolean, metric: 'weight' | 'height'): StatusResult | null {
  if (!val || !ranges) return null;

  // Approximate SD bands from WHO reference (ranges.lowest ~ -3SD, ranges.ideal ~ median, ranges.highest ~ +3SD)
  const sd3neg = ranges.lowest;
  const sd2neg = ranges.lowest + (ranges.ideal - ranges.lowest) * 0.4;
  const sd2pos = ranges.ideal + (ranges.highest - ranges.ideal) * 0.6;
  const sd3pos = ranges.highest;

  if (metric === 'weight') {
    if (val < sd3neg) {
      return {
        label: 'Severely Underweight', labelNe: 'अति कम तौल',
        color: '#B71C1C', category: 'Severely Underweight', categoryNe: 'अति कम तौल (गम्भीर)',
        description: 'Your child is severely underweight for their age (below -3 SD).',
        descriptionNe: 'तपाईंको बच्चाको तौल उमेर अनुसार अत्यन्त कम छ (गम्भीर अवस्था)।',
        needsDoctor: true,
      };
    } else if (val < sd2neg) {
      return {
        label: 'Underweight', labelNe: 'कम तौल',
        color: '#F44336', category: 'Underweight', categoryNe: 'कम तौल',
        description: 'Your child is underweight for their age (below -2 SD by WHO criteria).',
        descriptionNe: 'तपाईंको बच्चाको तौल WHO मापदण्ड अनुसार कम छ (−२ SD भन्दा कम)।',
        needsDoctor: true,
      };
    } else if (val > sd3pos) {
      return {
        label: 'Obese', labelNe: 'मोटोपना',
        color: '#E65100', category: 'Obese', categoryNe: 'मोटोपना',
        description: 'Your child is obese (above +3 SD by WHO criteria). Diet and activity review is recommended.',
        descriptionNe: 'तपाईंको बच्चाको तौल अत्यधिक बढी छ (मोटोपना)। खाना र शारीरिक गतिविधि समीक्षा सिफारिस गरिन्छ।',
        needsDoctor: true,
      };
    } else if (val > sd2pos) {
      return {
        label: 'Overweight', labelNe: 'बढी तौल',
        color: '#FF9800', category: 'Overweight', categoryNe: 'बढी तौल',
        description: 'Your child is overweight (above +2 SD). Monitor diet and activity.',
        descriptionNe: 'तपाईंको बच्चाको तौल सामान्यभन्दा बढी छ। खाना र गतिविधिमा ध्यान दिनुहोस्।',
        needsDoctor: false,
      };
    } else {
      return {
        label: 'Normal', labelNe: 'सामान्य',
        color: '#4CAF50', category: 'Normal', categoryNe: 'सामान्य',
        description: 'Your child\'s weight is normal for their age. Great job!',
        descriptionNe: 'तपाईंको बच्चाको तौल उमेर अनुसार सामान्य छ। राम्रो गर्दै हुनुहुन्छ!',
        needsDoctor: false,
      };
    }
  } else {
    // Height/Length for age
    if (val < sd3neg) {
      return {
        label: 'Severely Stunted', labelNe: 'अति ठिग्नो',
        color: '#B71C1C', category: 'Severe Stunting', categoryNe: 'गम्भीर बिकास अवरोध (Stunting)',
        description: 'Your child has severe stunting — height is well below expected for age (below -3 SD).',
        descriptionNe: 'तपाईंको बच्चाको उचाइ उमेर अनुसार अत्यन्त कम छ — गम्भीर बिकास अवरोध (Stunting)।',
        needsDoctor: true,
      };
    } else if (val < sd2neg) {
      return {
        label: 'Stunted', labelNe: 'ठिग्नो',
        color: '#F44336', category: 'Stunting', categoryNe: 'बिकास अवरोध (Stunting)',
        description: 'Your child has stunting — height is below -2 SD by WHO criteria. This may indicate chronic undernutrition.',
        descriptionNe: 'तपाईंको बच्चाको उचाइ WHO मापदण्ड अनुसार कम छ (Stunting)। यो दीर्घकालिन कुपोषणको संकेत हुनसक्छ।',
        needsDoctor: true,
      };
    } else {
      return {
        label: 'Normal', labelNe: 'सामान्य',
        color: '#4CAF50', category: 'Normal', categoryNe: 'सामान्य',
        description: 'Your child\'s height is normal for their age.',
        descriptionNe: 'तपाईंको बच्चाको उचाइ उमेर अनुसार सामान्य छ।',
        needsDoctor: false,
      };
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// Accurate BS ↔ AD conversion (Sync with AddChildScreen)
// ─────────────────────────────────────────────────────────────────
const BS_MONTHS_NE = ['बैशाख','जेठ','असार','श्रावण','भाद्र','आश्विन','कार्तिक','मंसिर','पुष','माघ','फाल्गुन','चैत्र'];
const BS_YEAR_DATA: number[][] = [
  [30,32,31,32,31,30,30,30,29,30,29,31],[31,31,32,31,31,31,30,29,30,29,30,30],
  [31,31,32,32,31,30,30,29,30,29,30,30],[31,32,31,32,31,30,30,30,29,29,30,31],
  [30,32,31,32,31,30,30,30,29,30,29,31],[31,31,32,31,31,30,30,30,29,30,29,31],
  [31,31,32,31,31,30,30,29,30,29,30,30],[31,31,32,32,31,30,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],[31,31,31,32,31,31,29,30,30,29,29,31],
  [31,31,32,31,31,31,30,29,30,29,30,30],[31,31,32,31,32,30,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],[30,32,31,32,31,30,30,30,29,30,29,31],
  [31,31,32,31,31,30,30,30,29,30,29,31],[31,31,32,31,31,30,30,29,30,29,30,30],
  [31,31,32,32,31,30,30,29,30,29,30,30],[31,32,31,32,31,30,30,30,29,29,30,31],
  [30,32,31,32,31,30,30,30,29,30,29,31],[31,31,32,31,31,31,30,29,30,29,30,30],
  [31,31,32,31,31,30,30,29,30,29,30,30],[31,32,31,32,31,30,30,30,29,29,30,31],
  [30,32,31,32,31,30,30,30,29,30,29,31],[31,31,32,31,31,31,30,29,30,29,30,30],
  [31,31,32,31,31,30,30,29,30,29,30,30],[31,32,31,32,31,30,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],[30,32,31,32,31,30,30,30,29,30,29,31],
  [31,31,32,31,31,31,30,29,30,29,30,30],[31,31,32,31,31,30,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],[30,32,31,32,31,30,30,30,29,30,29,31],
  [31,31,32,31,31,31,30,29,30,29,30,30],[31,31,32,31,31,30,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],[31,31,32,32,31,30,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],[30,32,31,32,31,30,30,30,29,30,29,31],
  [31,31,32,31,31,31,30,29,30,29,30,30],[31,31,32,31,31,30,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],[30,32,31,32,31,30,30,30,29,30,29,31],
  [31,31,32,31,31,31,30,29,30,29,30,30],[31,31,32,31,31,30,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],[30,32,31,32,31,30,30,30,29,30,29,31],
  [31,31,32,31,31,31,30,29,30,29,30,30],[31,31,32,31,31,30,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],[31,31,32,32,31,30,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],[30,32,31,32,31,30,30,30,29,30,29,31],
  [31,31,32,31,31,31,30,29,30,29,30,30],[31,31,32,31,31,30,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],[30,32,31,32,31,30,30,30,29,30,29,31],
  [31,31,32,31,31,31,30,29,30,29,30,30],[31,31,32,31,31,30,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],[31,31,32,32,31,30,30,29,30,29,30,30],
  // 2056 - 2060
  [31,32,31,32,31,30,30,30,29,29,30,31],[30,32,31,32,31,30,30,30,29,30,29,31],
  [31,31,32,31,31,31,30,29,30,29,30,30],[31,31,32,31,31,30,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],
  // 2061 - 2070
  [31,32,31,32,31,30,30,30,29,30,29,31],[31,31,32,31,31,31,30,29,30,29,30,30],
  [31,31,32,31,31,31,30,29,30,29,30,30],[31,32,31,32,31,30,30,30,29,29,30,31],
  [31,32,31,32,31,30,30,30,29,30,29,31],[31,31,32,31,31,31,30,29,30,29,30,30],
  [31,31,32,31,31,31,30,29,30,29,30,30],[31,32,31,32,31,30,30,30,29,29,30,31],
  [31,32,31,32,31,30,30,30,29,30,29,31],[31,31,32,31,31,31,30,29,30,29,30,30],
  // 2071 - 2080
  [31,31,32,31,31,31,30,29,30,29,30,30],[31,32,31,32,31,30,30,30,29,29,30,31],
  [31,32,31,32,31,30,30,30,29,30,29,31],[31,31,32,31,31,31,30,29,30,29,30,30],
  [31,31,32,31,31,31,30,29,30,29,30,30],[31,32,31,32,31,30,30,30,29,29,30,31],
  [31,32,31,32,31,30,30,30,29,30,29,31],[31,31,32,31,31,31,30,29,30,29,30,30],
  [31,31,32,31,31,31,30,29,30,29,30,30],[31,32,31,32,31,30,30,30,29,29,30,31],
  // 2081 - 2091
  [31,32,31,32,31,30,30,30,29,30,29,31],[31,31,32,31,31,31,30,29,30,29,30,30],
  [31,31,32,31,31,31,30,29,30,29,30,30],[31,32,31,32,31,30,30,30,29,29,30,31],
  [31,32,31,32,31,30,30,30,29,30,29,31],[31,31,32,31,31,31,30,29,30,29,30,30],
  [31,31,32,31,31,31,30,29,30,29,30,30],[31,32,31,32,31,30,30,30,29,29,30,31],
  [31,32,31,32,31,30,30,30,29,30,29,31],[31,31,32,31,31,31,30,29,30,29,30,30],
  [31,31,32,31,31,31,30,29,30,29,30,30],
];
const BS_START_YEAR = 2000;
const AD_REF = new Date(1943, 3, 13);
const toNE = (n: number) => n.toString().split('').map(d => '०१२३४५६७८९'[parseInt(d)] ?? d).join('');

function adToBs(adDateStr: string): { year: number; month: number; day: number } | null {
  try {
    const ad = new Date(adDateStr);
    if (isNaN(ad.getTime())) return null;
    let totalDays = Math.floor((ad.getTime() - AD_REF.getTime()) / 86400000);
    if (totalDays < 0) return null;
    for (let y = 0; y < BS_YEAR_DATA.length; y++) {
      for (let m = 0; m < 12; m++) {
        const dim = BS_YEAR_DATA[y][m];
        if (totalDays < dim) return { year: BS_START_YEAR + y, month: m + 1, day: totalDays + 1 };
        totalDays -= dim;
      }
    }
    return null;
  } catch { return null; }
}

function bsToAd(bsYear: number, bsMonth: number, bsDay: number): string | null {
  try {
    const yearIndex = bsYear - BS_START_YEAR;
    if (yearIndex < 0 || yearIndex >= BS_YEAR_DATA.length) return null;
    let totalDays = 0;
    for (let y = 0; y < yearIndex; y++)
      for (let m = 0; m < 12; m++) totalDays += BS_YEAR_DATA[y][m];
    for (let m = 0; m < bsMonth - 1; m++) totalDays += BS_YEAR_DATA[yearIndex][m];
    totalDays += bsDay - 1;
    const adDate = new Date(AD_REF.getTime() + totalDays * 86400000);
    return dayjs(adDate).format('YYYY-MM-DD');
  } catch { return null; }
}

function bsDaysInMonth(y: number, m: number): number {
  const idx = y - BS_START_YEAR;
  if (idx < 0 || idx >= BS_YEAR_DATA.length) return 30;
  return BS_YEAR_DATA[idx][m - 1];
}

// User Requested Year Ranges
const BS_YEARS_LIST = Array.from({ length: 31 }, (_, i) => 2070 + i); // 2070 to 2100
const AD_YEARS_LIST = Array.from({ length: 36 }, (_, i) => 2015 + i); // 2015 to 2050
const BS_MONTHS_LIST = Array.from({ length: 12 }, (_, i) => i + 1);

const ScrollPicker = React.memo(({ items, selectedValue, onSelect }: {
  items: { label: string; value: number }[];
  selectedValue: number;
  onSelect: (v: number) => void;
}) => {
  const initIdx = Math.max(0, items.findIndex(i => i.value === selectedValue));
  return (
    <FlatList
      data={items}
      keyExtractor={i => String(i.value)}
      style={{ maxHeight: 200 }}
      showsVerticalScrollIndicator={true}
      initialScrollIndex={initIdx > 0 ? initIdx : undefined}
      nestedScrollEnabled={true}
      getItemLayout={(_, index) => ({ length: 44, offset: 44 * index, index })}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[pickerSt.item, item.value === selectedValue && pickerSt.itemSel]}
          onPress={() => onSelect(item.value)}
        >
          <Text style={[pickerSt.itemTxt, item.value === selectedValue && pickerSt.itemTxtSel]}>
            {item.label}
          </Text>
        </TouchableOpacity>
      )}
    />
  );
});

const pickerSt = StyleSheet.create({
  item: { height: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 8 },
  itemSel: { backgroundColor: '#e8f0fe' },
  itemTxt: { fontSize: 15, color: '#444' },
  itemTxtSel: { color: '#1a73e8', fontWeight: '700' },
});

export default function GrowthChartScreen({ route, navigation }: Props) {
  const { child } = route.params;
  const { language } = useContext(LanguageContext);
  const t = translations[language];
  const isNe = language === 'ne';

  const [records, setRecords] = useState<GrowthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [chartType, setChartType] = useState<'weight' | 'height'>('weight');

  const todayAd = dayjs().format('YYYY-MM-DD');
  const [dateAD, setDateAD] = useState(todayAd);
  
  // Initialize BS based on current AD
  const initialBs = useMemo(() => adToBs(todayAd) || { year: 2081, month: 3, day: 5 }, [todayAd]);
  const [bsYear, setBsYear] = useState(initialBs.year);
  const [bsMonth, setBsMonth] = useState(initialBs.month);
  const [bsDay, setBsDay] = useState(initialBs.day);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerType, setPickerType] = useState<'ad' | 'bs'>('bs');

  // English Date Picker State
  const [adYear, setAdYear] = useState(dayjs(dateAD).year());
  const [adMonth, setAdMonth] = useState(dayjs(dateAD).month() + 1);
  const [adDay, setAdDay] = useState(dayjs(dateAD).date());

  const finalDate = useMemo(() => {
      if (pickerType === 'bs') {
          return bsToAd(bsYear, bsMonth, bsDay) ?? todayAd;
      } else {
          return dayjs().year(adYear).month(adMonth - 1).date(adDay).format('YYYY-MM-DD');
      }
  }, [bsYear, bsMonth, bsDay, adYear, adMonth, adDay, pickerType, todayAd]);

  const currentBs = useMemo(() => adToBs(finalDate) || initialBs, [finalDate, initialBs]);

  const loadRecords = async () => {
    try {
      const user = auth.currentUser;
      const q = query(collection(db, 'growth_records'), where('childId', '==', child.id), where('ownerId', '==', user?.uid || ''));
      const snap = await getDocs(q);
      const loaded: GrowthRecord[] = [];
      snap.forEach(d => loaded.push({ id: d.id, ...d.data() } as GrowthRecord));
      if (child.birthWeight && !loaded.some(r => r.date === child.dateOfBirth)) {
          loaded.push({ id: 'birth', childId: child.id, date: child.dateOfBirth, weight: child.birthWeight, height: child.birthLength || 0, ownerId: user?.uid || '' } as GrowthRecord);
      }
      loaded.sort((a, b) => a.date.localeCompare(b.date));
      setRecords(loaded);
    } catch { Alert.alert('Error', isNe ? 'डेटा लोड भएन।' : 'Could not load growth records.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadRecords(); }, []);

  const saveRecord = async () => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    if (!weight || isNaN(w) || w <= 0) return Alert.alert('Error', isNe ? 'सही तौल हाल्नुहोस्' : 'Please enter a valid weight');
    setSaving(true);
    try {
      const user = auth.currentUser;
      const ageMonths = getAgeInMonths(child.dateOfBirth, finalDate);
      await addDoc(collection(db, 'growth_records'), { 
        childId: child.id, 
        date: finalDate, 
        weight: w, 
        height: isNaN(h) ? 0 : h, 
        ageMonths, 
        recordedAt: dayjs().toISOString(), 
        ownerId: user?.uid || '' 
      });
      setWeight(''); setHeight(''); setShowForm(false); loadRecords();
    } catch { Alert.alert('Error', isNe ? 'बचत गर्न सकिएन।' : 'Could not save.'); }
    finally { setSaving(false); }
  };

  const chartData = useMemo(() => records.map(r => ({ x: r.ageMonths || getAgeInMonths(child.dateOfBirth, r.date), y: (chartType === 'weight' ? r.weight : r.height) || 0 })).filter(d => d.y > 0), [records, chartType, child.dateOfBirth]);
  const latestRecord = records[records.length - 1];
  const currentVal = chartType === 'weight' ? latestRecord?.weight : latestRecord?.height;
  const unit = chartType === 'weight' ? 'kg' : 'cm';
  const displayAgeMonths = latestRecord ? (latestRecord.ageMonths || getAgeInMonths(child.dateOfBirth, latestRecord.date)) : 0;
  const ranges = getIdealRanges(displayAgeMonths, child.sex, chartType);
  const status = latestRecord ? getNutritionalStatus(currentVal || 0, ranges, isNe, chartType) : null;

  const activeCurves = chartType === 'weight' ? (child.sex === 'male' ? WHO_WFA_BOYS : WHO_WFA_GIRLS) : (child.sex === 'male' ? WHO_HFA_BOYS : WHO_HFA_GIRLS);
  const sd3n = activeCurves.map(r => ({ x: r[0], y: r[1] }));
  const sd2n = activeCurves.map(r => ({ x: r[0], y: r[2] }));
  const med  = activeCurves.map(r => ({ x: r[0], y: r[3] }));
  const sd2p = activeCurves.map(r => ({ x: r[0], y: r[4] }));
  const sd3p = activeCurves.map(r => ({ x: r[0], y: r[5] }));

  if (loading) return <ActivityIndicator size="large" color="#1a73e8" style={{ flex: 1 }} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{paddingBottom: 40}}>
      <View style={styles.disclaimerBanner}><Text style={styles.disclaimerText}>{t.growthChartEducationalDisclaimer}</Text></View>
      
      {/* WHO Diagnostic Card */}
      {status && (
        <View style={[styles.statusCard, { borderLeftColor: status.color }]}>
          <View style={styles.statusHeader}>
            <Text style={styles.statusTitle}>{isNe ? 'वृद्धि स्थिति' : 'Growth Status'}: </Text>
            <Text style={[styles.statusLabel, { color: status.color }]}>{isNe ? status.labelNe : status.label}</Text>
          </View>
          {/* WHO Diagnosis category badge */}
          <View style={[styles.categoryBadge, { backgroundColor: status.color + '20', borderColor: status.color }]}>
            <Text style={[styles.categoryText, { color: status.color }]}>
              {isNe ? status.categoryNe : status.category}
            </Text>
          </View>
          <Text style={styles.statusDesc}>{isNe ? status.descriptionNe : status.description}</Text>
          {status.needsDoctor && (
            <View style={styles.alertBox}>
              <Ionicons name="warning" size={20} color="#F44336" />
              <Text style={styles.alertText}>
                {isNe
                  ? 'तपाईंको बच्चालाई थप मूल्यांकनको लागि बाल रोग विशेषज्ञसँग परामर्श लिनुहोस्। यो जरुरी छैन, तर ढिलो नगर्नुहोस्।'
                  : 'Please have your child evaluated by a pediatrician for further assessment. This is not an emergency, but do not delay.'}
              </Text>
            </View>
          )}
          {/* Always show nutrition link when not normal */}
          {status.label !== 'Normal' && (
            <TouchableOpacity
              style={styles.nutritionLink}
              onPress={() => navigation.navigate('Nutrition', { child, highlightAge: getAgeInMonths(child.dateOfBirth) } as any)}
            >
              <Ionicons name="leaf" size={16} color="#4CAF50" />
              <Text style={styles.nutritionLinkText}>{isNe ? 'पोषण सल्लाह हेर्नुहोस्' : 'View Nutrition & Feeding Advice'}</Text>
              <Ionicons name="chevron-forward" size={16} color="#1a73e8" />
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.toggleContainer}>
        <TouchableOpacity style={[styles.toggleBtn, chartType === 'weight' && styles.toggleBtnActive]} onPress={() => setChartType('weight')}><Text style={[styles.toggleText, chartType === 'weight' && styles.toggleTextActive]}>{isNe ? 'तौल' : 'Weight'}</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.toggleBtn, chartType === 'height' && styles.toggleBtnActive]} onPress={() => setChartType('height')}><Text style={[styles.toggleText, chartType === 'height' && styles.toggleTextActive]}>{isNe ? 'उचाइ' : 'Height'}</Text></TouchableOpacity>
      </View>

      <View style={styles.chartWrapper}>
        <VictoryChart width={CHART_WIDTH} height={CHART_HEIGHT} theme={VictoryTheme.material} padding={{ top: 20, bottom: 40, left: 45, right: 20 }}>
          <VictoryAxis label={isNe ? 'उमेर (महिना)' : 'Age (months)'} style={{ axisLabel: { padding: 30, fontSize: 10 } }} />
          <VictoryAxis dependentAxis label={`${chartType === 'weight' ? (isNe ? 'तौल (केजी)' : 'Weight (kg)') : (isNe ? 'उचाइ (सेमी)' : 'Height (cm)')}`} style={{ axisLabel: { padding: 35, fontSize: 10 } }} />
          <VictoryArea data={sd3p} y0={(d: any) => sd3n.find(p => p.x === d.x)?.y || 0} style={{ data: { fill: '#ffebee', fillOpacity: 0.5 } }} />
          <VictoryArea data={sd2p} y0={(d: any) => sd2n.find(p => p.x === d.x)?.y || 0} style={{ data: { fill: '#e8f5e9', fillOpacity: 0.5 } }} />
          <VictoryLine data={med} style={{ data: { stroke: '#4CAF50', strokeWidth: 1, strokeDasharray: '5,5' } }} />
          <VictoryLine data={chartData} style={{ data: { stroke: '#1a73e8', strokeWidth: 3 } }} />
          <VictoryScatter data={chartData} size={4} style={{ data: { fill: '#1a73e8' } }} />
        </VictoryChart>
      </View>

      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>{isNe ? 'पछिल्लो मापन' : 'Latest Measurement'}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}><Text style={styles.statLabel}>{isNe ? 'तौल' : 'Weight'}</Text><Text style={styles.statValue}>{latestRecord?.weight || '--'} kg</Text></View>
          <View style={styles.statItem}><Text style={styles.statLabel}>{isNe ? 'उचाइ' : 'Height'}</Text><Text style={styles.statValue}>{latestRecord?.height || '--'} cm</Text></View>
          <View style={styles.statItem}><Text style={styles.statLabel}>{isNe ? 'उमेर' : 'Age'}</Text><Text style={styles.statValue}>{displayAgeMonths} {isNe ? 'महिना' : 'mo'}</Text></View>
        </View>
      </View>

      <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)}>
        <Ionicons name="add-circle" size={24} color="#fff" />
        <Text style={styles.addBtnText}>{isNe ? 'नयाँ मापन थप्नुहोस्' : 'Add New Measurement'}</Text>
      </TouchableOpacity>

      <Modal visible={showForm} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{isNe ? 'नयाँ मापन' : 'New Measurement'}</Text>
            <TextInput style={styles.input} placeholder={isNe ? 'तौल (केजी)' : 'Weight (kg)'} keyboardType="numeric" value={weight} onChangeText={setWeight} />
            <TextInput style={styles.input} placeholder={isNe ? 'उचाइ (सेमी)' : 'Height (cm)'} keyboardType="numeric" value={height} onChangeText={setHeight} />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowForm(false)}><Text style={styles.cancelBtnText}>{isNe ? 'रद्द' : 'Cancel'}</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveRecord} disabled={saving}><Text style={styles.saveBtnText}>{saving ? '...' : (isNe ? 'बचत' : 'Save')}</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  disclaimerBanner: { backgroundColor: '#fff3e0', padding: 10, margin: 12, borderRadius: 8, borderLeftWidth: 4, borderLeftColor: '#ff9800' },
  disclaimerText: { fontSize: 12, color: '#e65100', lineHeight: 18 },
  toggleContainer: { flexDirection: 'row', marginHorizontal: 12, marginBottom: 16, backgroundColor: '#eee', borderRadius: 8, padding: 4 },
  toggleBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  toggleBtnActive: { backgroundColor: '#fff', elevation: 2 },
  toggleText: { fontSize: 14, fontWeight: '600', color: '#666' },
  toggleTextActive: { color: '#1a73e8' },
  chartWrapper: { backgroundColor: '#fff', marginHorizontal: 12, borderRadius: 12, padding: 8, elevation: 2 },
  statsCard: { backgroundColor: '#fff', margin: 12, borderRadius: 12, padding: 16, elevation: 2 },
  statsTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, color: '#333' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statItem: { alignItems: 'center' },
  statLabel: { fontSize: 12, color: '#888', marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#1a73e8' },
  addBtn: { backgroundColor: '#1a73e8', margin: 12, padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', elevation: 3 },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  statusCard: { backgroundColor: '#fff', margin: 12, borderRadius: 12, padding: 16, elevation: 2, borderLeftWidth: 5 },
  statusHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  statusTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  statusLabel: { fontSize: 16, fontWeight: 'bold' },
  statusDesc: { fontSize: 14, color: '#555', lineHeight: 20 },
  alertBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffebee', padding: 10, borderRadius: 8, marginTop: 10 },
  alertText: { flex: 1, fontSize: 12, color: '#c62828', marginLeft: 8 },
  nutritionLink: { flexDirection: 'row', alignItems: 'center', marginTop: 12, alignSelf: 'flex-start', gap: 4 },
  categoryBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 8 },
  categoryText: { fontSize: 13, fontWeight: '700' },
  nutritionLinkText: { fontSize: 14, color: '#1a73e8', fontWeight: '600', marginRight: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16 },
  modalBtns: { flexDirection: 'row', justifyContent: 'space-between' },
  cancelBtn: { flex: 1, padding: 14, marginRight: 10, borderRadius: 8, alignItems: 'center', backgroundColor: '#f5f5f5' },
  cancelBtnText: { color: '#666', fontWeight: 'bold' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 8, alignItems: 'center', backgroundColor: '#1a73e8' },
  saveBtnText: { color: '#fff', fontWeight: 'bold' },
});
