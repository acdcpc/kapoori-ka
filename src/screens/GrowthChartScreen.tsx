// src/screens/GrowthChartScreen.tsx
import React, { useContext, useEffect, useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator,
  Dimensions, Modal,
} from 'react-native';
import { ThemeContext } from '../context/ThemeContext';
import { Palette } from '../theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import {
  VictoryChart, VictoryLine, VictoryAxis, VictoryScatter,
  VictoryTheme, VictoryArea,
} from 'victory-native';
import { LanguageContext } from '../context/LanguageContext';
import { translations } from '../i18n/translations';
import { GrowthRecord } from '../types';
import { getAgeInMonths, classifyGrowthStatus, getIdealRanges } from '../utils/growthCalculations';
import { WHO_WFA_BOYS, WHO_WFA_GIRLS } from '../data/whoWFA';
import { WHO_HFA_BOYS, WHO_HFA_GIRLS } from '../data/whoHFA';
import { WHO_BFA_BOYS, WHO_BFA_GIRLS } from '../data/whoBFA';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import InfoBubble from '../components/InfoBubble';
import * as Speech from 'expo-speech';
import NepaliDate from 'nepali-date-converter';
import { FlatList } from 'react-native';
import { PremiumGuard } from '../components/PremiumGuard';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { CLINICAL_SAFETY_NOTICE, getGrowthTrendFlags } from '../lib/clinicalSafety';

type Props = NativeStackScreenProps<RootStackParamList, 'GrowthChart'>;

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 24;
const CHART_HEIGHT = 320;

function calculateBMI(weightKg: number, heightCm: number): number { const heightM = heightCm / 100; return weightKg / (heightM * heightM); }
function calculateMidParentalHeight(fatherHeight: number, motherHeight: number, childSex: 'male' | 'female'): number {
  return childSex === 'male' ? (fatherHeight + motherHeight + 13) / 2 : (fatherHeight + motherHeight - 13) / 2;
}

