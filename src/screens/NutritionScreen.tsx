// src/screens/NutritionScreen.tsx
// Based on Nepal Ministry of Health & Population, Child Health Division guidelines,
// IYCF (Infant and Young Child Feeding) national guidelines, and FCHV training materials.
import React, { useContext, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { LanguageContext } from '../context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import dayjs from 'dayjs';

type Props = NativeStackScreenProps<RootStackParamList, 'Nutrition'>;

// Age group data — key content per age band
const AGE_GROUPS_EN = [
  {
    range: '0–6 Months',
    subtitle: 'Exclusive Breastfeeding Only',
    icon: 'heart',
    color: '#E91E63',
    minMonths: 0,
    maxMonths: 6,
    points: [
      'Start breastfeeding within 1 hour of birth.',
      'Give colostrum (first yellow milk) — do NOT throw away.',
      'ONLY breast milk for 6 months — no water, no juice, no formula.',
      'Feed on demand — at least 8–12 times per day.',
      'No bottles or pacifiers recommended.',
    ],
    malnutritionTip: 'If the baby is not feeding well, losing weight, or looks too thin — visit the health post immediately.',
  },
  {
    range: '6–9 Months',
    subtitle: 'Start Complementary Foods',
    icon: 'restaurant',
    color: '#4CAF50',
    minMonths: 6,
    maxMonths: 9,
    points: [
      'Continue breastfeeding alongside new foods.',
      'Start with Sarbottam Lito (सर्वोत्तम लिटो) — thin, smooth porridge.',
      'Frequency: 2–3 times per day + 1–2 breastfeeds.',
      'Amount: start with 2–3 tablespoons, increase gradually.',
      'Texture: very smooth, no lumps.',
      'Include four star food groups in each meal (see below).',
    ],
    malnutritionTip: 'If the child refuses food, has persistent diarrhea, or is not gaining weight — consult FCHV or health post.',
  },
  {
    range: '9–12 Months',
    subtitle: 'More Variety & Texture',
    icon: 'nutrition',
    color: '#FF9800',
    minMonths: 9,
    maxMonths: 12,
    points: [
      'Continue breastfeeding.',
      'Frequency: 3 main meals + 1–2 nutritious snacks per day.',
      'Amount: 3/4 cup (125–175 ml) per meal.',
      'Texture: mashed/finely chopped — no need to grind.',
      'Include: eggs, fish, meat, lentils, green vegetables, fruits.',
      'Add 1 teaspoon of oil/ghee to each meal for energy.',
    ],
    malnutritionTip: 'If the child looks pale (anaemia), introduce iron-rich foods (meat, liver, dark green leaves).',
  },
  {
    range: '12–24 Months',
    subtitle: 'Family Pot Foods',
    icon: 'people',
    color: '#2196F3',
    minMonths: 12,
    maxMonths: 24,
    points: [
      'Continue breastfeeding up to 2 years and beyond.',
      'Feed family foods — dal-bhat-tarkari with all four groups.',
      'Frequency: 3–4 meals + 1–2 snacks per day.',
      'Amount: 3/4–1 cup per meal.',
      'Encourage self-feeding with spoon.',
      'Avoid: spicy, fried, salty, packet foods and soft drinks.',
    ],
    malnutritionTip: 'Check weight monthly. If the child has not gained for 2 consecutive months, see a doctor.',
  },
  {
    range: '2–5 Years',
    subtitle: 'Growing Child Nutrition',
    icon: 'walk',
    color: '#9C27B0',
    minMonths: 24,
    maxMonths: 60,
    points: [
      'Feed 3 main meals + 2 healthy snacks per day.',
      'Maintain balanced diet: carbohydrates 50–55%, protein 15%, fat 30%.',
      'Protein sources: lentils, eggs, milk, meat, soybeans.',
      'Give fruit or vegetables in every meal.',
      'Ensure child food plate: 1/2 vegetables, 1/4 grains, 1/4 protein.',
      'Micronutrients: Vitamin A supplement every 6 months (Nepal NIP).',
    ],
    malnutritionTip: 'For wasted children (very thin): therapeutic feeding (RUTF/F-100) — refer to health post immediately.',
  },
];

const AGE_GROUPS_NE = [
  {
    range: '०–६ महिना',
    subtitle: 'केवल आमाको दूध',
    icon: 'heart',
    color: '#E91E63',
    minMonths: 0,
    maxMonths: 6,
    points: [
      'जन्मेको १ घण्टाभित्रै स्तनपान सुरु गर्नुहोस्।',
      'पहिलो पहेँलो दूध (कोलोस्ट्रम) फ्याँक्नु हुँदैन — बच्चालाई दिनुहोस्।',
      '६ महिनासम्म केवल आमाको दूध — पानी, जुस, फर्मुला केही नदिनुहोस्।',
      'बच्चाले चाहेको बेलामा दिनुहोस् — दिनमा कम्तिमा ८–१२ पटक।',
      'बोतल वा प्याकिफायर प्रयोग नगर्नुहोस्।',
    ],
    malnutritionTip: 'बच्चाले दूध राम्ररी नखाएको छ, तौल घट्दैछ, वा अति दुब्लो देखिन्छ भने तुरुन्त स्वास्थ्य चौकी जानुहोस्।',
  },
  {
    range: '६–९ महिना',
    subtitle: 'पूरक खानाको सुरुवात',
    icon: 'restaurant',
    color: '#4CAF50',
    minMonths: 6,
    maxMonths: 9,
    points: [
      'आमाको दूधको साथमा थप खाना सुरु गर्नुहोस्।',
      'सर्वोत्तम लिटोबाट सुरु गर्नुहोस् — पातलो, नरम जाउलो।',
      'दिनमा २–३ पटक खुवाउनुहोस् र बीचमा स्तनपान।',
      'मात्रा: २–३ चम्चाबाट सुरु गर्नुहोस्, बिस्तारै बढाउनुहोस्।',
      'बनावट: एकदम नरम, ढोद्रो नहुने।',
      'हरेक छाकमा चारतारे खाद्य समूह समावेश गर्नुहोस्।',
    ],
    malnutritionTip: 'बच्चाले खाना अस्वीकार गर्छ, झाडापखाला लाग्छ, वा तौल बढेको छैन भने FCHV वा स्वास्थ्य चौकी सम्पर्क गर्नुहोस्।',
  },
  {
    range: '९–१२ महिना',
    subtitle: 'थप विविधता र बनावट',
    icon: 'nutrition',
    color: '#FF9800',
    minMonths: 9,
    maxMonths: 12,
    points: [
      'स्तनपान जारी राख्नुहोस्।',
      'दिनमा ३ मुख्य खाना + १–२ पटक खाजा।',
      'मात्रा: हरेक पटक ३/४ कप (१२५–१७५ मिलि)।',
      'बनावट: मुसारेको/बारीक काटेको — पिसेको नहोस् भए पनि हुन्छ।',
      'समावेश गर्नुहोस्: अन्डा, माछा, मासु, दाल, हरियो सब्जी, फलफूल।',
      'हरेक छाकमा १ चम्चा तेल/घिउ थप्नुहोस् — ऊर्जाको लागि।',
    ],
    malnutritionTip: 'बच्चाको अनुहार सेतो देखिन्छ (एनिमिया) भने फलाम भएको खाना (मासु, कलेजो, हरियो पात) दिनुहोस्।',
  },
  {
    range: '१२–२४ महिना',
    subtitle: 'घरको खाना',
    icon: 'people',
    color: '#2196F3',
    minMonths: 12,
    maxMonths: 24,
    points: [
      '२ वर्षसम्म र सकेसम्म लामो समय स्तनपान जारी राख्नुहोस्।',
      'दाल–भात–तरकारी — चारतारे खाद्य समूह सहित।',
      'दिनमा ३–४ मुख्य खाना + १–२ खाजा।',
      'मात्रा: हरेक पटक ३/४–१ कप।',
      'चम्चाले आफैँ खान प्रोत्साहित गर्नुहोस्।',
      'नदिनुहोस्: तिखो, तलेको, नुनिलो, प्याकेट खाना र सफ्ट ड्रिंक।',
    ],
    malnutritionTip: 'हरेक महिना तौल जाँच गर्नुहोस्। लगातार २ महिना तौल नबढेको छ भने चिकित्सकलाई देखाउनुहोस्।',
  },
  {
    range: '२–५ वर्ष',
    subtitle: 'बढ्दो बच्चाको पोषण',
    icon: 'walk',
    color: '#9C27B0',
    minMonths: 24,
    maxMonths: 60,
    points: [
      'दिनमा ३ मुख्य खाना + २ स्वस्थ खाजा।',
      'सन्तुलित आहार: कार्बोहाइड्रेट ५०–५५%, प्रोटिन १५%, बोसो ३०%।',
      'प्रोटिनका स्रोत: दाल, अन्डा, दूध, मासु, सोयाबिन।',
      'हरेक छाकमा फलफूल वा सब्जी दिनुहोस्।',
      'बच्चाको थालमा: आधा सब्जी, एक चौथाइ अन्न, एक चौथाइ प्रोटिन।',
      'सूक्ष्म पोषक: हरेक ६ महिनामा भिटामिन A क्याप्सुल (नेपाल NIP)।',
    ],
    malnutritionTip: 'अति दुब्लो बच्चाको लागि: RUTF/F-100 उपचारात्मक खाना — तुरुन्त स्वास्थ्य चौकी रेफर गर्नुहोस्।',
  },
];

const FOUR_STAR_EN = [
  { name: 'Grains & Tubers', desc: 'Energy: rice, wheat, maize, potato', color: '#FFD54F', examples: 'Bhat, roti, chiura, potato' },
  { name: 'Pulses & Legumes', desc: 'Body building: protein & iron', color: '#81C784', examples: 'Lentil dal, black gram, soybean, beans' },
  { name: 'Animal & Dairy', desc: 'Protective: vitamins & calcium', color: '#F06292', examples: 'Egg, milk, curd, meat, fish' },
  { name: 'Fruits & Vegetables', desc: 'Disease fighting: vitamins A & C', color: '#64B5F6', examples: 'Spinach, pumpkin, banana, citrus' },
];
const FOUR_STAR_NE = [
  { name: 'अन्न र कन्दमूल', desc: 'ऊर्जा: चामल, गहुँ, मकै, आलु', color: '#FFD54F', examples: 'भात, रोटी, चिउरा, आलु' },
  { name: 'गेडागुडी', desc: 'शरीर बनाउने: प्रोटिन र फलाम', color: '#81C784', examples: 'मसुरको दाल, राजमा, सोयाबिन' },
  { name: 'पशुजन्य र दुग्ध', desc: 'सुरक्षा दिने: भिटामिन र क्याल्सियम', color: '#F06292', examples: 'अन्डा, दूध, दही, मासु, माछा' },
  { name: 'फलफूल र सागपात', desc: 'रोगसँग लड्ने: भिटामिन A र C', color: '#64B5F6', examples: 'पालुंगो, कद्दु, केरा, सुन्तला' },
];

export default function NutritionScreen({ route }: Props) {
  const { language } = useContext(LanguageContext);
  const isNe = language === 'ne';
  const scrollRef = useRef<ScrollView>(null);

  const child = route?.params?.child;
  const highlightAge = route?.params?.highlightAge;

  // Determine the child's current age in months for auto-scroll highlight
  const childAgeMonths = child
    ? dayjs().diff(dayjs(child.dateOfBirth), 'month')
    : null;

  const ageGroups = isNe ? AGE_GROUPS_NE : AGE_GROUPS_EN;
  const fourStar = isNe ? FOUR_STAR_NE : FOUR_STAR_EN;

  // Find the matching age group for this child
  const activeGroupIndex = childAgeMonths !== null
    ? ageGroups.findIndex(g => childAgeMonths >= g.minMonths && childAgeMonths < g.maxMonths)
    : -1;

  return (
    <ScrollView ref={scrollRef} style={styles.container} contentContainerStyle={{ paddingBottom: 50 }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{isNe ? 'पोषण मार्गनिर्देशन' : 'Nutrition Guidelines'}</Text>
        <Text style={styles.headerSubtitle}>
          {isNe
            ? 'नेपाल स्वास्थ्य मन्त्रालय र IYCF दिशानिर्देशमा आधारित'
            : 'Based on Nepal MoHP & IYCF Guidelines'}
        </Text>
        {child && (
          <View style={styles.childChip}>
            <Text style={styles.childChipText}>
              {isNe
                ? `${child.name} को उमेर: ${childAgeMonths} महिना`
                : `${child.name}'s age: ${childAgeMonths} months`}
            </Text>
          </View>
        )}
      </View>

      {/* Four Star Food Box */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>⭐ {isNe ? 'चारतारे खाना' : 'Four Star Food'}</Text>
        <Text style={styles.cardSubtitle}>
          {isNe
            ? 'हरेक छाकमा यी ४ समूहका खाना समावेश गर्नुहोस्:'
            : 'Include these 4 food groups in every meal:'}
        </Text>
        <View style={styles.grid}>
          {fourStar.map((item, i) => (
            <View key={i} style={[styles.gridItem, { backgroundColor: item.color + 'CC' }]}>
              <Text style={styles.gridName}>{item.name}</Text>
              <Text style={styles.gridDesc}>{item.desc}</Text>
              <Text style={styles.gridExamples}>{item.examples}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Child Food Plate */}
      <View style={styles.plateCard}>
        <Text style={styles.cardTitle}>🍽 {isNe ? 'बच्चाको थाल' : "Child's Food Plate"}</Text>
        <View style={styles.plateRow}>
          <View style={[styles.platePart, { backgroundColor: '#A5D6A7', flex: 2 }]}>
            <Text style={styles.plateLabel}>{isNe ? '½ सब्जी/फलफूल' : '½ Vegetables/Fruit'}</Text>
          </View>
          <View style={{ flex: 2 }}>
            <View style={[styles.platePart, { backgroundColor: '#FFE082', flex: 1 }]}>
              <Text style={styles.plateLabel}>{isNe ? '¼ अन्न' : '¼ Grains'}</Text>
            </View>
            <View style={[styles.platePart, { backgroundColor: '#F48FB1', flex: 1 }]}>
              <Text style={styles.plateLabel}>{isNe ? '¼ प्रोटिन' : '¼ Protein'}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Age Group Sections */}
      <Text style={styles.sectionHeading}>
        {isNe ? '📅 उमेर अनुसार खुवाइ' : '📅 Feeding by Age'}
      </Text>

      {ageGroups.map((group, idx) => {
        const isActive = idx === activeGroupIndex;
        return (
          <View
            key={idx}
            style={[styles.timelineCard, isActive && { borderWidth: 2, borderColor: group.color, backgroundColor: '#fff' }]}
          >
            {isActive && (
              <View style={[styles.activeBadge, { backgroundColor: group.color }]}>
                <Text style={styles.activeBadgeText}>
                  {isNe ? `${child?.name} अहिले यहाँ छ` : `${child?.name} is here now`}
                </Text>
              </View>
            )}
            <View style={[styles.ageHeader, { backgroundColor: group.color }]}>
              <Ionicons name={group.icon as any} size={20} color="#fff" />
              <Text style={styles.ageHeaderText}>{group.range}</Text>
              <Text style={styles.ageHeaderSubtext}>{group.subtitle}</Text>
            </View>
            <View style={styles.pointsBox}>
              {group.points.map((pt, pi) => (
                <View key={pi} style={styles.pointRow}>
                  <Text style={[styles.bullet, { color: group.color }]}>•</Text>
                  <Text style={styles.pointText}>{pt}</Text>
                </View>
              ))}
            </View>
            {/* Malnutrition tip */}
            <View style={styles.malnutTip}>
              <Ionicons name="alert-circle-outline" size={16} color="#F44336" />
              <Text style={styles.malnutTipText}>{group.malnutritionTip}</Text>
            </View>
          </View>
        );
      })}

      {/* General Malnutrition Card */}
      <View style={styles.malnutritionCard}>
        <Ionicons name="alert-circle" size={30} color="#F44336" />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.malnutritionTitle}>
            {isNe ? 'कुपोषणका संकेत' : 'Signs of Malnutrition'}
          </Text>
          <Text style={styles.malnutritionDesc}>
            {isNe
              ? 'अति दुब्लो (Wasted), ठिग्नो (Stunted), हात–खुट्टा सुन्निएको, पहेँलो–सुस्त बच्चा देखिएमा तुरुन्त नजिकैको स्वास्थ्य केन्द्र वा FCHV सम्पर्क गर्नुहोस्।'
              : 'Very thin (wasted), short for age (stunted), swollen limbs, pale or lethargic child — contact your nearest health post or FCHV immediately.'}
          </Text>
        </View>
      </View>

      {/* DoHS Link */}
      <TouchableOpacity style={styles.resourceBtn} onPress={() => Linking.openURL('https://dohs.gov.np/nutrition/')}>
        <Ionicons name="open-outline" size={16} color="#1a73e8" />
        <Text style={styles.resourceBtnText}>
          {isNe ? 'थप जानकारी (DoHS Nepal)' : 'More Information (DoHS Nepal)'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#1a73e8', padding: 24, paddingBottom: 32 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 6 },
  headerSubtitle: { fontSize: 13, color: '#e3f2fd', lineHeight: 18 },
  childChip: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginTop: 10, alignSelf: 'flex-start' },
  childChipText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  card: { backgroundColor: '#fff', margin: 16, borderRadius: 12, padding: 16, elevation: 2, marginTop: -20 },
  cardTitle: { fontSize: 17, fontWeight: 'bold', color: '#333', marginBottom: 6 },
  cardSubtitle: { fontSize: 13, color: '#666', marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridItem: { width: '48%', padding: 12, borderRadius: 10 },
  gridName: { fontSize: 13, fontWeight: 'bold', color: '#333', marginBottom: 3 },
  gridDesc: { fontSize: 11, color: '#555', marginBottom: 4 },
  gridExamples: { fontSize: 10, color: '#777', fontStyle: 'italic' },
  plateCard: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 16, borderRadius: 12, padding: 16, elevation: 2 },
  plateRow: { flexDirection: 'row', height: 90, gap: 6, marginTop: 10 },
  platePart: { borderRadius: 8, alignItems: 'center', justifyContent: 'center', padding: 4 },
  plateLabel: { fontSize: 11, fontWeight: '700', color: '#333', textAlign: 'center' },
  sectionHeading: { fontSize: 16, fontWeight: '700', color: '#333', paddingHorizontal: 16, marginBottom: 10 },
  timelineCard: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 16, borderRadius: 12, overflow: 'hidden', elevation: 2 },
  activeBadge: { padding: 6, alignItems: 'center' },
  activeBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  ageHeader: { padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  ageHeaderText: { fontSize: 15, fontWeight: 'bold', color: '#fff' },
  ageHeaderSubtext: { fontSize: 12, color: 'rgba(255,255,255,0.85)', flex: 1 },
  pointsBox: { padding: 12 },
  pointRow: { flexDirection: 'row', marginBottom: 6, alignItems: 'flex-start' },
  bullet: { fontSize: 16, marginRight: 8, lineHeight: 20, fontWeight: 'bold' },
  pointText: { flex: 1, fontSize: 13, color: '#444', lineHeight: 19 },
  malnutTip: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#ffebee', padding: 10, gap: 6 },
  malnutTipText: { flex: 1, fontSize: 11, color: '#c62828', lineHeight: 16 },
  malnutritionCard: { flexDirection: 'row', backgroundColor: '#fff', margin: 16, padding: 16, borderRadius: 12, borderLeftWidth: 5, borderLeftColor: '#F44336', elevation: 2, alignItems: 'flex-start' },
  malnutritionTitle: { fontSize: 15, fontWeight: 'bold', color: '#c62828', marginBottom: 6 },
  malnutritionDesc: { fontSize: 13, color: '#555', lineHeight: 19 },
  resourceBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', margin: 16, padding: 14, backgroundColor: '#e3f2fd', borderRadius: 12, gap: 8 },
  resourceBtnText: { color: '#1a73e8', fontWeight: 'bold', fontSize: 14 },
});
