import React, { useContext } from 'react';
import {
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { LanguageContext } from '../context/LanguageContext';

const copy = {
  en: {
    navFeatures: 'Features', navHow: 'How it works', navTrust: 'Privacy', navStart: 'Get started',
    eyebrow: 'A calmer way to care for little ones',
    title: 'Your child’s health story, in one gentle place.',
    body: 'Kapoori Ka helps Nepali parents keep growth, vaccines, milestones, and everyday care together — simple, private, and easy to understand.',
    primary: 'Start your child’s profile', secondary: 'Explore the app',
    heroNote: 'Bilingual by design · Made for families in Nepal',
    sectionLabel: 'Everything you need, without the clutter',
    sectionTitle: 'Small steps. Clear records. Better conversations.',
    sectionBody: 'From the first vaccine to the next clinic visit, Kapoori Ka turns important moments into a clear, shareable health story.',
    features: [
      ['01', 'Growth, at a glance', 'Track height and weight over time with familiar WHO growth references.'],
      ['02', 'Vaccines, never forgotten', 'See what is due, what is next, and what has already been given.'],
      ['03', 'Milestones with context', 'Notice development over time and know when to talk with a professional.'],
      ['04', 'Care that stays with you', 'Keep useful notes, nutrition guidance, and clinic-ready reports in one place.'],
    ],
    howLabel: 'A simple rhythm for every caregiver', howTitle: 'Set up once. Come back whenever you need.',
    steps: [['Create a profile', 'Add the basics about your child in a few calm, guided steps.'], ['Keep it current', 'Record measurements, vaccines, milestones, and care notes as life happens.'], ['Share with confidence', 'Bring a clear summary to your next conversation with a health professional.']],
    trustLabel: 'Built around trust', trustTitle: 'Your family’s information deserves care.',
    trustBody: 'Kapoori Ka is designed with privacy-first choices: clear explanations, secure account access, and control over the records you create. Health guidance is educational and never replaces a qualified clinician.',
    trustItems: [['Private by default', 'Your child’s records are not public.'], ['Bilingual from the start', 'Switch between नेपाली and English whenever you need.'], ['Designed for real life', 'Readable, forgiving, and friendly on small screens.']],
    ctaTitle: 'Make the next check-in a little easier.', ctaBody: 'Start building your child’s digital health book today.', cta: 'Open Kapoori Ka', footer: 'A bilingual child health assistant for Nepali families.', disclaimer: 'Educational information only. Always consult a qualified health professional for personal medical advice.', support: 'Need help? Contact us',
  },
  ne: {
    navFeatures: 'सुविधाहरू', navHow: 'कसरी चल्छ', navTrust: 'गोपनीयता', navStart: 'सुरु गर्नुहोस्',
    eyebrow: 'सानाको हेरचाह गर्ने शान्त तरिका',
    title: 'तपाईंको बच्चाको स्वास्थ्य कथा, एउटै सजिलो ठाउँमा।',
    body: 'कपूरी कले नेपाली अभिभावकलाई वृद्धि, खोप, विकास र दैनिक हेरचाहका कुरा सरल, सुरक्षित र बुझ्न सजिलो तरिकाले राख्न मद्दत गर्छ।',
    primary: 'बच्चाको प्रोफाइल सुरु गर्नुहोस्', secondary: 'एप हेर्नुहोस्',
    heroNote: 'नेपाली र अंग्रेजीमा · नेपालका परिवारका लागि',
    sectionLabel: 'झन्झटबिना चाहिने सबै कुरा',
    sectionTitle: 'सानो कदम। स्पष्ट रेकर्ड। राम्रो कुराकानी।',
    sectionBody: 'पहिलो खोपदेखि अर्को स्वास्थ्य जाँचसम्म, कपूरी कले महत्त्वपूर्ण क्षणलाई स्पष्ट स्वास्थ्य कथामा जोड्छ।',
    features: [['०१', 'वृद्धि एकै नजरमा', 'WHO का परिचित सन्दर्भसँग उचाइ र तौल समयअनुसार राख्नुहोस्।'], ['०२', 'खोप बिर्सनु पर्दैन', 'कुन खोप बाँकी छ, आउँदैछ र दिइसकिएको छ भन्ने हेर्नुहोस्।'], ['०३', 'विकासलाई सन्दर्भसहित', 'बच्चाको विकास हेर्नुहोस् र विशेषज्ञसँग कहिले कुरा गर्ने बुझ्नुहोस्।'], ['०४', 'हेरचाह सधैं साथमा', 'पोषण सामग्री र क्लिनिकमा लैजान मिल्ने रिपोर्ट एउटै ठाउँमा राख्नुहोस्।']],
    howLabel: 'हरेक अभिभावकका लागि सरल तरिका', howTitle: 'एकपटक सुरु गर्नुहोस्। आवश्यक पर्दा फेरि खोल्नुहोस्।',
    steps: [['प्रोफाइल बनाउनुहोस्', 'केही सजिला चरणमा बच्चाको आधारभूत जानकारी राख्नुहोस्।'], ['जानकारी थप्दै जानुहोस्', 'जीवनसँगै नाप, खोप, विकास र हेरचाहका कुरा राख्नुहोस्।'], ['विश्वासका साथ साझा गर्नुहोस्', 'स्वास्थ्यकर्मीसँगको अर्को कुराकानीमा स्पष्ट सारांश लैजानुहोस्।']],
    trustLabel: 'विश्वासलाई केन्द्रमा राखेर', trustTitle: 'तपाईंको परिवारको जानकारीको हेरचाह हुनुपर्छ।',
    trustBody: 'कपूरी क स्पष्ट जानकारी, सुरक्षित खाता र तपाईंले बनाएका रेकर्डमाथिको नियन्त्रणसहित गोपनीयतालाई प्राथमिकता दिएर बनाइएको हो। स्वास्थ्यसम्बन्धी सामग्री शैक्षिक हो र योग्य स्वास्थ्यकर्मीको सल्लाहको विकल्प होइन।',
    trustItems: [['पहिलेदेखि निजी', 'तपाईंको बच्चाको रेकर्ड सार्वजनिक हुँदैन।'], ['सुरुदेखि द्विभाषी', 'आवश्यकताअनुसार नेपाली र अंग्रेजी बदल्नुहोस्।'], ['दैनिक जीवनका लागि', 'सानो स्क्रिनमा पनि पढ्न र चलाउन सजिलो।']],
    ctaTitle: 'अर्को स्वास्थ्य जाँचलाई अलि सजिलो बनाउनुहोस्।', ctaBody: 'आजै बच्चाको डिजिटल स्वास्थ्य किताब सुरु गर्नुहोस्।', cta: 'कपूरी क खोल्नुहोस्', footer: 'नेपाली परिवारका लागि द्विभाषी बाल स्वास्थ्य सहायक।', disclaimer: 'शैक्षिक जानकारी मात्र। व्यक्तिगत स्वास्थ्य सल्लाहका लागि योग्य स्वास्थ्यकर्मीसँग सधैं परामर्श गर्नुहोस्।', support: 'सहायता चाहियो? सम्पर्क गर्नुहोस्',
  },
};

type Lang = 'en' | 'ne';

export default function WebsiteScreen() {
  const { language, setLanguage } = useContext(LanguageContext);
  const t = copy[language as Lang] || copy.ne;
  const { width } = useWindowDimensions();
  const compact = width < 760;

  const jump = (id: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.nav}>
        <Pressable onPress={() => jump('top')} style={styles.brand} accessibilityRole="link" accessibilityLabel="Kapoori Ka home">
          <Image source={require('../../assets/kapoori_ka_logo_1.png')} style={styles.logo} />
          <View><Text style={styles.brandNepali}>कपूरी क</Text><Text style={styles.brandLatin}>Kapoori Ka</Text></View>
        </Pressable>
        {!compact && <View style={styles.navLinks}><Pressable onPress={() => jump('features')}><Text style={styles.navText}>{t.navFeatures}</Text></Pressable><Pressable onPress={() => jump('how')}><Text style={styles.navText}>{t.navHow}</Text></Pressable><Pressable onPress={() => jump('trust')}><Text style={styles.navText}>{t.navTrust}</Text></Pressable></View>}
        <View style={styles.navRight}><Pressable onPress={() => setLanguage(language === 'ne' ? 'en' : 'ne')} style={styles.lang}><Text style={styles.langText}>{language === 'ne' ? 'EN' : 'नेपाली'}</Text></Pressable><Pressable onPress={() => jump('start')} style={styles.navCta}><Text style={styles.navCtaText}>{t.navStart}</Text></Pressable></View>
      </View>

      <View nativeID="top" style={[styles.hero, compact && styles.heroCompact]}>
        <View style={styles.heroCopy}><Text style={styles.eyebrow}>{t.eyebrow}</Text><Text style={[styles.heroTitle, compact && styles.heroTitleCompact]}>{t.title}</Text><Text style={styles.heroBody}>{t.body}</Text><View style={[styles.buttonRow, compact && styles.buttonColumn]}><Pressable style={[styles.primaryButton, compact && styles.fullButton]} onPress={() => jump('start')}><Text style={styles.primaryText}>{t.primary}</Text><Text style={styles.buttonArrow}>↗</Text></Pressable><Pressable style={[styles.secondaryButton, compact && styles.fullButton]} onPress={() => jump('features')}><Text style={styles.secondaryText}>{t.secondary}</Text></Pressable></View><Text style={styles.heroNote}>{t.heroNote}</Text></View>
        <View style={styles.heroArt}><View style={styles.sun} /><View style={styles.artCard}><Text style={styles.artKicker}>TODAY / आज</Text><Text style={styles.artTitle}>{language === 'ne' ? 'मायाको स्वास्थ्य किताब' : 'Maya’s health book'}</Text><View style={styles.artLine}><Text style={styles.artIcon}>↗</Text><View><Text style={styles.artLabel}>{language === 'ne' ? 'वृद्धि चार्ट' : 'Growth chart'}</Text><Text style={styles.artMeta}>{language === 'ne' ? 'पछिल्लो नाप २ हप्ता अघि' : 'Last measurement · 2 weeks ago'}</Text></View></View><View style={styles.artLine}><Text style={styles.artIcon}>✓</Text><View><Text style={styles.artLabel}>{language === 'ne' ? 'खोप तयार' : 'Vaccines on track'}</Text><Text style={styles.artMeta}>{language === 'ne' ? 'अर्को खोप ३ महिनामा' : 'Next one · 3 months'}</Text></View></View></View><Text style={styles.artCaption}>सुरक्षित · सरल · साथमा</Text></View>
      </View>

      <View nativeID="features" style={styles.section}><Text style={styles.sectionLabel}>{t.sectionLabel}</Text><Text style={styles.sectionTitle}>{t.sectionTitle}</Text><Text style={styles.sectionBody}>{t.sectionBody}</Text><View style={styles.featureGrid}>{t.features.map(([num, title, body]) => <View key={num} style={styles.featureCard}><Text style={styles.featureNum}>{num}</Text><Text style={styles.featureTitle}>{title}</Text><Text style={styles.featureBody}>{body}</Text></View>)}</View></View>

      <View nativeID="how" style={styles.how}><View style={styles.howHeading}><Text style={styles.sectionLabel}>{t.howLabel}</Text><Text style={styles.sectionTitle}>{t.howTitle}</Text></View><View style={styles.steps}>{t.steps.map(([title, body], i) => <View key={title} style={styles.step}><View style={styles.stepNum}><Text style={styles.stepNumText}>0{i + 1}</Text></View><Text style={styles.stepTitle}>{title}</Text><Text style={styles.stepBody}>{body}</Text></View>)}</View></View>

      <View nativeID="trust" style={styles.trust}><View style={styles.trustCopy}><Text style={styles.sectionLabel}>{t.trustLabel}</Text><Text style={styles.sectionTitle}>{t.trustTitle}</Text><Text style={styles.sectionBody}>{t.trustBody}</Text></View><View style={styles.trustList}>{t.trustItems.map(([title, body]) => <View key={title} style={styles.trustItem}><Text style={styles.trustCheck}>✓</Text><View><Text style={styles.trustTitle}>{title}</Text><Text style={styles.trustBodySmall}>{body}</Text></View></View>)}</View></View>

      <View nativeID="start" style={styles.cta}><Text style={styles.ctaTitle}>{t.ctaTitle}</Text><Text style={styles.ctaBody}>{t.ctaBody}</Text><Pressable style={styles.ctaButton} onPress={() => jump('top')}><Text style={styles.ctaButtonText}>{t.cta}</Text><Text style={styles.buttonArrow}>↗</Text></Pressable></View>
      <View style={styles.footer}><View><Text style={styles.footerBrand}>कपूरी क · Kapoori Ka</Text><Text style={styles.footerText}>{t.footer}</Text></View><Pressable onPress={() => Linking.openURL('mailto:kapoori.ka@gmail.com')}><Text style={styles.footerLink}>{t.support}</Text></Pressable><Text style={styles.disclaimer}>{t.disclaimer}</Text></View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FBF7F0' }, content: { paddingBottom: 36 }, nav: { maxWidth: 1180, width: '92%', alignSelf: 'center', minHeight: 84, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, brand: { flexDirection: 'row', alignItems: 'center', gap: 10 }, logo: { width: 48, height: 48, borderRadius: 14 }, brandNepali: { color: '#1A1A2E', fontSize: 18, fontWeight: '800' }, brandLatin: { color: '#8A7B70', fontSize: 11, letterSpacing: 1.6 }, navLinks: { flexDirection: 'row', gap: 30 }, navText: { color: '#6E625A', fontSize: 14, fontWeight: '600' }, navRight: { flexDirection: 'row', alignItems: 'center', gap: 10 }, lang: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 }, langText: { color: '#3D8B5E', fontWeight: '800', fontSize: 13 }, navCta: { backgroundColor: '#E8602C', paddingHorizontal: 18, minHeight: 44, borderRadius: 22, justifyContent: 'center' }, navCtaText: { color: '#1A1A2E', fontWeight: '800', fontSize: 13 }, hero: { maxWidth: 1180, width: '92%', alignSelf: 'center', minHeight: 590, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 40 }, heroCompact: { flexDirection: 'column', alignItems: 'stretch', paddingTop: 42, paddingBottom: 56 }, heroCopy: { flex: 1, maxWidth: 650 }, eyebrow: { color: '#3D8B5E', fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase', fontSize: 12, marginBottom: 18 }, heroTitle: { color: '#1A1A2E', fontSize: 62, lineHeight: 68, fontWeight: '900', letterSpacing: -2 }, heroTitleCompact: { fontSize: 42, lineHeight: 48, letterSpacing: -1 }, heroBody: { color: '#6E625A', fontSize: 18, lineHeight: 29, maxWidth: 560, marginTop: 24 }, buttonRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 32 }, buttonColumn: { flexDirection: 'column', alignItems: 'stretch' }, primaryButton: { backgroundColor: '#E8602C', minHeight: 56, paddingHorizontal: 22, borderRadius: 30, flexDirection: 'row', alignItems: 'center', gap: 16, justifyContent: 'center' }, fullButton: { width: '100%' }, primaryText: { color: '#1A1A2E', fontWeight: '900', fontSize: 15 }, buttonArrow: { color: '#1A1A2E', fontSize: 20, fontWeight: '800' }, secondaryButton: { minHeight: 56, paddingHorizontal: 20, borderRadius: 30, justifyContent: 'center', borderWidth: 1, borderColor: '#E2D5C9' }, secondaryText: { color: '#5D5149', fontWeight: '800', fontSize: 15 }, heroNote: { color: '#8A7B70', marginTop: 20, fontSize: 12, fontWeight: '700' }, heroArt: { width: 430, height: 470, backgroundColor: '#F2D2B5', borderRadius: 220, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', position: 'relative' }, sun: { position: 'absolute', width: 250, height: 250, borderRadius: 125, backgroundColor: '#F5A623', top: 42, right: -44, opacity: 0.9 }, artCard: { width: 290, backgroundColor: '#FFFDF9', borderRadius: 22, padding: 22, shadowColor: '#A76E45', shadowOpacity: 0.18, shadowRadius: 22, shadowOffset: { width: 0, height: 12 }, elevation: 4 }, artKicker: { color: '#E8602C', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 }, artTitle: { color: '#1A1A2E', fontSize: 23, fontWeight: '900', marginTop: 8, marginBottom: 18 }, artLine: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderTopWidth: 1, borderTopColor: '#F0E6DD' }, artIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#D1FAE5', color: '#065F46', textAlign: 'center', paddingTop: 5, fontWeight: '900' }, artLabel: { color: '#1A1A2E', fontSize: 13, fontWeight: '800' }, artMeta: { color: '#8A7B70', fontSize: 10, marginTop: 3 }, artCaption: { color: '#1A1A2E', fontWeight: '900', fontSize: 13, position: 'absolute', bottom: 32, left: 42 }, section: { maxWidth: 1180, width: '92%', alignSelf: 'center', paddingVertical: 88 }, sectionLabel: { color: '#E8602C', fontSize: 12, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 13 }, sectionTitle: { color: '#1A1A2E', fontSize: 38, lineHeight: 44, fontWeight: '900', maxWidth: 700 }, sectionBody: { color: '#6E625A', fontSize: 16, lineHeight: 26, maxWidth: 610, marginTop: 17 }, featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 44 }, featureCard: { backgroundColor: '#FFFDF9', borderRadius: 20, padding: 25, minHeight: 210, flexGrow: 1, flexBasis: '23%', borderWidth: 1, borderColor: '#F0E4D9' }, featureNum: { color: '#E8602C', fontSize: 12, fontWeight: '900', letterSpacing: 1, marginBottom: 48 }, featureTitle: { color: '#1A1A2E', fontSize: 20, fontWeight: '900' }, featureBody: { color: '#7A6E65', fontSize: 14, lineHeight: 22, marginTop: 10 }, how: { backgroundColor: '#EAF2E7', paddingVertical: 84, paddingHorizontal: '4%', flexDirection: 'row', gap: 60, justifyContent: 'center', flexWrap: 'wrap' }, howHeading: { width: 360 }, steps: { flexDirection: 'row', flexWrap: 'wrap', gap: 36, flex: 1, maxWidth: 700 }, step: { flex: 1, minWidth: 180 }, stepNum: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#3D8B5E', justifyContent: 'center', alignItems: 'center', marginBottom: 18 }, stepNumText: { color: '#fff', fontSize: 12, fontWeight: '900' }, stepTitle: { color: '#1A1A2E', fontSize: 17, fontWeight: '900' }, stepBody: { color: '#62715E', fontSize: 14, lineHeight: 22, marginTop: 8 }, trust: { maxWidth: 1180, width: '92%', alignSelf: 'center', paddingVertical: 100, flexDirection: 'row', gap: 80, justifyContent: 'space-between', flexWrap: 'wrap' }, trustCopy: { flex: 1, minWidth: 280 }, trustList: { flex: 1, minWidth: 280, gap: 18 }, trustItem: { flexDirection: 'row', gap: 15, padding: 20, borderRadius: 16, backgroundColor: '#FFFDF9', borderWidth: 1, borderColor: '#F0E4D9' }, trustCheck: { color: '#3D8B5E', fontSize: 21, fontWeight: '900' }, trustTitle: { color: '#1A1A2E', fontSize: 15, fontWeight: '900' }, trustBodySmall: { color: '#7A6E65', fontSize: 13, marginTop: 4 }, cta: { width: '92%', maxWidth: 1180, alignSelf: 'center', backgroundColor: '#1A1A2E', borderRadius: 28, padding: 48, alignItems: 'center', marginBottom: 64 }, ctaTitle: { color: '#FFFDF9', textAlign: 'center', fontSize: 36, lineHeight: 42, fontWeight: '900' }, ctaBody: { color: '#CFC7C0', textAlign: 'center', fontSize: 16, marginTop: 13 }, ctaButton: { backgroundColor: '#F5A623', borderRadius: 28, minHeight: 54, paddingHorizontal: 23, flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 28 }, ctaButtonText: { color: '#1A1A2E', fontWeight: '900', fontSize: 15 }, footer: { width: '92%', maxWidth: 1180, alignSelf: 'center', flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 18, paddingBottom: 28, borderBottomWidth: 1, borderBottomColor: '#E9DDD2' }, footerBrand: { color: '#1A1A2E', fontWeight: '900', fontSize: 15 }, footerText: { color: '#8A7B70', fontSize: 12, marginTop: 5 }, footerLink: { color: '#3D8B5E', fontWeight: '800', fontSize: 13 }, disclaimer: { width: '100%', color: '#9A8D83', fontSize: 11, lineHeight: 18, marginTop: 4 },
});
