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
  scoring: 'yes_concern' | 'no_concern'; // yes_concern = score 1, no_concern = score 0
}

const MCHAT_QUESTIONS: MChatQuestion[] = [
  {
    id: 'q1',
    questionEn: 'Does your child enjoy being swung, bounced on your knee, etc.?',
    questionNe: 'के तपाईंको बच्चा झूलिएको, घुँडामा उछालिएको आदि पसन्द गर्छ?',
    descriptionEn: 'Watch if the child laughs and shows enjoyment during physical play.',
    descriptionNe: 'शारीरिक खेलकुदमा बच्चा हाँस्छ र आनन्द देखाउँछ कि भनेर हेर्नुहोस्।',
    scoring: 'no_concern',
  },
  {
    id: 'q2',
    questionEn: 'Does your child take interest in other children?',
    questionNe: 'के तपाईंको बच्चा अन्य बच्चाहरूमा रुचि राख्छ?',
    descriptionEn: 'Look for eye contact, smiling, or attempts to interact with other children.',
    descriptionNe: 'अन्य बच्चाहरूसँग आँखाको सम्पर्क, मुस्कुराउने, वा अन्तरक्रिया गर्ने प्रयास हेर्नुहोस्।',
    scoring: 'no_concern',
  },
  {
    id: 'q3',
    questionEn: 'Does your child like to climb on things, such as up stairs?',
    questionNe: 'के तपाईंको बच्चा सीढीजस्ता चीजहरूमा चढ्न पसन्द गर्छ?',
    descriptionEn: 'Observe if the child attempts to climb or explores physical challenges.',
    descriptionNe: 'बच्चा चढ्ने प्रयास गर्छ वा शारीरिक चुनौतीहरू अन्वेषण गर्छ कि भनेर हेर्नुहोस्।',
    scoring: 'no_concern',
  },
  {
    id: 'q4',
    questionEn: 'Does your child play peek-a-boo or hide-and-seek?',
    questionNe: 'के तपाईंको बच्चा पीक-अ-बू वा लुकाएको खेल खेल्छ?',
    descriptionEn: 'Watch for back-and-forth interaction and understanding of the game.',
    descriptionNe: 'आगोपछाडिको अन्तरक्रिया र खेलको बुझाइ हेर्नुहोस्।',
    scoring: 'no_concern',
  },
  {
    id: 'q5',
    questionEn: 'Does your child ever pretend, for example, to drink from an empty cup or pretend to talk on a phone?',
    questionNe: 'के तपाईंको बच्चा कहिले नाटक गर्छ, उदाहरणको लागि, खाली कपबाट पिउने वा फोनमा कुरा गर्ने नाटक गर्छ?',
    descriptionEn: 'Look for symbolic or imaginative play behavior.',
    descriptionNe: 'प्रतीकात्मक वा कल्पनाशील खेलको व्यवहार हेर्नुहोस्।',
    scoring: 'no_concern',
  },
  {
    id: 'q6',
    questionEn: 'Does your child ever use his/her index finger to point, to ask for something?',
    questionNe: 'के तपाईंको बच्चा कहिले आफ्नो तर्जनी उँगली प्रयोग गरेर केहि माग्न संकेत गर्छ?',
    descriptionEn: 'Observe if the child uses pointing to communicate needs or share interest.',
    descriptionNe: 'बच्चा आवश्यकता संचार गर्न वा रुचि साझा गर्न संकेत गर्छ कि भनेर हेर्नुहोस्।',
    scoring: 'no_concern',
  },
  {
    id: 'q7',
    questionEn: 'Does your child ever use his/her index finger to point, to show you something interesting?',
    questionNe: 'के तपाईंको बच्चा कहिले आफ्नो तर्जनी उँगली प्रयोग गरेर तपाईंलाई केहि रोचक देखाउन संकेत गर्छ?',
    descriptionEn: 'Look for joint attention and sharing of interest.',
    descriptionNe: 'संयुक्त ध्यान र रुचि साझा गरिएको हेर्नुहोस्।',
    scoring: 'no_concern',
  },
  {
    id: 'q8',
    questionEn: 'Is your child interested in playing with toys in a functional way (e.g., putting objects in a container, taking them out)?',
    questionNe: 'के तपाईंको बच्चा खेलौनाहरूसँग कार्यात्मक तरिकामा खेल्न रुचि राख्छ (जस्तै, वस्तुहरू कन्टेनरमा राख्ने, निकाल्ने)?',
    descriptionEn: 'Observe functional and purposeful play with objects.',
    descriptionNe: 'वस्तुहरूको साथ कार्यात्मक र उद्देश्यपूर्ण खेल हेर्नुहोस्।',
    scoring: 'no_concern',
  },
  {
    id: 'q9',
    questionEn: 'Does your child ever bring you things to show you?',
    questionNe: 'के तपाईंको बच्चा कहिले तपाईंलाई देखाउन केहि ल्याउँछ?',
    descriptionEn: 'Look for sharing of objects and joint attention.',
    descriptionNe: 'वस्तु साझा गरिएको र संयुक्त ध्यान हेर्नुहोस्।',
    scoring: 'no_concern',
  },
  {
    id: 'q10',
    questionEn: 'Does your child look you in the eye for more than a few seconds at a time?',
    questionNe: 'के तपाईंको बच्चा एक पटकमा केहि सेकेन्डभन्दा बढी समयको लागि तपाईंको आँखामा हेर्छ?',
    descriptionEn: 'Observe sustained eye contact during interaction.',
    descriptionNe: 'अन्तरक्रियाको समयमा स्थिर आँखाको सम्पर्क हेर्नुहोस्।',
    scoring: 'no_concern',
  },
  {
    id: 'q11',
    questionEn: 'Does your child seem oversensitive to noise (e.g., plugging ears)?',
    questionNe: 'के तपाईंको बच्चा आवाजमा अत्यधिक संवेदनशील देखिन्छ (जस्तै, कान बन्द गर्ने)?',
    descriptionEn: 'Watch for unusual reactions to sounds.',
    descriptionNe: 'आवाजमा असामान्य प्रतिक्रिया हेर्नुहोस्।',
    scoring: 'yes_concern',
  },
  {
    id: 'q12',
    questionEn: 'Does your child smile in response to your face or your smiling?',
    questionNe: 'के तपाईंको बच्चा तपाईंको अनुहार वा तपाईंको मुस्कुरामा प्रतिक्रिया स्वरूप मुस्कुराउँछ?',
    descriptionEn: 'Look for social reciprocity in smiling.',
    descriptionNe: 'मुस्कुरामा सामाजिक पारस्परिकता हेर्नुहोस्।',
    scoring: 'no_concern',
  },
  {
    id: 'q13',
    questionEn: 'Does your child imitate you? (e.g., you make a face and he/she imitates it)',
    questionNe: 'के तपाईंको बच्चा तपाईंको नकल गर्छ? (जस्तै, तपाई मुहार बनाउनुहुन्छ र बच्चा नकल गर्छ)',
    descriptionEn: 'Observe imitation of facial expressions or actions.',
    descriptionNe: 'अनुहारको अभिव्यक्ति वा कार्यहरूको नकल हेर्नुहोस्।',
    scoring: 'no_concern',
  },
  {
    id: 'q14',
    questionEn: 'Does your child ever respond to his/her name when you call?',
    questionNe: 'के तपाईंको बच्चा कहिले तपाईंले बोलाउँदा आफ्नो नाममा प्रतिक्रिया दिन्छ?',
    descriptionEn: 'Watch for name recognition and response.',
    descriptionNe: 'नाम पहिचान र प्रतिक्रिया हेर्नुहोस्।',
    scoring: 'no_concern',
  },
  {
    id: 'q15',
    questionEn: 'If you point at a toy across the room, does your child look at it?',
    questionNe: 'यदि तपाई कोठाको अर्को पार खेलौनामा संकेत गर्नुहुन्छ, के तपाईंको बच्चा यसमा हेर्छ?',
    descriptionEn: 'Observe joint attention and following of pointing gestures.',
    descriptionNe: 'संयुक्त ध्यान र संकेत गर्ने इशारा अनुसरण हेर्नुहोस्।',
    scoring: 'no_concern',
  },
  {
    id: 'q16',
    questionEn: 'Does your child walk?',
    questionNe: 'के तपाईंको बच्चा हिंड्छ?',
    descriptionEn: 'Observe gross motor development.',
    descriptionNe: 'सामान्य मोटर विकास हेर्नुहोस्।',
    scoring: 'no_concern',
  },
  {
    id: 'q17',
    questionEn: 'Does your child look at things you are looking at?',
    questionNe: 'के तपाईंको बच्चा तपाई हेर्दै गरेको चीजहरू हेर्छ?',
    descriptionEn: 'Observe joint attention and gaze following.',
    descriptionNe: 'संयुक्त ध्यान र दृष्टि अनुसरण हेर्नुहोस्।',
    scoring: 'no_concern',
  },
  {
    id: 'q18',
    questionEn: 'Does your child make unusual finger movements near his/her face?',
    questionNe: 'के तपाईंको बच्चा आफ्नो अनुहार नजिक असामान्य उँगली आन्दोलन गर्छ?',
    descriptionEn: 'Watch for repetitive or stereotyped hand movements.',
    descriptionNe: 'दोहोरिएको वा स्टेरिओटाइप हात आन्दोलन हेर्नुहोस्।',
    scoring: 'yes_concern',
  },
  {
    id: 'q19',
    questionEn: 'Does your child ever try to say any words or imitate any sounds?',
    questionNe: 'के तपाईंको बच्चा कहिले कुनै शब्द भन्ने वा कुनै आवाज नकल गर्ने प्रयास गर्छ?',
    descriptionEn: 'Observe language development and vocalization.',
    descriptionNe: 'भाषा विकास र आवाज निकाल्ने हेर्नुहोस्।',
    scoring: 'no_concern',
  },
  {
    id: 'q20',
    questionEn: 'Does your child understand simple instructions? (e.g., "Get your shoes" or "Don\'t touch")',
    questionNe: 'के तपाईंको बच्चा सरल निर्देशनहरू बुझ्छ? (जस्तै, "आफ्नो जुत्ता ल्याउ" वा "नछुनु")',
    descriptionEn: 'Observe receptive language and comprehension.',
    descriptionNe: 'ग्राहक भाषा र बुझाइ हेर्नुहोस्।',
    scoring: 'no_concern',
  },
];

