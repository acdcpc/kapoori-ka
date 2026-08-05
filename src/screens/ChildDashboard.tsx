// src/screens/ChildDashboard.tsx
import React, { useContext, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ScrollView, StatusBar, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Onboarding from '../components/Onboarding';

import { LanguageContext } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { RootStackParamList } from '../navigation/types';
import { translations } from '../i18n/translations';
import { formatAge, getAgeInMonths, getIdealRanges, classifyGrowthStatus } from '../utils/growthCalculations';
import { computeVaccineSchedule, getVaccineSummary, ComputedVaccine } from '../utils/vaccineSchedule';
import { getMilestonesForAge } from '../data/milestones';
import { VaccineRecord, GrowthRecord } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'ChildDashboard'>;

export default function ChildDashboard({ route, navigation }: Props) {
  const { child } = route.params;
  const { language } = useContext(LanguageContext);
  const { subscription, user } = useAuth();
  const t = translations[language];
  const isNe = language === 'ne';

  const isPremium = subscription?.status === 'active' || subscription?.plan === 'premium' || subscription?.plan === 'yearly' || subscription?.plan === 'monthly';

  // Dashboard summary state
  const [growthStatus, setGrowthStatus] = useState<'green' | 'yellow' | 'red' | 'grey'>('grey');
  const [growthLabel, setGrowthLabel] = useState('');
  const [vaccineSummary, setVaccineSummary] = useState<ReturnType<typeof getVaccineSummary> | null>(null);
  const [vaccineStatusColor, setVaccineStatusColor] = useState<'green' | 'yellow' | 'red'>('green');
  const [milestoneStatus, setMilestoneStatus] = useState<'green' | 'yellow' | 'red'>('green');
  const [milestoneRedFlags, setMilestoneRedFlags] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const loadSummary = async () => {
      try {
        // Growth
        const { data, error: gErr } = await supabase
          .from('growth_records')
          .select('*')
          .eq('child_id', child.id)
          .eq('user_id', user?.uid || '');
        if (gErr) throw gErr;
        const records: GrowthRecord[] = (data || []).map((r: any) => ({
          id: r.id, childId: r.child_id, ownerId: r.user_id,
          date: r.date, bsDate: r.bs_date, weight: r.weight, height: r.height,
          ageMonths: r.age_months, notes: r.notes, recordedAt: r.recorded_at,
        }));
        records.sort((a, b) => a.date.localeCompare(b.date));

        if (records.length === 0) {
          setGrowthStatus('grey');
          setGrowthLabel(isNe ? 'नाप भएको छैन' : 'Not yet measured');
        } else {
          const latest = records[records.length - 1];
          const ageM = latest.ageMonths || getAgeInMonths(child.dateOfBirth, latest.date);
          const result = classifyGrowthStatus(latest.weight, latest.height, ageM, child.sex);
          setGrowthStatus(result.status);
          setGrowthLabel(isNe ? result.labelNe : result.labelEn);
        }

        // Vaccines
        const { data: vData, error: vErr } = await supabase
          .from('vaccinations')
          .select('*')
          .eq('child_id', child.id)
          .eq('user_id', user?.uid || '');
        if (vErr) throw vErr;
        const vaccines: VaccineRecord[] = (vData || []).map((r: any) => ({
          id: r.id, childId: r.child_id, ownerId: r.user_id,
          vaccineName: r.vaccine_name, vaccineNameNepali: r.vaccine_name_nepali,
          scheduledDate: r.scheduled_date, givenDate: r.given_date,
          isGiven: r.is_given, isMissed: r.is_missed,
        }));
        const schedule = computeVaccineSchedule(child.dateOfBirth, vaccines, language as 'en' | 'ne');
        const summary = getVaccineSummary(schedule);
        setVaccineSummary(summary);

        if (summary.missed > 0) setVaccineStatusColor('red');
        else if (summary.due > 0) setVaccineStatusColor('yellow');
        else setVaccineStatusColor('green');

        // Milestones
        const ageMonths = getAgeInMonths(child.dateOfBirth, new Date().toISOString().split('T')[0]);
        const milestones = getMilestonesForAge(ageMonths);
        const redFlags = milestones.filter(m => m.flagLevel === 'red').length;
        const yellowFlags = milestones.filter(m => m.flagLevel === 'yellow').length;
        setMilestoneRedFlags(redFlags);
        // Note: we can't know achieved status without loading milestone records
        // Simplified: just check if red flags exist
        // In practice, you'd load milestone records too like MilestoneScreen does
        if (redFlags > 0) setMilestoneStatus('red');
        else if (yellowFlags > 0) setMilestoneStatus('yellow');
        else setMilestoneStatus('green');
      } catch (e) { console.error('Dashboard summary error:', e); }
    };
    if (child) loadSummary();

  }, [child.id, language]);

  const menuItems = [
    { title: t.growthChart,    icon: '📈', color: '#E8602C', screen: 'GrowthChart' as const,  desc: isNe ? 'तौल र उचाइ ट्र्याक गर्नुहोस्' : 'Track weight & height', premium: true },
    { title: isNe ? 'उचाइ नाप' : 'Height Measure', icon: '📏', color: '#795548', screen: 'HeightMeasure' as const, desc: isNe ? 'क्यामेराबाट उचाइ नाप्नुहोस्' : 'Measure height with camera', premium: true },
    { title: t.immunization,   icon: '💉', color: '#3D8B5E', screen: 'Immunization' as const, desc: isNe ? 'खोप तालिका र रिमाइन्डर' : 'Vaccine schedule & reminders', premium: true },
    { title: t.milestones,     icon: '🧠', color: '#6B21A8', screen: 'Milestone' as const,    desc: isNe ? 'विकासका मापदण्ड जाँच्नुहोस्' : 'Check developmental milestones', premium: true },
    { title: isNe ? 'पोषण' : 'Nutrition', icon: '🥦', color: '#3D8B5E', screen: 'Nutrition' as const, params: { child }, desc: isNe ? 'उमेर अनुसार खाना गाइड' : 'Age-wise feeding guide', premium: true },
    { title: t.mchat,          icon: '🔍', color: '#C0392B', screen: 'MChat' as const,        desc: isNe ? 'अटिजम स्क्रिनिङ' : 'Autism screening tool', premium: true },
    { title: t.pdfReport,      icon: '📄', color: '#607D8B', screen: 'PDFReport' as const,    desc: isNe ? 'पूर्ण रिपोर्ट डाउनलोड' : 'Download full report', premium: true },
  ];

  const handleChangePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(isNe ? 'अनुमति अस्वीकृत' : 'Permission denied',
          isNe ? 'क्यामेरा अनुमति चाहिन्छ।' : 'Camera permission is needed.');
        return;
      }
      Alert.alert(
        isNe ? 'फोटो थप्नुहोस्' : 'Add Photo',
        isNe ? 'क्यामेरा वा ग्यालरी प्रयोग गर्नुहोस्।' : 'Use camera or choose from gallery.',
        [
          { text: isNe ? 'क्यामेरा' : 'Camera', onPress: () => pickAndUpload('camera') },
          { text: isNe ? 'ग्यालरी' : 'Gallery', onPress: () => pickAndUpload('gallery') },
          { text: isNe ? 'रद्द गर्नुहोस्' : 'Cancel', style: 'cancel' },
        ],
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not open picker.');
    }
  };

  async function pickAndUpload(source: 'camera' | 'gallery') {
    try {
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true, aspect: [1, 1] })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, allowsEditing: true, aspect: [1, 1] });

      if (result.canceled || !result.assets?.[0]) return;

      const FileSystem = require('expo-file-system');
      const destDir = FileSystem.documentDirectory + 'child-photos/';
      await FileSystem.makeDirectoryAsync(destDir, { intermediates: true });
      const path = destDir + `child-${child.id}-${Date.now()}.jpg`;

      const manip = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 512 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      await FileSystem.copyAsync({ from: manip.uri, to: path });

      // Upload to Supabase Storage using the FileSystem upload helper
      const storagePath = `${user?.uid}/${child.id}/photo.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('child-photos')
        .upload(storagePath, {
          uri: path,
          type: 'image/jpeg',
        } as any, { upsert: true });
      if (uploadError && !uploadError.message?.includes('already exists')) {
        throw uploadError;
      }
      const { data: urlData } = supabase.storage
        .from('child-photos')
        .getPublicUrl(storagePath);

      await supabase.from('children').update({ photo_uri: urlData.publicUrl }).eq('id', child.id);
      child.photoUri = urlData.publicUrl;

      // Force re-render
      navigation.setParams({ child: { ...child, photoUri: urlData.publicUrl } });
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not upload photo.');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      isNe ? 'बच्चाको डेटा मेटाउने?' : "Delete child's data?",
      isNe ? 'यो कार्य पूर्ववत गर्न सकिँदैन।' : 'This action cannot be undone.',
      [
        { text: isNe ? 'रद्द गर्नुहोस्' : 'Cancel' },
        {
          text: isNe ? 'मेटाउनुहोस्' : 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              // Delete child (cascading FK handles related tables)
              const { error } = await supabase
                .from('children')
                .delete()
                .eq('id', child.id);
              if (error) throw error;
              Alert.alert(isNe ? 'हटाइयो' : 'Deleted', `${child.name} ${isNe ? 'हटाइयो' : 'has been removed.'}`);
              navigation.goBack();
            } catch { Alert.alert('Error', isNe ? 'हटाउन सकिएन' : 'Could not delete child.'); }
          }
        }
      ]
    );
  };

  // Child initials (first 2 chars)
  const displayName = child.nameNepali && isNe ? child.nameNepali : child.name;
  const initials = displayName ? displayName.slice(0, 2) : '👶';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      {showOnboarding && <Onboarding onComplete={() => setShowOnboarding(false)} screen="dashboard" />}
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar: back + delete pill */}
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#7A6E65" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.deletePill}>
            <Ionicons name="trash-outline" size={16} color="#C0392B" />
            <Text style={styles.deletePillText}>{isNe ? 'मेटाउनुहोस्' : 'Delete'}</Text>
          </TouchableOpacity>
        </View>

        {/* Avatar — 64×64 circle, tap to change photo */}
        <TouchableOpacity onPress={handleChangePhoto} style={styles.avatarCircle}>
          {child.photoUri ? (
            <>
              <Image source={{ uri: child.photoUri }} style={styles.avatarPhoto} />
              <View style={styles.avatarEditOverlay}>
                <Ionicons name="camera" size={14} color="#FFF" />
              </View>
            </>
          ) : (
            <View style={styles.avatarPlaceholderWrap}>
              <Text style={styles.avatarInitials}>{initials}</Text>
              <View style={styles.avatarEditOverlay}>
                <Ionicons name="camera-outline" size={16} color="#7A6E65" />
              </View>
            </View>
          )}
        </TouchableOpacity>

        {/* Name & info */}
        <Text style={styles.childName}>{displayName}</Text>
        <Text style={styles.childAge}>{formatAge(child.dateOfBirth, language)}</Text>
        <Text style={styles.childDob}>{isNe ? 'जन्म' : 'Born'}: {child.dateOfBirth}</Text>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <Text style={styles.statValue}>{child.birthWeight} kg</Text>
            <Text style={styles.statLabel}>{isNe ? 'जन्मको तौल' : 'Birth Weight'}</Text>
          </View>
          <View style={styles.statChip}>
            <Text style={styles.statValue}>{child.sex === 'male' ? t.male : t.female}</Text>
            <Text style={styles.statLabel}>{isNe ? 'लिंग' : 'Sex'}</Text>
          </View>
        </View>

        {/* HEALTH RECORDS section label */}
        <Text style={styles.sectionTitle}>{isNe ? 'स्वास्थ्य रेकर्ड' : 'HEALTH RECORDS'}</Text>

        {/* Feature Rows */}
        {menuItems.map(item => (
          <TouchableOpacity
            key={item.screen}
            style={styles.menuItem}
            onPress={() => {
              if (item.screen === 'Nutrition') {
                navigation.navigate('Nutrition', { child });
              } else if (item.screen === 'HeightMeasure') {
                navigation.navigate('HeightMeasure', { child });
              } else {
                navigation.navigate(item.screen, { child });
              }
            }}
          >
            <View style={[styles.menuIconBox, { backgroundColor: item.color + '26' }]}>
              <Text style={[styles.menuIcon, { color: item.color }]}>{item.icon}</Text>
            </View>
            <View style={styles.menuTextBox}>
              <View style={styles.titleRow}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                {item.premium && !isPremium && (
                  <View style={styles.premiumBadge}>
                    <Text style={styles.premiumBadgeText}>{isNe ? 'प्रिमियम' : 'Premium'}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.menuDesc}>{item.desc}</Text>
            </View>
            <Text style={styles.chevron}>→</Text>
          </TouchableOpacity>
        ))}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F1EB' },
  container: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  headerTop: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, marginBottom: 8 },
  backBtn: { padding: 8 },
  deletePill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: '#FEE2E2', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#FFF5F5' },
  deletePillText: { fontSize: 12, fontWeight: '600', color: '#C0392B' },

  // Avatar
  avatarCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#E8602C', alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  avatarInitials: { fontSize: 24, fontWeight: '800', color: '#fff' },
  avatarPhoto: { width: 64, height: 64, borderRadius: 32 },

  childName: { fontSize: 17, fontWeight: '700', color: '#1A1A2E', textAlign: 'center', marginTop: 12 },
  childAge: { fontSize: 13, color: '#7A6E65', textAlign: 'center', marginTop: 4 },
  childDob: { fontSize: 13, color: '#7A6E65', textAlign: 'center', marginTop: 2 },

  statsRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 16, paddingHorizontal: 16 },
  statChip: { backgroundColor: '#FDF8F2', borderRadius: 12, borderWidth: 1, borderColor: '#EDE0D4', paddingVertical: 10, paddingHorizontal: 18, alignItems: 'center' },
  statValue: { fontWeight: '700', fontSize: 16, color: '#1A1A2E' },
  statLabel: { fontSize: 12, color: '#7A6E65', marginTop: 2 },

  // Traffic-light summary
  summaryCard: { backgroundColor: '#FDF8F2', marginHorizontal: 15, marginBottom: 16, borderRadius: 16, padding: 16, shadowColor: '#C4956A', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  summaryTitle: { fontSize: 12, fontWeight: '700', color: '#7A6E65', letterSpacing: 1, marginBottom: 12, textTransform: 'uppercase' },
  summaryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F7F1EB' },
  summaryDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  summaryLabel: { fontSize: 14, fontWeight: '600', color: '#1A1A2E', width: 80 },
  summaryValue: { flex: 1, fontSize: 13, fontWeight: '600', textAlign: 'right' },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, color: '#7A6E65', textTransform: 'uppercase', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, marginBottom: 4 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FDF8F2', padding: 14, marginHorizontal: 15, marginBottom: 10, borderRadius: 16, shadowColor: '#C4956A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  menuIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  menuIcon: { fontSize: 20 },
  menuTextBox: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  menuTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
  premiumBadge: { backgroundColor: '#F5A623', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  premiumBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  menuDesc: { fontSize: 13, color: '#7A6E65', marginTop: 2 },
  chevron: { fontSize: 16, color: '#C4956A', fontWeight: '600' },
  subBanner: { margin: 15, backgroundColor: '#E8602C', borderRadius: 16, padding: 16, alignItems: 'center', elevation: 2 },
  subBannerText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  avatarEditOverlay: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12,
    width: 24, height: 24, alignItems: 'center', justifyContent: 'center',
  },
  avatarPlaceholderWrap: {
    width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center',
  },
});
