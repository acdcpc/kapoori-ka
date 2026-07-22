// src/screens/MilestoneScreen.tsx
import React, { useContext, useEffect, useState, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, ScrollView, StatusBar,
  Modal
} from 'react-native';
import { collection, getDocs, addDoc, query, where, doc, setDoc } from 'firebase/firestore';
import dayjs from 'dayjs';
import { db } from '../../firebase';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LanguageContext } from '../context/LanguageContext';
import { RootStackParamList } from '../navigation/types';
import { translations } from '../i18n/translations';
import { Milestone, MilestoneRecord } from '../types';
import { getMilestonesForAge, AGE_BANDS, MILESTONES } from '../data/milestones';
import { getAgeInMonths } from '../utils/growthCalculations';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PremiumGuard } from '../components/PremiumGuard';
import { useAuth } from '../context/AuthContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Milestone'>;

const DOMAIN_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  motor:    { bg: '#FEE2E2', text: '#C0392B', icon: '🏃' },
  language: { bg: '#FEF3C7', text: '#92400E', icon: '💬' },
  social:   { bg: '#D1FAE5', text: '#065F46', icon: '🤝' },
  cognitive:{ bg: '#E8E0F0', text: '#6B21A8', icon: '🧠' },
};

export default function MilestoneScreen({ route, navigation }: Props) {
  const { child } = route.params;
  const { language } = useContext(LanguageContext);
  const t = translations[language];
  const isNe = language === 'ne';
  const { subscription } = useAuth();
  const isPremium = subscription?.status === 'active' || subscription?.plan === 'premium' || subscription?.plan === 'yearly' || subscription?.plan === 'monthly';

  const ageMonths = getAgeInMonths(child.dateOfBirth, dayjs().format('YYYY-MM-DD'));
  const [achievedIds, setAchievedIds] = useState<Set<string>>(new Set());
  const [deniedIds, setDeniedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showFullChart, setShowFullChart] = useState(false);

  const currentMilestones = getMilestonesForAge(ageMonths);
  const positiveMilestones = currentMilestones.filter(m => m.flagLevel !== 'red');
  const redFlagMilestones = currentMilestones.filter(m => m.flagLevel === 'red');

  const achievedCount = positiveMilestones.filter(m => achievedIds.has(m.id)).length;
  const progress = positiveMilestones.length > 0 ? achievedCount / positiveMilestones.length : 0;

  const loadRecords = async () => {
    try {
      const q = query(collection(db, 'milestones'), where('childId', '==', child.id));
      const snapshot = await getDocs(q);
      const achieved = new Set<string>();
      const denied = new Set<string>();
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.status === 'denied') denied.add(data.milestoneId);
        else achieved.add(data.milestoneId);
      });
      setAchievedIds(achieved); setDeniedIds(denied);
    } catch { Alert.alert('Error', 'Could not load records.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadRecords(); }, [child.id]);

  const updateStatus = async (milestoneId: string, status: 'achieved' | 'denied') => {
    if (!isPremium) {
      Alert.alert(isNe ? 'प्रिमियम सुविधा' : 'Premium Feature', isNe ? 'विकासका चरणहरू चिन्ह लगाउन प्रिमियम सदस्यता आवश्यक छ।' : 'Marking milestones requires a premium subscription.');
      return;
    }
    try {
      const docId = `${child.id}_${milestoneId}`;
      await setDoc(doc(db, 'milestones', docId), { childId: child.id, milestoneId, status, updatedAt: dayjs().toISOString(), ageAtUpdate: ageMonths });
      if (status === 'achieved') { setAchievedIds(prev => new Set([...prev, milestoneId])); setDeniedIds(prev => { const n = new Set(prev); n.delete(milestoneId); return n; }); }
      else { setDeniedIds(prev => new Set([...prev, milestoneId])); setAchievedIds(prev => { const n = new Set(prev); n.delete(milestoneId); return n; }); }
    } catch { Alert.alert('Error', 'Could not save.'); }
  };

  const hasAnyWarning = currentMilestones.some(m =>
    (m.flagLevel === 'red' && achievedIds.has(m.id)) || (m.flagLevel !== 'red' && deniedIds.has(m.id))
  );

  const renderMilestoneItem = (item: Milestone, isRedFlag: boolean) => {
    const isAchieved = achievedIds.has(item.id);
    const isDenied = deniedIds.has(item.id);
    const showWarning = (isRedFlag && isAchieved) || (!isRedFlag && isDenied);
    const domain = DOMAIN_COLORS[item.domain] || DOMAIN_COLORS.motor;

    return (
      <View key={item.id} style={[styles.card, isRedFlag && styles.redCard, showWarning && styles.warningCard]}>
        {/* Category Pill */}
        <View style={[styles.domainPill, { backgroundColor: domain.bg }]}>
          <Text style={styles.domainPillIcon}>{domain.icon}</Text>
          <Text style={[styles.domainPillText, { color: domain.text }]}>
            {t[`domain${item.domain.charAt(0).toUpperCase() + item.domain.slice(1)}` as keyof typeof t] as string}
          </Text>
        </View>

        <Text style={styles.descText}>{isNe ? item.descriptionNepali : item.description}</Text>

        {showWarning && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>{isNe ? '⚠️ कृपया बालरोग विशेषज्ञसँग परामर्श गर्नुहोस्।' : '⚠️ Please consult your pediatrician.'}</Text>
          </View>
        )}

        {!isRedFlag ? (
          <View style={styles.toggleRow}>
            <TouchableOpacity style={[styles.toggleBtn, styles.toggleLeft, isAchieved && styles.toggleAchieved]} onPress={() => updateStatus(item.id, 'achieved')}>
              <Text style={[styles.toggleBtnText, isAchieved && styles.toggleBtnTextActive]}>{isNe ? 'भयो' : 'Achieved'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.toggleBtn, styles.toggleRight, isDenied && styles.toggleDenied]} onPress={() => updateStatus(item.id, 'denied')}>
              <Text style={[styles.toggleBtnText, isDenied && styles.toggleBtnTextDenied]}>{isNe ? 'भएको छैन' : 'Not Yet'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.toggleRow}>
            <TouchableOpacity style={[styles.toggleBtn, styles.toggleLeft, isAchieved && styles.toggleRed]} onPress={() => updateStatus(item.id, 'achieved')}>
              <Text style={[styles.toggleBtnText, isAchieved && styles.toggleBtnTextActive]}>{isNe ? 'हो, यो समस्या छ' : 'Yes, I see this'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.toggleBtn, styles.toggleRight, isDenied && styles.toggleGreen]} onPress={() => updateStatus(item.id, 'denied')}>
              <Text style={[styles.toggleBtnText, isDenied && styles.toggleBtnTextActive]}>{isNe ? 'छैन, समस्या छैन' : 'No concern'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading) return <ActivityIndicator size="large" color="#E8602C" style={{ flex: 1, backgroundColor: '#F7F1EB' }} />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color="#7A6E65" /></TouchableOpacity>
        <Text style={styles.headerTitle}>{t.milestones}</Text>
        <TouchableOpacity onPress={() => setShowFullChart(true)} style={styles.fullBtn}><Ionicons name="calendar" size={20} color="#fff" /><Text style={styles.fullBtnText}>{isNe ? 'तालिका' : 'Full'}</Text></TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        {hasAnyWarning && (
          <View style={styles.topWarningBanner}>
            <Text style={styles.topWarningText}>{isNe ? '⚠️ चेतावनी पत्ता लाग्यो। कृपया बालरोग विशेषज्ञसँग परामर्श गर्नुहोस्।' : '⚠️ Concern detected. Please consult your pediatrician.'}</Text>
          </View>
        )}

        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <Text style={styles.progressLabel}>
            {isNe ? `${achievedCount}/${positiveMilestones.length} कोशेढुङ्गा हासिल` : `${achievedCount} of ${positiveMilestones.length} milestones achieved`}
          </Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` as any }]} />
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{isNe ? 'हासिल गर्नुपर्ने कोशेढुङ्गाहरू' : 'Milestones to be Achieved'}</Text>
          <Text style={styles.sectionSub}>{isNe ? `${ageMonths} महिनाको लागि` : `For ${ageMonths} months`}</Text>
        </View>
        {positiveMilestones.map(m => renderMilestoneItem(m, false))}

        <View style={[styles.sectionHeader, { marginTop: 30 }]}>
          <Text style={[styles.sectionTitle, { color: '#C0392B' }]}>{isNe ? 'चेतावनीका संकेतहरू' : 'Red Flags to Watch For'}</Text>
          <Text style={styles.sectionSub}>{isNe ? 'यदि यी लक्षण देखिएमा डाक्टरसँग सल्लाह लिनुहोस्' : 'Consult a doctor if you notice these'}</Text>
        </View>
        {redFlagMilestones.map(m => renderMilestoneItem(m, true))}
      </ScrollView>

      <Modal visible={showFullChart} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FDF8F2' }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowFullChart(false)}><Ionicons name="close" size={28} color="#7A6E65" /></TouchableOpacity>
            <Text style={styles.modalTitle}>{t.milestoneFullChart}</Text>
            <View style={{ width: 28 }} />
          </View>
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            {AGE_BANDS.map(band => (
              <View key={band} style={styles.bandRow}>
                <Text style={styles.bandTitle}>{band} {isNe ? 'महिना' : 'Months'}</Text>
                {MILESTONES.filter(m => m.ageMonthsMax === band).map(m => (
                  <View key={m.id} style={styles.miniItem}>
                    <Text style={[styles.miniDot, { backgroundColor: m.flagLevel === 'red' ? '#C0392B' : '#3D8B5E' }]} />
                    <Text style={styles.miniText}>{isNe ? m.descriptionNepali : m.description}</Text>
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F1EB' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, backgroundColor: '#FDF8F2', shadowColor: '#C4956A', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  backBtn: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A2E' },
  fullBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8602C', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 4 },
  fullBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  container: { flex: 1 },
  topWarningBanner: { backgroundColor: '#FEF3C7', padding: 15, margin: 12, borderRadius: 8, borderLeftWidth: 4, borderLeftColor: '#F5A623' },
  topWarningText: { color: '#92400E', fontWeight: 'bold', textAlign: 'center', fontSize: 13 },

  // Progress
  progressSection: { paddingHorizontal: 15, marginTop: 16, marginBottom: 6 },
  progressLabel: { fontSize: 13, color: '#7A6E65', fontWeight: '600', marginBottom: 6 },
  progressBar: { height: 6, borderRadius: 3, backgroundColor: '#EDE0D4', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: '#E8602C' },

  sectionHeader: { paddingHorizontal: 15, marginTop: 20, marginBottom: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#1A1A2E' },
  sectionSub: { fontSize: 12, color: '#7A6E65', marginTop: 2 },

  card: { backgroundColor: '#FDF8F2', marginHorizontal: 12, marginBottom: 10, borderRadius: 16, padding: 16, shadowColor: '#C4956A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  redCard: { borderLeftWidth: 4, borderLeftColor: '#C0392B' },
  warningCard: { borderLeftWidth: 4, borderLeftColor: '#F5A623' },

  domainPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginBottom: 10, gap: 4 },
  domainPillIcon: { fontSize: 12 },
  domainPillText: { fontSize: 11, fontWeight: '700' },

  descText: { fontSize: 15, fontWeight: '600', color: '#1A1A2E', lineHeight: 22, marginBottom: 14 },

  warningBox: { backgroundColor: '#FEF3C7', padding: 10, borderRadius: 8, marginBottom: 14, borderLeftWidth: 2, borderLeftColor: '#F5A623' },
  warningText: { fontSize: 12, color: '#92400E', fontWeight: '600' },

  toggleRow: { flexDirection: 'row', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#EDE0D4' },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FDF8F2' },
  toggleLeft: { borderRightWidth: 1, borderRightColor: '#EDE0D4' },
  toggleRight: {},
  toggleAchieved: { backgroundColor: '#3D8B5E' },
  toggleDenied: { backgroundColor: '#EDE0D4' },
  toggleRed: { backgroundColor: '#C0392B' },
  toggleGreen: { backgroundColor: '#3D8B5E' },
  toggleBtnText: { fontSize: 14, fontWeight: '600', color: '#7A6E65' },
  toggleBtnTextActive: { color: '#fff' },
  toggleBtnTextDenied: { color: '#1A1A2E' },

  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#EDE0D4' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A2E' },
  bandRow: { marginBottom: 20 },
  bandTitle: { fontSize: 16, fontWeight: 'bold', color: '#E8602C', marginBottom: 10 },
  miniItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, paddingLeft: 10 },
  miniDot: { width: 6, height: 6, borderRadius: 3, marginRight: 10 },
  miniText: { fontSize: 13, color: '#1A1A2E', flex: 1 },
});