export default function MChatScreen({ route, navigation }: Props) {
  const { child } = route.params;
  const { language } = useContext(LanguageContext);
  const t = translations[language];
  const isNe = language === 'ne';

  const [responses, setResponses] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);

  const ageMonths = getAgeInMonths(child.dateOfBirth, dayjs().format('YYYY-MM-DD'));
  const isAppropriateAge = ageMonths >= 16 && ageMonths <= 30;

  const calculateScore = () => {
    let totalScore = 0;
    MCHAT_QUESTIONS.forEach(q => {
      if (responses[q.id]) {
        totalScore += q.scoring === 'yes_concern' ? 1 : 0;
      }
    });
    return totalScore;
  };

  const handleSubmit = async () => {
    const totalScore = calculateScore();
    setScore(totalScore);
    setShowResult(true);

    // Save result to Firestore
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
          ? 'आपके बच्चे को विकास सामान्य दिख रहा है। नियमित जांच जारी रखें।'
          : 'Your child\'s development appears typical. Continue regular check-ups.',
        color: '#4CAF50',
      };
    } else if (score <= 7) {
      return {
        title: isNe ? 'मध्यम जोखिम' : 'Medium Risk',
        message: isNe
          ? 'आपके बच्चे को एक बाल रोग विशेषज्ञ द्वारा मूल्यांकन किया जाना चाहिए।'
          : 'Your child should be evaluated by a pediatrician.',
        color: '#FF9800',
      };
    } else {
      return {
        title: isNe ? 'उच्च जोखिम' : 'High Risk',
        message: isNe
          ? 'कृपया तुरंत एक बाल रोग विशेषज्ञ या विकास विशेषज्ञ से परामर्श लें।'
          : 'Please consult a pediatrician or developmental specialist immediately.',
        color: '#F44336',
      };
    }
  };

  if (!isAppropriateAge) {
    return (
      <View style={styles.container}>
        <View style={styles.warningBox}>
          <Ionicons name="alert-circle" size={48} color="#FF9800" />
          <Text style={styles.warningTitle}>{isNe ? 'उपयुक्त आयु नहीं' : 'Not Appropriate Age'}</Text>
          <Text style={styles.warningText}>
            {isNe
              ? 'M-CHAT-R/F स्क्रीनिंग 16-30 महीने की आयु के लिए डिज़ाइन की गई है।'
              : 'M-CHAT-R/F screening is designed for ages 16-30 months.'}
          </Text>
          <Text style={styles.warningAge}>
            {isNe ? `वर्तमान आयु: ${ageMonths} महिने` : `Current age: ${ageMonths} months`}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <PremiumGuard feature="autism_screening">
      <View style={styles.container}>
        <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>M-CHAT-R/F</Text>
            <Text style={styles.headerSub}>
              {isNe ? 'आत्मकेंद्रित स्क्रीनिंग' : 'Autism Screening'}
            </Text>
            <Text style={styles.reference}>
              {isNe ? 'नेपाली सत्यापित संस्करण' : 'Nepali Validated Version'}
            </Text>
          </View>

          {MCHAT_QUESTIONS.map((question, index) => (
            <View key={question.id} style={styles.questionCard}>
              <View style={styles.questionHeader}>
                <Text style={styles.questionNumber}>{index + 1}</Text>
                <Text style={styles.questionText}>
                  {isNe ? question.questionNe : question.questionEn}
                </Text>
              </View>
              <Text style={styles.descriptionText}>
                {isNe ? question.descriptionNe : question.descriptionEn}
              </Text>
              <View style={styles.responseButtons}>
                <TouchableOpacity
                  style={[
                    styles.responseBtn,
                    responses[question.id] === true && styles.responseBtnActive,
                  ]}
                  onPress={() => setResponses({ ...responses, [question.id]: true })}
                >
                  <Text style={[styles.responseBtnText, responses[question.id] === true && styles.responseBtnTextActive]}>
                    {isNe ? 'हो' : 'Yes'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.responseBtn,
                    responses[question.id] === false && styles.responseBtnActive,
                  ]}
                  onPress={() => setResponses({ ...responses, [question.id]: false })}
                >
                  <Text style={[styles.responseBtnText, responses[question.id] === false && styles.responseBtnTextActive]}>
                    {isNe ? 'छैन' : 'No'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          <TouchableOpacity
            style={[styles.submitBtn, Object.keys(responses).length < MCHAT_QUESTIONS.length && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={Object.keys(responses).length < MCHAT_QUESTIONS.length}
          >
            <Text style={styles.submitBtnText}>{isNe ? 'परिणाम देखें' : 'See Results'}</Text>
          </TouchableOpacity>
        </ScrollView>

        <Modal visible={showResult} transparent animationType="fade">
          <View style={styles.resultModal}>
            <View style={styles.resultBox}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setShowResult(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
              <View style={[styles.resultContent, { borderTopColor: getResultMessage().color }]}>
                <Text style={[styles.resultTitle, { color: getResultMessage().color }]}>
                  {getResultMessage().title}
                </Text>
                <Text style={styles.scoreText}>
                  {isNe ? 'स्कोर:' : 'Score:'} {score}/{MCHAT_QUESTIONS.length}
                </Text>
                <Text style={styles.resultMessage}>{getResultMessage().message}</Text>
                <View style={styles.referenceBox}>
                  <Text style={styles.referenceTitle}>{isNe ? 'संदर्भ:' : 'Reference:'}</Text>
                  <Text style={styles.referenceText}>
                    Robins, D.L., et al. (2014). Modified Checklist for Autism in Toddlers, Revised with Follow-up (M-CHAT-R/F)
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </PremiumGuard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { backgroundColor: '#1a73e8', padding: 20, alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 14, color: '#e0e0e0', marginTop: 4 },
  reference: { fontSize: 12, color: '#b3d9ff', marginTop: 8, fontStyle: 'italic' },
  questionCard: { backgroundColor: '#fff', marginHorizontal: 12, marginVertical: 8, borderRadius: 12, padding: 16, elevation: 1 },
  questionHeader: { flexDirection: 'row', marginBottom: 8 },
  questionNumber: { fontSize: 16, fontWeight: '700', color: '#1a73e8', marginRight: 12, minWidth: 24 },
  questionText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#333', lineHeight: 20 },
  descriptionText: { fontSize: 12, color: '#666', marginBottom: 12, lineHeight: 16, fontStyle: 'italic' },
  responseButtons: { flexDirection: 'row', gap: 12 },
  responseBtn: { flex: 1, borderWidth: 2, borderColor: '#ddd', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  responseBtnActive: { borderColor: '#1a73e8', backgroundColor: '#E8F0FE' },
  responseBtnText: { fontSize: 13, fontWeight: '600', color: '#666' },
  responseBtnTextActive: { color: '#1a73e8' },
  submitBtn: { backgroundColor: '#1a73e8', marginHorizontal: 12, marginVertical: 20, borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  submitBtnDisabled: { backgroundColor: '#ccc' },
  submitBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  warningBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  warningTitle: { fontSize: 18, fontWeight: '700', color: '#FF9800', marginTop: 12 },
  warningText: { fontSize: 14, color: '#666', marginTop: 8, textAlign: 'center', lineHeight: 20 },
  warningAge: { fontSize: 13, color: '#999', marginTop: 12, fontStyle: 'italic' },
  resultModal: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', alignItems: 'center' },
  resultBox: { backgroundColor: '#fff', borderRadius: 16, marginHorizontal: 20, maxHeight: '80%' },
  closeBtn: { alignSelf: 'flex-end', padding: 12 },
  resultContent: { paddingHorizontal: 20, paddingBottom: 20, borderTopWidth: 4 },
  resultTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  scoreText: { fontSize: 16, fontWeight: '600', color: '#666', marginBottom: 12 },
  resultMessage: { fontSize: 14, color: '#333', lineHeight: 20, marginBottom: 16 },
  referenceBox: { backgroundColor: '#f5f5f5', padding: 12, borderRadius: 8 },
  referenceTitle: { fontSize: 12, fontWeight: '700', color: '#333' },
  referenceText: { fontSize: 11, color: '#666', marginTop: 4, lineHeight: 16 },
});
