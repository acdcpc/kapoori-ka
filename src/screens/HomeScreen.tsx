// src/screens/HomeScreen.tsx
import React, { useContext, useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { collection, getDocs, query, where, doc, writeBatch } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { db, auth } from '../../firebase';
import { useAuth } from '../context/AuthContext';
import { Child } from '../types';
import { LanguageContext } from '../context/LanguageContext';
import { RootStackParamList } from '../navigation/types';
import { translations } from '../i18n/translations';
import { formatAge } from '../utils/growthCalculations';
import { WHATSAPP_NUMBER } from '../constants';

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

const HOW_TO_STEPS_EN = [
  { icon: '🔵', text: 'Tap the blue ⊕ button at the bottom to add your child' },
  { icon: '📈', text: 'Track Growth — record weight & height' },
  { icon: '💉', text: 'Immunization — see & track vaccines' },
  { icon: '🧠', text: 'Milestones — check developmental progress' },
  { icon: '🥦', text: 'Nutrition — age-specific feeding guides' },
];

const HOW_TO_STEPS_NE = [
  { icon: '🔵', text: 'आफ्नो बच्चा थप्न तलको निलो ⊕ बटन थिच्नुहोस्।' },
  { icon: '📈', text: 'वृद्धि — तौल र उचाइ रेकर्ड गर्नुहोस्' },
  { icon: '💉', text: 'खोप — खोप तालिका हेर्नुहोस् र ट्र्याक गर्नुहोस्' },
  { icon: '🧠', text: 'विकास — बच्चाको शारीरिक र मानसिक विकास जाँच्नुहोस्।' },
  { icon: '🥦', text: 'पोषण — उमेर अनुसार बच्चालाई खुवाउने तरिका' },
];

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { language, setLanguage } = useContext(LanguageContext);
  const { signOutUser } = useAuth();
  const t = translations[language];
  const isNe = language === 'ne';
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGuide, setShowGuide] = useState(false);

  const handleLogout = async () => {
    Alert.alert(
      isNe ? 'लग आउट गर्नुहोस्?' : 'Logout?',
      isNe ? 'के तपाई लग आउट गर्न निश्चित हुनुहुन्छ?' : 'Are you sure you want to logout?',
      [
        { text: isNe ? 'रद्द गर्नुहोस्' : 'Cancel', onPress: () => {} },
        {
          text: isNe ? 'लग आउट' : 'Logout',
          onPress: async () => {
            try {
              await signOutUser();
            } catch (error) {
              Alert.alert('Error', 'Failed to logout');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const openWhatsApp = () => {
    const message = isNe ? 'नमस्ते, मलाई सहायता चाहिन्छ।' : 'Hello, I need help.';
    const url = `whatsapp://send?phone=${WHATSAPP_NUMBER}&text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'WhatsApp is not installed or could not be opened.');
    });
  };

  const steps = isNe ? HOW_TO_STEPS_NE : HOW_TO_STEPS_EN;

  const claimExistingRecords = async (user: any) => {
    try {
      const userPhone = user.phoneNumber?.replace('+977', '');
      if (!userPhone) return;
      const q = query(
        collection(db, 'children'),
        where('parentPhone', '==', userPhone),
        where('ownerId', '==', '')
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) return;
      const batch = writeBatch(db);
      for (const childDoc of snapshot.docs) {
        const childId = childDoc.id;
        batch.update(doc(db, 'children', childId), { ownerId: user.uid });
        const growthQ = query(collection(db, 'growth_records'), where('childId', '==', childId), where('ownerId', '==', ''));
        const growthSnap = await getDocs(growthQ);
        growthSnap.forEach(d => batch.update(doc(db, 'growth_records', d.id), { ownerId: user.uid }));
        const vaccQ = query(collection(db, 'vaccinations'), where('childId', '==', childId), where('ownerId', '==', ''));
        const vaccSnap = await getDocs(vaccQ);
        vaccSnap.forEach(d => batch.update(doc(db, 'vaccinations', d.id), { ownerId: user.uid }));
      }
      await batch.commit();
    } catch (error) {
      console.error('Claiming records error:', error);
    }
  };

  const loadChildren = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) { setChildren([]); return; }
      await claimExistingRecords(user);
      const q = query(collection(db, 'children'), where('ownerId', '==', user.uid));
      const snapshot = await getDocs(q);
      const loaded: Child[] = [];
      snapshot.forEach(d => loaded.push({ id: d.id, ...d.data() } as Child));
      setChildren(loaded.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error('Load children error:', error);
      Alert.alert('Error', 'Could not load children list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadChildren);
    return unsubscribe;
  }, [navigation]);

  const renderChild = ({ item }: { item: Child }) => (
    <TouchableOpacity
      style={styles.childCard}
      onPress={() => navigation.navigate('ChildDashboard', { child: item })}
      activeOpacity={0.7}
    >
      <View style={styles.childCardContent}>
        {/* Avatar with gradient feel */}
        <View 
          style={[
            styles.avatar, 
            { 
              backgroundColor: item.sex === 'male' ? '#E3F2FD' : '#FCE4EC',
              borderWidth: 2,
              borderColor: item.sex === 'male' ? '#1a73e8' : '#e91e8c',
            }
          ]}
        >
          <Text style={styles.avatarText}>
            {item.sex === 'male' ? '👦' : '👧'}
          </Text>
        </View>

        {/* Child Info */}
        <View style={styles.childInfo}>
          <Text style={styles.childName}>
            {item.nameNepali && isNe ? item.nameNepali : item.name}
          </Text>
          {item.nameNepali && isNe && item.name && (
            <Text style={styles.childNameRoman}>{item.name}</Text>
          )}
          {!isNe && item.nameNepali && (
            <Text style={styles.childNameNepali}>{item.nameNepali}</Text>
          )}
          <View style={styles.childMeta}>
            <View style={styles.chip}>
              <Text style={styles.chipText}>{item.sex === 'male' ? (isNe ? 'छोरा' : 'Boy') : (isNe ? 'छोरी' : 'Girl')}</Text>
            </View>
            <Text style={styles.childAge}>
              {item.dateOfBirth ? String(formatAge(item.dateOfBirth, language) || '') : (isNe ? 'मिति अज्ञात' : 'Date unknown')}
            </Text>
          </View>
        </View>

        {/* Action Icons */}
        <View style={styles.childActions}>
          <Ionicons name="chevron-forward" size={24} color="#bbb" />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Header Row */}
      <View style={styles.headerTop}>
        <View style={styles.headerIconWrap}>
          <TouchableOpacity style={styles.aboutBtn} onPress={() => navigation.navigate('About')}>
            <Ionicons name="information-circle-outline" size={24} color="#1a73e8" />
          </TouchableOpacity>
          <View style={styles.headerHint} pointerEvents="none">
            <Text style={styles.headerHintText}>{isNe ? 'लेखकको बारेमा' : 'About the Author'}</Text>
          </View>
        </View>
        <View style={styles.langToggle}>
          <TouchableOpacity
            style={[styles.langBtn, language === 'ne' && styles.langBtnActive]}
            onPress={() => setLanguage('ne')}
          >
            <Text style={[styles.langBtnText, language === 'ne' && styles.langBtnTextActive]}>नेपाली</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.langBtn, language === 'en' && styles.langBtnActive]}
            onPress={() => setLanguage('en')}
          >
            <Text style={[styles.langBtnText, language === 'en' && styles.langBtnTextActive]}>English</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.headerIconWrap}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#F44336" />
          </TouchableOpacity>
          <View style={styles.headerHint} pointerEvents="none">
            <Text style={styles.headerHintText}>{isNe ? 'लग आउट' : 'Logout'}</Text>
          </View>
        </View>
      </View>

      {/* Welcome / How-to Banner */}
      <TouchableOpacity
        style={styles.welcomeBanner}
        onPress={() => setShowGuide(!showGuide)}
        activeOpacity={0.85}
      >
        <View style={styles.welcomeRow}>
          <Text style={styles.welcomeEmoji}></Text>
          <View style={styles.welcomeTextBox}>
            <Text style={styles.welcomeTitle}>
              {isNe ? 'कपूरी क मा स्वागत छ!' : 'Welcome to Kapoori Ka!'}
            </Text>
            <Text style={styles.welcomeSubtitle}>
              {isNe
                ? 'एप कसरी चलाउने भनेर थाहा पाउन यहाँ क्लिक गर्नुहोस्'
                : "Click here to know how to use the app"}
            </Text>
          </View>
          <Ionicons
            name={showGuide ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#1a73e8"
          />
        </View>

        {showGuide && (
          <View style={styles.stepsBox}>
            <Text style={styles.stepsHeading}>
              {isNe ? '📋 एप प्रयोग गर्ने तरिका :' : '📋 How to use this app:'}
            </Text>
            {steps.map((s, i) => (
              <View key={i} style={styles.stepRow}>
                <Text style={styles.stepIcon}>{s.icon}</Text>
                <Text style={styles.stepText}>{s.text}</Text>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator size="large" color="#1a73e8" style={styles.loader} />
      ) : children.length === 0 ? (
        <ScrollView contentContainerStyle={styles.emptyState}>
          <Text style={styles.emptyIcon}></Text>
          <Text style={styles.emptyText}>{t.noChildren}</Text>
          <Text style={styles.hintText}>
            {isNe
              ? 'तलको निलो ⊕ बटन थिचेर आफ्नो बच्चाको प्रोफाइल बनाउनुहोस्।'
              : 'Tap the blue ⊕ button below to create your child\'s profile.'}
          </Text>
          {/* Feature quick-look for empty state */}
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
        />
      )}

      {/* WhatsApp Support Card */}
      {children.length > 0 && (
        <View style={styles.whatsappCard}>
          <TouchableOpacity style={styles.whatsappBtn} onPress={openWhatsApp} activeOpacity={0.8}>
            <Ionicons name="logo-whatsapp" size={22} color="#fff" />
            <Text style={styles.whatsappBtnTxt}>{isNe ? 'व्हाट्सअप सहायता' : 'WhatsApp Support'}</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddChild')}>
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      {/* FAB label hint */}
      <View style={styles.fabHint} pointerEvents="none">
        <Text style={styles.fabHintText}>
          {isNe ? 'बच्चा थप्नुहोस्' : 'Add Child'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  headerTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 8 },
  aboutBtn: { padding: 8, marginRight: 4 },
  langToggle: { flex: 1, flexDirection: 'row', borderRadius: 8, backgroundColor: '#e0e0e0', padding: 4 },
  langBtn: { flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: 6 },
  langBtnActive: { backgroundColor: '#1a73e8' },
  langBtnText: { color: '#555', fontWeight: '600' },
  langBtnTextActive: { color: '#fff' },

  welcomeBanner: {
    marginHorizontal: 12, marginTop: 6, marginBottom: 4,
    backgroundColor: '#E8F0FE', borderRadius: 14, padding: 14,
    borderLeftWidth: 4, borderLeftColor: '#1a73e8',
  },
  welcomeRow: { flexDirection: 'row', alignItems: 'center' },
  welcomeEmoji: { fontSize: 32, marginRight: 10 },
  welcomeTextBox: { flex: 1 },
  welcomeTitle: { fontSize: 15, fontWeight: '700', color: '#1a73e8' },
  welcomeSubtitle: { fontSize: 12, color: '#555', marginTop: 2 },
  stepsBox: { marginTop: 12, backgroundColor: '#fff', borderRadius: 10, padding: 12 },
  stepsHeading: { fontSize: 13, fontWeight: '700', color: '#333', marginBottom: 8 },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 7 },
  stepIcon: { fontSize: 18, marginRight: 10 },
  stepText: { fontSize: 13, color: '#444', flex: 1, lineHeight: 18 },

  list: { paddingHorizontal: 12, paddingBottom: 160 },
  childCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  childCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    
  },
  avatar: { 
    width: 56, 
    height: 56, 
    borderRadius: 28, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginRight: 14 
  },
  avatarText: { fontSize: 28 },
  childInfo: { flex: 1 },
  childName: { fontSize: 17, fontWeight: '700', color: '#222' },
  childNameNepali: { fontSize: 14, color: '#555', marginTop: 2 },
  childNameRoman: { fontSize: 12, color: '#888', marginTop: 1 },
  childMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 },
  chip: { backgroundColor: '#E8F0FE', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  chipText: { fontSize: 11, color: '#1a73e8', fontWeight: '600' },
  childAge: { fontSize: 13, color: '#888' },
  childActions: { paddingRight: 4 },

  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40, paddingBottom: 160 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontSize: 16, color: '#888', textAlign: 'center', lineHeight: 24 },
  hintText: { fontSize: 13, color: '#1a73e8', textAlign: 'center', marginTop: 10, fontStyle: 'italic' },
  featurePreview: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 20, gap: 10 },
  featureChip: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, width: 80, elevation: 2 },
  featureChipIcon: { fontSize: 24, marginBottom: 4 },
  featureChipLabel: { fontSize: 11, color: '#555', fontWeight: '600', textAlign: 'center' },

  loader: { flex: 1 },
  fab: {
    position: 'absolute', bottom: 50, right: 24,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#1a73e8', alignItems: 'center', justifyContent: 'center',
    elevation: 6,
  },
  fabHint: {
    position: 'absolute', bottom: 54, right: 92,
    backgroundColor: '#333', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  fabHintText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  logoutBtn: { padding: 8, marginLeft: 4 },
  headerIconWrap: { alignItems: 'center' },
  headerHint: { marginTop: 2 },
  headerHintText: { fontSize: 9, color: '#999', fontWeight: '500' },
  whatsappCard: { paddingHorizontal: 16, paddingBottom: 100, paddingTop: 12 },
  whatsappBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#25D366', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 24,
    gap: 10, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 6,
  },
  whatsappBtnTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
});