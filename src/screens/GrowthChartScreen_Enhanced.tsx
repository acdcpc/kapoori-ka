// src/screens/GrowthChartScreen.tsx - Enhanced with Height-for-Age and Mid-Parental Height
import React, { useContext, useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Modal, Dimensions,
} from 'react-native';
import { collection, getDocs, addDoc, query, where, doc, setDoc } from 'firebase/firestore';
import dayjs from 'dayjs';
import { db, auth } from '../../firebase';
import { LanguageContext } from '../context/LanguageContext';
import { RootStackParamList } from '../navigation/types';
import { translations } from '../i18n/translations';
import { Child, GrowthRecord } from '../types';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { getAgeInMonths, formatAge } from '../utils/growthCalculations';
import { PremiumGuard } from '../components/PremiumGuard';

type Props = NativeStackScreenProps<RootStackParamList, 'GrowthChart'>;

// WHO Growth Standards - Height-for-Age (cm) - Boys 0-60 months
const WHO_HFA_BOYS = {
  0: { p3: 45.4, p15: 46.9, p50: 49.9, p85: 53.0, p97: 54.5 },
  1: { p3: 48.8, p15: 50.4, p50: 53.7, p85: 57.0, p97: 58.6 },
  2: { p3: 51.8, p15: 53.5, p50: 56.9, p85: 60.3, p97: 62.0 },
  3: { p3: 54.2, p15: 56.0, p50: 59.6, p85: 63.2, p97: 64.9 },
  6: { p3: 59.9, p15: 61.9, p50: 65.9, p85: 70.0, p97: 71.9 },
  9: { p3: 64.8, p15: 67.0, p50: 71.3, p85: 75.8, p97: 77.9 },
  12: { p3: 69.0, p15: 71.3, p50: 75.9, p85: 80.7, p97: 83.0 },
  18: { p3: 75.1, p15: 77.6, p50: 82.5, p85: 87.6, p97: 90.1 },
  24: { p3: 80.0, p15: 82.6, p50: 87.6, p85: 92.9, p97: 95.5 },
  30: { p3: 84.2, p15: 86.9, p50: 92.1, p85: 97.6, p97: 100.4 },
  36: { p3: 87.9, p15: 90.7, p50: 96.1, p85: 101.7, p97: 104.6 },
  42: { p3: 91.3, p15: 94.1, p50: 99.7, p85: 105.5, p97: 108.5 },
  48: { p3: 94.4, p15: 97.2, p50: 102.9, p85: 108.9, p97: 112.0 },
  54: { p3: 97.2, p15: 100.1, p50: 105.8, p85: 111.9, p97: 115.1 },
  60: { p3: 99.8, p15: 102.8, p50: 108.6, p85: 114.8, p97: 118.1 },
};

// WHO Growth Standards - Height-for-Age (cm) - Girls 0-60 months
const WHO_HFA_GIRLS = {
  0: { p3: 44.2, p15: 45.6, p50: 48.4, p85: 51.3, p97: 52.8 },
  1: { p3: 47.4, p15: 48.9, p50: 51.9, p85: 55.0, p97: 56.5 },
  2: { p3: 50.2, p15: 51.8, p50: 55.0, p85: 58.3, p97: 59.9 },
  3: { p3: 52.4, p15: 54.0, p50: 57.3, p85: 60.8, p97: 62.4 },
  6: { p3: 57.9, p15: 59.9, p50: 63.7, p85: 67.6, p97: 69.5 },
  9: { p3: 62.4, p15: 64.5, p50: 68.5, p85: 72.8, p97: 74.9 },
  12: { p3: 66.3, p15: 68.5, p50: 72.8, p85: 77.4, p97: 79.6 },
  18: { p3: 71.9, p15: 74.3, p50: 79.0, p85: 83.9, p97: 86.3 },
  24: { p3: 76.3, p15: 78.8, p50: 83.6, p85: 88.8, p97: 91.3 },
  30: { p3: 80.1, p15: 82.7, p50: 87.7, p85: 93.1, p97: 95.7 },
  36: { p3: 83.4, p15: 86.1, p50: 91.3, p85: 96.9, p97: 99.6 },
  42: { p3: 86.4, p15: 89.2, p50: 94.6, p85: 100.4, p97: 103.2 },
  48: { p3: 89.1, p15: 92.0, p50: 97.5, p85: 103.4, p97: 106.3 },
  54: { p3: 91.6, p15: 94.6, p50: 100.1, p85: 106.2, p97: 109.2 },
  60: { p3: 94.0, p15: 97.0, p50: 102.5, p85: 108.7, p97: 111.8 },
};

