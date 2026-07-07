// src/screens/NutritionScreen.tsx - Enhanced with Tabs
import React, { useContext, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking, Dimensions } from 'react-native';
import { LanguageContext } from '../context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import dayjs from 'dayjs';
import { PremiumGuard } from '../components/PremiumGuard';

type Props = NativeStackScreenProps<RootStackParamList, 'Nutrition'>;

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
    range: '24–60 Months',
    subtitle: 'Balanced Family Diet',
    icon: 'checkmark-circle',
    color: '#673AB7',
    minMonths: 24,
    maxMonths: 60,
    points: [
      'Continue breastfeeding if desired.',
      'Eat all family meals with the family.',
      'Frequency: 3 meals + 1–2 snacks per day.',
      'Amount: 1–1.5 cups per meal.',
      'Include all four food groups at each meal.',
      'Encourage hand-washing before meals.',
      'Teach table manners and food safety.',
    ],
    malnutritionTip: 'Monitor growth monthly. Ensure variety and adequate portions of protein, vegetables, and fruits.',
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
      'जन्मपछि १ घन्टामा दुध खुवाउन सुरु गर्नुहोस्।',
      'पहिलो पहेँलो दूध (कोलोस्ट्रम) दिनुहोस् — कहिले पनि फ्याँक्नु हुँदैन।',
      '६ महिनासम्म केवल आमाको दूध — पानी, जुस वा फार्मुला छैन।',
      'माग अनुसार दुध खुवाउनुहोस् — दिनमा कम्तिमा ८-१२ पटक।',
      'बोतल वा निप्पल सिफारिस गरिँदैन।',
    ],
    malnutritionTip: 'यदि बच्चा राम्ररी दुध खाइरहेको छैन, वजन घटिरहेको छ, वा पातलो देखिन्छ — स्वास्थ्य चौकीमा जानुहोस्।',
  },
  {
    range: '६–९ महिना',
    subtitle: 'पूरक खाना सुरु गर्नुहोस्',
    icon: 'restaurant',
    color: '#4CAF50',
    minMonths: 6,
    maxMonths: 9,
    points: [
      'आमाको दूध जारी राख्नुहोस् र नयाँ खाना दिनुहोस्।',
      'सर्वोत्तम लिटो (पातलो, चिकनो पोरिज) सुरु गर्नुहोस्।',
      'आवृत्ति: दिनमा २-३ पटक + १-२ पटक आमाको दूध।',
      'मात्रा: २-३ चम्मच सुरु गर्नुहोस्, बिस्तारै बढाउनुहोस्।',
      'बनावट: बहुत चिकनो, कुनै गोली छैन।',
      'प्रत्येक खानामा चार तारे खाद्य समूह समावेश गर्नुहोस्।',
    ],
    malnutritionTip: 'यदि बच्चा खाना खाइरहेको छैन, लगातार दस्त हुन्छ, वा वजन बढिरहेको छैन — FCHV वा स्वास्थ्य चौकीमा परामर्श गर्नुहोस्।',
  },
  {
    range: '९–१२ महिना',
    subtitle: 'अधिक विविधता र बनावट',
    icon: 'nutrition',
    color: '#FF9800',
    minMonths: 9,
    maxMonths: 12,
    points: [
      'आमाको दूध जारी राख्नुहोस्।',
      'आवृत्ति: दिनमा ३ मुख्य खाना + १-२ पोषक खाजा।',
      'मात्रा: ३/४ कप (१२५-१७५ मिली) प्रति खाना।',
      'बनावट: मसलिएको/बारीक काटिएको — पीसने आवश्यकता छैन।',
      'समावेश गर्नुहोस्: अण्डा, माछा, मासु, दाल, हरियो पात, फलफूल।',
      'प्रत्येक खानामा १ चम्मच तेल/घी थप्नुहोस्।',
    ],
    malnutritionTip: 'यदि बच्चा पहेँलो देखिन्छ (रक्ताल्पता), लौह समृद्ध खाना (मासु, कलेजो, हरियो पात) दिनुहोस्।',
  },
  {
    range: '१२–२४ महिना',
    subtitle: 'पारिवारिक खाना',
    icon: 'people',
    color: '#2196F3',
    minMonths: 12,
    maxMonths: 24,
    points: [
      'आमाको दूध २ वर्ष र त्यसपछि पनि जारी राख्नुहोस्।',
      'पारिवारिक खाना दिनुहोस् — दाल-भात-तरकारी सबै चार समूहको साथ।',
      'आवृत्ति: दिनमा ३-४ खाना + १-२ खाजा।',
      'मात्रा: ३/४-१ कप प्रति खाना।',
      'चम्मचले आफै खान प्रोत्साहित गर्नुहोस्।',
      'अलमेल, तेलेली, नुनिलो, प्याकेट खाना र सफट ड्रिङ्क अलग राख्नुहोस्।',
    ],
    malnutritionTip: 'महिनामा वजन जाँच्नुहोस्। यदि २ महिना लगातार वजन बढिरहेको छैन — डाक्टरलाई भेट्नुहोस्।',
  },
  {
    range: '२४–६० महिना',
    subtitle: 'संतुलित पारिवारिक खाना',
    icon: 'checkmark-circle',
    color: '#673AB7',
    minMonths: 24,
    maxMonths: 60,
    points: [
      'आमाको दूध चाहिएमा जारी राख्नुहोस्।',
      'परिवारको साथ सबै खाना खाउनुहोस्।',
      'आवृत्ति: दिनमा ३ खाना + १-२ खाजा।',
      'मात्रा: १-१.५ कप प्रति खाना।',
      'प्रत्येक खानामा चार खाद्य समूह समावेश गर्नुहोस्।',
      'खाना खानुअघि हात धुन प्रोत्साहित गर्नुहोस्।',
      'टेबल शिष्टाचार र खाद्य सुरक्षा सिखाउनुहोस्।',
    ],
    malnutritionTip: 'महिनामा वृद्धि निरीक्षण गर्नुहोस्। प्रोटीन, तरकारी र फलफूलको पर्याप्त विविधता सुनिश्चित गर्नुहोस्।',
  },
];

