// src/screens/ChildDashboard.tsx
import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { doc, deleteDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { Alert } from 'react-native';
import { LanguageContext } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../navigation/types';
import { translations } from '../i18n/translations';
import { formatAge } from '../utils/growthCalculations';

type Props = NativeStackScreenProps<RootStackParamList, 'ChildDashboard'>;

export default function ChildDashboard({ route, navigation }: Props) {
  const { child } = route.params;
  const { language } = useContext(LanguageContext);
  const { subscription } = useAuth();
  const t = translations[language];
  const isNe = language === 'ne';

  const isPremium = subscription?.status === 'active' || subscription?.plan === 'premium';

  const menuItems = [
    { title: t.growthChart,    icon: '📈', color: '#E8602C', screen: 'GrowthChart' as const,  desc: isNe ? 'तौल र उचाइ ट्र्याक गर्नुहोस्' : 'Track weight & height', premium: true },
    { title: isNe ? 'उचाइ नाप' : 'Height Measure', icon: '📏', color: '#795548', screen: 'HeightMeasure' as const, desc: isNe ? 'क्यामेराबाट उचाइ नाप्नुहोस्' : 'Measure height with camera', premium: true },
    { title: t.immunization,   icon: '💉', color: '#3D8B5E', screen: 'Immunization' as const, desc: isNe ? 'खोप तालिका र रिमाइन्डर' : 'Vaccine schedule & reminders', premium: true },
    { title: t.milestones,     icon: '🧠', color: '#6B21A8', screen: 'Milestone' as const,    desc: isNe ? 'विकासका मापदण्ड जाँच्नुहोस्' : 'Check developmental milestones', premium: true },
    { title: isNe ? 'पोषण' : 'Nutrition', icon: '🥦', color: '#3D8B5E', screen: 'Nutrition' as const, params: { child }, desc: isNe ? 'उमेर अनुसार खाना गाइड' : 'Age-wise feeding guide', premium: true },
    { title: t.mchat,          icon: '🔍', color: '#C0392B', screen: 'MChat' as const,        desc: isNe ? 'अटिजम स्क्रिनिङ' : 'Autism screening tool', premium: true },
    { title: t.pdfReport,      icon: '📄', color: '#607D8B', screen: 'PDFReport' as const,    desc: isNe ? 'पूर्ण रिपोर्ट डाउनलोड' : 'Download full report', premium: true },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar: back + delete */}
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#7A6E65" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => {
            Alert.alert(
              isNe ? 'बच्चा हटाउने?' : 'Delete Child?',
              isNe
                ? `के तपाईं ${child.name} लाई स्थायी रूपमा हटाउन चाहनुहुन्छ? यो कार्य पूर्ववत गर्न सकिने छैन।`
                : `Are you sure you want to permanently delete ${child.name}? This cannot be undone.`,
              [
                { text: isNe ? 'रद्द गर्नुहोस्' : 'Cancel' },
                {
                  text: isNe ? 'हटाउनुहोस्' : 'Delete', style: 'destructive',
                  onPress: async () => {
                    try {
                      await deleteDoc(doc(db, 'children', child.id));
                      const collections = ['growth_records', 'vaccinations', 'milestones', 'mchat_responses'];
                      for (const col of collections) {
                        const q = query(collection(db, col), where('childId', '==', child.id));
                        const snap = await getDocs(q);
                        const batch: Promise<void>[] = [];
                        snap.forEach(d => batch.push(deleteDoc(doc(db, col, d.id))));
                        await Promise.all(batch);
                      }
                      Alert.alert(isNe ? 'हटाइयो' : 'Deleted', `${child.name} ${isNe ? 'हटाइयो' : 'has been removed.'}`);
                      navigation.goBack();
                    } catch { Alert.alert('Error', isNe ? 'हटाउन सकिएन' : 'Could not delete child.'); }
                  }
                }
              ]
            );
          }} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={22} color="#C0392B" />
          </TouchableOpacity>
        </View>

        {/* Avatar */}
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarEmoji}>{child.sex === 'male' ? '👦' : '👧'}</Text>
        </View>

        {/* Name & info */}
        <Text style={styles.childName}>{child.name}</Text>
        {child.nameNepali ? <Text style={styles.childNameNepali}>{child.nameNepali}</Text> : null}
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

        {/* Divider */}
        <View style={styles.divider} />

        {/* Section */}
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

        {!isPremium && (
          <TouchableOpacity style={styles.subBanner} onPress={() => navigation.navigate('Subscription')}>
            <Text style={styles.subBannerText}>✨ {isNe ? 'प्रिमियममा अपग्रेड गर्नुहोस् र सबै सुविधाहरू खोल्नुहोस् ›' : 'Upgrade to Premium & Unlock All Features ›'}</Text>
          </TouchableOpacity>
        )}
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
  deleteBtn: { padding: 8 },
  avatarCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#E8602C', alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  avatarEmoji: { fontSize: 32, color: '#fff' },
  childName: { fontSize: 22, fontWeight: '800', color: '#1A1A2E', textAlign: 'center', marginTop: 12 },
  childNameNepali: { fontSize: 15, color: '#7A6E65', textAlign: 'center', marginTop: 2 },
  childAge: { fontSize: 16, color: '#7A6E65', textAlign: 'center', marginTop: 4 },
  childDob: { fontSize: 13, color: '#7A6E65', textAlign: 'center', marginTop: 2 },
  statsRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 16, paddingHorizontal: 16 },
  statChip: { backgroundColor: '#FDF8F2', borderRadius: 12, borderWidth: 1, borderColor: '#EDE0D4', paddingVertical: 10, paddingHorizontal: 18, alignItems: 'center' },
  statValue: { fontWeight: '700', fontSize: 16, color: '#1A1A2E' },
  statLabel: { fontSize: 12, color: '#7A6E65', marginTop: 2 },
  divider: { backgroundColor: '#EDE0D4', height: 1, marginHorizontal: 20, marginTop: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#7A6E65', letterSpacing: 1.2, textTransform: 'uppercase', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FDF8F2', padding: 14, marginHorizontal: 15, marginBottom: 10, borderRadius: 16, shadowColor: '#C4956A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  menuIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  menuIcon: { fontSize: 20 },
  menuTextBox: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  menuTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
  premiumBadge: { backgroundColor: '#F5A623', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  premiumBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  menuDesc: { fontSize: 13, color: '#7A6E65', marginTop: 2 },
  chevron: { fontSize: 20, color: '#C4956A', fontWeight: '600' },
  subBanner: { margin: 15, backgroundColor: '#E8602C', borderRadius: 16, padding: 16, alignItems: 'center', elevation: 2 },
  subBannerText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
