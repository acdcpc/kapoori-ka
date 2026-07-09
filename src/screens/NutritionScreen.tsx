// src/screens/NutritionScreen.tsx - Enhanced with Tabs
import React, { useContext, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
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
    icon: '🍼',
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
    icon: '🥣',
    color: '#4CAF50',
    minMonths: 6,
    maxMonths: 9,
    points: [
      'Continue breastfeeding alongside new foods.',
      'Start with Sarbottam Lito (सर्वोत्तम लिटो) — thin, smooth porridge.',
      'Frequency: 2–3 times per day + 1–2 breastfeeds.',
      'Amount: start with 2–3 tablespoons, increase gradually.',
      'Texture: very smooth, no lumps.',
      'Include four star food groups in each meal.',
    ],
    malnutritionTip: 'If the child refuses food, has persistent diarrhea, or is not gaining weight — consult FCHV or health post.',
  },
  {
    range: '9–12 Months',
    subtitle: 'More Variety & Texture',
    icon: '🥘',
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
    icon: '🍛',
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
    icon: '🍽️',
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
    icon: '🍼',
    color: '#E91E63',
    minMonths: 0,
    maxMonths: 6,
    points: [
      'जन्मपछि १ घन्टामा दुध खुवाउन सुरु गर्नुहोस्।',
      'पहिलो पहेँलो दूध (कोलोस्ट्रम) दिनुहोस् — कहिले पनि फ्याँक्नु हुँदैन।',
      '६ महिनासम्म केवल आमाको दूध दिनुहोस्।',
      'माग अनुसार दुध खुवाउनुहोस् — दिनमा कम्तिमा ८-१२ पटक।',
      'बोतल वा निप्पल प्रयोग नगर्नुहोस्।',
    ],
    malnutritionTip: 'बच्चा राम्रोसँग खाँदैन, तौल घट्छ वा निकै दुब्लो देखिन्छ भने तुरुन्त स्वास्थ्य चौकी जानुहोस्।',
  },
  {
    range: '६–९ महिना',
    subtitle: 'पूरक खाना सुरु गर्नुहोस्',
    icon: '🥣',
    color: '#4CAF50',
    minMonths: 6,
    maxMonths: 9,
    points: [
      'आमाको दूध जारी राख्नुहोस् र नयाँ खाना दिनुहोस्।',
      'सर्वोत्तम लिटोबाट सुरु गर्नुहोस् — पातलो, चिल्लो लिटो।',
      'दिनमा २–३ पटक + १–२ पटक स्तनपान।',
      'सुरुमा २–३ चम्चा दिनुहोस्, बिस्तारै बढाउनुहोस्।',
      'बनावट: एकदमै मुलायम र चिल्लो, कुनै डल्ला हुँदैन।',
      'प्रत्येक खानामा चार तारे खाद्य समूह समावेश गर्नुहोस्।',
    ],
    malnutritionTip: 'बच्चाले खान मान्दैन, दिसा लागिरहन्छ वा तौल बढ्दैन भने स्वास्थ्य स्वयंसेविका  वा स्वास्थ्य चौकीमा जानुहोस्।',
  },
  {
    range: '९–१२ महिना',
    subtitle: 'अधिक विविधता र बनावट',
    icon: '🥘',
    color: '#FF9800',
    minMonths: 9,
    maxMonths: 12,
    points: [
      'आमाको दूध जारी राख्नुहोस्।',
      'आवृत्ति: दिनमा ३ मुख्य खाना + १-२ पोषक खाजा।',
      'मात्रा: ३/४ कप (१२५-१७५ मिली) प्रति खाना।',
      'बनावट: नरम बनाएर मसिनो बनाएर  दिनुहोस्। पिस्नु पर्दैन।',
      'समावेश गर्नुहोस्: अण्डा, माछा, मासु, दाल, हरियो पात, फलफूल।',
      'प्रत्येक खानामा १ चम्चा तेल वा घिउ हाल्नुहोस् (शक्ति बढोस् भनेर)।',
    ],
    malnutritionTip: 'बच्चाको अनुहार फिका (सेतो) देखिन्छ भने रगतको कमीको लागि मासु, कलेजो, हरियो सागपात जस्ता खानेकुरा दिनुहोस्।',
  },
  {
    range: '१२–२४ महिना',
    subtitle: 'पारिवारिक खाना',
    icon: '🍛',
    color: '#2196F3',
    minMonths: 12,
    maxMonths: 24,
    points: [
      'आमाको दूध २ वर्ष र त्यसपछि पनि जारी राख्नुहोस्।',
      'घरको खाना खुवाउनुहोस् — दाल-भात-तरकारीसँगै चारै किसिमका खानेकुरा।',
      'कति पटक खुवाउने? दिनमा ३–४ पटक मुख्य खाना + १–२ पटक खाजा।',
      'कति खुवाउने? एक पटकमा ३/४ देखि १ कप।',
      'बच्चालाई आफैं चम्चाले खान प्रोत्साहन गर्नुहोस्।',
      'यस्ता कुरा नदिनुहोस्: पिरो, भुटेको, नुनिलो, प्याकेटका खानेकुरा र सोडा/जुस।',
    ],
    malnutritionTip: 'हरेक महिना तौल जाँच गर्नुहोस्। यदि २ महिनासम्म तौल बढेन भने डाक्टरलाई देखाउनुहोस्।',
  },
  {
    range: '२४–६० महिना',
    subtitle: 'संतुलित पारिवारिक खाना',
    icon: '🍽️',
    color: '#673AB7',
    minMonths: 24,
    maxMonths: 60,
    points: [
      'आमाको दूध चाहिएमा जारी राख्नुहोस्।',
      'परिवारसँगै घरको खाना खानुहोस्।',
      'कति पटक खुवाउने? दिनमा ३ पटक मुख्य खाना + १–२ पटक खाजा।',
      'कति खुवाउने? एक पटकमा १ देखि १.५ कप।',
      'प्रत्येक खानामा चारै किसिमका खानेकुरा हाल्नुहोस्।',
      'खाना खानुअघि हात धुन प्रोत्साहित गर्नुहोस्।',
      'टेबल शिष्टाचार र खाना सफा राख्ने तरिका सिकाउनुहोस्।',
    ],
    malnutritionTip: 'हरेक महिना बच्चाको विकास हेर्नुहोस्। खानामा दाल-मासु, सागपात र फलफूल सबै किसिमका हाल्नुहोस् र पर्याप्त मात्रामा दिनुहोस्।',
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
      '२ भाग दाल ((सोयाबिन राम्रो, वा अन्य साना दाल)',
      '१ भाग सम्पूर्ण अनाज (मकै वा चामल)',
      '१ भाग अन्य सम्पूर्ण अनाज (गहू, कोदो, वा फापर)',
    ],
    steps: [
      'सबै सामग्री राम्ररी सफा गर्नुहोस्।',
      'प्रत्येक सामग्री अलग-अलग हल्का खैरो र सुगन्धित नभएसम्म भुट्नुहोस्।',
      'भुटेका प्रत्येक सामग्रीलाई छुट्टाछुट्टै मसिनो पिठो बनाउनुहोस्।',
      'सबै पिठोलाई राम्ररी मिसाउनुहोस्।',
      'एयरटाइट डब्बामा राख्नुहोस्। १ देखि ३ महिनासम्म प्रयोग गर्न सकिन्छ।',
    ],
  },
  feeding: {
    title: 'खुवाउने तरिका',
    content: [
      '६ महिनामाथि: १–२ चम्चा, दिनमा २–३ पटक स्तनपानसँगै।',
      '१–३ वर्ष: दिनमा जम्मा १०० ग्राम (४ चम्चा) सम्म, ३ पटकमा बाँडेर।',
      'बनाउने तरिका: पिठोलाई उम्लिरहेको पानीमा हाल्नुहोस् र छोटो समय पकाउनुहोस्।',
      'भिटामिन ए को लागि मसिनो काटेको हरियो साग हाल्नुहोस्।',
      'शक्ति र राम्रो पाचनको लागि घिउ वा तेल हाल्नुहोस्।',
      '१ वर्षभन्दा कम उमेरका बच्चालाई नुन र चिनी नहाल्नुहोस्।',
    ],
  },
  nutrition: {
    title: 'पोषणको जानकारी',
    content: [
      '१०० ग्राम मा १३.५ देखि २५ ग्राम प्रोटिन हुन्छ।',
      '१०० ग्राम मा ३४५–३७० क्यालोरी हुन्छ।',
      'क्याल्सियम, आइरन र विभिन्न भिटामिन प्रशस्त मात्रामा पाइन्छ।',
      'स्तनपानसँगै खुवाउँदा यसले प्रोटिन र ऊर्जाको धेरै आवश्यकता पूरा गर्छ।',
      'कुपोषित बच्चाहरूको लागि WHO ले सिफारिस गरेको छ।',
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
    myth: 'बच्चालाई चिनी र नुन राम्रो हुन्छ।',
    reality: 'होइन। १ वर्षभन्दा कम उमेरका बच्चालाई चिनी र नुन नदिनुहोस्। यसले मिर्गौला बिगार्न सक्छ र पछि मोटोपन र उच्च रक्तचापको खतरा बढाउँछ।',
    recommendation: 'खानेकुराको आफ्नै प्राकृतिक स्वाद मात्र प्रयोग गर्नुहोस्। १ वर्षपछि मात्र एकदम थोरै मात्रामा नुन र चिनी दिन सकिन्छ।',
  },
  {
    myth: 'बच्चालाई मह सुरक्षित छ।',
    reality: 'होइन। महमा खतरनाक कीटाणु हुन सक्छ जसले १ वर्षभन्दा कम उमेरका बच्चालाई गम्भीर बिरामी बनाउँछ।',
    recommendation: '१ वर्षभन्दा कम उमेरका बच्चालाई मह कदापि नदिनुहोस्। १ वर्षपछि मात्र दिन सकिन्छ।',
  },
  {
    myth: 'गाईको दूध आमाको दूधभन्दा राम्रो छ',
    reality: 'होइन। आमाको दुध बच्चाको लागि उत्तम र पूर्ण खाना हो। गाईको दुधमा आवश्यक पोषण कम हुन्छ र मिर्गौलालाई समस्या पार्न सक्छ।',
    recommendation: '६ महिनासम्म मात्र स्तनपान गराउनुहोस्। १ वर्षपछि मात्र गाईको दुध सन्तुलित खानासँग दिन सकिन्छ।',
  },
  {
    myth: '६ महिनापछि चामल पानी वा सादा खोले पर्याप्त छ',
    reality: 'होइन। भातको पानीमा वा सादा खोले प्रोटिन, बोसो र आवश्यक भिटामिन हुँदैन।',
    recommendation: 'सर्वोत्तम पिठो वा अन्य पूरक खाना भएको पौष्टिक खाना दिनुहोस्।',
  },
  {
    myth: 'जति धेरै खुवायो उति छिटो बच्चा बढ्छ।',
    reality: 'होइन। अधिक खुवाउनु मोटोपना र पाचन समस्या हुन सक्छ।',
    recommendation: 'बच्चा कति खान चाहन्छ त्यही अनुसार खुवाउनुहोस्। उचित मात्रा दिनुहोस् र बच्चाले आफैं खान छोडेपछि रोक्नुहोस्।',
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
  title: 'खुवाउन गाह्रो भएमा',
  challenges: [
    {
      challenge: 'बच्चा खाना खान मान्दैन',
      solutions: [
        'बच्चा शान्त र खुशी भएका बेला खाना दिनुहोस्',
        'अलिकति फरक-फरक खानेकुरा दिन प्रयास गर्नुहोस्',
        'परिवार सबैले सँगै बसेर खाना खाएर देखाउनुहोस्',
        'जबरजस्ती नखुवाउनुहोस्, बच्चालाई आफैं खान दिनुहोस्',
        'समस्या धेरै दिनसम्म रहे भने डाक्टरलाई देखाउनुहोस्',
      ],
    },
    {
      challenge: 'बच्चा खाँदा बान्ता जस्तो गर्छ वा अड्किन्छ',
      solutions: [
        'बच्चाको उमेर अनुसार नरम खाना दिनुहोस्',
        'पहिले निकै नरम खानाबाट सुरु गर्नुहोस्, बिस्तारै बढाउनुहोस्',
        'खाना खाँदा बच्चालाई एक्लै नछोड्नुहोस्',
        'खाना खाँदा बच्चालाई सीधा बसाल्नुहोस्',
        'धेरै गाह्रो भए डाक्टरलाई देखाउनुहोस्',
      ],
    },
    {
      challenge: 'खाना खाएपछि बच्चालाई दिसा लाग्छ',
      solutions: [
        'खाना राम्रोसँग सफा र ताजा बनाएर दिनुहोस्',
        'नयाँ खाना एक-एक गरेर मात्र दिनुहोस्',
        'कुनै खानाबाट एलर्जी छ कि हेर्नुहोस्',
        'आमाको दूध निरन्तर दिनुहोस्',
        'ORS झोल दिनुहोस्',
        'दिसा नरोकिए डाक्टरलाई देखाउनुहोस्',
      ],
    },
    {
      challenge: 'बच्चा खाना छान्ने हुन्छ',
      solutions: [
        'दबाब नदिई विभिन्न खानेकुरा दिनुहोस्',
        'नयाँ खाना पटक-पटक दिनुहोस् (१०–१५ पटक)',
        'बच्चालाई खाना बनाउनमा सघाउन लगाउनुहोस्',
        'खाना खाने समय रमाइलो बनाउनुहोस्',
        'आफैं विभिन्न खानेकुरा खाएर बच्चालाई देखाउनुहोस्',
      ],
    },
  ],
};

export default function NutritionScreen({ route, navigation }: Props) {
  const { language } = useContext(LanguageContext);
  const isNe = language === 'ne';
  const [activeTab, setActiveTab] = useState<'age' | 'sarbottam' | 'myths' | 'difficulties'>('age');

  const child = route.params?.child;
  const highlightAge = route.params?.highlightAge;

  const ageGroups = isNe ? AGE_GROUPS_NE : AGE_GROUPS_EN;
  const sarbottamData = isNe ? SARBOTTAM_PITHO_NE : SARBOTTAM_PITHO_EN;
  const mythsData = isNe ? MYTHS_NE : MYTHS_EN;
  const difficultiesData = isNe ? FEEDING_DIFFICULTIES_NE : FEEDING_DIFFICULTIES_EN;

  const childAgeMonths = child ? dayjs().diff(dayjs(child.dateOfBirth), 'month') : highlightAge;

  return (
    <PremiumGuard>
      <View style={styles.container}>
        <View style={styles.tabBar}>
          {[
            { key: 'age', label: isNe ? 'उमेर अनुसार' : 'By Age' },
            { key: 'sarbottam', label: isNe ? 'सर्वोत्तम पिठो' : 'Sarbottam' },
            { key: 'myths', label: isNe ? 'गलत-धारणा' : 'Myths' },
            { key: 'difficulties', label: isNe ? 'चुनौतीहरू' : 'Challenges' },
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
              {ageGroups.map((group, i) => {
                const isCurrentAge = childAgeMonths !== undefined && childAgeMonths >= group.minMonths && childAgeMonths < group.maxMonths;
                return (
                  <View key={i} style={[styles.ageCard, isCurrentAge && { borderWidth: 2, borderColor: group.color }]}>
                    <View style={[styles.ageHeader, { backgroundColor: group.color }]}>
                      <Text style={styles.ageIcon}>{group.icon}</Text>
                      <View style={styles.ageHeaderText}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={styles.ageRange}>{group.range}</Text>
                          {isCurrentAge && (
                            <View style={{ backgroundColor: '#fff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                              <Text style={{ color: group.color, fontSize: 10, fontWeight: '800' }}>{isNe ? 'तपाईंको बच्चा' : 'YOUR CHILD'}</Text>
                            </View>
                          )}
                        </View>
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
                );
              })}
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
              <Text style={styles.sectionTitle}>{isNe ? 'खाना सम्बन्धी गलत-धारणा' : 'Nutrition Myths'}</Text>
              {mythsData.map((item, i) => (
                <View key={i} style={styles.mythCard}>
                  <View style={styles.mythHeader}>
                    <Ionicons name="close-circle" size={20} color="#F44336" />
                    <Text style={styles.mythTitle}>{item.myth}</Text>
                  </View>
                  <View style={styles.mythContent}>
                    <Text style={styles.mythLabel}>{isNe ? 'सत्य:' : 'Reality:'}</Text>
                    <Text style={styles.mythText}>{item.reality}</Text>
                    <Text style={styles.mythLabel}>{isNe ? 'सल्लाह:' : 'Recommendation:'}</Text>
                    <Text style={styles.mythText}>{item.recommendation}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {activeTab === 'difficulties' && (
            <View style={styles.sectionContent}>
              <Text style={styles.sectionTitle}>{isNe ? 'चुनौतीहरू' : 'Challenges'}</Text>
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