export default function GrowthChartScreen({ route, navigation }: Props) {
  const { child } = route.params;
  const { language } = useContext(LanguageContext);
  const t = translations[language];
  const isNe = language === 'ne';

  const [records, setRecords] = useState<GrowthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMidParentalModal, setShowMidParentalModal] = useState(false);
  const [fatherHeight, setFatherHeight] = useState('');
  const [motherHeight, setMotherHeight] = useState('');
  const [midParentalHeight, setMidParentalHeight] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'weight' | 'height' | 'midparental'>('weight');

  const ageMonths = getAgeInMonths(child.dateOfBirth, dayjs().format('YYYY-MM-DD'));
  const childSex = child.sex;
  const whoHFA = childSex === 'male' ? WHO_HFA_BOYS : WHO_HFA_GIRLS;

  // Get closest WHO standards for current age
  const getWHOStandards = (months: number) => {
    const ageKeys = Object.keys(whoHFA).map(Number).sort((a, b) => a - b);
    for (let i = 0; i < ageKeys.length; i++) {
      if (months <= ageKeys[i]) {
        return whoHFA[ageKeys[i] as keyof typeof whoHFA];
      }
    }
    return whoHFA[60];
  };

  const currentWHOStandards = getWHOStandards(ageMonths);

  const calculateMidParentalHeight = () => {
    const fh = parseFloat(fatherHeight);
    const mh = parseFloat(motherHeight);
    if (isNaN(fh) || isNaN(mh) || fh <= 0 || mh <= 0) {
      Alert.alert('Error', 'Please enter valid heights');
      return;
    }
    let mph = (fh + mh) / 2;
    if (childSex === 'male') {
      mph += 6.5; // Boys are typically 6.5cm taller
    } else {
      mph -= 6.5; // Girls are typically 6.5cm shorter
    }
    setMidParentalHeight(Math.round(mph * 10) / 10);
  };

  const loadRecords = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) return;
      const q = query(
        collection(db, 'growth_records'),
        where('childId', '==', child.id),
        where('ownerId', '==', user.uid)
      );
      const snapshot = await getDocs(q);
      const loaded: GrowthRecord[] = [];
      snapshot.forEach(d => loaded.push({ id: d.id, ...d.data() } as GrowthRecord));
      setRecords(loaded.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    } catch (error) {
      console.error('Load records error:', error);
      Alert.alert('Error', 'Could not load growth records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const getHeightPercentile = (heightCm: number) => {
    if (heightCm <= currentWHOStandards.p3) return '< 3rd';
    if (heightCm <= currentWHOStandards.p15) return '3-15th';
    if (heightCm <= currentWHOStandards.p50) return '15-50th';
    if (heightCm <= currentWHOStandards.p85) return '50-85th';
    if (heightCm <= currentWHOStandards.p97) return '85-97th';
    return '> 97th';
  };

  const latestHeight = records.length > 0 ? records[records.length - 1].height : null;
  const heightPercentile = latestHeight ? getHeightPercentile(latestHeight) : null;

  if (loading) return <ActivityIndicator size="large" color="#1a73e8" style={{ flex: 1 }} />;

  return (
    <PremiumGuard>
      <View style={styles.container}>
        {/* Tab Bar */}
        <View style={styles.tabBar}>
          {[
            { key: 'weight', label: isNe ? 'तौल' : 'Weight' },
            { key: 'height', label: isNe ? 'उचाइ' : 'Height' },
            { key: 'midparental', label: isNe ? 'अभिभावक उचाइ' : 'Mid-Parental' },
          ].map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.activeTab]}
              onPress={() => setActiveTab(tab.key as any)}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
          {activeTab === 'weight' && (
            <View>
              <View style={styles.infoCard}>
                <Text style={styles.cardTitle}>{isNe ? 'वर्तमान तौल' : 'Current Weight'}</Text>
                {records.length > 0 ? (
                  <>
                    <Text style={styles.largeValue}>{records[records.length - 1].weight} kg</Text>
                    <Text style={styles.smallText}>
                      {isNe ? 'अन्तिम अपडेट:' : 'Last updated:'} {dayjs(records[records.length - 1].date).format('DD MMM YYYY')}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.placeholderText}>{isNe ? 'कुनै रेकर्ड छैन' : 'No records'}</Text>
                )}
              </View>
              <View style={styles.chartPlaceholder}>
                <Ionicons name="bar-chart" size={40} color="#ccc" />
                <Text style={styles.chartPlaceholderText}>
                  {isNe ? 'तौल चार्ट (आउँदो संस्करणमा)' : 'Weight Chart (Coming Soon)'}
                </Text>
              </View>
            </View>
          )}

          {activeTab === 'height' && (
            <View>
              <View style={styles.infoCard}>
                <Text style={styles.cardTitle}>{isNe ? 'वर्तमान उचाइ' : 'Current Height'}</Text>
                {latestHeight ? (
                  <>
                    <Text style={styles.largeValue}>{latestHeight} cm</Text>
                    <View style={styles.percentileRow}>
                      <Text style={styles.percentileLabel}>{isNe ? 'प्रतिशत:' : 'Percentile:'}</Text>
                      <Text style={styles.percentileValue}>{heightPercentile}</Text>
                    </View>
                    <View style={styles.whoStandardsBox}>
                      <Text style={styles.whoLabel}>{isNe ? 'WHO मानक' : 'WHO Standards'} ({ageMonths} {isNe ? 'महिना' : 'months'}):</Text>
                      <View style={styles.standardsGrid}>
                        <View style={styles.standardItem}>
                          <Text style={styles.standardLabel}>P3</Text>
                          <Text style={styles.standardValue}>{currentWHOStandards.p3} cm</Text>
                        </View>
                        <View style={styles.standardItem}>
                          <Text style={styles.standardLabel}>P50</Text>
                          <Text style={styles.standardValue}>{currentWHOStandards.p50} cm</Text>
                        </View>
                        <View style={styles.standardItem}>
                          <Text style={styles.standardLabel}>P97</Text>
                          <Text style={styles.standardValue}>{currentWHOStandards.p97} cm</Text>
                        </View>
                      </View>
                    </View>
                  </>
                ) : (
                  <Text style={styles.placeholderText}>{isNe ? 'कुनै रेकर्ड छैन' : 'No records'}</Text>
                )}
              </View>
            </View>
          )}

          {activeTab === 'midparental' && (
            <View>
              <View style={styles.infoCard}>
                <Text style={styles.cardTitle}>{isNe ? 'अभिभावक उचाइ कैलकुलेटर' : 'Mid-Parental Height Calculator'}</Text>
                <Text style={styles.description}>
                  {isNe
                    ? 'आपके बच्चे की संभावित वयस्क ऊंचाई का अनुमान लगाएं'
                    : 'Estimate your child\'s expected adult height based on parental heights'}
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{isNe ? 'पिता की उचाइ (सेमी)' : 'Father\'s Height (cm)'}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="180"
                    keyboardType="decimal-pad"
                    value={fatherHeight}
                    onChangeText={setFatherHeight}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{isNe ? 'माता की उचाइ (सेमी)' : 'Mother\'s Height (cm)'}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="165"
                    keyboardType="decimal-pad"
                    value={motherHeight}
                    onChangeText={setMotherHeight}
                  />
                </View>

                <TouchableOpacity style={styles.calculateBtn} onPress={calculateMidParentalHeight}>
                  <Text style={styles.calculateBtnText}>{isNe ? 'गणना करें' : 'Calculate'}</Text>
                </TouchableOpacity>

                {midParentalHeight !== null && (
                  <View style={styles.resultBox}>
                    <Text style={styles.resultLabel}>{isNe ? 'अपेक्षित वयस्क उचाइ:' : 'Expected Adult Height:'}</Text>
                    <Text style={styles.resultValue}>{midParentalHeight} cm</Text>
                    <Text style={styles.resultNote}>
                      {isNe
                        ? '(यह एक अनुमान है। वास्तविक ऊंचाई आनुवंशिकी और पोषण पर निर्भर करती है)'
                        : '(This is an estimate. Actual height depends on genetics and nutrition)'}
                    </Text>
                  </View>
                )}

                <View style={styles.infoBox}>
                  <Ionicons name="information-circle" size={16} color="#1a73e8" />
                  <Text style={styles.infoText}>
                    {isNe
                      ? 'अच्छा पोषण और स्वास्थ्य सेवा बच्चे को उनकी आनुवंशिक संभावना तक पहुंचने में मदद करती है।'
                      : 'Good nutrition and healthcare help children reach their genetic potential.'}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Recent Records */}
          {records.length > 0 && (
            <View style={styles.recordsSection}>
              <Text style={styles.sectionTitle}>{isNe ? 'हाल का रेकर्ड' : 'Recent Records'}</Text>
              {records.slice(-5).reverse().map((record, i) => (
                <View key={i} style={styles.recordCard}>
                  <View style={styles.recordDate}>
                    <Text style={styles.recordDateText}>{dayjs(record.date).format('DD MMM')}</Text>
                  </View>
                  <View style={styles.recordData}>
                    <Text style={styles.recordValue}>{record.weight} kg</Text>
                    {record.height && <Text style={styles.recordValue}>{record.height} cm</Text>}
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </PremiumGuard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ddd', paddingHorizontal: 8 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#1a73e8' },
  tabText: { fontSize: 12, fontWeight: '600', color: '#666' },
  activeTabText: { color: '#1a73e8' },
  content: { flex: 1, padding: 12 },
  infoCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 12 },
  largeValue: { fontSize: 32, fontWeight: '700', color: '#1a73e8', marginBottom: 8 },
  smallText: { fontSize: 12, color: '#888' },
  placeholderText: { fontSize: 14, color: '#aaa', fontStyle: 'italic' },
  percentileRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8 },
  percentileLabel: { fontSize: 13, fontWeight: '600', color: '#666' },
  percentileValue: { fontSize: 14, fontWeight: '700', color: '#4CAF50' },
  whoStandardsBox: { backgroundColor: '#E8F0FE', padding: 12, borderRadius: 8, marginTop: 12 },
  whoLabel: { fontSize: 12, fontWeight: '600', color: '#1a73e8', marginBottom: 8 },
  standardsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  standardItem: { alignItems: 'center' },
  standardLabel: { fontSize: 11, fontWeight: '600', color: '#666' },
  standardValue: { fontSize: 13, fontWeight: '700', color: '#1a73e8', marginTop: 4 },
  description: { fontSize: 13, color: '#666', marginBottom: 16, lineHeight: 18 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#333', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  calculateBtn: { backgroundColor: '#1a73e8', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginBottom: 16 },
  calculateBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  resultBox: { backgroundColor: '#E8F5E9', padding: 12, borderRadius: 8, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#4CAF50' },
  resultLabel: { fontSize: 12, fontWeight: '600', color: '#2E7D32' },
  resultValue: { fontSize: 24, fontWeight: '700', color: '#4CAF50', marginTop: 4, marginBottom: 8 },
  resultNote: { fontSize: 11, color: '#558B2F', fontStyle: 'italic' },
  infoBox: { flexDirection: 'row', backgroundColor: '#E8F0FE', padding: 12, borderRadius: 8, gap: 8 },
  infoText: { flex: 1, fontSize: 12, color: '#1a73e8', lineHeight: 16 },
  chartPlaceholder: { backgroundColor: '#fff', borderRadius: 12, padding: 40, alignItems: 'center', justifyContent: 'center', elevation: 1 },
  chartPlaceholderText: { fontSize: 14, color: '#aaa', marginTop: 12 },
  recordsSection: { marginTop: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#333', marginBottom: 12 },
  recordCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 8, elevation: 1 },
  recordDate: { backgroundColor: '#E8F0FE', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, justifyContent: 'center' },
  recordDateText: { fontSize: 12, fontWeight: '600', color: '#1a73e8' },
  recordData: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  recordValue: { fontSize: 13, fontWeight: '600', color: '#333' },
});
