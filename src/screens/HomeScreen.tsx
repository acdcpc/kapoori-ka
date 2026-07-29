// src/screens/HomeScreen.tsx
import React, { useContext, useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Image, StyleSheet,
  Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Onboarding from '../components/Onboarding';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Child } from '../types';
import { LanguageContext } from '../context/LanguageContext';
import { RootStackParamList } from '../navigation/types';
import { translations } from '../i18n/translations';
import { formatAge, getAgeInMonths } from '../utils/growthCalculations';
import { WHATSAPP_NUMBER } from '../constants';
import { computeVaccineSchedule } from '../utils/vaccineSchedule';
import { VaccineRecord } from '../types';

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

const HOW_TO_STEPS_EN = [
  { icon: '📈', title: 'Growth Chart', desc: 'Enter your child\'s height & weight to track healthy growth.' },
  { icon: '💉', title: 'Immunization', desc: 'Record vaccines received and track upcoming vaccinations.' },
  { icon: '🧠', title: 'Milestones', desc: 'Mark achieved milestones and monitor upcoming development.' },
  { icon: '🥦', title: 'Nutrition', desc: 'Learn age-wise nutrition and prepare nutritious Sarbottam Pitho.' },
];

const HOW_TO_STEPS_NE = [
  { icon: '📈', title: 'वृद्धि चार्ट', desc: 'बच्चाको उचाइ र तौल राखेर वृद्धि ट्र्याक गर्नुहोस्।' },
  { icon: '💉', title: 'खोप', desc: 'लगाइएका खोप दर्ता गर्नुहोस् र आगामी खोप ट्र्याक गर्नुहोस्।' },
  { icon: '🧠', title: 'विकास', desc: 'पूरा भएका विकास चरणहरू चिन्ह लगाउनुहोस् र आगामी चरण हेर्नुहोस्।' },
  { icon: '🥦', title: 'पोषण', desc: 'उमेर अनुसारको पोषण जान्नुहोस् र सर्वोत्तम पिठो बनाउने तरिका सिक्नुहोस्।' },
];

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { language, setLanguage } = useContext(LanguageContext);
  const { signOutUser, user } = useAuth();
  const t = translations[language];
  const isNe = language === 'ne';
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGuide, setShowGuide] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [missedChildren, setMissedChildren] = useState<{ child: Child; missedVax: { name: string; nameNe: string; ageLabel: string }[] }[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  const handleLogout = async () => {
    Alert.alert(
      isNe ? 'लग आउट गर्नुहोस्?' : 'Logout?',
      isNe ? 'के तपाई लग आउट गर्न निश्चित हुनुहुन्छ?' : 'Are you sure you want to logout?',
      [
        { text: isNe ? 'रद्द गर्नुहोस्' : 'Cancel', onPress: () => {} },
        { text: isNe ? 'लग आउट' : 'Logout', onPress: async () => { try { await signOutUser(); } catch { Alert.alert('Error', 'Failed to logout'); } }, style: 'destructive' },
      ]
    );
  };

  const openWhatsApp = () => {
    const message = isNe ? 'नमस्ते, मलाई सहायता चाहिन्छ।' : 'Hello, I need help.';
    Linking.openURL(`whatsapp://send?phone=${WHATSAPP_NUMBER}&text=${encodeURIComponent(message)}`).catch(() => {
      Alert.alert('Error', 'WhatsApp is not installed or could not be opened.');
    });
  };

  const steps = isNe ? HOW_TO_STEPS_NE : HOW_TO_STEPS_EN;

  const claimExistingRecords = async (user: any) => {
    try {
      const userPhone = user.phoneNumber?.replace('+977', '');
      if (!userPhone) return;
      const { data } = await supabase
        .from('children')
        .select('id')
        .eq('parent_phone', userPhone)
        .eq('user_id', '');
      if (!data || data.length === 0) return;
      const childIds = data.map((d: any) => d.id);
      // Update children
      await supabase.from('children').update({ user_id: user.uid }).in('id', childIds);
      // Update growth_records, vaccinations for these children
      for (const cid of childIds) {
        await supabase.from('growth_records').update({ user_id: user.uid }).eq('child_id', cid).eq('user_id', '');
        await supabase.from('vaccinations').update({ user_id: user.uid }).eq('child_id', cid).eq('user_id', '');
      }
    } catch (error) { console.error('Claiming records error:', error); }
  };

  const loadChildren = async () => {
    try {
      setLoading(true);
      
      if (!user) { setChildren([]); return; }
      await claimExistingRecords(user);
      const { data, error: sbError } = await supabase
        .from('children')
        .select('*')
        .eq('user_id', user.uid);
      if (sbError) throw sbError;
      const loaded: Child[] = (data || []).map((d: any) => ({
        id: d.id,
        name: d.name,
        nameNepali: d.name_nepali,
        dateOfBirth: d.date_of_birth,
        sex: d.sex,
        birthWeight: d.birth_weight,
        birthLength: d.birth_length,
        photoUri: d.photo_uri,
        parentPhone: d.parent_phone,
        ownerId: d.user_id,
        createdAt: d.created_at,
      }));
      setChildren(loaded.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) { console.error('Load children error:', error); Alert.alert('Error', 'Could not load children list.'); }
    finally { setLoading(false); }
  };

  const checkMissedVaccines = async (childrenList: Child[]) => {
    const missed: { child: Child; missedVax: { name: string; nameNe: string; ageLabel: string }[] }[] = [];
    for (const ch of childrenList) {
      try {
        const { data } = await supabase
          .from('vaccinations')
          .select('*')
          .eq('child_id', ch.id);
        const records: VaccineRecord[] = (data || []).map((d: any) => ({
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
        const schedule = computeVaccineSchedule(ch.dateOfBirth, records);
        const missedVax = schedule.filter(v => v.status === 'missed').map(v => ({ name: v.name, nameNe: v.nameNepali, ageLabel: v.dueAge }));
        if (missedVax.length > 0) missed.push({ child: ch, missedVax });
      } catch {}
    }
    setMissedChildren(missed);
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadChildren().then(() => {
        // We need children state after load — use a delayed check
        setTimeout(() => {
          
          if (user) {
            supabase.from('children').select('*').eq('user_id', user.uid).then(({ data }) => {
              const loaded: Child[] = (data || []).map((d: any) => ({
                id: d.id, name: d.name, nameNepali: d.name_nepali, dateOfBirth: d.date_of_birth,
                sex: d.sex, birthWeight: d.birth_weight, birthLength: d.birth_length,
                photoUri: d.photo_uri, parentPhone: d.parent_phone, ownerId: d.user_id, createdAt: d.created_at,
              }));
              checkMissedVaccines(loaded);
            });
          }
        }, 500);
      });
    });
    return unsubscribe;
  }, [navigation]);

  const renderChild = ({ item }: { item: Child }) => (
    <TouchableOpacity style={styles.childCard} onPress={() => navigation.navigate('ChildDashboard', { child: item })} activeOpacity={0.7}>
      <View style={styles.childCardContent}>
        <View style={styles.avatar}>
          {item.photoUri ? (
            <Image source={{ uri: item.photoUri }} style={styles.avatarPhoto} />
          ) : (
            <Text style={styles.avatarText}>{item.sex === 'male' ? '👦' : '👧'}</Text>
          )}
        </View>
        <View style={styles.childInfo}>
          <Text style={styles.childName}>{item.nameNepali && isNe ? item.nameNepali : item.name}</Text>
          {item.nameNepali && isNe && item.name && <Text style={styles.childNameRoman}>{item.name}</Text>}
          {!isNe && item.nameNepali && <Text style={styles.childNameNepali}>{item.nameNepali}</Text>}
          <View style={styles.childMeta}>
            <Text style={styles.childAge}>{item.dateOfBirth ? String(formatAge(item.dateOfBirth, language) || '') : (isNe ? 'मिति अज्ञात' : 'Date unknown')}</Text>
          </View>
        </View>
        <Text style={styles.childArrow}>→</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>कपूरी क</Text>
          <Text style={styles.headerSubtitle}>Kapoori Ka</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.langToggle}>
            <TouchableOpacity style={[styles.langBtn, language === 'ne' && styles.langBtnActive]} onPress={() => setLanguage('ne')}>
              <Text style={[styles.langBtnText, language === 'ne' && styles.langBtnTextActive]}>नेपाली</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.langBtn, language === 'en' && styles.langBtnActive]} onPress={() => setLanguage('en')}>
              <Text style={[styles.langBtnText, language === 'en' && styles.langBtnTextActive]}>English</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.settingsBtn} onPress={() => setShowSettings(s => !s)}>
              <Ionicons name="settings-outline" size={22} color="#7A6E65" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.welcomeBanner} onPress={() => setShowGuide(!showGuide)} activeOpacity={0.85}>
        <View style={styles.welcomeRow}>
          <View style={styles.welcomeTextBox}>
            <Text style={styles.welcomeTitle}>{isNe ? 'कपूरी क मा स्वागत छ!' : 'Welcome to Kapoori Ka!'}</Text>
            <Text style={styles.welcomeSubtitle}>{isNe ? 'एप कसरी चलाउने? थिच्नुहोस्' : 'Tap to learn how to use the app'}</Text>
          </View>
          <Ionicons name={showGuide ? 'chevron-up' : 'chevron-down'} size={20} color="#E8602C" />
        </View>
        {showGuide && (
          <View style={styles.stepsBox}>
            <Text style={styles.stepsHeading}>{isNe ? '📋 एप प्रयोग गर्ने तरिका :' : '📋 How to use this app:'}</Text>
            {steps.map((s, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={styles.stepIconBox}><Text style={styles.stepIcon}>{s.icon}</Text></View>
                <View style={styles.stepTextBox}>
                  <Text style={styles.stepTitle}>{s.title}</Text>
                  <Text style={styles.stepDesc}>{s.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator size="large" color="#E8602C" style={styles.loader} />
      ) : children.length === 0 ? (
        <ScrollView contentContainerStyle={styles.emptyState}>
          <Text style={styles.emptyIcon}>👶</Text>
          <Text style={styles.emptyText}>{t.noChildren}</Text>
          <Text style={styles.hintText}>{isNe ? 'तलको ⊕ बटन थिचेर आफ्नो बच्चाको प्रोफाइल बनाउनुहोस्।' : "Tap the ⊕ button below to create your child's profile."}</Text>
          <View style={styles.fabPointer}>
            <Text style={styles.fabPointerTitle}>{isNe ? 'यहाँ थिच्नुहोस्' : 'Tap here to add child'}</Text>
            <Text style={styles.fabPointerArrow}>↓</Text>
          </View>
          <View style={styles.featurePreview}>
            {[
              { icon: '📈', label: isNe ? 'वृद्धि चार्ट' : 'Growth Chart' },
              { icon: '💉', label: isNe ? 'खोप' : 'Vaccines' },
              { icon: '🧠', label: isNe ? 'विकास' : 'Milestones' },
              { icon: '🥦', label: isNe ? 'पोषण' : 'Nutrition' },
            ].map((f, i) => (
              <View key={i} style={styles.featureChip}>
                <Text style={styles.featureChipIcon}>{f.icon}</Text>
                <Text style={styles.featureChipLabel}>{f.label}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={children}
          renderItem={renderChild}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={<Text style={styles.sectionLabel}>{isNe ? 'तपाईंको बच्चाहरू' : 'Your Children'}</Text>}
          ListFooterComponent={
            <View style={styles.whatsappCard}>
              <TouchableOpacity style={styles.whatsappBtn} onPress={openWhatsApp} activeOpacity={0.8}>
                <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
                <Text style={styles.whatsappBtnTxt}>{isNe ? 'व्हाट्सअप सहायता' : 'WhatsApp Support'}</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {showSettings && (
        <View style={styles.settingsPanel}>
          <View style={styles.settingsHandle} />
          <Text style={styles.settingsTitle}>{isNe ? 'सेटिङ' : 'Settings'}</Text>
          <View style={styles.settingsRow}>
            <Ionicons name="medical-outline" size={18} color="#7A6E65" />
            <Text style={styles.settingsLabel}>Kapoori Ka</Text>
            <Text style={styles.settingsValue}>{isNe ? 'बाल स्वास्थ्य सहायक' : 'Child Health Assistant'}</Text>
          </View>
          <View style={styles.settingsRow}>
            <Ionicons name="code-slash-outline" size={18} color="#7A6E65" />
            <Text style={styles.settingsLabel}>{isNe ? 'संस्करण' : 'Version'}</Text>
            <Text style={styles.settingsValue}>1.0.0</Text>
          </View>
          <TouchableOpacity style={styles.settingsRow} onPress={() => { setShowSettings(false); navigation.navigate('About'); }}>
            <Ionicons name="information-circle-outline" size={18} color="#7A6E65" />
            <Text style={styles.settingsLabel}>{t.about}</Text>
            <Ionicons name="chevron-forward" size={16} color="#C4956A" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.settingsRow, styles.logoutRow]} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={18} color="#C0392B" />
            <Text style={[styles.settingsLabel, { color: '#C0392B' }]}>{isNe ? 'लग आउट' : 'Logout'}</Text>
          </TouchableOpacity>
        </View>
      )}
      {showOnboarding && <Onboarding onComplete={() => setShowOnboarding(false)} screen="home" />}
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddChild')}>
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F1EB' },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6 },
  headerLeft: { flex: 1 },
  headerTitle: { fontWeight: '800', fontSize: 22, color: '#1A1A2E' },
  headerSubtitle: { fontSize: 13, color: '#7A6E65', marginTop: 1 },
  headerRight: { alignItems: 'flex-end' },
  langToggle: { flexDirection: 'row', borderRadius: 20, borderWidth: 1, borderColor: '#EDE0D4', padding: 2, marginBottom: 6 },
  langBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 18 },
  langBtnActive: { backgroundColor: '#E8602C' },
  langBtnText: { fontSize: 12, fontWeight: '600', color: '#7A6E65' },
  langBtnTextActive: { color: '#fff' },
  headerIcons: { flexDirection: 'row', gap: 8 },

  // Missed vaccine banner
  missedBanner: { marginHorizontal: 12, marginTop: 6, marginBottom: 6, backgroundColor: '#FEE2E2', borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#C0392B', padding: 10 },
  missedBannerInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  missedBannerTitle: { fontSize: 13, fontWeight: '700', color: '#991B1B' },
  missedBannerDetail: { fontSize: 11, color: '#991B1B', marginTop: 2 },
  missedBannerMore: { fontSize: 11, color: '#991B1B', textAlign: 'center', marginTop: 4, fontWeight: '600' },

  aboutBtn: { padding: 4 },
  settingsBtn: { padding: 4 },
  settingsPanel: { backgroundColor: '#FDF8F2', borderTopWidth: 1, borderTopColor: '#EDE0D4', padding: 16, paddingTop: 8 },
  settingsHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#EDE0D4', alignSelf: 'center', marginBottom: 12 },
  settingsTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E', marginBottom: 12 },
  settingsRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F7ECD6', gap: 10 },
  settingsLabel: { flex: 1, fontSize: 14, color: '#1A1A2E' },
  settingsValue: { fontSize: 13, color: '#7A6E65' },
  logoutRow: { borderBottomWidth: 0, marginTop: 4 },

  welcomeBanner: { marginHorizontal: 12, marginTop: 6, marginBottom: 4, backgroundColor: '#FDF8F2', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#EDE0D4', borderLeftWidth: 4, borderLeftColor: '#E8602C' },
  welcomeRow: { flexDirection: 'row', alignItems: 'center' },
  welcomeTextBox: { flex: 1 },
  welcomeTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  welcomeSubtitle: { fontSize: 12, color: '#7A6E65', marginTop: 2 },
  stepsBox: { marginTop: 12, backgroundColor: '#FDF8F2', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#EDE0D4' },
  stepsHeading: { fontSize: 13, fontWeight: '700', color: '#1A1A2E', marginBottom: 10 },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
  stepIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#E8602C15', alignItems: 'center', justifyContent: 'center' },
  stepIcon: { fontSize: 18 },
  stepTextBox: { flex: 1 },
  stepTitle: { fontSize: 13, fontWeight: '700', color: '#1A1A2E' },
  stepDesc: { fontSize: 11, color: '#7A6E65', marginTop: 1 },

  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, color: '#7A6E65', textTransform: 'uppercase', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10 },

  list: { paddingHorizontal: 12, paddingBottom: 16 },
  childCard: { backgroundColor: '#FDF8F2', borderRadius: 16, marginBottom: 8, shadowColor: '#C4956A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  childCardContent: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F7ECD6', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  avatarText: { fontSize: 24 },
  avatarPhoto: { width: 44, height: 44, borderRadius: 22 },
  childInfo: { flex: 1 },
  childName: { fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
  childNameNepali: { fontSize: 14, color: '#7A6E65', marginTop: 2 },
  childNameRoman: { fontSize: 12, color: '#7A6E65', marginTop: 1 },
  childMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  childAge: { fontSize: 13, color: '#7A6E65' },
  childArrow: { fontSize: 22, color: '#C4956A', fontWeight: '600' },

  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40, paddingBottom: 160 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontSize: 16, color: '#7A6E65', textAlign: 'center', lineHeight: 24 },
  hintText: { fontSize: 13, color: '#E8602C', textAlign: 'center', marginTop: 10, fontStyle: 'italic' },
  fabPointer: { backgroundColor: '#E8602C18', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, alignItems: 'center', marginBottom: 8 },
  fabPointerTitle: { fontWeight: '700', fontSize: 13, color: '#E8602C', textAlign: 'center' },
  fabPointerArrow: { fontSize: 20, color: '#E8602C', textAlign: 'center', marginTop: 2 },
  featurePreview: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 20, gap: 10 },
  featureChip: { alignItems: 'center', backgroundColor: '#FDF8F2', borderRadius: 12, padding: 12, width: 80, borderWidth: 1, borderColor: '#EDE0D4' },
  featureChipIcon: { fontSize: 24, marginBottom: 4 },
  featureChipLabel: { fontSize: 11, color: '#7A6E65', fontWeight: '600', textAlign: 'center' },

  loader: { flex: 1 },
  fab: { position: 'absolute', bottom: 80, right: 20, width: 56, height: 56, borderRadius: 30, backgroundColor: '#E8602C', alignItems: 'center', justifyContent: 'center', shadowColor: '#E8602C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8 },
  whatsappCard: { paddingHorizontal: 16, paddingBottom: 80, paddingTop: 12 },
  whatsappBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#25D366', borderRadius: 28, paddingVertical: 12, paddingHorizontal: 24, gap: 10 },
  whatsappBtnTxt: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
});
