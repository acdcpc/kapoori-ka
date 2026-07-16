// src/screens/MChatScreen.tsx - Enhanced with M-CHAT-R/F Nepali Validation
import React, { useContext, useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, Modal,
} from 'react-native';
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';
import dayjs from 'dayjs';
import { db, auth } from '../../firebase';
import { LanguageContext } from '../context/LanguageContext';
import { RootStackParamList } from '../navigation/types';
import { translations } from '../i18n/translations';
import { Child } from '../types';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { getAgeInMonths } from '../utils/growthCalculations';
import { PremiumGuard } from '../components/PremiumGuard';

type Props = NativeStackScreenProps<RootStackParamList, 'MChat'>;

// M-CHAT-R/F - Modified Checklist for Autism in Toddlers, Revised with Follow-up
// Validated for Nepali population
// Age: 16-30 months (optimal: 18-24 months)
// Reference: Robins, D.L., et al. (2014). The Modified Checklist for Autism in Toddlers, Revised with Follow-up (M-CHAT-R/F)

interface MChatQuestion {
  id: string;
  questionEn: string;
  questionNe: string;
  descriptionEn: string;
  descriptionNe: string;
  scoring: 'yes_concern' | 'no_concern'; // yes_concern = score 1 if Yes, no_concern = score 1 if No
}