export default function GrowthChartScreen({ route, navigation }: Props) {
  const { palette: pal } = useContext(ThemeContext);
  const styles = makeStyles(pal);
  const { child } = route.params;
  const { language } = useContext(LanguageContext);
  const { subscription, user } = useAuth();
  const t = translations[language] || translations['en'];
  const isNe = language === 'ne';
  const isPremium = subscription?.status === 'active' || subscription?.plan === 'premium' || subscription?.plan === 'yearly' || subscription?.plan === 'monthly';

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
  const [firstWeight, setFirstWeight] = useState('');
  const [firstHeight, setFirstHeight] = useState('');
  const [firstSaving, setFirstSaving] = useState(false);

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
          <Text style={{ fontSize: 15, color: item.value === selected ? pal.clay : pal.muted, fontWeight: item.value === selected ? '700' : '400' }}>{item.label}</Text>
        </TouchableOpacity>
      )}
    />
  );

  const childAgeMonths = getAgeInMonths(child.dateOfBirth, todayAd);

  const loadRecords = async () => {
    try {
      if (!user?.uid) { setRecords([]); return; }
      if (!child?.id) {
        // No child id — should not happen (screen requires child param),
        // but guard against navigation edge cases.
        setRecords([]);
        setLoading(false);
        return;
      }
      const { data, error: sbError } = await supabase
        .from('growth_records')
        .select('*')
        .eq('child_id', child.id)
        .order('date', { ascending: true });
      if (sbError) throw sbError;
      const loaded: GrowthRecord[] = (data || []).map((d: any) => ({
        id: d.id,
        childId: d.child_id,
        ownerId: d.user_id,
        date: d.date,
        weight: d.weight,
        height: d.height,
        notes: d.notes,
        ageMonths: d.age_months,
        bsDate: d.bs_date,
      }));
      setRecords(loaded);
    } catch (e: any) {
      console.error('Load growth records error:', e?.message || e);
      Alert.alert('Error', isNe ? 'डेटा लोड भएन।' : 'Could not load growth records.');
    }
    finally { setLoading(false); }
  };

  useEffect(() => { loadRecords(); }, []);
  useEffect(() => {
    return () => { Speech.stop(); };
  }, []);

  const saveRecord = async () => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    if (!weight || isNaN(w) || w <= 0) return Alert.alert('Error', isNe ? 'सही तौल हाल्नुहोस्' : 'Please enter a valid weight');
    setSaving(true);
    try {
      
      const adDateObj = bsDate.getAD();
      const adDateStr = `${adDateObj.year}-${String(adDateObj.month + 1).padStart(2, '0')}-${String(adDateObj.date).padStart(2, '0')}`;
      const bsDateStr = bsDate.format('YYYY-MM-DD');
      const ageMonths = getAgeInMonths(child.dateOfBirth, adDateStr);
      const { error: sbError } = await supabase
        .from('growth_records')
        .insert({ child_id: child.id, user_id: user?.uid || '', date: adDateStr, bs_date: bsDateStr, weight: w, height: isNaN(h) ? 0 : h, age_months: ageMonths, notes: '', recorded_at: dayjs().toISOString() });
      if (sbError) throw sbError;
      setWeight(''); setHeight(''); setBsDate(new NepaliDate()); setShowForm(false); loadRecords();
    } catch { Alert.alert('Error', isNe ? 'बचत गर्न सकिएन।' : 'Could not save.'); }
    finally { setSaving(false); }
  };

  const saveFirstMeasurement = async () => {
    const w = parseFloat(firstWeight);
    if (!firstWeight || isNaN(w) || w <= 0) return Alert.alert('Error', isNe ? 'सही तौल हाल्नुहोस्' : 'Please enter a valid weight');
    setFirstSaving(true);
    try {
      
      const h = parseFloat(firstHeight);
      const today = dayjs().format('YYYY-MM-DD');
      const ageM = getAgeInMonths(child.dateOfBirth, today);
      const { error: sbError } = await supabase
        .from('growth_records')
        .insert({ child_id: child.id, user_id: user?.uid || '', date: today, weight: w, height: isNaN(h) ? 0 : h, age_months: ageM, notes: '', recorded_at: dayjs().toISOString() });
      if (sbError) throw sbError;
      setFirstWeight(''); setFirstHeight('');
      loadRecords();
    } catch { Alert.alert('Error', isNe ? 'बचत गर्न सकिएन।' : 'Could not save.'); }
    finally { setFirstSaving(false); }
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

  const displayAgeMonths = chartType === 'bmi' && latestBMIRecord ? latestBMIRecord.ageMonths : (latestRecord ? (latestRecord.ageMonths || getAgeInMonths(child.dateOfBirth, latestRecord.date)) : 0);
  const sharedRanges = getIdealRanges(displayAgeMonths, child.sex);
  const status = (chartType === 'bmi' && latestBMIRecord?.bmi)
    ? classifyGrowthStatus(latestRecord?.weight, latestRecord?.height, displayAgeMonths, child.sex, { metric: 'bmi', bmiValue: latestBMIRecord.bmi })
    : (latestRecord ? classifyGrowthStatus(latestRecord.weight, latestRecord.height, displayAgeMonths, child.sex) : null);
  const trendFlags = useMemo(() => getGrowthTrendFlags(records, isNe ? 'ne' : 'en'), [records, isNe]);

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

const STATUS_COLORS = { green: pal.green, yellow: pal.gold, red: pal.red, grey: pal.muted };
const STATUS_DESC: Record<string, { en: string; ne: string }> = {
  green: { en: 'Your child is growing well within WHO standards.', ne: 'बच्चा WHO मापदण्ड अनुसार राम्रोसँग बढिरहेको छ।' },
  yellow: { en: 'Growth needs attention. Monitor closely.', ne: 'वृद्धि ध्यान दिनुपर्ने। नजिकबाट निगरानी गर्नुहोस्।' },
  red: { en: 'Severe growth concern. Please see a doctor.', ne: 'गम्भीर चिन्ता। कृपया डाक्टर देखाउनुहोस्।' },
  grey: { en: 'Not enough data yet.', ne: 'पर्याप्त डेटा छैन।' },
};

  if (loading) return <ActivityIndicator size="large" color={pal.clay} style={{ flex: 1, backgroundColor: pal.bg }} />;

  if (records.length === 0) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={{paddingBottom: 40}}>
        <View style={styles.firstCard}>
          <Text style={styles.firstCardIcon}>📏</Text>
          <Text style={styles.firstCardTitle}>{isNe ? 'पहिलो नाप' : 'First Measurement'}</Text>
          <Text style={styles.firstCardSub}>{isNe ? 'तपाईंको बच्चाको पहिलो तौल र उचाइ रेकर्ड गर्नुहोस्' : "Record your child's first weight and height"}</Text>
          <Text style={styles.firstLabel}>{isNe ? 'तौल (केजी)' : 'Weight (kg)'}</Text>
          <TextInput style={styles.firstInput} placeholder={isNe ? 'जस्तै: ३.२' : 'e.g. 3.2'} keyboardType="numeric" value={firstWeight} onChangeText={setFirstWeight} autoFocus editable={!firstSaving} placeholderTextColor={pal.shadow} />
          <Text style={styles.firstLabel}>{isNe ? 'उचाइ (सेमी)' : 'Height (cm)'}</Text>
          <TextInput style={styles.firstInput} placeholder={isNe ? 'जस्तै: ५०' : 'e.g. 50'} keyboardType="numeric" value={firstHeight} onChangeText={setFirstHeight} editable={!firstSaving} placeholderTextColor={pal.shadow} />
          <TouchableOpacity style={[styles.firstSaveBtn, firstSaving && { opacity: 0.6 }]} onPress={saveFirstMeasurement} disabled={firstSaving}>
            {firstSaving ? <ActivityIndicator color={pal.onAccent} size="small" /> : <Text style={styles.firstSaveBtnText}>{isNe ? 'बचत गर्नुहोस्' : 'Save'}</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

    return (
    <ScrollView style={styles.container} contentContainerStyle={{paddingBottom: 40}}>
      {/* Tab Switcher — Pill style */}
      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.pillTab, activeTab === 'chart' && styles.pillTabActive]} onPress={() => setActiveTab('chart')}>
          <Ionicons name="analytics" size={16} color={activeTab === 'chart' ? pal.onAccent : pal.muted} />
          <Text style={[styles.pillTabText, activeTab === 'chart' && styles.pillTabTextActive]}>{isNe ? 'वृद्धि चार्ट' : 'Growth Chart'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.pillTab, activeTab === 'predictor' && styles.pillTabActive]} onPress={() => setActiveTab('predictor')}>
          <Ionicons name="trending-up" size={16} color={activeTab === 'predictor' ? pal.onAccent : pal.muted} />
          <Text style={[styles.pillTabText, activeTab === 'predictor' && styles.pillTabTextActive]}>{isNe ? 'भविष्य उचाइ' : 'Height Predictor'}</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'chart' ? (
        <>
          {/* Disclaimer */}
          <View style={styles.disclaimerBanner}>
            <Text style={styles.disclaimerText}>{isNe ? '⚠️ यो शैक्षिक सन्दर्भ मात्र हो। चिकित्सकीय सल्लाहको विकल्प होइन।' : '⚠️ For educational reference only. Not medical advice.'}</Text>
          </View>

          {trendFlags.map((flag) => (
            <View key={`${flag.level}-${flag.measuredAt}`} style={styles.trendNotice} accessibilityRole="alert">
              <Ionicons name="information-circle-outline" size={20} color={pal.subInk} />
              <View style={{ flex: 1 }}>
                <Text style={styles.trendNoticeTitle}>{flag.title}</Text>
                <Text style={styles.trendNoticeText}>{flag.message}</Text>
                <Text style={styles.trendNoticeFootnote}>{isNe ? CLINICAL_SAFETY_NOTICE.ne : CLINICAL_SAFETY_NOTICE.en}</Text>
              </View>
            </View>
          ))}

          {/* Growth Status Card */}
          {status && status.status !== 'grey' && (
            <View style={[styles.statusCard, { borderLeftColor: STATUS_COLORS[status.status] }]}>
              <View style={styles.statusHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <InfoBubble titleEn="What is WAZ?" titleNe="WAZ के हो?" bodyEn="Weight-for-Age Z-score compares your child's weight to WHO standards." bodyNe="यो उमेर अनुसारको तौल सूचकांक हो।" iconSize={14} iconColor={pal.muted} />
                  <Text style={styles.statusTitle}>{chartType === 'bmi' ? (isNe ? 'BMI स्थिति' : 'BMI Status') : (isNe ? 'वृद्धि स्थिति' : 'Growth Status')}: </Text>
                  <TouchableOpacity onPress={() => { Speech.speak(isNe ? STATUS_DESC[status.status].ne : STATUS_DESC[status.status].en); }}>
                    <Ionicons name="volume-high" size={16} color={pal.muted} />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.statusLabel, { color: STATUS_COLORS[status.status] }]}>{isNe ? status.labelNe : status.labelEn}</Text>
              </View>
              <Text style={styles.statusDesc}>{isNe ? STATUS_DESC[status.status].ne : STATUS_DESC[status.status].en}</Text>
              {status.status === 'red' && (
                <View style={styles.alertBox}>
                  <Ionicons name="warning" size={20} color={pal.red} />
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
                <Ionicons name="calendar-outline" size={14} color={pal.muted} />
                <Text style={styles.lastRecordedText}>{isNe ? 'अन्तिम: ' : 'Last: '}{(latestRecord as any).bsDate ? `${(latestRecord as any).bsDate}` : dayjs(latestRecord.date).format('YYYY-MM-DD')}</Text>
              </View>
            )}
            {latestBMIRecord && (
              <View style={styles.bmiRow}><Text style={styles.bmiLabel}>BMI:</Text><Text style={styles.bmiValue}>{latestBMIRecord.bmi.toFixed(1)}</Text></View>
            )}
            {sharedRanges && (
              <View style={styles.idealRangeBox}>
                <Text style={styles.idealRangeTitle}>{isNe ? 'WHO मापदण्ड' : 'WHO Standards'} ({displayAgeMonths}{isNe ? ' महिना' : 'mo'})</Text>
                <View style={styles.idealRangeRow}>
                  <View style={[styles.idealRangeItem]}><Text style={styles.idealRangeLabel}>{isNe ? 'न्यून' : 'Low'}</Text><Text style={styles.idealRangeValue}>{sharedRanges.weight.min}</Text></View>
                  <View style={[styles.idealRangeItem, styles.idealMedian]}><Text style={styles.idealRangeLabel}>{isNe ? 'सामान्य' : 'Normal'}</Text><Text style={styles.idealRangeValue}>{sharedRanges.weight.ideal}</Text></View>
                  <View style={styles.idealRangeItem}><Text style={styles.idealRangeLabel}>{isNe ? 'अधिक' : 'High'}</Text><Text style={styles.idealRangeValue}>{sharedRanges.weight.max}</Text></View>
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
              <VictoryArea data={sd3p} y0={(d: any) => sd3n.find(p => p.x === d.x)?.y || 0} style={{ data: { fill: pal.redLight, fillOpacity: 0.3 } }} />
              <VictoryArea data={sd2p} y0={(d: any) => sd2n.find(p => p.x === d.x)?.y || 0} style={{ data: { fill: pal.greenLight, fillOpacity: 0.4 } }} />
              <VictoryLine data={med} style={{ data: { stroke: pal.green, strokeWidth: 1.5, strokeDasharray: '4,4' } }} />
              <VictoryLine data={sd2n} style={{ data: { stroke: pal.gold, strokeWidth: 1, opacity: 0.6 } }} />
              <VictoryLine data={sd2p} style={{ data: { stroke: pal.gold, strokeWidth: 1, opacity: 0.6 } }} />
              <VictoryLine data={chartData} style={{ data: { stroke: pal.clay, strokeWidth: 3 } }} />
              <VictoryScatter data={chartData} size={4} style={{ data: { fill: pal.clay } }} />
            </VictoryChart>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}><View style={[styles.legendDot, {backgroundColor: pal.clay}]} /><Text style={styles.legendText}>{isNe ? 'तपाईंको बच्चा' : 'Your Child'}</Text></View>
              <View style={styles.legendItem}><View style={[styles.legendDot, {backgroundColor: pal.green}]} /><Text style={styles.legendText}>WHO Median</Text></View>
              <View style={styles.legendItem}><View style={[styles.legendDot, {backgroundColor: pal.gold}]} /><Text style={styles.legendText}>±2 SD</Text></View>
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
              <Ionicons name="add-circle" size={24} color={pal.onAccent} />
              <Text style={styles.addBtnText}>{isNe ? 'नयाँ मापन थप्नुहोस्' : 'Add New Measurement'}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.addBtnLocked}>
              <Ionicons name="lock-closed" size={20} color={pal.clay} />
              <Text style={styles.addBtnLockedText}>{isNe ? 'प्रिमियम सुविधा — बृद्धि निदान र WHO प्रतिशत चार्टहरू' : 'Premium Feature — Growth diagnostics & WHO percentile charts'}</Text>
            </View>
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
                <TextInput style={styles.input} placeholder={isNe ? 'तौल (केजी)' : 'Weight (kg)'} keyboardType="numeric" value={weight} onChangeText={setWeight} placeholderTextColor={pal.shadow} />
                <TextInput style={styles.input} placeholder={isNe ? 'उचाइ (सेमी)' : 'Height (cm) - optional'} keyboardType="numeric" value={height} onChangeText={setHeight} placeholderTextColor={pal.shadow} />
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
        <PremiumGuard feature="growth_report">
          <View style={styles.predictorContainer}>
            <View style={styles.predictorCard}>
              <Ionicons name="trending-up" size={40} color={pal.clay} style={{ alignSelf: 'center', marginBottom: 12 }} />
              <Text style={styles.predictorTitle}>{isNe ? 'बच्चाको सम्भावित वयस्क उचाइ' : "Predict Your Child's Adult Height"}</Text>
              <Text style={styles.predictorSubtitle}>{isNe ? 'आमाबुबाको उचाइबाट अनुमान' : 'Estimate based on parent heights'}</Text>
              <View style={styles.predictorInputRow}>
                <View style={styles.predictorInputGroup}><Text style={styles.predictorLabel}>{isNe ? 'बुबाको उचाइ (सेमी)' : "Father (cm)"}</Text><TextInput style={styles.predictorInput} keyboardType="numeric" value={fatherHeight} onChangeText={setFatherHeight} placeholder="170" placeholderTextColor={pal.shadow} /></View>
                <View style={styles.predictorInputGroup}><Text style={styles.predictorLabel}>{isNe ? 'आमाको उचाइ (सेमी)' : "Mother (cm)"}</Text><TextInput style={styles.predictorInput} keyboardType="numeric" value={motherHeight} onChangeText={setMotherHeight} placeholder="155" placeholderTextColor={pal.shadow} /></View>
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

const makeStyles = (pal: Palette) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: pal.surface },
  container: { flex: 1, backgroundColor: pal.bg },
  tabContainer: { flexDirection: 'row', marginHorizontal: 12, marginTop: 12, marginBottom: 8, borderRadius: 24, borderWidth: 1, borderColor: pal.border, backgroundColor: pal.surface, padding: 4 },
  pillTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 22, gap: 6 },
  pillTabActive: { backgroundColor: pal.clay },
  pillTabText: { fontSize: 13, fontWeight: '600', color: pal.muted },
  pillTabTextActive: { color: pal.onAccent },

  disclaimerBanner: { backgroundColor: pal.amberLight, padding: 10, marginHorizontal: 12, marginBottom: 8, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: pal.gold },
  disclaimerText: { fontSize: 12, color: pal.amberDark, lineHeight: 18 },
  trendNotice: { flexDirection: 'row', gap: 9, backgroundColor: pal.amberLight, padding: 12, marginHorizontal: 12, marginBottom: 10, borderRadius: 10, borderLeftWidth: 4, borderLeftColor: pal.amberDark },
  trendNoticeTitle: { color: pal.amberDark, fontWeight: '800', fontSize: 14, marginBottom: 3 },
  trendNoticeText: { color: pal.muted2, fontSize: 12, lineHeight: 18 },
  trendNoticeFootnote: { color: pal.muted2, fontSize: 11, lineHeight: 16, marginTop: 6 },

  statusCard: { backgroundColor: pal.surface, marginHorizontal: 12, marginBottom: 12, borderRadius: 16, padding: 16, borderLeftWidth: 5, shadowColor: pal.shadow, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  statusHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' },
  statusTitle: { fontSize: 16, fontWeight: '600', color: pal.text },
  statusLabel: { fontSize: 16, fontWeight: 'bold', marginLeft: 4 },
  categoryBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 8 },
  categoryText: { fontSize: 13, fontWeight: '700' },
  statusDesc: { fontSize: 14, color: pal.muted, lineHeight: 20 },
  alertBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: pal.redLight, padding: 10, borderRadius: 8, marginTop: 10 },
  alertText: { flex: 1, fontSize: 12, color: pal.redDark, marginLeft: 8 },

  currentInfoCard: { backgroundColor: pal.surface, marginHorizontal: 12, marginBottom: 12, borderRadius: 16, padding: 16, shadowColor: pal.shadow, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  currentInfoTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, color: pal.text },
  currentInfoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, gap: 8 },
  statChip: { flex: 1, alignItems: 'center', backgroundColor: pal.surface, borderRadius: 12, borderWidth: 1, borderColor: pal.border, padding: 12 },
  statChipLabel: { fontSize: 12, color: pal.muted, marginBottom: 4 },
  statChipValue: { fontSize: 18, fontWeight: 'bold', color: pal.text },
  bmiRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12, backgroundColor: pal.greenLight, padding: 8, borderRadius: 8 },
  bmiLabel: { fontSize: 14, fontWeight: '600', color: pal.greenDark },
  bmiValue: { fontSize: 18, fontWeight: 'bold', color: pal.greenDark, marginLeft: 8 },
  idealRangeBox: { backgroundColor: pal.bg, borderRadius: 8, padding: 12, marginTop: 4 },
  idealRangeTitle: { fontSize: 13, fontWeight: '600', color: pal.muted, marginBottom: 8 },
  idealRangeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  idealRangeItem: { alignItems: 'center', flex: 1 },
  idealMedian: { borderWidth: 1, borderColor: pal.clay, borderRadius: 8, padding: 6 },
  idealRangeLabel: { fontSize: 11, color: pal.muted, marginBottom: 2 },
  idealRangeValue: { fontSize: 14, fontWeight: '700', color: pal.text },

  underlineToggle: { flexDirection: 'row', marginHorizontal: 12, marginBottom: 12, gap: 0 },
  underlineBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  underlineBtnActive: { borderBottomColor: pal.clay },
  underlineBtnText: { fontSize: 13, fontWeight: '600', color: pal.muted },
  underlineBtnTextActive: { color: pal.clay },

  chartWrapper: { backgroundColor: pal.surface, marginHorizontal: 12, borderRadius: 16, padding: 8, shadowColor: pal.shadow, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2, marginBottom: 12 },
  chartTitle: { fontSize: 14, fontWeight: '600', color: pal.muted, marginBottom: 10, textAlign: 'center' },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, color: pal.muted },

  addBtn: { backgroundColor: pal.clay, marginHorizontal: 12, padding: 14, borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', elevation: 3, marginBottom: 12 },
  addBtnLocked: { backgroundColor: pal.surfaceWarm, marginHorizontal: 12, padding: 14, borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: pal.clay, marginBottom: 12 },
  addBtnText: { color: pal.onAccent, fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  addBtnLockedText: { color: pal.clay, fontSize: 13, fontWeight: '600', marginLeft: 8, flex: 1 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: pal.surface, borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 4, textAlign: 'center', color: pal.text },
  modalDateLabel: { fontSize: 13, color: pal.muted, marginBottom: 4, textAlign: 'center' },
  dateDisplay: { alignItems: 'center', backgroundColor: pal.surface, borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: pal.border },
  dateValue: { fontSize: 20, fontWeight: 'bold', color: pal.clay },
  pickerRow: { flexDirection: 'row', height: 180, marginBottom: 16 },
  pickerCol: { flex: 1 },
  pickerLabel: { fontSize: 12, color: pal.muted, textAlign: 'center', marginBottom: 4, fontWeight: '600' },
  input: { borderWidth: 1.5, borderColor: pal.border, borderRadius: 12, padding: 12, marginBottom: 16, fontSize: 16, color: pal.text, backgroundColor: pal.surface },
  modalBtns: { flexDirection: 'row', justifyContent: 'space-between' },
  cancelBtn: { flex: 1, padding: 14, marginRight: 10, borderRadius: 28, alignItems: 'center', backgroundColor: pal.bg },
  cancelBtnText: { color: pal.muted, fontWeight: 'bold' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 28, alignItems: 'center', backgroundColor: pal.clay },
  saveBtnText: { color: pal.onAccent, fontWeight: 'bold' },

  lastRecordedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: pal.border },
  lastRecordedText: { fontSize: 12, color: pal.muted, marginLeft: 4 },

  recordsCard: { backgroundColor: pal.surface, marginHorizontal: 12, marginBottom: 12, borderRadius: 16, padding: 16, shadowColor: pal.shadow, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  recordsTitle: { fontSize: 14, fontWeight: '700', color: pal.text, marginBottom: 12 },
  recordRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  recordRowBorder: { borderTopWidth: 1, borderTopColor: pal.border },
  recordDateText: { fontSize: 14, fontWeight: '600', color: pal.clay },
  recordValue: { fontSize: 15, fontWeight: '600', color: pal.text },

  predictorContainer: { paddingHorizontal: 12, paddingTop: 8 },
  predictorCard: { backgroundColor: pal.surface, borderRadius: 16, padding: 20, shadowColor: pal.shadow, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2, marginBottom: 12 },
  predictorTitle: { fontSize: 18, fontWeight: 'bold', color: pal.text, textAlign: 'center', marginBottom: 8 },
  predictorSubtitle: { fontSize: 13, color: pal.muted, textAlign: 'center', marginBottom: 20, lineHeight: 18 },
  predictorInputRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  predictorInputGroup: { flex: 1 },
  predictorLabel: { fontSize: 13, color: pal.muted, marginBottom: 6 },
  predictorInput: { borderWidth: 1.5, borderColor: pal.border, borderRadius: 12, padding: 12, fontSize: 16, backgroundColor: pal.surface, color: pal.text },
  predictorBtn: { backgroundColor: pal.clay, borderRadius: 28, padding: 14, alignItems: 'center', marginTop: 4 },
  predictorBtnText: { color: pal.onAccent, fontSize: 16, fontWeight: '700' },
  predictionResult: { backgroundColor: pal.greenLight, borderRadius: 12, padding: 16, marginTop: 16, alignItems: 'center' },
  predictionLabel: { fontSize: 14, color: pal.greenDark, marginBottom: 4 },
  predictionValue: { fontSize: 32, fontWeight: 'bold', color: pal.greenDark },
  predictionRange: { fontSize: 13, color: pal.greenDark, marginTop: 4 },
  predictionNote: { fontSize: 12, color: pal.muted, marginTop: 8, textAlign: 'center', fontStyle: 'italic' },
  predictorInfoCard: { backgroundColor: pal.surface, borderRadius: 16, padding: 20, marginBottom: 20, borderLeftWidth: 4, borderLeftColor: pal.clay },
  predictorInfoTitle: { fontSize: 16, fontWeight: '700', color: pal.clay, marginBottom: 10 },
  // First Measurement Card
  firstCard: { backgroundColor: pal.surface, marginHorizontal: 12, marginTop: 24, borderRadius: 20, padding: 24, alignItems: 'center', shadowColor: pal.shadow, shadowOpacity: 0.1, shadowRadius: 10, elevation: 3 },
  firstCardIcon: { fontSize: 48, marginBottom: 12 },
  firstCardTitle: { fontSize: 22, fontWeight: '800', color: pal.text, marginBottom: 6 },
  firstCardSub: { fontSize: 14, color: pal.muted, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  firstLabel: { fontSize: 13, fontWeight: '600', color: pal.muted, alignSelf: 'flex-start', marginBottom: 6 },
  firstInput: { width: '100%', borderWidth: 1.5, borderColor: pal.border, borderRadius: 12, paddingHorizontal: 14, padding: 13, fontSize: 18, color: pal.text, marginBottom: 14, backgroundColor: pal.surface },
  firstSaveBtn: { backgroundColor: pal.clay, borderRadius: 28, paddingVertical: 14, width: '100%', alignItems: 'center', marginTop: 8 },
  firstSaveBtnText: { color: pal.onAccent, fontSize: 16, fontWeight: '700' },
  predictorInfoText: { fontSize: 13, color: pal.muted, lineHeight: 20 },
});
