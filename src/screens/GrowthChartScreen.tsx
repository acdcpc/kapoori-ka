// src/screens/GrowthChartScreen.tsx
import React, { useContext, useEffect, useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator,
  Dimensions, Modal,
} from 'react-native';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import dayjs from 'dayjs';
import {
  VictoryChart, VictoryLine, VictoryAxis, VictoryScatter,
  VictoryTheme, VictoryArea,
} from 'victory-native';
import { db, auth } from '../../firebase';
import { LanguageContext } from '../context/LanguageContext';
import { translations } from '../i18n/translations';
import { GrowthRecord } from '../types';
import { getAgeInMonths } from '../utils/growthCalculations';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import NepaliDate from 'nepali-date-converter';
import { FlatList } from 'react-native';
import { PremiumGuard } from '../components/PremiumGuard';
import { useAuth } from '../context/AuthContext';

type Props = NativeStackScreenProps<RootStackParamList, 'GrowthChart'>;

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 24;
const CHART_HEIGHT = 320;

const WHO_WFA_BOYS: number[][] = [
  [0, 2.1, 2.5, 3.3, 4.4, 5.0], [3, 4.3, 4.9, 6.0, 7.5, 8.4], [6, 5.9, 6.4, 7.9, 9.8, 10.9],
  [9, 6.9, 7.5, 9.2, 11.4, 12.7], [12, 7.7, 8.6, 10.2, 12.3, 13.3], [15, 8.4, 9.3, 11.0, 13.4, 14.5],
  [18, 9.0, 10.0, 11.8, 14.3, 15.5], [24, 9.4, 10.1, 12.2, 15.0, 16.4], [30, 10.0, 10.8, 13.0, 16.1, 17.7],
  [36, 11.3, 12.2, 14.3, 17.8, 19.7], [42, 11.8, 12.7, 15.0, 18.7, 20.7], [48, 12.7, 13.8, 16.3, 20.8, 23.1],
  [54, 13.3, 14.4, 17.1, 22.0, 24.5], [60, 14.1, 15.3, 18.3, 24.1, 27.9], [66, 14.7, 16.0, 19.2, 25.4, 29.5],
  [72, 15.3, 16.5, 20.0, 27.1, 32.0], [84, 16.5, 17.8, 21.9, 30.5, 36.8], [96, 17.6, 19.0, 23.8, 34.0, 41.8],
  [108, 18.7, 20.2, 25.8, 37.6, 47.2], [120, 19.8, 21.4, 27.8, 41.3, 52.8], [132, 21.0, 22.7, 30.0, 45.2, 58.8],
  [144, 22.2, 24.0, 32.3, 49.3, 65.0], [156, 23.5, 25.4, 34.7, 53.6, 71.5], [168, 24.8, 26.8, 37.2, 58.0, 78.2],
  [180, 26.2, 28.3, 39.8, 62.6, 85.2], [192, 27.6, 29.8, 42.5, 67.3, 92.5], [204, 29.0, 31.4, 45.3, 72.2, 100.0],
  [216, 30.5, 33.0, 48.2, 77.2, 107.8]
];
const WHO_WFA_GIRLS: number[][] = [
  [0, 2.0, 2.4, 3.2, 4.2, 4.8], [3, 3.9, 4.5, 5.4, 6.9, 7.7], [6, 5.3, 5.8, 7.3, 9.3, 10.6],
  [9, 6.2, 6.8, 8.5, 10.8, 12.2], [12, 7.0, 7.7, 9.6, 11.5, 12.8], [15, 7.7, 8.4, 10.4, 12.7, 14.0],
  [18, 8.3, 9.1, 11.3, 13.9, 15.3], [24, 9.0, 9.2, 11.5, 14.8, 17.0], [30, 9.5, 9.8, 12.2, 15.8, 18.2],
  [36, 10.8, 11.3, 13.9, 18.1, 21.0], [42, 11.3, 11.8, 14.6, 19.1, 22.2], [48, 12.3, 13.0, 16.1, 21.2, 24.8],
  [54, 12.9, 13.6, 16.9, 22.4, 26.3], [60, 13.7, 14.6, 18.2, 24.3, 28.5], [66, 14.3, 15.2, 19.0, 25.5, 30.0],
  [72, 14.8, 15.8, 19.9, 27.0, 32.2], [84, 15.9, 17.0, 21.7, 30.1, 36.5], [96, 17.0, 18.2, 23.6, 33.3, 41.0],
  [108, 18.1, 19.4, 25.6, 36.7, 45.8], [120, 19.2, 20.6, 27.7, 40.2, 50.8], [132, 20.4, 21.9, 29.9, 43.9, 56.2],
  [144, 21.6, 23.2, 32.2, 47.8, 61.9], [156, 22.9, 24.6, 34.6, 51.8, 67.9], [168, 24.2, 26.0, 37.0, 56.0, 74.2],
  [180, 25.5, 27.5, 39.5, 60.3, 80.8], [192, 26.9, 29.0, 42.1, 64.7, 87.7], [204, 28.3, 30.5, 44.8, 69.2, 94.9],
  [216, 29.7, 32.1, 47.5, 73.9, 102.4]
];
const WHO_HFA_BOYS: number[][] = [
  [0, 44.2, 46.1, 49.9, 53.7, 55.6], [3, 55.3, 57.3, 61.4, 65.5, 67.6], [6, 61.2, 63.0, 67.6, 72.2, 74.0],
  [9, 65.5, 67.5, 72.3, 77.1, 79.2], [12, 70.7, 72.6, 76.1, 79.6, 81.4], [15, 73.9, 75.8, 79.4, 83.2, 85.1],
  [18, 76.6, 78.6, 82.3, 86.2, 88.2], [24, 79.3, 81.0, 85.7, 90.4, 92.2], [30, 82.3, 84.1, 88.9, 93.7, 95.6],
  [36, 85.7, 87.4, 93.9, 100.3, 102.1], [42, 88.2, 89.9, 96.6, 103.3, 105.1], [48, 91.2, 92.9, 100.3, 107.7, 109.5],
  [54, 93.6, 95.4, 103.1, 110.8, 112.7], [60, 96.1, 97.8, 106.0, 114.2, 116.0], [66, 98.4, 100.1, 108.6, 117.2, 119.1],
  [72, 100.6, 102.3, 111.2, 120.1, 121.9], [84, 104.9, 106.6, 116.0, 125.4, 127.2], [96, 109.1, 110.8, 120.6, 130.4, 132.2],
  [108, 113.1, 114.8, 125.0, 135.2, 137.0], [120, 117.0, 118.7, 129.3, 139.8, 141.6], [132, 120.8, 122.5, 133.5, 144.2, 146.0],
  [144, 124.4, 126.1, 137.5, 148.5, 150.3], [156, 127.9, 129.6, 141.4, 152.6, 154.4], [168, 131.3, 133.0, 145.2, 156.6, 158.4],
  [180, 134.5, 136.2, 148.8, 160.4, 162.2], [192, 137.6, 139.3, 152.3, 164.1, 165.9], [204, 140.6, 142.3, 155.7, 167.6, 169.4],
  [216, 143.5, 145.2, 159.0, 171.0, 172.8]
];
const WHO_HFA_GIRLS: number[][] = [
  [0, 43.6, 45.4, 49.1, 52.9, 54.7], [3, 54.2, 56.0, 60.0, 64.0, 65.8], [6, 59.6, 61.4, 65.7, 70.0, 71.8],
  [9, 63.8, 65.6, 70.1, 74.7, 76.5], [12, 69.2, 71.0, 74.3, 77.7, 79.5], [15, 72.3, 74.1, 77.5, 81.1, 82.9],
  [18, 75.0, 76.8, 80.2, 83.9, 85.7], [24, 77.8, 79.5, 84.0, 88.5, 90.2], [30, 80.9, 82.6, 87.4, 92.2, 93.9],
  [36, 84.4, 86.1, 92.9, 99.6, 101.3], [42, 86.9, 88.6, 95.7, 102.7, 104.4], [48, 90.0, 91.7, 99.0, 106.2, 107.9],
  [54, 92.5, 94.2, 101.9, 109.4, 111.1], [60, 95.2, 96.9, 104.9, 112.9, 114.6], [66, 97.7, 99.4, 107.7, 115.9, 117.6],
  [72, 99.9, 101.6, 110.0, 118.4, 120.1], [84, 104.4, 106.1, 114.9, 123.7, 125.4], [96, 108.7, 110.4, 119.6, 128.8, 130.5],
  [108, 112.9, 114.6, 124.1, 133.7, 135.4], [120, 117.0, 118.7, 128.5, 138.5, 140.2], [132, 121.0, 122.7, 132.7, 143.0, 144.7],
  [144, 124.8, 126.5, 136.8, 147.3, 149.0], [156, 128.5, 130.2, 140.7, 151.4, 153.1], [168, 132.1, 133.8, 144.5, 155.3, 157.0],
  [180, 135.5, 137.2, 148.1, 159.0, 160.7], [192, 138.8, 140.5, 151.6, 162.6, 164.3], [204, 142.0, 143.7, 155.0, 166.0, 167.7],
  [216, 145.1, 146.8, 158.2, 169.3, 171.0]
];
const WHO_BFA_BOYS: number[][] = [
  [24, 13.4, 14.3, 16.3, 17.8, 18.9], [30, 13.3, 14.1, 16.0, 17.5, 18.6], [36, 13.2, 14.0, 15.8, 17.3, 18.3],
  [42, 13.2, 13.9, 15.7, 17.1, 18.2], [48, 13.1, 13.8, 15.6, 17.0, 18.1], [54, 13.1, 13.8, 15.5, 16.9, 18.0],
  [60, 13.0, 13.7, 15.4, 16.8, 17.9], [66, 13.0, 13.7, 15.4, 16.8, 17.9], [72, 13.0, 13.7, 15.4, 16.8, 17.9],
  [84, 13.0, 13.7, 15.5, 17.0, 18.1], [96, 13.1, 13.8, 15.6, 17.2, 18.3], [108, 13.2, 13.9, 15.8, 17.5, 18.7],
  [120, 13.3, 14.1, 16.1, 17.9, 19.1], [132, 13.5, 14.3, 16.4, 18.3, 19.6], [144, 13.7, 14.6, 16.8, 18.8, 20.2],
  [156, 13.9, 14.9, 17.2, 19.4, 20.9], [168, 14.2, 15.2, 17.7, 20.0, 21.6], [180, 14.5, 15.6, 18.2, 20.7, 22.4],
  [192, 14.8, 16.0, 18.8, 21.5, 23.3], [204, 15.2, 16.4, 19.4, 22.3, 24.2], [216, 15.6, 16.9, 20.1, 23.2, 25.2]
];
const WHO_BFA_GIRLS: number[][] = [
  [24, 13.2, 14.1, 16.1, 17.6, 18.7], [30, 13.1, 13.9, 15.8, 17.3, 18.4], [36, 13.0, 13.8, 15.6, 17.1, 18.1],
  [42, 13.0, 13.7, 15.5, 16.9, 18.0], [48, 12.9, 13.6, 15.4, 16.8, 17.9], [54, 12.9, 13.6, 15.3, 16.7, 17.8],
  [60, 12.8, 13.5, 15.3, 16.7, 17.8], [66, 12.8, 13.5, 15.3, 16.7, 17.8], [72, 12.8, 13.5, 15.3, 16.7, 17.9],
  [84, 12.9, 13.6, 15.4, 16.9, 18.1], [96, 13.0, 13.7, 15.6, 17.2, 18.4], [108, 13.1, 13.8, 15.8, 17.5, 18.8],
  [120, 13.2, 14.0, 16.1, 17.9, 19.3], [132, 13.4, 14.2, 16.4, 18.3, 19.8], [144, 13.6, 14.5, 16.8, 18.8, 20.4],
  [156, 13.9, 14.8, 17.2, 19.4, 21.1], [168, 14.2, 15.2, 17.7, 20.0, 21.8], [180, 14.5, 15.6, 18.2, 20.7, 22.6],
  [192, 14.9, 16.0, 18.8, 21.5, 23.5], [204, 15.3, 16.5, 19.4, 22.3, 24.5], [216, 15.7, 17.0, 20.1, 23.2, 25.6]
];