const SARBOTTAM_PITHO_EN = {
  title: 'Sarbottam Pitho (Super-Flour)',
  description: 'A traditional Nepali complementary food that is highly nutritious and affordable.',
  recipe: {
    title: 'Recipe & Preparation',
    ingredients: [
      '2 parts pulse (soybeans preferred, or other small beans)',
      '1 part whole grain cereal (maize or rice)',
      '1 part another whole grain cereal (wheat, millet, or buckwheat)',
    ],
    steps: [
      'Clean all ingredients thoroughly.',
      'Roast each ingredient separately until light brown and fragrant.',
      'Grind each roasted ingredient into fine flour separately.',
      'Mix all flours together.',
      'Store in an airtight container for 1–3 months.',
    ],
  },
  feeding: {
    title: 'Feeding Guide',
    content: [
      '6+ months: 1–2 teaspoons, 2–3 times daily with breastfeeding',
      '1–3 years: Up to 100g (4 tablespoons) per day across 3 feeds',
      'Preparation: Stir flour into boiling water, cook briefly',
      'Add ground leafy greens for Vitamin A',
      'Add ghee or oil for energy and absorption',
      'NO salt or sugar for infants under 1 year',
    ],
  },
  nutrition: {
    title: 'Nutritional Value',
    content: [
      '100g provides 13.5–25g protein',
      '345–370 calories per 100g',
      'Rich in calcium, iron, and various vitamins',
      'Meets most protein and energy needs when combined with breastfeeding',
      'WHO-recommended for malnourished children',
    ],
  },
};

