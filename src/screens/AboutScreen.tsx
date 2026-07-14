// src/screens/AboutScreen.tsx
import React, { useContext } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LanguageContext } from '../context/LanguageContext';
import { translations } from '../i18n/translations';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'About'>;

export default function AboutScreen({ navigation }: Props) {
  const { language } = useContext(LanguageContext);
  const t = translations[language];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.about}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.appName}</Text>
          <Text style={styles.appTagline}>{t.appTagline}</Text>
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color="#1a73e8" />
            <Text style={styles.infoText}>
              {language === 'en'
                ? 'A comprehensive digital health companion for Nepali parents to track their child\'s growth, development, and immunization.'
                : 'नेपाली अभिभावकहरूको लागि एक  डिजिटल स्वास्थ्य साथी जो बच्चाको वृद्धि, विकास र खोपको ट्र्याकिङ गर्न मदद गर्छ।'}
            </Text>
          </View>
        </View>

        {/* Author Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.aboutAuthor}</Text>
          
          <View style={styles.authorCard}>
            <View style={styles.authorHeader}>
              <View style={styles.authorAvatar}>
                <Ionicons name="person-circle" size={60} color="#1a73e8" />
              </View>
              <View style={styles.authorInfo}>
                <Text style={styles.authorName}>{t.authorName}</Text>
                <Text style={styles.authorTitle}>{t.authorTitle}</Text>
                <Text style={styles.authorSpecialty}>{t.authorSpecialty}</Text>
              </View>
            </View>

            <View style={styles.bioBox}>
              <Text style={styles.bioText}>{t.authorBio}</Text>
            </View>

            {/* Contact Links */}
            <View style={styles.contactGrid}>
              <TouchableOpacity 
                style={styles.contactBtn}
                onPress={() => Linking.openURL('https://www.youtube.com/@dr.prakashthapa')}
              >
                <Ionicons name="logo-youtube" size={20} color="#FF0000" />
                <Text style={styles.contactBtnText}>YouTube</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.contactBtn}
                onPress={() => Linking.openURL('https://vt.tiktok.com/ZSQ7Q58QD/')}
              >
                <Ionicons name="logo-tiktok" size={20} color="#000000" />
                <Text style={styles.contactBtnText}>TikTok</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.contactBtn}
                onPress={() => Linking.openURL('https://wa.me/9779704533141')}
              >
                <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                <Text style={styles.contactBtnText}>WhatsApp</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.contactBtn}
                onPress={() => Linking.openURL('mailto:picuour@gmail.com')}
              >
                <Ionicons name="mail" size={20} color="#EA4335" />
                <Text style={styles.contactBtnText}>Email</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Sources & Disclaimers */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{language === 'en' ? 'Sources & References' : 'स्रोत र सन्दर्भ'}</Text>
          <View style={styles.sourceBox}>
            <Text style={styles.sourceTitle}>{language === 'en' ? 'Developmental Milestones' : 'विकास मापदण्ड'}</Text>
            <Text style={styles.sourceText}>• WHO Developmental Milestones (2012)</Text>
            <Text style={styles.sourceText}>• CDC Learn the Signs. Act Early. (2022)</Text>
          </View>

          <View style={styles.sourceBox}>
            <Text style={styles.sourceTitle}>{language === 'en' ? 'Growth Charts' : 'वृद्धि चार्ट'}</Text>
            <Text style={styles.sourceText}>• WHO Child Growth Standards (2006)</Text>
          </View>

          <View style={styles.sourceBox}>
            <Text style={styles.sourceTitle}>{language === 'en' ? 'Immunization' : 'खोप'}</Text>
            <Text style={styles.sourceText}>• Nepal National Immunization Programme (NIP)</Text>
          </View>
        </View>

        {/* Disclaimer */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{language === 'en' ? 'Important Disclaimer' : 'महत्त्वपूर्ण सूचना'}</Text>
          <View style={styles.disclaimerBox}>
            <Text style={styles.disclaimerText}>
              {language === 'en'
                ? 'This application is designed for educational and informational purposes only. The content provided is based on WHO, CDC, and NIP guidelines and is not a substitute for professional medical advice, diagnosis, or treatment.'
                : 'यो एप्लिकेसन शैक्षिक र सूचनामूलक प्रयोजनका लागि मात्र तयार गरिएको हो। यहाँ राखिएका सामग्रीहरू विश्व स्वास्थ्य संगठन (WHO), CDC र नेपालको राष्ट्रिय खोप कार्यक्रम (NIP) को निर्देशिकामा आधारित छन्। कृपया ध्यान दिनुहोला, यो सामग्री डाक्टरको  सल्लाह, रोगको पहिचान वा उपचारको विकल्प होइन।यो कुनै अस्पताल वा डाक्टरको विकल्प नभएकाले स्वास्थ्य सम्बन्धी समस्या परेमा सधैँ विशेषज्ञ डाक्टरसँगै परामर्श लिनुहोला।'}
            </Text>
          </View>
        </View>

        {/* Version Info */}
        <View style={styles.section}>
          <Text style={styles.versionText}>
            {language === 'en' ? 'Version 1.0.0' : 'संस्करण १.०.०'}
          </Text>
          <Text style={styles.versionText}>
            {language === 'en' ? 'Last Updated: June 2026' : 'अन्तिम अपडेट: जुन २०२६'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backBtn: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  contentContainer: { paddingHorizontal: 12, paddingVertical: 16, paddingBottom: 30 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 12 },
  appTagline: { fontSize: 14, color: '#666', marginBottom: 12, lineHeight: 20 },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 12,
    alignItems: 'flex-start',
  },
  infoText: { flex: 1, marginLeft: 10, fontSize: 13, color: '#0D47A1', lineHeight: 20 },
  authorCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, elevation: 1 },
  authorHeader: { flexDirection: 'row', marginBottom: 16 },
  authorAvatar: { marginRight: 12 },
  authorInfo: { flex: 1 },
  authorName: { fontSize: 16, fontWeight: '700', color: '#333' },
  authorTitle: { fontSize: 12, fontWeight: '600', color: '#1a73e8', marginTop: 2 },
  authorSpecialty: { fontSize: 12, color: '#666', marginTop: 2 },
  bioBox: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  bioText: { fontSize: 13, color: '#444', lineHeight: 20 },
  contactGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  contactBtn: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 10,
    gap: 8,
  },
  contactBtnText: { fontSize: 12, fontWeight: '600', color: '#333' },
  sourceBox: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#1a73e8',
  },
  sourceTitle: { fontSize: 12, fontWeight: '700', color: '#333', marginBottom: 8 },
  sourceText: { fontSize: 12, color: '#666', marginBottom: 4, lineHeight: 18 },
  disclaimerBox: {
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
  },
  disclaimerText: { fontSize: 12, color: '#E65100', lineHeight: 20 },
  versionText: { fontSize: 12, color: '#999', textAlign: 'center', marginBottom: 6 },
});