function getIdealRanges(ageMonths: number, sex: 'male' | 'female', metric: 'weight' | 'height' | 'bmi') {
  let curves: number[][];
  if (metric === 'weight') curves = sex === 'male' ? WHO_WFA_BOYS : WHO_WFA_GIRLS;
  else if (metric === 'height') curves = sex === 'male' ? WHO_HFA_BOYS : WHO_HFA_GIRLS;
  else curves = sex === 'male' ? WHO_BFA_BOYS : WHO_BFA_GIRLS;
  let closest = curves[0];
  for (const curve of curves) { if (Math.abs(curve[0] - ageMonths) < Math.abs(closest[0] - ageMonths)) closest = curve; }
  return { age: closest[0], lowest: closest[1], sd2neg: closest[2], ideal: closest[3], sd2pos: closest[4], highest: closest[5] };
}

interface StatusResult { label: string; labelNe: string; color: string; description: string; descriptionNe: string; needsDoctor: boolean; category: string; categoryNe: string; }

function getNutritionalStatus(val: number, ranges: any, isNe: boolean, metric: 'weight' | 'height' | 'bmi'): StatusResult | null {
  if (!val || !ranges) return null;
  const sd3neg = ranges.lowest, sd2neg = ranges.sd2neg, sd2pos = ranges.sd2pos, sd3pos = ranges.highest;
  if (metric === 'bmi') {
    if (val < sd3neg) return { label: 'Severely Wasted', labelNe: 'अति कम BMI', color: '#B71C1C', category: 'Severely Wasted', categoryNe: 'अति कम BMI', description: 'Severe acute malnutrition. Immediate medical attention needed.', descriptionNe: 'गम्भीर कुपोषण। तुरुन्त चिकित्सकीय ध्यान आवश्यक।', needsDoctor: true };
    if (val < sd2neg) return { label: 'Wasted', labelNe: 'कम BMI', color: '#C0392B', category: 'Wasted', categoryNe: 'कम BMI', description: 'Wasted - acute malnutrition.', descriptionNe: 'तीव्र कुपोषणको संकेत।', needsDoctor: true };
    if (val > sd2pos) return { label: 'Obese', labelNe: 'मोटोपना', color: '#E65100', category: 'Obese', categoryNe: 'मोटोपना', description: 'Obese based on BMI-for-age.', descriptionNe: 'मोटोपना छ।', needsDoctor: true };
    if (val > ranges.ideal + (ranges.sd2pos - ranges.ideal) * 0.5) return { label: 'Overweight', labelNe: 'बढी BMI', color: '#F5A623', category: 'Overweight', categoryNe: 'बढी BMI', description: 'Overweight. Monitor diet.', descriptionNe: 'BMI सामान्यभन्दा बढी।', needsDoctor: false };
    return { label: 'Normal', labelNe: 'सामान्य', color: '#3D8B5E', category: 'Normal', categoryNe: 'सामान्य', description: 'BMI is normal.', descriptionNe: 'BMI सामान्य।', needsDoctor: false };
  }
  if (metric === 'weight') {
    if (val < sd3neg) return { label: 'Severely Underweight', labelNe: 'अति कम तौल', color: '#B71C1C', category: 'Severely Underweight', categoryNe: 'अति कम तौल', description: 'Severely underweight.', descriptionNe: 'अत्यन्त कम तौल।', needsDoctor: true };
    if (val < sd2neg) return { label: 'Underweight', labelNe: 'कम तौल', color: '#C0392B', category: 'Underweight', categoryNe: 'कम तौल', description: 'Underweight (below -2 SD).', descriptionNe: 'कम तौल।', needsDoctor: true };
    if (val > sd3pos) return { label: 'Obese', labelNe: 'मोटोपना', color: '#E65100', category: 'Obese', categoryNe: 'मोटोपना', description: 'Obese.', descriptionNe: 'मोटोपना।', needsDoctor: true };
    if (val > sd2pos) return { label: 'Overweight', labelNe: 'बढी तौल', color: '#F5A623', category: 'Overweight', categoryNe: 'बढी तौल', description: 'Overweight.', descriptionNe: 'बढी तौल।', needsDoctor: false };
    return { label: 'Normal', labelNe: 'सामान्य', color: '#3D8B5E', category: 'Normal', categoryNe: 'सामान्य', description: 'Weight is normal.', descriptionNe: 'तौल सामान्य।', needsDoctor: false };
  }
  if (val < sd3neg) return { label: 'Severely Stunted', labelNe: 'अति ठिग्नो', color: '#B71C1C', category: 'Severe Stunting', categoryNe: 'गम्भीर बिकास अवरोध', description: 'Severe stunting.', descriptionNe: 'गम्भीर बिकास अवरोध।', needsDoctor: true };
  if (val < sd2neg) return { label: 'Stunted', labelNe: 'ठिग्नो', color: '#C0392B', category: 'Stunting', categoryNe: 'बिकास अवरोध', description: 'Stunting - chronic undernutrition.', descriptionNe: 'दीर्घकालिन कुपोषण।', needsDoctor: true };
  return { label: 'Normal', labelNe: 'सामान्य', color: '#3D8B5E', category: 'Normal', categoryNe: 'सामान्य', description: 'Height is normal.', descriptionNe: 'उचाइ सामान्य।', needsDoctor: false };
}