const SARBOTTAM_PITHO_NE = {
  title: 'सर्वोत्तम पिठो (सुपर-फ्लोर)',
  description: 'एक परम्परागत नेपाली पूरक खाना जो अत्यन्त पोषक र सस्तो छ।',
  recipe: {
    title: 'रेसिपी र तयारी',
    ingredients: [
      '२ भाग दाल (सोयाबीन सर्वोत्तम, वा अन्य साना बीन)',
      '१ भाग सम्पूर्ण अनाज (मकै वा चामल)',
      '१ भाग अन्य सम्पूर्ण अनाज (गहू, ज्वार, वा फप्पर)',
    ],
    steps: [
      'सबै सामग्री राम्ररी सफा गर्नुहोस्।',
      'प्रत्येक सामग्री अलग-अलग हल्का खैरो र सुगन्धित नभएसम्म भुन्नुहोस्।',
      'प्रत्येक भुनिएको सामग्री अलग-अलग महीन पिठोमा पीसनुहोस्।',
      'सबै पिठो मिलाउनुहोस्।',
      'एयरटाइट कन्टेनरमा १-३ महिनासम्म भण्डार गर्नुहोस्।',
    ],
  },
  feeding: {
    title: 'खुवाउने मार्गदर्शन',
    content: [
      '६+ महिना: १-२ चम्मच, दिनमा २-३ पटक आमाको दूधको साथ',
      '१-३ वर्ष: दिनमा १०० ग्राम (४ चम्मच) सम्म ३ खानामा विभाजित',
      'तयारी: पिठो उमलिएको पानीमा हलचल गर्नुहोस्, छोटो समय पकाउनुहोस्',
      'विटामिन एको लागि पिसिएको हरियो पात थप्नुहोस्',
      'ऊर्जा र अवशोषणको लागि घी वा तेल थप्नुहोस्',
      '१ वर्षभन्दा कम बच्चाको लागि कुनै नुन वा चिनी छैन',
    ],
  },
  nutrition: {
    title: 'पोषक मूल्य',
    content: [
      '१००ग्रामले १३.५-२५ग्राम प्रोटीन प्रदान गर्छ',
      '१००ग्रामप्रति ३४५-३७० क्यालोरी',
      'क्याल्सियम, लौह र विभिन्न भिटामिनमा समृद्ध',
      'आमाको दूधको साथ संयोजनमा अधिकांश प्रोटीन र ऊर्जा आवश्यकता पूरा गर्छ',
      'कुपोषित बच्चाहरूको लागि WHO-सिफारिस गरिएको',
    ],
  },
};

const MYTHS_EN = [
  {
    myth: 'Sugar and salt are good for infants',
    reality: 'NO. Avoid sugar and salt for children under 1 year. They can cause kidney damage and increase risk of obesity and hypertension later.',
    recommendation: 'Use only natural flavors from foods. Salt and sugar can be introduced after 1 year in very small amounts.',
  },
  {
    myth: 'Honey is safe for babies',
    reality: 'NO. Honey can contain botulism spores, which can cause serious illness in infants under 1 year.',
    recommendation: 'Never give honey to children under 1 year. After 1 year, honey is generally safe.',
  },
  {
    myth: 'Cow\'s milk is better than breast milk',
    reality: 'NO. Breast milk is perfectly designed for infants. Cow\'s milk lacks essential nutrients and can cause kidney stress.',
    recommendation: 'Exclusive breastfeeding until 6 months. Cow\'s milk can be introduced after 1 year as part of a balanced diet.',
  },
  {
    myth: 'Rice water or plain porridge is enough for 6+ months',
    reality: 'NO. Plain rice water lacks protein, fat, and micronutrients needed for growth.',
    recommendation: 'Use Sarbottam Pitho or other nutrient-dense complementary foods with protein, fat, and vegetables.',
  },
  {
    myth: 'More food = faster growth',
    reality: 'NO. Overfeeding can cause obesity and digestive problems. Responsive feeding is key.',
    recommendation: 'Feed according to child\'s hunger cues. Offer appropriate portions and let the child decide when to stop.',
  },
];

const MYTHS_NE = [
  {
    myth: 'चिनी र नुन शिशुको लागि राम्रो छ',
    reality: 'छैन। १ वर्षभन्दा कम बच्चाको लागि चिनी र नुन अलग राख्नुहोस्। यो गुर्दामा क्षति र पछि मोटोपना र उच्च रक्तचापको जोखिम बढाउन सक्छ।',
    recommendation: 'केवल खानाको प्राकृतिक स्वाद प्रयोग गर्नुहोस्। नुन र चिनी १ वर्षपछि अत्यन्त कम मात्रामा दिन सकिन्छ।',
  },
  {
    myth: 'शहद शिशुको लागि सुरक्षित छ',
    reality: 'छैन। शहदमा बोटुलिजम बीजाणु हुन सक्छ, जो १ वर्षभन्दा कम शिशुमा गम्भीर रोग हुन सक्छ।',
    recommendation: '१ वर्षभन्दा कम बच्चालाई कहिले पनि शहद दिनु हुँदैन। १ वर्षपछि शहद सामान्यतः सुरक्षित छ।',
  },
  {
    myth: 'गाईको दूध आमाको दूधभन्दा राम्रो छ',
    reality: 'छैन। आमाको दूध शिशुको लागि पूर्ण रूपमा डिजाइन गरिएको छ। गाईको दूधमा आवश्यक पोषक तत्व नहुन्छ र गुर्दामा तनाव हुन सक्छ।',
    recommendation: '६ महिनासम्म एकमात्र आमाको दूध। गाईको दूध १ वर्षपछि संतुलित खानाको भागको रूपमा दिन सकिन्छ।',
  },
  {
    myth: 'चामल पानी वा साधारण पोरिज ६+ महिनाको लागि पर्याप्त छ',
    reality: 'छैन। साधारण चामल पानीमा प्रोटीन, वसा र सूक्ष्म पोषक तत्व नहुन्छ।',
    recommendation: 'सर्वोत्तम पिठो वा अन्य पोषक पूरक खाना प्रोटीन, वसा र तरकारीको साथ प्रयोग गर्नुहोस्।',
  },
  {
    myth: 'अधिक खाना = छिटो वृद्धि',
    reality: 'छैन। अधिक खुवाउनु मोटोपना र पाचन समस्या हुन सक्छ। प्रतिक्रियाशील खुवाउने महत्त्वपूर्ण छ।',
    recommendation: 'बच्चाको भोकको संकेत अनुसार खुवाउनुहोस्। उपयुक्त मात्रा दिनुहोस् र बच्चालाई रोक्न दिनुहोस्।',
  },
];