const MCHAT_QUESTIONS: MChatQuestion[] = [
  {
    id: 'q1',
    questionEn: 'If you point at something across the room, does your child look at it? (e.g., if you point at a toy or an animal, does your child look at the toy or animal?)',
    questionNe: 'यदि तपाईंले कोठाको अर्को कुनामा रहेको कुनै चीज (जस्तै खेलौना वा जनावर) तिर औंल्याउनुभयो भने, के तपाईंको बच्चाले त्यसलाई हेर्छ?',
    descriptionEn: 'Observe joint attention and following of pointing gestures.',
    descriptionNe: 'संयुक्त ध्यान र संकेत गर्ने इशारा अनुसरण हेर्नुहोस्।',
    scoring: 'no_concern',
  },
  {
    id: 'q2',
    questionEn: 'Have you ever wondered if your child might be deaf?',
    questionNe: 'के तपाईंलाई कहिल्यै आफ्नो बच्चा बहिरो हुन सक्छ कि भन्ने लागेको छ?',
    descriptionEn: 'Check if the child responds to sounds or their name.',
    descriptionNe: 'बच्चाले आवाज वा आफ्नो नाममा प्रतिक्रिया दिन्छ कि भनेर जाँच गर्नुहोस्।',
    scoring: 'yes_concern',
  },
  {
    id: 'q3',
    questionEn: 'Does your child play pretend or make-believe? (e.g., pretend to drink from an empty cup, pretend to talk on a phone, or pretend to feed a doll or stuffed animal?)',
    questionNe: 'के तपाईंको बच्चाले केही भएको जस्तो गरी नाटक गरेर खेल्छ? (जस्तै: खाली कपबाट पिएको जस्तो गर्ने, फोनमा कुरा गरेको जस्तो गर्ने, वा पुतलीलाई खुवाएको जस्तो गर्ने?)',
    descriptionEn: 'Look for symbolic or imaginative play behavior.',
    descriptionNe: 'प्रतीकात्मक वा कल्पनाशील खेलको व्यवहार हेर्नुहोस्।',
    scoring: 'no_concern',
  },
  {
    id: 'q4',
    questionEn: 'Does your child like climbing on things? (e.g., furniture, playground equipment, or stairs)',
    questionNe: 'के तपाईंको बच्चालाई चीजहरूमा चढ्न मनपर्छ? (जस्तै: फर्निचर, खेल मैदानका उपकरण, वा सिढी)',
    descriptionEn: 'Observe if the child attempts to climb or explores physical challenges.',
    descriptionNe: 'बच्चा चढ्ने प्रयास गर्छ वा शारीरिक चुनौतीहरू अन्वेषण गर्छ कि भनेर हेर्नुहोस्।',
    scoring: 'no_concern',
  },
  {
    id: 'q5',
    questionEn: 'Does your child make unusual finger movements near his or her eyes? (e.g., does your child wiggle his or her fingers close to his or her eyes?)',
    questionNe: 'के तपाईंको बच्चाले आफ्नो आँखा नजिकै औंलाहरू असामान्य रूपमा चलाउँछ? (जस्तै: आँखा नजिकै औंलाहरू हल्लाउने?)',
    descriptionEn: 'Watch for repetitive or stereotyped hand movements.',
    descriptionNe: 'बच्चाले हात बारम्बार घुमाउने वा दोहोर्‍याउने गर्छ कि भनेर हेर्नुहोस्।',
    scoring: 'yes_concern',
  },
  {
    id: 'q6',
    questionEn: 'Does your child point with one finger to ask for something or to get help? (e.g., pointing to a cracker or a toy that is out of reach)',
    questionNe: 'के तपाईंको बच्चाले केही माग्न वा मद्दत लिनको लागि एउटा औंलाले संकेत गर्छ? (जस्तै: पहुँच बाहिर रहेको बिस्कुट वा खेलौनातिर औंल्याउने)',
    descriptionEn: 'Observe if the child uses pointing to communicate needs or share interest.',
    descriptionNe: 'बच्चा आवश्यकता संचार गर्न वा रुचि साझा गर्न संकेत गर्छ कि भनेर हेर्नुहोस्।',
    scoring: 'no_concern',
  },
  {
    id: 'q7',
    questionEn: 'Does your child point with one finger to show you something interesting? (e.g., pointing to an airplane in the sky or a big truck in the road)',
    questionNe: 'के तपाईंको बच्चाले तपाईंलाई केही रोचक कुरा देखाउन एउटा औंलाले संकेत गर्छ? (जस्तै: आकाशमा उडिरहेको जहाज वा सडकमा ठूलो ट्रकतिर औंल्याउने)',
    descriptionEn: 'Look for joint attention and sharing of interest.',
    descriptionNe: 'बच्चाले तपाईंसँग ध्यान दिन्छ र रुचि देखाउँछ कि हेर्नुहोस्।',
    scoring: 'no_concern',
  },
  {
    id: 'q8',
    questionEn: 'Is your child interested in other children? (e.g., does your child watch other children, smile at them, or go to them?)',
    questionNe: 'के तपाईंको बच्चा अन्य बच्चाहरूमा रुचि राख्छ? (जस्तै: अन्य बच्चाहरूलाई हेर्ने, उनीहरूलाई हेरेर मुस्कुराउने, वा उनीहरूतर्फ जाने?)',
    descriptionEn: 'Look for eye contact, smiling, or attempts to interact with other children.',
    descriptionNe: 'अन्य बच्चाहरूसँग आँखाको सम्पर्क, मुस्कुराउने, वा अन्तरक्रिया गर्ने प्रयास हेर्नुहोस्।',
    scoring: 'no_concern',
  },
  {
    id: 'q9',
    questionEn: 'Does your child show you things by bringing them to you or holding them up for you to see — not to get help, but just to share? (e.g., showing you a flower, a stuffed animal, or a toy truck)',
    questionNe: 'के तपाईंको बच्चाले तपाईंलाई कुनै कुरा देखाउनको लागि ल्याउँछ वा तपाईंले देख्ने गरी समात्छ — मद्दत माग्न होइन, तर केवल साझा गर्नको लागि? (जस्तै: फूल, पुतली, वा खेलौना ट्रक देखाउने)',
    descriptionEn: 'Look for sharing of objects and joint attention.',
    descriptionNe: 'वस्तु साझा गरिएको र संयुक्त ध्यान हेर्नुहोस्।',
    scoring: 'no_concern',
  },
  {
    id: 'q10',
    questionEn: 'Does your child respond when you call his or her name? (e.g., does he or she look up, talk or babble, or stop what he or she is doing when you call his or her name?)',
    questionNe: 'के तपाईंले नाम काढेर बोलाउँदा तपाईंको बच्चाले प्रतिक्रिया दिन्छ? (जस्तै: माथि हेर्ने, बोल्ने वा कराउने, वा गरिरैको काम रोक्ने?)',
    descriptionEn: 'Watch for name recognition and response.',
    descriptionNe: 'नाम पहिचान र प्रतिक्रिया हेर्नुहोस्।',
    scoring: 'no_concern',
  },
  {
    id: 'q11',
    questionEn: 'When you smile at your child, does he or she smile back at you?',
    questionNe: 'जब तपाईं आफ्नो बच्चालाई हेरेर मुस्कुराउनुहुन्छ, के उसले पनि तपाईंलाई हेरेर मुस्कुराउँछ?',
    descriptionEn: 'Look for social reciprocity in smiling.',
    descriptionNe: 'मुस्कानमा सामाजिक आपसी प्रतिक्रिया हेर्नुहोस्।',
    scoring: 'no_concern',
  },
  {
    id: 'q12',
    questionEn: 'Does your child get upset by everyday noises? (e.g., does your child scream or cry to noise such as a vacuum cleaner or loud music?)',
    questionNe: 'के तपाईंको बच्चा सामान्य आवाजहरूबाट विचलित हुन्छ? (जस्तै: भ्याकुम क्लिनर वा ठूलो संगीतको आवाजमा चिच्याउने वा रुने?)',
    descriptionEn: 'Watch for unusual reactions to sounds.',
    descriptionNe: 'आवाजमा असामान्य प्रतिक्रिया हेर्नुहोस्।',
    scoring: 'yes_concern',
  },
  {
    id: 'q13',
    questionEn: 'Does your child walk?',
    questionNe: 'के तपाईंको बच्चा हिँड्छ?',
    descriptionEn: 'Observe gross motor development.',
    descriptionNe: 'सामान्य शारीरिक विकास हेर्नुहोस्।',
    scoring: 'no_concern',
  },
  {
    id: 'q14',
    questionEn: 'Does your child look you in the eye when you are talking to him or her, playing with him or her, or dressing him or her?',
    questionNe: 'के तपाईंको बच्चाले तपाईंसँग कुरा गर्दा, खेल्दा, वा लुगा लगाइदिँदा तपाईंको आँखामा हेर्छ?',
    descriptionEn: 'Observe sustained eye contact during interaction.',
    descriptionNe: 'अन्तरक्रियाको समयमा स्थिर आँखाको सम्पर्क हेर्नुहोस्।',
    scoring: 'no_concern',
  },
  {
    id: 'q15',
    questionEn: 'Does your child try to copy what you do? (e.g., wave bye-bye, clap, or make a funny noise when you do)',
    questionNe: 'के तपाईंको बच्चाले तपाईंले गरेको कामको नक्कल गर्ने प्रयास गर्छ? (जस्तै: टाटा गर्ने, ताली बजाउने, वा तपाईंले जस्तै रमाइलो आवाज निकाल्ने?)',
    descriptionEn: 'Observe imitation of facial expressions or actions.',
    descriptionNe: 'अनुहारको अभिव्यक्ति वा कार्यहरूको नक्कल हेर्नुहोस्।',
    scoring: 'no_concern',
  },
  {
    id: 'q16',
    questionEn: 'If you turn your head to look at something, does your child look around to see what you are looking at?',
    questionNe: 'यदि तपाईंले केही कुरा हेर्नको लागि टाउको घुमाउनुभयो भने, के तपाईंको बच्चाले तपाईंले के हेरिरहनुभएको छ भनेर हेर्न टाउको घुमाउँछ?',
    descriptionEn: 'Observe joint attention and gaze following.',
    descriptionNe: 'संयुक्त ध्यान र दृष्टि अनुसरण हेर्नुहोस्।',
    scoring: 'no_concern',
  },
  {
    id: 'q17',
    questionEn: 'Does your child try to get you to watch him or her? (e.g., does your child look at you for praise, or say "look" or "watch me"?)',
    questionNe: 'के तपाईंको बच्चाले आफूलाई हेर्न लगाउने प्रयास गर्छ? (जस्तै: प्रशंसाको लागि तपाईंलाई हेर्ने, वा "हेर" वा "मलाई हेर" भन्ने?)',
    descriptionEn: 'Observe if the child seeks social attention or praise.',
    descriptionNe: 'बच्चाले सामाजिक ध्यान वा प्रशंसा खोज्छ कि भनेर हेर्नुहोस्।',
    scoring: 'no_concern',
  },
  {
    id: 'q18',
    questionEn: 'Does your child understand when you tell him or her to do something? (e.g., if you don\'t point, can your child understand "put the book on the chair" or "bring me the blanket"?)',
    questionNe: 'के तपाईंले केही गर्न भन्दा तपाईंको बच्चाले बुझ्छ? (जस्तै: संकेत नगरीकन "किताब कुर्सीमा राख" वा "मलाई ओढ्ने ल्याइदेउ" भन्दा बुझ्छ?)',
    descriptionEn: 'Observe receptive language and comprehension.',
    descriptionNe: 'बच्चाको कुरा बुझ्ने क्षमता र समझ हेर्नुहोस्।',
    scoring: 'no_concern',
  },
  {
    id: 'q19',
    questionEn: 'If something new happens, does your child look at your face to see how you feel about it? (e.g., if he or she hears a strange or funny noise, or sees a new toy, will he or she look at your face?)',
    questionNe: 'यदि केही नयाँ कुरा भयो भने, के तपाईंको बच्चाले तपाईंलाई कस्तो लाग्यो भनेर तपाईंको अनुहारमा हेर्छ? (जस्तै: कुनै अनौठो वा रमाइलो आवाज सुन्यो वा नयाँ खेलौना देख्यो भने तपाईंको अनुहारमा हेर्छ?)',
    descriptionEn: 'Observe social referencing behavior.',
    descriptionNe: 'बच्चाले अरुको प्रतिक्रिया हेरेर व्यवहार गर्छ कि हेर्नुहोस्।',
    scoring: 'no_concern',
  },
  {
    id: 'q20',
    questionEn: 'Does your child enjoy movement activities? (e.g., being swung or bounced on your knee)',
    questionNe: 'के तपाईंको बच्चालाई हलचल हुने गतिविधिहरू मनपर्छ? (जस्तै: पिङ खेलेको जस्तो हल्लाउने वा घुँडामा उफार्ने?)',
    descriptionEn: 'Watch if the child laughs and shows enjoyment during physical play.',
    descriptionNe: 'बच्चाले शारीरिक खेल खेल्दा हाँस्छ र रमाउँछ कि भनेर हेर्नुहोस्।',
    scoring: 'no_concern',
  },
];

