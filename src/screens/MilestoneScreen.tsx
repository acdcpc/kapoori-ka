// src/screens/MilestoneScreen.tsx
import React, { useContext, useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, ScrollView, StatusBar,
  Modal, Dimensions
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

const DOMAIN_COLORS = { motor: '#4CAF50', language: '#1a73e8', social: '#e91e8c', cognitive: '#FF9800' };
const DOMAIN_ICONS  = { motor: '🏃', language: '💬', social: '🤝', cognitive: '🧠' };

export default function MilestoneScreen({ route, navigation }: Props) {
  const { child } = route.params;
  const { language } = useContext(LanguageContext);
  const t = translations[language];
  const isNe = language === 'ne';
  const { subscription } = useAuth();
  const isPremium = subscription?.status === 'active' || subscription?.plan === 'premium';

  const ageMonths = getAgeInMonths(child.dateOfBirth, dayjs().format('YYYY-MM-DD'));
  const [achievedIds, setAchievedIds] = useState<Set<string>>(new Set());
  const [deniedIds, setDeniedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showFullChart, setShowFullChart] = useState(false);

  const currentMilestones = getMilestonesForAge(ageMonths);
  
  const positiveMilestones = currentMilestones.filter(m => m.flagLevel !== 'red');
  const redFlagMilestones = currentMilestones.filter(m => m.flagLevel === 'red');

  const loadRecords = async () => {
    try {
      const q = query(collection(db, 'milestones'), where('childId', '==', child.id));
      const snapshot = await getDocs(q);
      const achieved = new Set<string>();
      const denied = new Set<string>();
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.status === 'denied') {
          denied.add(data.milestoneId);
        } else {
          achieved.add(data.milestoneId);
        }
      });
      setAchievedIds(achieved);
      setDeniedIds(denied);
    } catch { Alert.alert('Error', 'Could not load records.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadRecords(); }, [child.id]);

  const updateStatus = async (milestoneId: string, status: 'achieved' | 'denied') => {
    if (!isPremium) {
      Alert.alert(
        isNe ? 'प्रिमियम सुविधा' : 'Premium Feature',
        isNe
          ? 'विकासका चरणहरू चिन्ह लगाउन प्रिमियम सदस्यता आवश्यक छ। तपाईं सबै चरणहरू हेर्न सक्नुहुन्छ तर चिन्ह लगाउन सक्नुहुन्न।'
          : 'Marking milestones requires a premium subscription. You can view all milestones but cannot mark them.',
        [
          { text: isNe ? 'पछि' : 'Later' },
          { text: isNe ? 'अपग्रेड गर्नुहोस्' : 'Upgrade', onPress: () => navigation.navigate('Subscription') }
        ]
      );
      return;
    }
    try {
      const docId = `${child.id}_${milestoneId}`;
      await setDoc(doc(db, 'milestones', docId), {
        childId: child.id,
        milestoneId,
        status,
        updatedAt: dayjs().toISOString(),
        ageAtUpdate: ageMonths,
      });
      
      if (status === 'achieved') {
        setAchievedIds(prev => new Set([...prev, milestoneId]));
        setDeniedIds(prev => { const n = new Set(prev); n.delete(milestoneId); return n; });
      } else {
        setDeniedIds(prev => new Set([...prev, milestoneId]));
        setAchievedIds(prev => { const n = new Set(prev); n.delete(milestoneId); return n; });
      }
    } catch { Alert.alert('Error', 'Could not save.'); }
  };

  const hasAnyWarning = currentMilestones.some(m => 
    (m.flagLevel === 'red' && achievedIds.has(m.id)) || 
    (m.flagLevel !== 'red' && deniedIds.has(m.id))
  );

  const renderMilestoneItem = (item: Milestone, isRedFlag: boolean) => {
    const isAchieved = achievedIds.has(item.id);
    const isDenied = deniedIds.has(item.id);
    const showWarning = (isRedFlag && isAchieved) || (!isRedFlag && isDenied);

    return (
      <View key={item.id} style={[styles.card, isRedFlag && styles.redCard, showWarning && styles.warningCard]}>
        <View style={styles.cardHeader}>
          <Text style={styles.domainIcon}>{DOMAIN_ICONS[item.domain]}</Text>
          <View style={styles.cardInfo}>
            <Text style={[styles.domainText, { color: DOMAIN_COLORS[item.domain] }]}>{t[`domain${item.domain.charAt(0).toUpperCase() + item.domain.slice(1)}` as keyof typeof t] as string}</Text>
            <Text style={styles.descText}>{isNe ? item.descriptionNepali : item.description}</Text>
          </View>
        </View>

        {showWarning && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>{isNe ? '⚠️ कृपया बालरोग विशेषज्ञसँग परामर्श गर्नुहोस्।' : '⚠️  Please consult your pediatrician.'}</Text>
          </View>
        )}

        <View style={styles.btnRow}>
          {!isRedFlag ? (
            <>
              <TouchableOpacity 
                style={[styles.actionBtn, isAchieved && styles.btnAchieved]} 
                onPress={() => updateStatus(item.id, 'achieved')}
              >
                <Ionicons name={isAchieved ? "checkmark-circle" : "ellipse-outline"} size={20} color={isAchieved ? "#fff" : "#4CAF50"} />
                <Text style={[styles.btnText, isAchieved && styles.btnTextActive]}>{isNe ? (isPremium || isAchieved ? 'भयो' : '🔒 भयो') : (isPremium || isAchieved ? 'Achieved' : '🔒 Achieved')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionBtn, isDenied && styles.btnDenied]} 
                onPress={() => updateStatus(item.id, 'denied')}
              >
                <Ionicons name={isDenied ? "close-circle" : "ellipse-outline"} size={20} color={isDenied ? "#fff" : "#f44336"} />
                <Text style={[styles.btnText, isDenied && styles.btnTextActive]}>{isNe ? (isPremium || isDenied ? 'भएको छैन' : '🔒 भएको छैन') : (isPremium || isDenied ? 'Not Yet' : '🔒 Not Yet')}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity 
                style={[styles.actionBtn, isAchieved && styles.btnDenied]} 
                onPress={() => updateStatus(item.id, 'achieved')}
              >
                <Ionicons name={isAchieved ? "warning" : "ellipse-outline"} size={20} color={isAchieved ? "#fff" : "#f44336"} />
                <Text style={[styles.btnText, isAchieved && styles.btnTextActive]}>{isNe ? 'हो, यो समस्या छ' : 'Yes, I see this'}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionBtn, isDenied && styles.btnAchieved]} 
                onPress={() => updateStatus(item.id, 'denied')}
              >
                <Ionicons name={isDenied ? "shield-checkmark" : "ellipse-outline"} size={20} color={isDenied ? "#fff" : "#4CAF50"} />
                <Text style={[styles.btnText, isDenied && styles.btnTextActive]}>{isNe ? 'छैन, समस्या छैन' : 'No concern'}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  if (loading) return <ActivityIndicator size="large" color="#1a73e8" style={{ flex: 1 }} />;

  return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color="#333" /></TouchableOpacity>
          <Text style={styles.headerTitle}>{t.milestones}</Text>
          <TouchableOpacity onPress={() => setShowFullChart(true)} style={styles.fullBtn}><Ionicons name="calendar" size={20} color="#fff" /><Text style={styles.fullBtnText}>{isNe ? 'तालिका' : 'Full'}</Text></TouchableOpacity>
        </View>

        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
          {hasAnyWarning && (
            <View style={styles.topWarningBanner}>
              <Text style={styles.topWarningText}>{isNe ? '⚠️ चेतावनी पत्ता लाग्यो। कृपया बालरोग विशेषज्ञसँग परामर्श गर्नुहोस्।' : '⚠️ Concern detected. Please consult your pediatrician.'}</Text>
            </View>
          )}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{isNe ? 'हासिल गर्नुपर्ने कोशेढुङ्गाहरू' : 'Milestones to be Achieved'}</Text>
            <Text style={styles.sectionSub}>{isNe ? `${ageMonths} महिनाको लागि` : `For ${ageMonths} months`}</Text>
          </View>
          {positiveMilestones.map(m => renderMilestoneItem(m, false))}

          <View style={[styles.sectionHeader, { marginTop: 30 }]}>
            <Text style={[styles.sectionTitle, { color: '#f44336' }]}>{isNe ? 'चेतावनीका संकेतहरू' : 'Red Flags to Watch For'}</Text>
            <Text style={styles.sectionSub}>{isNe ? 'यदि यी लक्षण देखिएमा डाक्टरसँग सल्लाह लिनुहोस्' : 'Consult a doctor if you notice these'}</Text>
          </View>
          {redFlagMilestones.map(m => renderMilestoneItem(m, true))}
        </ScrollView>

        <Modal visible={showFullChart} animationType="slide">
          <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowFullChart(false)}><Ionicons name="close" size={28} color="#333" /></TouchableOpacity>
              <Text style={styles.modalTitle}>{t.milestoneFullChart}</Text>
              <View style={{ width: 28 }} />
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {AGE_BANDS.map(band => (
                <View key={band} style={styles.bandRow}>
                  <Text style={styles.bandTitle}>{band} {isNe ? 'महिना' : 'Months'}</Text>
                  {MILESTONES.filter(m => m.ageMonthsMax === band).map(m => (
                    <View key={m.id} style={styles.miniItem}>
                      <Text style={[styles.miniDot, { backgroundColor: m.flagLevel === 'red' ? '#f44336' : '#4CAF50' }]} />
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
  safeArea: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  backBtn: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  fullBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a73e8', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 4 },
  fullBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  topWarningBanner: { backgroundColor: '#FFEBEE', padding: 15, margin: 12, borderRadius: 10, borderLeftWidth: 5, borderLeftColor: '#f44336' },
  topWarningText: { color: '#B71C1C', fontWeight: 'bold', textAlign: 'center', fontSize: 13 },
  sectionHeader: { paddingHorizontal: 15, marginTop: 20, marginBottom: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#333' },
  sectionSub: { fontSize: 12, color: '#888', marginTop: 2 },
  card: { backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 12, borderRadius: 12, padding: 15, elevation: 2, borderLeftWidth: 4, borderLeftColor: '#4CAF50' },
  redCard: { borderLeftColor: '#f44336' },
  warningCard: { backgroundColor: '#FFF9C4', borderColor: '#f44336' },
  cardHeader: { flexDirection: 'row', gap: 12, marginBottom: 15 },
  domainIcon: { fontSize: 24 },
  cardInfo: { flex: 1 },
  domainText: { fontSize: 11, fontWeight: 'bold', marginBottom: 4 },
  descText: { fontSize: 15, color: '#333', lineHeight: 22 },
  warningBox: { backgroundColor: '#fff', padding: 10, borderRadius: 8, marginBottom: 15, borderLeftWidth: 3, borderLeftColor: '#f44336' },
  warningText: { fontSize: 12, color: '#B71C1C', fontWeight: 'bold' },
  btnRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#eee', gap: 6 },
  btnAchieved: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  btnDenied: { backgroundColor: '#f44336', borderColor: '#f44336' },
  btnText: { fontSize: 13, color: '#666', fontWeight: '600' },
  btnTextActive: { color: '#fff' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  bandRow: { marginBottom: 20 },
  bandTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a73e8', marginBottom: 10 },
  miniItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, paddingLeft: 10 },
  miniDot: { width: 6, height: 6, borderRadius: 3, marginRight: 10 },
  miniText: { fontSize: 13, color: '#444', flex: 1 },
});