const FEEDING_DIFFICULTIES_EN = {
  title: 'Feeding Difficulties',
  challenges: [
    {
      challenge: 'Child refuses to eat',
      solutions: [
        'Offer food when the child is calm and alert',
        'Try different foods and textures',
        'Eat together as a family to model eating',
        'Don\'t force-feed; let the child decide',
        'If persistent, consult a pediatrician',
      ],
    },
    {
      challenge: 'Child gags or chokes',
      solutions: [
        'Ensure food is age-appropriate texture',
        'Start with smoother textures and gradually progress',
        'Never leave the child alone while eating',
        'Sit the child upright while eating',
        'Consult a pediatrician if severe',
      ],
    },
    {
      challenge: 'Child has diarrhea after eating',
      solutions: [
        'Ensure food is clean and freshly prepared',
        'Introduce new foods one at a time',
        'Check for food allergies',
        'Continue breastfeeding',
        'Offer oral rehydration solution (ORS)',
        'See a doctor if diarrhea persists',
      ],
    },
    {
      challenge: 'Child is very picky',
      solutions: [
        'Offer variety without pressure',
        'Repeat exposure to new foods (10–15 times)',
        'Involve the child in food preparation',
        'Make mealtimes fun and stress-free',
        'Model eating a variety of foods',
      ],
    },
  ],
};

const FEEDING_DIFFICULTIES_NE = {
  title: 'खुवाउने कठिनाइ',
  challenges: [
    {
      challenge: 'बच्चा खाना खाइरहेको छैन',
      solutions: [
        'बच्चा शान्त र सचेत हुँदा खाना दिनुहोस्',
        'विभिन्न खाना र बनावट प्रयोग गर्नुहोस्',
        'परिवारको साथ खाना खाएर नमूना देखाउनुहोस्',
        'जबरदस्ती खुवाउनु हुँदैन; बच्चालाई निर्णय लिन दिनुहोस्',
        'यदि लगातार हुन्छ, बालरोग विशेषज्ञसँग परामर्श गर्नुहोस्',
      ],
    },
    {
      challenge: 'बच्चा गाग गर्छ वा घोकिन्छ',
      solutions: [
        'खाना उमेर अनुसार बनावटको हुनुपर्छ',
        'चिकनो बनावटबाट सुरु गर्नुहोस् र बिस्तारै अगाडि बढाउनुहोस्',
        'खाना खाँदा बच्चालाई अकेले नराख्नुहोस्',
        'खाना खाँदा बच्चा सीधा बसेको हुनुपर्छ',
        'गम्भीर हुन्छ भने बालरोग विशेषज्ञसँग परामर्श गर्नुहोस्',
      ],
    },
    {
      challenge: 'खाना खानपछि बच्चालाई दस्त हुन्छ',
      solutions: [
        'खाना सफा र ताजा तयार गरिएको हुनुपर्छ',
        'नयाँ खाना एक पटकमा एकै दिनुहोस्',
        'खाद्य एलर्जी जाँच गर्नुहोस्',
        'आमाको दूध जारी राख्नुहोस्',
        'मौखिक पुनर्जलीकरण समाधान (ORS) दिनुहोस्',
        'दस्त लगातार हुन्छ भने डाक्टरलाई भेट्नुहोस्',
      ],
    },
    {
      challenge: 'बच्चा बहुत छनौट गर्छ',
      solutions: [
        'दबाब बिना विविधता दिनुहोस्',
        'नयाँ खानामा बारम्बार संपर्क गर्नुहोस् (१०-१५ पटक)',
        'बच्चालाई खाना तयारीमा संलग्न गर्नुहोस्',
        'खाना खाने समय मजेदार र तनावमुक्त गर्नुहोस्',
        'विभिन्न खाना खाएर नमूना देखाउनुहोस्',
      ],
    },
  ],
};