function calculateBMI(weightKg: number, heightCm: number): number { const heightM = heightCm / 100; return weightKg / (heightM * heightM); }
function calculateMidParentalHeight(fatherHeight: number, motherHeight: number, childSex: 'male' | 'female'): number {
  return childSex === 'male' ? (fatherHeight + motherHeight + 13) / 2 : (fatherHeight + motherHeight - 13) / 2;
}

export default function GrowthChartScreen({ route, navigation }: Props) {
  const { child } = route.params;
  const { language } = useContext(LanguageContext);
  const { subscription } = useAuth();
  const t = translations[language] || translations['en'];
  const isNe = language === 'ne';
  const isPremium = subscription?.status === 'active' || subscription?.plan === 'premium' || subscription?.plan === 'yearly';

  const [records, setRecords] = useState<GrowthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [bsDate, setBsDate] = useState<NepaliDate>(new NepaliDate());
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [chartType, setChartType] = useState<'weight' | 'height' | 'bmi'>('weight');
  const [activeTab, setActiveTab] = useState<'chart' | 'predictor'>('chart');
  const [fatherHeight, setFatherHeight] = useState('');
  const [motherHeight, setMotherHeight] = useState('');
  const [showPrediction, setShowPrediction] = useState(false);

  const todayAd = dayjs().format('YYYY-MM-DD');

  const getNepaliMonthName = (monthIndex: number): string => {
    const months = ['बैशाख','जेठ','असार','साउन','भदौ','असोज','कार्तिक','मंसिर','पुष','माघ','फागुन','चैत्र'];
    return months[monthIndex] || '';
  };
  const neDigits = (n: number) => String(n).split('').map(c => '०१२३४५६७८९'[parseInt(c)] ?? c).join('');

  const BS_YEARS = Array.from({length: 44}, (_, i) => 2057 + i);
  const BS_MONTHS = [1,2,3,4,5,6,7,8,9,10,11,12];
  const bsDaysInMonth = (y: number, m: number): number => { const days = [31,31,32,31,31,31,30,29,30,29,30,30]; return days[m-1]; };

  const ScrollPicker2 = ({ items, selected, onSelect }: { items: {label:string,value:number}[], selected: number, onSelect: (v:number) => void }) => (
    <FlatList data={items} keyExtractor={i => String(i.value)} style={{ maxHeight: 180 }} showsVerticalScrollIndicator={true}
      getItemLayout={(_, i) => ({ length: 40, offset: 40 * i, index: i })}
      renderItem={({ item }) => (
        <TouchableOpacity style={{ height: 40, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 6, backgroundColor: item.value === selected ? '#E8602C20' : 'transparent' }}
          onPress={() => onSelect(item.value)}>
          <Text style={{ fontSize: 15, color: item.value === selected ? '#E8602C' : '#7A6E65', fontWeight: item.value === selected ? '700' : '400' }}>{item.label}</Text>
        </TouchableOpacity>
      )}
    />
  );

  const childAgeMonths = getAgeInMonths(child.dateOfBirth, todayAd);

  const loadRecords = async () => {
    try {
      const user = auth.currentUser;
      const q = query(collection(db, 'growth_records'), where('childId', '==', child.id), where('ownerId', '==', user?.uid || ''));
      const snap = await getDocs(q);
      const loaded: GrowthRecord[] = [];
      snap.forEach(d => loaded.push({ id: d.id, ...d.data() } as GrowthRecord));
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
      const adDateObj = bsDate.getAD();
      const adDateStr = `${adDateObj.year}-${String(adDateObj.month + 1).padStart(2, '0')}-${String(adDateObj.date).padStart(2, '0')}`;
      const bsDateStr = bsDate.format('YYYY-MM-DD');
      const ageMonths = getAgeInMonths(child.dateOfBirth, adDateStr);
      await addDoc(collection(db, 'growth_records'), { childId: child.id, date: adDateStr, bsDate: bsDateStr, weight: w, height: isNaN(h) ? 0 : h, ageMonths, recordedAt: dayjs().toISOString(), ownerId: user?.uid || '' });
      setWeight(''); setHeight(''); setBsDate(new NepaliDate()); setShowForm(false); loadRecords();
    } catch { Alert.alert('Error', isNe ? 'बचत गर्न सकिएन।' : 'Could not save.'); }
    finally { setSaving(false); }
  };

  const chartData = useMemo(() => {
    if (chartType === 'bmi') return records.filter(r => r.weight && r.height && (r.ageMonths || getAgeInMonths(child.dateOfBirth, r.date)) >= 24).map(r => ({ x: r.ageMonths || getAgeInMonths(child.dateOfBirth, r.date), y: calculateBMI(r.weight, r.height || 0) })).filter(d => d.y > 0);
    return records.map(r => ({ x: r.ageMonths || getAgeInMonths(child.dateOfBirth, r.date), y: (chartType === 'weight' ? r.weight : r.height) || 0 })).filter(d => d.y > 0);
  }, [records, chartType, child.dateOfBirth]);

  const latestRecord = records.length > 0 ? records[records.length - 1] : null;
  const latestBMIRecord = useMemo(() => {
    for (let i = records.length - 1; i >= 0; i--) { const r = records[i]; const age = r.ageMonths || getAgeInMonths(child.dateOfBirth, r.date); if (r.weight && r.height && age >= 24) return { ...r, ageMonths: age, bmi: calculateBMI(r.weight, r.height) }; }
    return null;
  }, [records, child.dateOfBirth]);

  const currentVal = chartType === 'weight' ? latestRecord?.weight : chartType === 'height' ? latestRecord?.height : latestBMIRecord?.bmi;
  const displayAgeMonths = chartType === 'bmi' && latestBMIRecord ? latestBMIRecord.ageMonths : (latestRecord ? (latestRecord.ageMonths || getAgeInMonths(child.dateOfBirth, latestRecord.date)) : 0);
  const ranges = getIdealRanges(displayAgeMonths, child.sex, chartType);
  const status = currentVal ? getNutritionalStatus(currentVal, ranges, isNe, chartType) : null;

  const getActiveCurves = () => {
    if (chartType === 'weight') return child.sex === 'male' ? WHO_WFA_BOYS : WHO_WFA_GIRLS;
    if (chartType === 'height') return child.sex === 'male' ? WHO_HFA_BOYS : WHO_HFA_GIRLS;
    return child.sex === 'male' ? WHO_BFA_BOYS : WHO_BFA_GIRLS;
  };
  const activeCurves = getActiveCurves();
  const sd3n = activeCurves.map(r => ({ x: r[0], y: r[1] }));
  const sd2n = activeCurves.map(r => ({ x: r[0], y: r[2] }));
  const med = activeCurves.map(r => ({ x: r[0], y: r[3] }));
  const sd2p = activeCurves.map(r => ({ x: r[0], y: r[4] }));
  const sd3p = activeCurves.map(r => ({ x: r[0], y: r[5] }));

  const predictedHeight = useMemo(() => {
    const fh = parseFloat(fatherHeight), mh = parseFloat(motherHeight);
    if (isNaN(fh) || isNaN(mh) || fh <= 0 || mh <= 0) return null;
    return calculateMidParentalHeight(fh, mh, child.sex);
  }, [fatherHeight, motherHeight, child.sex]);

  const bmiAvailable = childAgeMonths >= 24;

  if (loading) return <ActivityIndicator size="large" color="#E8602C" style={{ flex: 1, backgroundColor: '#F7F1EB' }} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{paddingBottom: 40}}>
      {/* Tab Switcher — Pill style */}
      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.pillTab, activeTab === 'chart' && styles.pillTabActive]} onPress={() => setActiveTab('chart')}>
          <Ionicons name="analytics" size={16} color={activeTab === 'chart' ? '#fff' : '#7A6E65'} />
          <Text style={[styles.pillTabText, activeTab === 'chart' && styles.pillTabTextActive]}>{isNe ? 'वृद्धि चार्ट' : 'Growth Chart'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.pillTab, activeTab === 'predictor' && styles.pillTabActive]} onPress={() => setActiveTab('predictor')}>
          <Ionicons name="trending-up" size={16} color={activeTab === 'predictor' ? '#fff' : '#7A6E65'} />
          <Text style={[styles.pillTabText, activeTab === 'predictor' && styles.pillTabTextActive]}>{isNe ? 'भविष्य उचाइ' : 'Height Predictor'}</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'chart' ? (
        <>
          {/* Disclaimer */}
          <View style={styles.disclaimerBanner}>
            <Text style={styles.disclaimerText}>{isNe ? '⚠️ यो शैक्षिक सन्दर्भ मात्र हो। चिकित्सकीय सल्लाहको विकल्प होइन।' : '⚠️ For educational reference only. Not medical advice.'}</Text>
          </View>

          {/* WHO Diagnostic Card */}
          {status && (
            <View style={[styles.statusCard, { borderLeftColor: status.color }]}>
              <View style={styles.statusHeader}>
                <Text style={styles.statusTitle}>{chartType === 'bmi' ? (isNe ? 'BMI स्थिति' : 'BMI Status') : (isNe ? 'वृद्धि स्थिति' : 'Growth Status')}: </Text>
                <Text style={[styles.statusLabel, { color: status.color }]}>{isNe ? status.labelNe : status.label}</Text>
              </View>
              <View style={[styles.categoryBadge, { backgroundColor: status.color + '20', borderColor: status.color }]}>
                <Text style={[styles.categoryText, { color: status.color }]}>{isNe ? status.categoryNe : status.category}</Text>
              </View>
              <Text style={styles.statusDesc}>{isNe ? status.descriptionNe : status.description}</Text>
              {status.needsDoctor && (
                <View style={styles.alertBox}>
                  <Ionicons name="warning" size={20} color="#C0392B" />
                  <Text style={styles.alertText}>{isNe ? 'बाल रोग विशेषज्ञसँग परामर्श लिनुहोस्।' : 'Please have your child evaluated by a pediatrician.'}</Text>
                </View>
              )}
            </View>
          )}

          {/* Current Info */}
          <View style={styles.currentInfoCard}>
            <Text style={styles.currentInfoTitle}>{isNe ? 'हालको मापन' : 'Current Measurement'}</Text>
            <View style={styles.currentInfoRow}>
              <View style={styles.statChip}><Text style={styles.statChipLabel}>{isNe ? 'तौल' : 'Weight'}</Text><Text style={styles.statChipValue}>{latestRecord?.weight ? `${latestRecord.weight} kg` : (isNe ? 'N/A' : 'N/A')}</Text></View>
              <View style={styles.statChip}><Text style={styles.statChipLabel}>{isNe ? 'उचाइ' : 'Height'}</Text><Text style={styles.statChipValue}>{latestRecord?.height ? `${latestRecord.height} cm` : (isNe ? 'N/A' : 'N/A')}</Text></View>
              <View style={styles.statChip}><Text style={styles.statChipLabel}>{isNe ? 'उमेर' : 'Age'}</Text><Text style={styles.statChipValue}>{childAgeMonths} {isNe ? 'म' : 'mo'}</Text></View>
            </View>
            {latestRecord && (
              <View style={styles.lastRecordedRow}>
                <Ionicons name="calendar-outline" size={14} color="#7A6E65" />
                <Text style={styles.lastRecordedText}>{isNe ? 'अन्तिम: ' : 'Last: '}{(latestRecord as any).bsDate ? `${(latestRecord as any).bsDate}` : dayjs(latestRecord.date).format('YYYY-MM-DD')}</Text>
              </View>
            )}
            {latestBMIRecord && (
              <View style={styles.bmiRow}><Text style={styles.bmiLabel}>BMI:</Text><Text style={styles.bmiValue}>{latestBMIRecord.bmi.toFixed(1)}</Text></View>
            )}
            {ranges && (
              <View style={styles.idealRangeBox}>
                <Text style={styles.idealRangeTitle}>{isNe ? 'WHO मापदण्ड' : 'WHO Standards'} ({ranges.age}{isNe ? ' महिना' : 'mo'})</Text>
                <View style={styles.idealRangeRow}>
                  <View style={[styles.idealRangeItem]}><Text style={styles.idealRangeLabel}>{isNe ? 'न्यून' : 'Low'}</Text><Text style={styles.idealRangeValue}>{ranges.lowest}</Text></View>
                  <View style={[styles.idealRangeItem, styles.idealMedian]}><Text style={styles.idealRangeLabel}>{isNe ? 'सामान्य' : 'Normal'}</Text><Text style={styles.idealRangeValue}>{ranges.ideal}</Text></View>
                  <View style={styles.idealRangeItem}><Text style={styles.idealRangeLabel}>{isNe ? 'अधिक' : 'High'}</Text><Text style={styles.idealRangeValue}>{ranges.highest}</Text></View>
                </View>
              </View>
            )}
          </View>

          {/* Chart Type Toggle — underline style */}
          <View style={styles.underlineToggle}>
            <TouchableOpacity style={[styles.underlineBtn, chartType === 'weight' && styles.underlineBtnActive]} onPress={() => setChartType('weight')}>
              <Text style={[styles.underlineBtnText, chartType === 'weight' && styles.underlineBtnTextActive]}>{isNe ? 'तौल' : 'Weight'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.underlineBtn, chartType === 'height' && styles.underlineBtnActive]} onPress={() => setChartType('height')}>
              <Text style={[styles.underlineBtnText, chartType === 'height' && styles.underlineBtnTextActive]}>{isNe ? 'उचाइ' : 'Height'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.underlineBtn, chartType === 'bmi' && styles.underlineBtnActive, !bmiAvailable && { opacity: 0.4 }]} onPress={() => bmiAvailable && setChartType('bmi')} disabled={!bmiAvailable}>
              <Text style={[styles.underlineBtnText, chartType === 'bmi' && styles.underlineBtnTextActive]}>BMI {!bmiAvailable ? '(2y+)' : ''}</Text>
            </TouchableOpacity>
          </View>

          {/* Chart */}
          <View style={styles.chartWrapper}>
            <Text style={styles.chartTitle}>{chartType === 'weight' ? (isNe ? 'तौल चार्ट (WHO)' : 'Weight Chart (WHO)') : chartType === 'height' ? (isNe ? 'उचाइ चार्ट (WHO)' : 'Height Chart (WHO)') : (isNe ? 'BMI चार्ट (WHO)' : 'BMI Chart (WHO)')}</Text>
            <VictoryChart width={CHART_WIDTH} height={CHART_HEIGHT} theme={VictoryTheme.material} padding={{ top: 20, bottom: 40, left: 50, right: 20 }}>
              <VictoryAxis label={isNe ? 'उमेर (महिना)' : 'Age (months)'} style={{ axisLabel: { padding: 30, fontSize: 10 } }} />
              <VictoryAxis dependentAxis label={`${chartType === 'weight' ? (isNe ? 'तौल (केजी)' : 'Weight (kg)') : chartType === 'height' ? (isNe ? 'उचाइ (सेमी)' : 'Height (cm)') : 'BMI (kg/m²)'}`} style={{ axisLabel: { padding: 40, fontSize: 10 } }} />
              <VictoryArea data={sd3p} y0={(d: any) => sd3n.find(p => p.x === d.x)?.y || 0} style={{ data: { fill: '#ffebee', fillOpacity: 0.3 } }} />
              <VictoryArea data={sd2p} y0={(d: any) => sd2n.find(p => p.x === d.x)?.y || 0} style={{ data: { fill: '#e8f5e9', fillOpacity: 0.4 } }} />
              <VictoryLine data={med} style={{ data: { stroke: '#3D8B5E', strokeWidth: 1.5, strokeDasharray: '4,4' } }} />
              <VictoryLine data={sd2n} style={{ data: { stroke: '#F5A623', strokeWidth: 1, opacity: 0.6 } }} />
              <VictoryLine data={sd2p} style={{ data: { stroke: '#F5A623', strokeWidth: 1, opacity: 0.6 } }} />
              <VictoryLine data={chartData} style={{ data: { stroke: '#E8602C', strokeWidth: 3 } }} />
              <VictoryScatter data={chartData} size={4} style={{ data: { fill: '#E8602C' } }} />
            </VictoryChart>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}><View style={[styles.legendDot, {backgroundColor:'#E8602C'}]} /><Text style={styles.legendText}>{isNe ? 'तपाईंको बच्चा' : 'Your Child'}</Text></View>
              <View style={styles.legendItem}><View style={[styles.legendDot, {backgroundColor:'#3D8B5E'}]} /><Text style={styles.legendText}>WHO Median</Text></View>
              <View style={styles.legendItem}><View style={[styles.legendDot, {backgroundColor:'#F5A623'}]} /><Text style={styles.legendText}>±2 SD</Text></View>
            </View>
          </View>

          {/* Recent Records */}
          {records.length > 0 && (
            <View style={styles.recordsCard}>
              <Text style={styles.recordsTitle}>{isNe ? 'अघिल्लो मापनहरू' : 'Previous Measurements'}</Text>
              {records.slice(-5).reverse().map((record, i) => (
                <View key={record.id || i} style={[styles.recordRow, i > 0 && styles.recordRowBorder]}>
                  <Text style={styles.recordDateText}>{(record as any).bsDate || dayjs(record.date).format('YYYY-MM-DD')}</Text>
                  <Text style={styles.recordValue}>{record.weight} kg{record.height && record.height > 0 ? ` · ${record.height} cm` : ''}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Add Button */}
          {isPremium ? (
            <TouchableOpacity style={styles.addBtn} onPress={() => { setBsDate(new NepaliDate()); setShowForm(true); }}>
              <Ionicons name="add-circle" size={24} color="#fff" />
              <Text style={styles.addBtnText}>{isNe ? 'नयाँ मापन थप्नुहोस्' : 'Add New Measurement'}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.addBtnLocked} onPress={() => navigation.navigate('Subscription' as any)}>
              <Ionicons name="lock-closed" size={20} color="#fff" />
              <Text style={styles.addBtnText}>{isNe ? 'प्रिमियम अपग्रेड गर्नुहोस्' : 'Upgrade to Premium'}</Text>
            </TouchableOpacity>
          )}

          {/* Add Modal */}
          <Modal visible={showForm} animationType="slide" transparent={true}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>{isNe ? 'नयाँ मापन' : 'New Measurement'}</Text>
                {/* Date picker logic identical to original, just restyled */}
                <Text style={styles.modalDateLabel}>{isNe ? 'मिति छान्नुहोस्' : 'Select Date'}</Text>
                {isNe ? (
                  <>
                    <View style={styles.dateDisplay}><Text style={styles.dateValue}>{neDigits(bsDate.getDate())} {getNepaliMonthName(bsDate.getMonth())} {neDigits(bsDate.getYear())}</Text></View>
                    <View style={styles.pickerRow}>
                      <View style={styles.pickerCol}><Text style={styles.pickerLabel}>{isNe ? 'वर्ष' : 'Year'}</Text><ScrollPicker2 items={BS_YEARS.map(y => ({ label: neDigits(y), value: y }))} selected={bsDate.getYear()} onSelect={(v) => setBsDate(new NepaliDate(v, bsDate.getMonth(), bsDate.getDate()))} /></View>
                      <View style={styles.pickerCol}><Text style={styles.pickerLabel}>{isNe ? 'महिना' : 'Month'}</Text><ScrollPicker2 items={BS_MONTHS.map(m => ({ label: getNepaliMonthName(m-1), value: m }))} selected={bsDate.getMonth()+1} onSelect={(v) => setBsDate(new NepaliDate(bsDate.getYear(), v-1, bsDate.getDate()))} /></View>
                      <View style={styles.pickerCol}><Text style={styles.pickerLabel}>{isNe ? 'गते' : 'Day'}</Text><ScrollPicker2 items={Array.from({ length: bsDaysInMonth(bsDate.getYear(), bsDate.getMonth()+1) }, (_, i) => ({ label: neDigits(i+1), value: i+1 }))} selected={bsDate.getDate()} onSelect={(v) => setBsDate(new NepaliDate(bsDate.getYear(), bsDate.getMonth(), v))} /></View>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.dateDisplay}><Text style={styles.dateValue}>{dayjs(new Date(bsDate.getAD().year, bsDate.getAD().month - 1, bsDate.getAD().date)).format('DD MMM YYYY')}</Text></View>
                    <View style={styles.pickerRow}>
                      <View style={styles.pickerCol}><Text style={styles.pickerLabel}>Year</Text><ScrollPicker2 items={Array.from({length: 51}, (_, i) => 2000 + i).map(y => ({ label: String(y), value: y }))} selected={bsDate.getAD().year} onSelect={(v) => { const ad = bsDate.getAD(); setBsDate(new NepaliDate(new Date(v, ad.month - 1, ad.date))); }} /></View>
                      <View style={styles.pickerCol}><Text style={styles.pickerLabel}>Month</Text><ScrollPicker2 items={['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => ({ label: m, value: i+1 }))} selected={bsDate.getAD().month} onSelect={(v) => { const ad = bsDate.getAD(); setBsDate(new NepaliDate(new Date(ad.year, v - 1, ad.date))); }} /></View>
                      <View style={styles.pickerCol}><Text style={styles.pickerLabel}>Day</Text><ScrollPicker2 items={Array.from({length: 31}, (_, i) => ({ label: String(i+1), value: i+1 }))} selected={bsDate.getAD().date} onSelect={(v) => { const ad = bsDate.getAD(); setBsDate(new NepaliDate(new Date(ad.year, ad.month - 1, v))); }} /></View>
                    </View>
                  </>
                )}
                <TextInput style={styles.input} placeholder={isNe ? 'तौल (केजी)' : 'Weight (kg)'} keyboardType="numeric" value={weight} onChangeText={setWeight} placeholderTextColor="#C4956A" />
                <TextInput style={styles.input} placeholder={isNe ? 'उचाइ (सेमी)' : 'Height (cm) - optional'} keyboardType="numeric" value={height} onChangeText={setHeight} placeholderTextColor="#C4956A" />
                <View style={styles.modalBtns}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowForm(false)}><Text style={styles.cancelBtnText}>{isNe ? 'रद्द' : 'Cancel'}</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={saveRecord} disabled={saving}><Text style={styles.saveBtnText}>{saving ? '...' : (isNe ? 'बचत' : 'Save')}</Text></TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </>
      ) : (
        /* Height Predictor */
        <PremiumGuard>
          <View style={styles.predictorContainer}>
            <View style={styles.predictorCard}>
              <Ionicons name="trending-up" size={40} color="#E8602C" style={{ alignSelf: 'center', marginBottom: 12 }} />
              <Text style={styles.predictorTitle}>{isNe ? 'बच्चाको सम्भावित वयस्क उचाइ' : "Predict Your Child's Adult Height"}</Text>
              <Text style={styles.predictorSubtitle}>{isNe ? 'आमाबुबाको उचाइबाट अनुमान' : 'Estimate based on parent heights'}</Text>
              <View style={styles.predictorInputRow}>
                <View style={styles.predictorInputGroup}><Text style={styles.predictorLabel}>{isNe ? 'बुबाको उचाइ (सेमी)' : "Father (cm)"}</Text><TextInput style={styles.predictorInput} keyboardType="numeric" value={fatherHeight} onChangeText={setFatherHeight} placeholder="170" placeholderTextColor="#C4956A" /></View>
                <View style={styles.predictorInputGroup}><Text style={styles.predictorLabel}>{isNe ? 'आमाको उचाइ (सेमी)' : "Mother (cm)"}</Text><TextInput style={styles.predictorInput} keyboardType="numeric" value={motherHeight} onChangeText={setMotherHeight} placeholder="155" placeholderTextColor="#C4956A" /></View>
              </View>
              <TouchableOpacity style={styles.predictorBtn} onPress={() => setShowPrediction(true)}><Text style={styles.predictorBtnText}>{isNe ? 'अनुमान गर्नुहोस्' : 'Calculate'}</Text></TouchableOpacity>
              {showPrediction && predictedHeight && (
                <View style={styles.predictionResult}>
                  <Text style={styles.predictionLabel}>{isNe ? 'सम्भावित वयस्क उचाइ:' : 'Predicted Adult Height:'}</Text>
                  <Text style={styles.predictionValue}>{predictedHeight.toFixed(1)} cm</Text>
                  <Text style={styles.predictionRange}>({isNe ? 'दायरा' : 'Range'}: {(predictedHeight - 8.5).toFixed(1)}–{(predictedHeight + 8.5).toFixed(1)} cm)</Text>
                  <Text style={styles.predictionNote}>{isNe ? 'यो अनुमान मात्र हो।' : 'This is an estimate only.'}</Text>
                </View>
              )}
            </View>
            <View style={styles.predictorInfoCard}>
              <Text style={styles.predictorInfoTitle}>{isNe ? 'Mid-parental Height के हो?' : 'What is Mid-parental Height?'}</Text>
              <Text style={styles.predictorInfoText}>{isNe ? 'आमाबुबाको उचाइ आधारमा बच्चाको वयस्क उचाइ अनुमान। सूत्र: छोरा: (बुबा+आमा+१३)÷२, छोरी: (बुबा+आमा-१३)÷२' : 'Formula: Boy: (Father+Mother+13)÷2, Girl: (Father+Mother-13)÷2. ±8.5 cm.'}</Text>
            </View>
          </View>
        </PremiumGuard>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F1EB' },
  tabContainer: { flexDirection: 'row', marginHorizontal: 12, marginTop: 12, marginBottom: 8, borderRadius: 24, borderWidth: 1, borderColor: '#EDE0D4', backgroundColor: '#FDF8F2', padding: 4 },
  pillTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 22, gap: 6 },
  pillTabActive: { backgroundColor: '#E8602C' },
  pillTabText: { fontSize: 13, fontWeight: '600', color: '#7A6E65' },
  pillTabTextActive: { color: '#fff' },

  disclaimerBanner: { backgroundColor: '#FEF3C7', padding: 10, marginHorizontal: 12, marginBottom: 8, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#F5A623' },
  disclaimerText: { fontSize: 12, color: '#92400E', lineHeight: 18 },

  statusCard: { backgroundColor: '#FDF8F2', marginHorizontal: 12, marginBottom: 12, borderRadius: 16, padding: 16, borderLeftWidth: 5, shadowColor: '#C4956A', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  statusHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' },
  statusTitle: { fontSize: 16, fontWeight: '600', color: '#1A1A2E' },
  statusLabel: { fontSize: 16, fontWeight: 'bold', marginLeft: 4 },
  categoryBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 8 },
  categoryText: { fontSize: 13, fontWeight: '700' },
  statusDesc: { fontSize: 14, color: '#7A6E65', lineHeight: 20 },
  alertBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEE2E2', padding: 10, borderRadius: 8, marginTop: 10 },
  alertText: { flex: 1, fontSize: 12, color: '#991B1B', marginLeft: 8 },

  currentInfoCard: { backgroundColor: '#FDF8F2', marginHorizontal: 12, marginBottom: 12, borderRadius: 16, padding: 16, shadowColor: '#C4956A', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  currentInfoTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, color: '#1A1A2E' },
  currentInfoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, gap: 8 },
  statChip: { flex: 1, alignItems: 'center', backgroundColor: '#FDF8F2', borderRadius: 12, borderWidth: 1, borderColor: '#EDE0D4', padding: 12 },
  statChipLabel: { fontSize: 12, color: '#7A6E65', marginBottom: 4 },
  statChipValue: { fontSize: 18, fontWeight: 'bold', color: '#1A1A2E' },
  bmiRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12, backgroundColor: '#D1FAE5', padding: 8, borderRadius: 8 },
  bmiLabel: { fontSize: 14, fontWeight: '600', color: '#065F46' },
  bmiValue: { fontSize: 18, fontWeight: 'bold', color: '#065F46', marginLeft: 8 },
  idealRangeBox: { backgroundColor: '#F7F1EB', borderRadius: 8, padding: 12, marginTop: 4 },
  idealRangeTitle: { fontSize: 13, fontWeight: '600', color: '#7A6E65', marginBottom: 8 },
  idealRangeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  idealRangeItem: { alignItems: 'center', flex: 1 },
  idealMedian: { borderWidth: 1, borderColor: '#E8602C', borderRadius: 8, padding: 6 },
  idealRangeLabel: { fontSize: 11, color: '#7A6E65', marginBottom: 2 },
  idealRangeValue: { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },

  underlineToggle: { flexDirection: 'row', marginHorizontal: 12, marginBottom: 12, gap: 0 },
  underlineBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  underlineBtnActive: { borderBottomColor: '#E8602C' },
  underlineBtnText: { fontSize: 13, fontWeight: '600', color: '#7A6E65' },
  underlineBtnTextActive: { color: '#E8602C' },

  chartWrapper: { backgroundColor: '#FDF8F2', marginHorizontal: 12, borderRadius: 16, padding: 8, shadowColor: '#C4956A', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2, marginBottom: 12 },
  chartTitle: { fontSize: 14, fontWeight: '600', color: '#7A6E65', marginBottom: 10, textAlign: 'center' },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, color: '#7A6E65' },

  addBtn: { backgroundColor: '#E8602C', marginHorizontal: 12, padding: 14, borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', elevation: 3, marginBottom: 12 },
  addBtnLocked: { backgroundColor: '#F5A623', marginHorizontal: 12, padding: 14, borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', elevation: 3, marginBottom: 12 },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FDF8F2', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 4, textAlign: 'center', color: '#1A1A2E' },
  modalDateLabel: { fontSize: 13, color: '#7A6E65', marginBottom: 4, textAlign: 'center' },
  dateDisplay: { alignItems: 'center', backgroundColor: '#FDF8F2', borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#EDE0D4' },
  dateValue: { fontSize: 20, fontWeight: 'bold', color: '#E8602C' },
  pickerRow: { flexDirection: 'row', height: 180, marginBottom: 16 },
  pickerCol: { flex: 1 },
  pickerLabel: { fontSize: 12, color: '#7A6E65', textAlign: 'center', marginBottom: 4, fontWeight: '600' },
  input: { borderWidth: 1.5, borderColor: '#EDE0D4', borderRadius: 12, padding: 12, marginBottom: 16, fontSize: 16, color: '#1A1A2E', backgroundColor: '#FDF8F2' },
  modalBtns: { flexDirection: 'row', justifyContent: 'space-between' },
  cancelBtn: { flex: 1, padding: 14, marginRight: 10, borderRadius: 28, alignItems: 'center', backgroundColor: '#F7F1EB' },
  cancelBtnText: { color: '#7A6E65', fontWeight: 'bold' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 28, alignItems: 'center', backgroundColor: '#E8602C' },
  saveBtnText: { color: '#fff', fontWeight: 'bold' },

  lastRecordedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#EDE0D4' },
  lastRecordedText: { fontSize: 12, color: '#7A6E65', marginLeft: 4 },

  recordsCard: { backgroundColor: '#FDF8F2', marginHorizontal: 12, marginBottom: 12, borderRadius: 16, padding: 16, shadowColor: '#C4956A', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  recordsTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A2E', marginBottom: 12 },
  recordRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  recordRowBorder: { borderTopWidth: 1, borderTopColor: '#EDE0D4' },
  recordDateText: { fontSize: 14, fontWeight: '600', color: '#E8602C' },
  recordValue: { fontSize: 15, fontWeight: '600', color: '#1A1A2E' },

  predictorContainer: { paddingHorizontal: 12, paddingTop: 8 },
  predictorCard: { backgroundColor: '#FDF8F2', borderRadius: 16, padding: 20, shadowColor: '#C4956A', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2, marginBottom: 12 },
  predictorTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A2E', textAlign: 'center', marginBottom: 8 },
  predictorSubtitle: { fontSize: 13, color: '#7A6E65', textAlign: 'center', marginBottom: 20, lineHeight: 18 },
  predictorInputRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  predictorInputGroup: { flex: 1 },
  predictorLabel: { fontSize: 13, color: '#7A6E65', marginBottom: 6 },
  predictorInput: { borderWidth: 1.5, borderColor: '#EDE0D4', borderRadius: 12, padding: 12, fontSize: 16, backgroundColor: '#FDF8F2', color: '#1A1A2E' },
  predictorBtn: { backgroundColor: '#E8602C', borderRadius: 28, padding: 14, alignItems: 'center', marginTop: 4 },
  predictorBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  predictionResult: { backgroundColor: '#D1FAE5', borderRadius: 12, padding: 16, marginTop: 16, alignItems: 'center' },
  predictionLabel: { fontSize: 14, color: '#065F46', marginBottom: 4 },
  predictionValue: { fontSize: 32, fontWeight: 'bold', color: '#065F46' },
  predictionRange: { fontSize: 13, color: '#065F46', marginTop: 4 },
  predictionNote: { fontSize: 12, color: '#7A6E65', marginTop: 8, textAlign: 'center', fontStyle: 'italic' },
  predictorInfoCard: { backgroundColor: '#FDF8F2', borderRadius: 16, padding: 20, marginBottom: 20, borderLeftWidth: 4, borderLeftColor: '#E8602C' },
  predictorInfoTitle: { fontSize: 16, fontWeight: '700', color: '#E8602C', marginBottom: 10 },
  predictorInfoText: { fontSize: 13, color: '#7A6E65', lineHeight: 20 },
});
