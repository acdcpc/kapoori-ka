// src/screens/ChildDashboard.tsx
import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

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
    { title: t.growthChart,    icon: '📈', color: '#4CAF50', screen: 'GrowthChart' as const,  desc: isNe ? 'तौल र उचाइ ट्र्याक गर्नुहोस्' : 'Track weight & height', premium: true },
    { title: t.immunization,   icon: '💉', color: '#1a73e8', screen: 'Immunization' as const, desc: isNe ? 'खोप तालिका र रिमाइन्डर' : 'Vaccine schedule & reminders', premium: true },
    { title: t.milestones,     icon: '🧠', color: '#9C27B0', screen: 'Milestone' as const,    desc: isNe ? 'विकासका मापदण्ड जाँच्नुहोस्' : 'Check developmental milestones', premium: true },
    { title: isNe ? 'पोषण' : 'Nutrition', icon: '🥦', color: '#FF9800', screen: 'Nutrition' as const, params: { child }, desc: isNe ? 'उमेर अनुसार खाना गाइड' : 'Age-wise feeding guide', premium: true },
    { title: t.mchat,          icon: '🔍', color: '#FF5722', screen: 'MChat' as const,        desc: isNe ? 'अटिजम स्क्रिनिङ' : 'Autism screening tool', premium: true },
    { title: t.pdfReport,      icon: '📄', color: '#607D8B', screen: 'PDFReport' as const,    desc: isNe ? 'पूर्ण रिपोर्ट डाउनलोड' : 'Download full report', premium: true },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: child.sex === 'male' ? '#1a73e8' : '#e91e8c' }]}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { backgroundColor: child.sex === 'male' ? '#1a73e8' : '#e91e8c' }]}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.headerEmoji}>{child.sex === 'male' ? '👦' : '👧'}</Text>
          <Text style={styles.headerName}>{child.name}</Text>
          {child.nameNepali ? <Text style={styles.headerNameNepali}>{child.nameNepali}</Text> : null}
          <Text style={styles.headerAge}>{formatAge(child.dateOfBirth, language)}</Text>
          <Text style={styles.headerDob}>{isNe ? 'जन्म' : 'Born'}: {child.dateOfBirth}</Text>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>{isNe ? 'जन्मको तौल' : 'Birth Weight'}</Text>
            <Text style={styles.infoValue}>{child.birthWeight} kg</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>{isNe ? 'लिंग' : 'Sex'}</Text>
            <Text style={styles.infoValue}>{child.sex === 'male' ? t.male : t.female}</Text>
          </View>
        </View>

        <View style={styles.hintBox}>
          <Ionicons name="information-circle" size={18} color="#1a73e8" />
          <Text style={styles.hintText}>
            {isNe
              ? 'तलका विकल्पहरूमा थिचेर आफ्नो बच्चाको स्वास्थ्य रेकर्ड व्यवस्थापन गर्नुहोस्।'
              : 'Tap the options below to manage your child\'s health records.'}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>{isNe ? 'स्वास्थ्य रेकर्ड' : 'Health Records'}</Text>

        {menuItems.map(item => (
          <TouchableOpacity
            key={item.screen}
            style={styles.menuItem}
            onPress={() => {
              if (item.screen === 'Nutrition') {
                navigation.navigate('Nutrition', { child });
              } else {
                navigation.navigate(item.screen, { child });
              }
            }}
          >
            <View style={[styles.menuIconBox, { backgroundColor: item.color + '20' }]}>
              <Text style={styles.menuIcon}>{item.icon}</Text>
            </View>
            <View style={styles.menuTextBox}>
              <View style={styles.titleRow}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                {item.premium && !isPremium && (
                  <View style={styles.premiumBadge}>
                    <Ionicons name="star" size={10} color="#fff" />
                    <Text style={styles.premiumBadgeText}>{isNe ? 'प्रिमियम' : 'Premium'}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.menuDesc}>{item.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color="#999" />
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
  safeArea: { flex: 1 },
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scrollContent: { paddingBottom: 40 },
  header: { paddingTop: 10, paddingBottom: 30, paddingHorizontal: 20, alignItems: 'center', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTop: { width: '100%', flexDirection: 'row', justifyContent: 'flex-start', marginBottom: 10 },
  backBtn: { padding: 8 },
  headerEmoji: { fontSize: 60, marginBottom: 10 },
  headerName: { fontSize: 26, fontWeight: '800', color: '#fff' },
  headerNameNepali: { fontSize: 18, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  headerAge: { fontSize: 16, color: 'rgba(255,255,255,0.95)', marginTop: 8, fontWeight: '600' },
  headerDob: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  infoRow: { flexDirection: 'row', padding: 15, gap: 12, marginTop: -20 },
  infoCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 16, alignItems: 'center', elevation: 4 },
  infoLabel: { fontSize: 12, color: '#888', marginBottom: 6, fontWeight: '600', textTransform: 'uppercase' },
  infoValue: { fontSize: 18, fontWeight: '700', color: '#222' },
  hintBox: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 15, marginBottom: 4, backgroundColor: '#E8F0FE', borderRadius: 10, padding: 10, gap: 8 },
  hintText: { flex: 1, fontSize: 12, color: '#1a73e8', lineHeight: 18 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#888', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, marginHorizontal: 15, marginBottom: 12, borderRadius: 16, elevation: 2 },
  menuIconBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  menuIcon: { fontSize: 24 },
  menuTextBox: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  menuTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  premiumBadge: { backgroundColor: '#FF9800', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, flexDirection: 'row', alignItems: 'center', gap: 2 },
  premiumBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  menuDesc: { fontSize: 12, color: '#999', marginTop: 2 },
  subBanner: { margin: 15, backgroundColor: '#1a73e8', borderRadius: 16, padding: 16, alignItems: 'center', elevation: 2 },
  subBannerText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