export default function NutritionScreen({ route, navigation }: Props) {
  const { language } = useContext(LanguageContext);
  const isNe = language === 'ne';
  const [activeTab, setActiveTab] = useState<'age' | 'sarbottam' | 'myths' | 'difficulties'>('age');

  const ageGroups = isNe ? AGE_GROUPS_NE : AGE_GROUPS_EN;
  const sarbottamData = isNe ? SARBOTTAM_PITHO_NE : SARBOTTAM_PITHO_EN;
  const mythsData = isNe ? MYTHS_NE : MYTHS_EN;
  const difficultiesData = isNe ? FEEDING_DIFFICULTIES_NE : FEEDING_DIFFICULTIES_EN;

  return (
    <PremiumGuard>
      <View style={styles.container}>
        {/* Tab Bar */}
        <View style={styles.tabBar}>
          {[
            { key: 'age', label: isNe ? 'उमेर अनुसार' : 'By Age' },
            { key: 'sarbottam', label: isNe ? 'सर्वोत्तम पिठो' : 'Sarbottam' },
            { key: 'myths', label: isNe ? 'मिथ्या' : 'Myths' },
            { key: 'difficulties', label: isNe ? 'कठिनाइ' : 'Challenges' },
          ].map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.activeTab]}
              onPress={() => setActiveTab(tab.key as any)}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
          {activeTab === 'age' && (
            <View>
              {ageGroups.map((group, i) => (
                <View key={i} style={styles.ageCard}>
                  <View style={[styles.ageHeader, { backgroundColor: group.color }]}>
                    <Text style={styles.ageIcon}>{group.icon}</Text>
                    <View style={styles.ageHeaderText}>
                      <Text style={styles.ageRange}>{group.range}</Text>
                      <Text style={styles.ageSubtitle}>{group.subtitle}</Text>
                    </View>
                  </View>
                  <View style={styles.ageBody}>
                    {group.points.map((point, j) => (
                      <View key={j} style={styles.pointRow}>
                        <Text style={styles.pointBullet}>•</Text>
                        <Text style={styles.pointText}>{point}</Text>
                      </View>
                    ))}
                    <View style={styles.tipBox}>
                      <Ionicons name="warning" size={16} color="#FF9800" />
                      <Text style={styles.tipText}>{group.malnutritionTip}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {activeTab === 'sarbottam' && (
            <View style={styles.sectionContent}>
              <Text style={styles.sectionTitle}>{sarbottamData.title}</Text>
              <Text style={styles.sectionDesc}>{sarbottamData.description}</Text>

              <View style={styles.subsection}>
                <Text style={styles.subsectionTitle}>{sarbottamData.recipe.title}</Text>
                <Text style={styles.subsubtitle}>{isNe ? 'सामग्री:' : 'Ingredients:'}</Text>
                {sarbottamData.recipe.ingredients.map((ing, i) => (
                  <View key={i} style={styles.pointRow}>
                    <Text style={styles.pointBullet}>•</Text>
                    <Text style={styles.pointText}>{ing}</Text>
                  </View>
                ))}
                <Text style={styles.subsubtitle}>{isNe ? 'चरणहरू:' : 'Steps:'}</Text>
                {sarbottamData.recipe.steps.map((step, i) => (
                  <View key={i} style={styles.pointRow}>
                    <Text style={styles.pointBullet}>{i + 1}.</Text>
                    <Text style={styles.pointText}>{step}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.subsection}>
                <Text style={styles.subsectionTitle}>{sarbottamData.feeding.title}</Text>
                {sarbottamData.feeding.content.map((item, i) => (
                  <View key={i} style={styles.pointRow}>
                    <Text style={styles.pointBullet}>•</Text>
                    <Text style={styles.pointText}>{item}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.subsection}>
                <Text style={styles.subsectionTitle}>{sarbottamData.nutrition.title}</Text>
                {sarbottamData.nutrition.content.map((item, i) => (
                  <View key={i} style={styles.pointRow}>
                    <Text style={styles.pointBullet}>•</Text>
                    <Text style={styles.pointText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {activeTab === 'myths' && (
            <View style={styles.sectionContent}>
              <Text style={styles.sectionTitle}>{isNe ? 'खाना सम्बन्धी मिथ्या' : 'Nutrition Myths'}</Text>
              {mythsData.map((item, i) => (
                <View key={i} style={styles.mythCard}>
                  <View style={styles.mythHeader}>
                    <Ionicons name="close-circle" size={20} color="#F44336" />
                    <Text style={styles.mythTitle}>{item.myth}</Text>
                  </View>
                  <View style={styles.mythContent}>
                    <Text style={styles.mythLabel}>{isNe ? 'वास्तविकता:' : 'Reality:'}</Text>
                    <Text style={styles.mythText}>{item.reality}</Text>
                    <Text style={styles.mythLabel}>{isNe ? 'सिफारिश:' : 'Recommendation:'}</Text>
                    <Text style={styles.mythText}>{item.recommendation}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {activeTab === 'difficulties' && (
            <View style={styles.sectionContent}>
              <Text style={styles.sectionTitle}>{difficultiesData.title}</Text>
              {difficultiesData.challenges.map((item, i) => (
                <View key={i} style={styles.challengeCard}>
                  <View style={styles.challengeHeader}>
                    <Ionicons name="help-circle" size={20} color="#1a73e8" />
                    <Text style={styles.challengeTitle}>{item.challenge}</Text>
                  </View>
                  <View style={styles.challengeContent}>
                    {item.solutions.map((solution, j) => (
                      <View key={j} style={styles.pointRow}>
                        <Text style={styles.pointBullet}>✓</Text>
                        <Text style={styles.pointText}>{solution}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </PremiumGuard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ddd', paddingHorizontal: 8 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#1a73e8' },
  tabText: { fontSize: 12, fontWeight: '600', color: '#666' },
  activeTabText: { color: '#1a73e8' },
  content: { flex: 1, padding: 12 },
  ageCard: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 16, overflow: 'hidden', elevation: 2 },
  ageHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  ageIcon: { fontSize: 32 },
  ageHeaderText: { flex: 1 },
  ageRange: { fontSize: 16, fontWeight: '700', color: '#fff' },
  ageSubtitle: { fontSize: 13, color: '#fff', marginTop: 2 },
  ageBody: { padding: 16 },
  pointRow: { flexDirection: 'row', marginBottom: 8, gap: 8 },
  pointBullet: { fontSize: 14, fontWeight: '700', color: '#1a73e8', minWidth: 16 },
  pointText: { flex: 1, fontSize: 13, color: '#444', lineHeight: 18 },
  tipBox: { flexDirection: 'row', backgroundColor: '#FFF3E0', padding: 12, borderRadius: 8, marginTop: 12, gap: 8 },
  tipText: { flex: 1, fontSize: 12, color: '#E65100', lineHeight: 16 },
  sectionContent: { paddingHorizontal: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 8 },
  sectionDesc: { fontSize: 13, color: '#666', marginBottom: 16, lineHeight: 18 },
  subsection: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 16, elevation: 1 },
  subsectionTitle: { fontSize: 15, fontWeight: '700', color: '#1a73e8', marginBottom: 12 },
  subsubtitle: { fontSize: 13, fontWeight: '600', color: '#333', marginTop: 12, marginBottom: 6 },
  mythCard: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, overflow: 'hidden', elevation: 1, borderLeftWidth: 4, borderLeftColor: '#F44336' },
  mythHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10, backgroundColor: '#FFEBEE' },
  mythTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: '#C62828' },
  mythContent: { padding: 12 },
  mythLabel: { fontSize: 12, fontWeight: '700', color: '#1a73e8', marginBottom: 4 },
  mythText: { fontSize: 13, color: '#444', marginBottom: 10, lineHeight: 18 },
  challengeCard: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, overflow: 'hidden', elevation: 1, borderLeftWidth: 4, borderLeftColor: '#1a73e8' },
  challengeHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10, backgroundColor: '#E8F0FE' },
  challengeTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1a73e8' },
  challengeContent: { padding: 12 },
});
