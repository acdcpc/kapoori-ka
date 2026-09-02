// src/screens/MilestoneScreen.tsx
import React, { useContext, useEffect, useState, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, ScrollView, StatusBar,
  Modal, Image, Animated,
} from 'react-native';
import { ThemeContext } from '../context/ThemeContext';
import { Palette } from '../theme';
import dayjs from 'dayjs';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
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
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'Milestone'>;

const makeDomainColors = (pal: Palette): Record<string, { bg: string; text: string; icon: string }> => ({
  motor:    { bg: pal.redLight, text: pal.red, icon: '🏃' },
  language: { bg: pal.amberLight, text: pal.amberDark, icon: '💬' },
  social:   { bg: pal.greenLight, text: pal.greenDark, icon: '🤝' },
  cognitive:{ bg: pal.purpleLight, text: pal.purpleDark, icon: '🧠' },
});

export default function MilestoneScreen({ route, navigation }: Props) {
  const { palette: pal } = useContext(ThemeContext);
  const domainColors = makeDomainColors(pal);
  const styles = makeStyles(pal);
  const { child } = route.params;
  const { language } = useContext(LanguageContext);
  const t = translations[language];
  const isNe = language === 'ne';
  const { subscription, user } = useAuth();
  const isPremium = subscription?.status === 'active' || subscription?.plan === 'premium' || subscription?.plan === 'yearly' || subscription?.plan === 'monthly';

  const ageMonths = getAgeInMonths(child.dateOfBirth, dayjs().format('YYYY-MM-DD'));
  const [achievedIds, setAchievedIds] = useState<Set<string>>(new Set());
  const [deniedIds, setDeniedIds] = useState<Set<string>>(new Set());
  const [celebratingId, setCelebratingId] = useState<string | null>(null);
  const [animScale] = useState(new Animated.Value(1));
  const [loading, setLoading] = useState(true);
  const [showFullChart, setShowFullChart] = useState(false);

  const currentMilestones = getMilestonesForAge(ageMonths);
  const positiveMilestones = currentMilestones.filter(m => m.flagLevel !== 'red');
  const redFlagMilestones = currentMilestones.filter(m => m.flagLevel === 'red');

  const achievedCount = positiveMilestones.filter(m => achievedIds.has(m.id)).length;
  const progress = positiveMilestones.length > 0 ? achievedCount / positiveMilestones.length : 0;

  const loadRecords = async () => {
    try {
      const { data, error: sbError } = await supabase
        .from('milestones')
        .select('*')
        .eq('child_id', child.id);
      if (sbError) throw sbError;
      const achieved = new Set<string>();
      const denied = new Set<string>();
      (data || []).forEach((r: any) => {
        if (r.status === 'denied') denied.add(r.milestone_id);
        else achieved.add(r.milestone_id);
      });
      setAchievedIds(achieved); setDeniedIds(denied);
    } catch { Alert.alert('Error', 'Could not load records.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadRecords(); }, [child.id]);
  useEffect(() => {
    return () => { Speech.stop(); };
  }, []);

  const updateStatus = async (milestoneId: string, status: 'achieved' | 'denied') => {
    if (!isPremium) {
      Alert.alert(isNe ? 'प्रिमियम सुविधा' : 'Premium Feature', isNe ? 'विकासका चरणहरू चिन्ह लगाउन प्रिमियम सदस्यता आवश्यक छ।' : 'Marking milestones requires a premium subscription.');
      return;
    }
    try {
      const { error: sbError } = await supabase
        .from('milestones')
        .upsert({
          child_id: child.id,
          user_id: user?.uid || '',
          milestone_id: milestoneId,
          status,
          age_at_update: ageMonths,
          updated_at: dayjs().toISOString(),
        }, { onConflict: 'child_id, milestone_id' });
      if (sbError) throw sbError;
      if (status === 'achieved') {
        setAchievedIds(prev => new Set([...prev, milestoneId]));
        setDeniedIds(prev => { const n = new Set(prev); n.delete(milestoneId); return n; });
        const milestone = currentMilestones.find(m => m.id === milestoneId);
        if (milestone && milestone.flagLevel !== 'red') {
          setCelebratingId(milestoneId);
          Animated.sequence([
            Animated.spring(animScale, { toValue: 1.05, useNativeDriver: true, speed: 12, bounciness: 8 }),
            Animated.spring(animScale, { toValue: 1, useNativeDriver: true, speed: 8, bounciness: 4 }),
          ]).start(() => setCelebratingId(null));
        }
      }
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
    const domain = domainColors[item.domain] || makeDomainColors(pal).motor;

    const isThisCelebrating = celebratingId === item.id;
    const CardWrapper = isThisCelebrating ? Animated.View : View;
    const scaleStyle = isThisCelebrating ? { transform: [{ scale: animScale }] } : {};

    return (
      <CardWrapper key={item.id} style={[styles.card, isRedFlag && styles.redCard, showWarning && styles.warningCard, scaleStyle]}>
        {/* Category Pill */}
        <View style={[styles.domainPill, { backgroundColor: domain.bg }]}>
          <Text style={styles.domainPillIcon}>{domain.icon}</Text>
          <Text style={[styles.domainPillText, { color: domain.text }]}>
            {t[`domain${item.domain.charAt(0).toUpperCase() + item.domain.slice(1)}` as keyof typeof t] as string}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
          <Text style={[styles.descText, { flex: 1 }]}>{isNe ? item.descriptionNepali : item.description}</Text>
          <TouchableOpacity onPress={(e: any) => { e.stopPropagation?.(); Speech.speak(isNe ? item.descriptionNepali : item.description); }}>
            <Ionicons name="volume-high" size={16} color={pal.muted} />
          </TouchableOpacity>
        </View>

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

        {/* Photo attachment section */}
        {isAchieved && (
          <>
          </>
        )}
      </CardWrapper>
    );
  };

  if (loading) return <ActivityIndicator size="large" color={pal.clay} style={{ flex: 1, backgroundColor: pal.bg }} />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color={pal.muted} /></TouchableOpacity>
        <Text style={styles.headerTitle}>{t.milestones}</Text>
        <TouchableOpacity onPress={() => setShowFullChart(true)} style={styles.fullBtn}><Ionicons name="calendar" size={20} color={pal.onAccent} /><Text style={styles.fullBtnText}>{isNe ? 'तालिका' : 'Full'}</Text></TouchableOpacity>
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
          <Text style={[styles.sectionTitle, { color: pal.red }]}>{isNe ? 'चेतावनीका संकेतहरू' : 'Red Flags to Watch For'}</Text>
          <Text style={styles.sectionSub}>{isNe ? 'यदि यी लक्षण देखिएमा डाक्टरसँग सल्लाह लिनुहोस्' : 'Consult a doctor if you notice these'}</Text>
        </View>
        {redFlagMilestones.map(m => renderMilestoneItem(m, true))}
      </ScrollView>

      <Modal visible={showFullChart} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: pal.surface }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowFullChart(false)}><Ionicons name="close" size={28} color={pal.muted} /></TouchableOpacity>
            <Text style={styles.modalTitle}>{t.milestoneFullChart}</Text>
            <View style={{ width: 28 }} />
          </View>
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            {AGE_BANDS.map(band => (
              <View key={band} style={styles.bandRow}>
                <Text style={styles.bandTitle}>{band} {isNe ? 'महिना' : 'Months'}</Text>
                {MILESTONES.filter(m => m.ageMonthsMax === band).map(m => (
                  <View key={m.id} style={styles.miniItem}>
                    <Text style={[styles.miniDot, { backgroundColor: m.flagLevel === 'red' ? pal.red : pal.green }]} />
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

const makeStyles = (pal: Palette) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: pal.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, backgroundColor: pal.surface, shadowColor: pal.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  backBtn: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: pal.text },
  fullBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: pal.clay, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 4 },
  fullBtnText: { color: pal.onAccent, fontSize: 12, fontWeight: 'bold' },
  container: { flex: 1 },
  topWarningBanner: { backgroundColor: pal.amberLight, padding: 15, margin: 12, borderRadius: 8, borderLeftWidth: 4, borderLeftColor: pal.gold },
  topWarningText: { color: pal.amberDark, fontWeight: 'bold', textAlign: 'center', fontSize: 13 },

  // Progress
  progressSection: { paddingHorizontal: 15, marginTop: 16, marginBottom: 6 },
  progressLabel: { fontSize: 13, color: pal.muted, fontWeight: '600', marginBottom: 6 },
  progressBar: { height: 6, borderRadius: 3, backgroundColor: pal.border, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: pal.clay },

  sectionHeader: { paddingHorizontal: 15, marginTop: 20, marginBottom: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: pal.text },
  sectionSub: { fontSize: 12, color: pal.muted, marginTop: 2 },

  card: { backgroundColor: pal.surface, marginHorizontal: 12, marginBottom: 10, borderRadius: 16, padding: 16, shadowColor: pal.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  redCard: { borderLeftWidth: 4, borderLeftColor: pal.red },
  warningCard: { borderLeftWidth: 4, borderLeftColor: pal.gold },

  domainPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginBottom: 10, gap: 4 },
  domainPillIcon: { fontSize: 12 },
  domainPillText: { fontSize: 11, fontWeight: '700' },

  descText: { fontSize: 15, fontWeight: '600', color: pal.text, lineHeight: 22, marginBottom: 14 },

  warningBox: { backgroundColor: pal.amberLight, padding: 10, borderRadius: 8, marginBottom: 14, borderLeftWidth: 2, borderLeftColor: pal.gold },
  warningText: { fontSize: 12, color: pal.amberDark, fontWeight: '600' },

  toggleRow: { flexDirection: 'row', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: pal.border },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: pal.surface },
  toggleLeft: { borderRightWidth: 1, borderRightColor: pal.border },
  toggleRight: {},
  toggleAchieved: { backgroundColor: pal.green },
  toggleDenied: { backgroundColor: pal.border },
  toggleRed: { backgroundColor: pal.red },
  toggleGreen: { backgroundColor: pal.green },
  toggleBtnText: { fontSize: 14, fontWeight: '600', color: pal.muted },
  toggleBtnTextActive: { color: pal.onAccent },
  toggleBtnTextDenied: { color: pal.text },

  // Photo attachment

  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: pal.border },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: pal.text },
  bandRow: { marginBottom: 20 },
  bandTitle: { fontSize: 16, fontWeight: 'bold', color: pal.clay, marginBottom: 10 },
  miniItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, paddingLeft: 10 },
  miniDot: { width: 6, height: 6, borderRadius: 3, marginRight: 10 },
  miniText: { fontSize: 13, color: pal.text, flex: 1 },
});