export default function MChatScreen({ route, navigation }: Props) {
  const { child } = route.params;
  const { language } = useContext(LanguageContext);
  const isNe = language === 'ne';

  const [responses, setResponses] = useState<Record<string, boolean>>({});
  const [showResultModal, setShowResultModal] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [score, setScore] = useState(0);
  const [concerns, setConcerns] = useState<string[]>([]);

  const ageMonths = getAgeInMonths(child.dateOfBirth, dayjs().format('YYYY-MM-DD'));
  const isAppropriateAge = ageMonths >= 16 && ageMonths <= 30;

  const calculateScore = () => {
    let totalScore = 0;
    const concernList: string[] = [];
    MCHAT_QUESTIONS.forEach(q => {
      const response = responses[q.id];
      if (response !== undefined) {
        if (q.scoring === 'yes_concern') {
          if (response === true) {
            totalScore += 1;
            concernList.push(q.id);
          }
        } else {
          if (response === false) {
            totalScore += 1;
            concernList.push(q.id);
          }
        }
      }
    });
    return { totalScore, concernList };
  };

  const handleSubmit = async () => {
    if (Object.keys(responses).length < MCHAT_QUESTIONS.length) {
      Alert.alert(
        isNe ? 'कृपया सबै प्रश्नहरूको उत्तर दिनुहोस्' : 'Please complete all questions',
        isNe ? 'नतिजा प्राप्त गर्नका लागि कृपया सबै २० प्रश्नहरूको उत्तर दिनुहोस्।' : 'Please answer all 20 questions to get the result.'
      );
      return;
    }
    const { totalScore, concernList } = calculateScore();
    setScore(totalScore);
    setConcerns(concernList);
    setShowResultModal(true);
    setIsReviewMode(true);

    try {
      const user = auth.currentUser;
      if (!user) return;
      await addDoc(collection(db, 'autism_screenings'), {
        childId: child.id,
        ownerId: user.uid,
        date: dayjs().format('YYYY-MM-DD'),
        ageMonths,
        score: totalScore,
        responses,
        createdAt: new Date(),
      });
    } catch (error) {
      console.error('Save screening error:', error);
    }
  };

  const getResultMessage = () => {
    if (score <= 2) {
      return {
        title: isNe ? 'कम जोखिम' : 'Low Risk',
        message: isNe
          ? 'बच्चाको विकास ठीक छ। नियमित रूपमा स्वास्थ्य जाँच गराउनुहोस्।'
          : 'Your child\'s development appears typical. Continue regular check-ups.',
        color: '#4CAF50',
      };
    } else if (score <= 7) {
      return {
        title: isNe ? 'मध्यम जोखिम' : 'Medium Risk',
        message: isNe
          ? 'तपाईंको बच्चालाई बाल रोग विशेषज्ञ वा विकास विशेषज्ञद्वारा मूल्यांकन गराउनुपर्छ।'
          : 'Your child should be evaluated by a pediatrician or developmental specialist.',
        color: '#FF9800',
      };
    } else {
      return {
        title: isNe ? 'उच्च जोखिम' : 'High Risk',
        message: isNe
          ? 'तपाईंको बच्चालाई तुरुन्त विशेषज्ञसँग जाँच गराउन सिफारिस गरिन्छ।'
          : 'Your child should be referred for specialist evaluation immediately.',
        color: '#F44336',
      };
    }
  };

  const result = getResultMessage();

  return (
    <PremiumGuard feature="autism_screening" onUpgrade={() => navigation.navigate('Subscription')}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>M-CHAT-R/F</Text>
        </View>

        {!isAppropriateAge ? (
          <View style={styles.centeredContent}>
            <View style={styles.warningBoxLarge}>
              <Ionicons name="warning" size={48} color="#E65100" />
              <Text style={styles.warningTitle}>
                {isNe ? 'उमेर उपयुक्त छैन' : 'Age Not Validated'}
              </Text>
              <Text style={styles.warningTextLarge}>
                {isNe 
                  ? `यो स्क्रिनिङ १६-३० महिनाका बच्चाहरूका लागि मात्र हो। तपाईंको बच्चा ${ageMonths} महिनाको छ।`
                  : `This screening is validated for children aged 16–30 months. Your child is ${ageMonths} months old.`}
              </Text>
              <TouchableOpacity style={styles.goBackBtn} onPress={() => navigation.goBack()}>
                <Text style={styles.goBackBtnText}>{isNe ? 'फिर्ता जानुहोस्' : 'Go Back'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={styles.intro}>
              {isNe 
                ? 'कृपया आफ्नो बच्चाको व्यवहार बारे तलका प्रश्नहरूको उत्तर दिनुहोस्।'
                : 'Please answer the following questions about your child\'s behavior.'}
            </Text>

            {MCHAT_QUESTIONS.map((q, index) => {
              const isConcern = concerns.includes(q.id);
              const showHighlights = isReviewMode && isConcern;
              
              return (
                <View key={q.id} style={[styles.questionCard, showHighlights && styles.concernCard]}>
                  <View style={styles.questionHeader}>
                    <Text style={styles.questionNum}>{isNe ? `प्रश्न ${index + 1}` : `Question ${index + 1}`}</Text>
                    {showHighlights && (
                      <View style={styles.concernBadge}>
                        <Ionicons name="alert-circle" size={14} color="#F44336" />
                        <Text style={styles.concernBadgeText}>{isNe ? 'चिन्ताको विषय' : 'Concern'}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.questionText}>{isNe ? q.questionNe : q.questionEn}</Text>
                  <Text style={styles.questionDesc}>{isNe ? q.descriptionNe : q.descriptionEn}</Text>
                  
                  <View style={styles.optionsRow}>
                    <TouchableOpacity 
                      style={[
                        styles.optionBtn, 
                        responses[q.id] === true && styles.optionBtnActive,
                        showHighlights && responses[q.id] === true && styles.optionBtnConcern
                      ]}
                      onPress={() => !isReviewMode && setResponses(prev => ({ ...prev, [q.id]: true }))}
                      disabled={isReviewMode}
                    >
                      <Text style={[styles.optionText, responses[q.id] === true && styles.optionTextActive]}>
                        {isNe ? 'हो' : 'Yes'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[
                        styles.optionBtn, 
                        responses[q.id] === false && styles.optionBtnActive,
                        showHighlights && responses[q.id] === false && styles.optionBtnConcern
                      ]}
                      onPress={() => !isReviewMode && setResponses(prev => ({ ...prev, [q.id]: false }))}
                      disabled={isReviewMode}
                    >
                      <Text style={[styles.optionText, responses[q.id] === false && styles.optionTextActive]}>
                        {isNe ? 'होइन' : 'No'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}

            {!isReviewMode ? (
              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                <Text style={styles.submitBtnText}>{isNe ? 'नतिजा हेर्नुहोस्' : 'See Results'}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#666' }]} onPress={() => navigation.goBack()}>
                <Text style={styles.submitBtnText}>{isNe ? 'फिर्ता जानुहोस्' : 'Go Back'}</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}

        <Modal visible={showResultModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={[styles.scoreBadge, { backgroundColor: result.color }]}>
                <Text style={styles.scoreText}>{score}</Text>
                <Text style={styles.scoreLabel}>{isNe ? 'अंक' : 'Score'}</Text>
              </View>
              <Text style={[styles.resultTitle, { color: result.color }]}>{result.title}</Text>
              <Text style={styles.resultMsg}>{result.message}</Text>
              
              {score > 0 && (
                <Text style={styles.reviewPrompt}>
                  {isNe 
                    ? 'चिन्ताका विषयहरू हेर्नको लागि तल स्क्रोल गर्नुहोस्।' 
                    : 'Scroll down to review the areas of concern.'}
                </Text>
              )}

              <TouchableOpacity 
                style={styles.closeBtn} 
                onPress={() => setShowResultModal(false)}
              >
                <Text style={styles.closeBtnText}>{isNe ? 'समीक्षा गर्नुहोस्' : 'Review Answers'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </PremiumGuard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  backBtn: { padding: 4, marginRight: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  centeredContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  warningBoxLarge: { backgroundColor: '#fff', padding: 30, borderRadius: 20, alignItems: 'center', elevation: 4, width: '100%' },
  warningTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginTop: 15, marginBottom: 10 },
  warningTextLarge: { fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 24, marginBottom: 30 },
  goBackBtn: { backgroundColor: '#1a73e8', paddingVertical: 12, paddingHorizontal: 40, borderRadius: 10 },
  goBackBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  intro: { fontSize: 15, color: '#666', marginBottom: 20, lineHeight: 22 },
  questionCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2, borderLeftWidth: 0 },
  concernCard: { borderLeftWidth: 4, borderLeftColor: '#F44336' },
  questionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  concernBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFEBEE', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  concernBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#F44336' },
  questionNum: { fontSize: 12, fontWeight: 'bold', color: '#1a73e8', textTransform: 'uppercase' },
  questionText: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 8, lineHeight: 22 },
  questionDesc: { fontSize: 13, color: '#888', marginBottom: 16, fontStyle: 'italic' },
  optionsRow: { flexDirection: 'row', gap: 12 },
  optionBtn: { flex: 1, height: 44, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', alignItems: 'center', justifyContent: 'center' },
  optionBtnActive: { backgroundColor: '#1a73e8', borderColor: '#1a73e8' },
  optionBtnConcern: { backgroundColor: '#F44336', borderColor: '#F44336' },
  optionText: { fontSize: 15, fontWeight: '600', color: '#666' },
  optionTextActive: { color: '#fff' },
  submitBtn: { backgroundColor: '#1a73e8', height: 55, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 10, elevation: 3 },
  submitBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 30, width: '100%', alignItems: 'center' },
  scoreBadge: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  scoreText: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  scoreLabel: { fontSize: 12, color: '#fff', fontWeight: 'bold' },
  resultTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  resultMsg: { fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 24, marginBottom: 20 },
  reviewPrompt: { fontSize: 14, color: '#888', marginBottom: 20, fontStyle: 'italic' },
  closeBtn: { backgroundColor: '#f0f0f0', paddingVertical: 12, paddingHorizontal: 40, borderRadius: 10 },
  closeBtnText: { color: '#333', fontSize: 16, fontWeight: '600' },
});
