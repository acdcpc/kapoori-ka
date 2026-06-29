// src/screens/MChatScreen.tsx
import React, { useContext, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { collection, addDoc } from 'firebase/firestore';
import dayjs from 'dayjs';
import { db, auth } from '../../firebase.ts';
// NEW — no cycle
import { LanguageContext } from '../context/LanguageContext';
import { RootStackParamList } from '../navigation/types';
import { translations } from '../i18n/translations';
import { getAgeInMonths } from '../utils/growthCalculations';
import { NativeStackScreenProps } from '@react-navigation/native-stack';


type Props = NativeStackScreenProps<RootStackParamList, 'MChat'>;

interface MChatQuestion {
  id: string;
  question: string;
  questionNepali: string;
  failAnswer: boolean;
}

const MCHAT_QUESTIONS: MChatQuestion[] = [
  { id: 'q1',  failAnswer: false, question: 'If you point at something across the room, does your child look at it?',                          questionNepali: 'कोठामा केहीतिर औंल्याउँदा बच्चाले त्यो हेर्छ?' },
  { id: 'q2',  failAnswer: true,  question: 'Have you ever wondered if your child might be deaf?',                                             questionNepali: 'के तपाईंलाई कहिले सोच्नुभयो कि बच्चाले सुनदैन?' },
  { id: 'q3',  failAnswer: false, question: 'Does your child play pretend or make-believe?',                                                   questionNepali: 'बच्चाले नाटकीय वा कल्पनाको खेल खेल्छ?' },
  { id: 'q4',  failAnswer: false, question: 'Does your child like climbing on things?',                                                        questionNepali: 'बच्चाले कुराहरूमाथि चढ्न मन पराउँछ?' },
  { id: 'q5',  failAnswer: true,  question: 'Does your child make unusual finger movements near his/her eyes?',                                questionNepali: 'बच्चाले आँखाको छेउमा असामान्य औंला हल्लाउँछ?' },
  { id: 'q6',  failAnswer: false, question: 'Does your child point with one finger to ask for something or get help?',                        questionNepali: 'बच्चाले केहि माग्न वा मद्दत लिन एउटा औंलाले देखाउँछ?' },
  { id: 'q7',  failAnswer: false, question: 'Does your child point with one finger to show you something interesting?',                       questionNepali: 'बच्चाले रोचक चिज देखाउन एउटा औंलाले औंल्याउँछ?' },
  { id: 'q8',  failAnswer: false, question: 'Is your child interested in other children?',                                                    questionNepali: 'बच्चाले अन्य बच्चाहरूमा रुचि राख्छ?' },
  { id: 'q9',  failAnswer: false, question: 'Does your child show you things by bringing them to you or holding them up?',                    questionNepali: 'बच्चाले चिजहरू तपाईंलाई ल्याएर वा उठाएर देखाउँछ?' },
  { id: 'q10', failAnswer: false, question: 'Does your child respond to his/her name when you call?',                                         questionNepali: 'बच्चाले नाम बोलाउँदा प्रतिक्रिया दिन्छ?' },
  { id: 'q11', failAnswer: false, question: 'When you smile at your child, does he/she smile back?',                                          questionNepali: 'तपाईं हाँस्दा बच्चाले पनि हाँस्छ?' },
  { id: 'q12', failAnswer: true,  question: 'Does your child get upset by everyday noises?',                                                  questionNepali: 'सामान्य आवाजले बच्चालाई परेशान पार्छ?' },
  { id: 'q13', failAnswer: false, question: 'Does your child walk?',                                                                          questionNepali: 'बच्चाले हिँड्छ?' },
  { id: 'q14', failAnswer: false, question: 'Does your child look you in the eye when you are talking or playing?',                           questionNepali: 'कुरा गर्दा वा खेल्दा बच्चाले आँखामा हेर्छ?' },
  { id: 'q15', failAnswer: false, question: 'Does your child try to copy what you do?',                                                       questionNepali: 'बच्चाले तपाईंको काम नक्कल गर्न कोशिश गर्छ?' },
  { id: 'q16', failAnswer: false, question: 'If you turn your head to look at something, does your child look around?',                       questionNepali: 'केहीतिर हेर्न टाउको फरकाउँदा बच्चाले वरिपरि हेर्छ?' },
  { id: 'q17', failAnswer: false, question: 'Does your child try to get you to watch him/her?',                                               questionNepali: 'बच्चाले तपाईंलाई आफूतिर हेराउन कोशिश गर्छ?' },
  { id: 'q18', failAnswer: false, question: 'Does your child understand what you say?',                                                       questionNepali: 'बच्चाले तपाईंको कुरा बुझ्छ?' },
  { id: 'q19', failAnswer: false, question: 'When something new happens, does your child stare at your face to see how to react?',            questionNepali: 'नयाँ कुरा हुँदा बच्चाले कसरी प्रतिक्रिया दिने जान्न तपाईंको अनुहार हेर्छ?' },
  { id: 'q20', failAnswer: false, question: 'Does your child like movement activities?',                                                      questionNepali: 'बच्चाले गति गतिविधिहरू मन पराउँछ?' },
];

const getResult = (score: number) => {
  if (score <= 2)  return { level: 'low',    color: '#4CAF50', emoji: '🟢' };
  if (score <= 7)  return { level: 'medium', color: '#FF9800', emoji: '🟡' };
  return             { level: 'high',   color: '#F44336', emoji: '🔴' };
};

export default function MChatScreen({ route }: Props) {
  const { child } = route.params;
  const { language } = useContext(LanguageContext);
  const t = translations[language];

  const ageMonths = getAgeInMonths(child.dateOfBirth, dayjs().format('YYYY-MM-DD'));
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [saving, setSaving] = useState(false);

  if (ageMonths < 18 || ageMonths > 30) {
    return (
      <View style={styles.notApplicable}>
        <Text style={styles.notApplicableIcon}>🔍</Text>
        <Text style={styles.notApplicableTitle}>{t.mchatNotApplicable}</Text>
        <Text style={styles.notApplicableDesc}>{t.mchatAgeRequired}</Text>
        <Text style={styles.notApplicableAge}>{language === 'en' ? `Current age: ${ageMonths} months` : `हालको उमेर: ${ageMonths} महिना`}</Text>
      </View>
    );
  }

  const setAnswer = (qId: string, answer: boolean) => setAnswers(prev => ({ ...prev, [qId]: answer }));

  const calculateAndSubmit = async () => {
    const unanswered = MCHAT_QUESTIONS.filter(q => answers[q.id] === undefined);
    if (unanswered.length > 0) {
      Alert.alert(language === 'en' ? 'Incomplete' : 'अधुरो',
        language === 'en' ? `Please answer all ${MCHAT_QUESTIONS.length} questions. ${unanswered.length} remaining.` : `कृपया सबै ${MCHAT_QUESTIONS.length} प्रश्नहरूको जवाफ दिनुहोस्। ${unanswered.length} बाँकी।`);
      return;
    }
    let failCount = 0;
    MCHAT_QUESTIONS.forEach(q => { if (answers[q.id] === q.failAnswer) failCount++; });

    setSaving(true);
    try {
      const user = auth.currentUser;
      await addDoc(collection(db, 'mchat_results'), {
        childId: child.id, ownerId: user?.uid || 'anonymous', date: dayjs().format('YYYY-MM-DD'), ageAtScreening: ageMonths,
        answers, score: failCount, riskLevel: getResult(failCount).level, followUpRequired: failCount >= 3,
      });
      setScore(failCount); setSubmitted(true);
    } catch { Alert.alert('Error', 'Could not save result. Try again.'); }
    finally { setSaving(false); }
  };

  if (submitted) {
    const result = getResult(score);
    const levelKey = `mchat${result.level.charAt(0).toUpperCase() + result.level.slice(1)}Risk` as keyof typeof t;
    const descKey  = `mchat${result.level.charAt(0).toUpperCase() + result.level.slice(1)}RiskDesc` as keyof typeof t;
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.resultContainer}>
        <Text style={styles.resultEmoji}>{result.emoji}</Text>
        <Text style={styles.resultScore}>{language === 'en' ? `Score: ${score} / 20` : `स्कोर: ${score} / २०`}</Text>
        <Text style={[styles.resultLevel, { color: result.color }]}>{t[levelKey] as string}</Text>
        <View style={[styles.resultCard, { borderColor: result.color }]}>
          <Text style={styles.resultDesc}>{t[descKey] as string}</Text>
        </View>
        {score >= 3 && (
          <View style={styles.referralBox}>
            <Text style={styles.referralTitle}>{language === 'en' ? '📋 Next Steps' : '📋 अर्को कदम'}</Text>
            <Text style={styles.referralText}>
              {language === 'en'
                ? 'This screening result suggests your child may benefit from a developmental evaluation. Please share this result with your pediatrician. Early intervention leads to better outcomes.'
                : 'यो जाँचको नतिजाले बच्चालाई विकास मूल्याङ्कन उपयोगी हुन सक्छ भन्ने संकेत गरछ। कृपया यो नतिजा आफ्नो बालरोग विशेषज्ञसँग साझा गर्नुहोस्। प्रारम्भिक हस्तक्षेपले राम्रो नतिजा दिन्छ।'}
            </Text>
          </View>
        )}
        <Text style={styles.disclaimer}>
          {language === 'en'
            ? '⚠️ This screening does not diagnose autism. Only a qualified professional can make a diagnosis.'
            : '⚠️ यो जाँचले अटिज्म निदान गर्दैन। केबल योग्य पेशेवरले मात्र निदान गर्न सक्छन्।'}
        </Text>
      </ScrollView>
    );
  }

  const answeredCount = Object.keys(answers).length;
  return (
    <ScrollView style={styles.container}>
      <View style={styles.introCard}>
        <Text style={styles.introTitle}>{t.mchatSubtitle}</Text>
        <Text style={styles.introText}>{t.mchatIntro}</Text>
        <Text style={styles.introProgress}>{language === 'en' ? `${answeredCount} / ${MCHAT_QUESTIONS.length} answered` : `${answeredCount} / ${MCHAT_QUESTIONS.length} जवाफ दिइयो`}</Text>
      </View>

      {MCHAT_QUESTIONS.map((q, index) => (
        <View key={q.id} style={styles.questionCard}>
          <Text style={styles.questionNum}>{language === 'en' ? `Q${index + 1}` : `प्र${index + 1}`}</Text>
          <Text style={styles.questionText}>{language === 'en' ? q.question : q.questionNepali}</Text>
          <View style={styles.answerRow}>
            <TouchableOpacity style={[styles.answerBtn, answers[q.id] === true && styles.answerBtnYes]} onPress={() => setAnswer(q.id, true)}>
              <Text style={[styles.answerBtnText, answers[q.id] === true && styles.answerBtnTextActive]}>{t.mchatYes}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.answerBtn, answers[q.id] === false && styles.answerBtnNo]} onPress={() => setAnswer(q.id, false)}>
              <Text style={[styles.answerBtnText, answers[q.id] === false && styles.answerBtnTextActive]}>{t.mchatNo}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <TouchableOpacity
        style={[styles.submitBtn, saving && { opacity: 0.6 }, answeredCount < MCHAT_QUESTIONS.length && styles.submitBtnDisabled]}
        onPress={calculateAndSubmit} disabled={saving}
      >
        <Text style={styles.submitBtnText}>{saving ? t.loading : `${t.mchatSubmit} (${answeredCount}/${MCHAT_QUESTIONS.length})`}</Text>
      </TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  notApplicable: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  notApplicableIcon: { fontSize: 64, marginBottom: 16 },
  notApplicableTitle: { fontSize: 18, fontWeight: '700', color: '#333', textAlign: 'center', marginBottom: 8 },
  notApplicableDesc: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 8 },
  notApplicableAge: { fontSize: 13, color: '#1a73e8', fontWeight: '600' },
  introCard: { margin: 12, backgroundColor: '#E3F2FD', borderRadius: 14, padding: 16 },
  introTitle: { fontSize: 15, fontWeight: '700', color: '#1565C0', marginBottom: 8 },
  introText: { fontSize: 13, color: '#333', lineHeight: 20, marginBottom: 8 },
  introProgress: { fontSize: 13, color: '#1a73e8', fontWeight: '600' },
  questionCard: { marginHorizontal: 12, marginBottom: 10, backgroundColor: '#fff', borderRadius: 12, padding: 14, elevation: 1, boxShadow: '0px 1px 2px rgba(0,0,0,0.1)' },
  questionNum: { fontSize: 11, fontWeight: '700', color: '#1a73e8', marginBottom: 4, textTransform: 'uppercase' },
  questionText: { fontSize: 14, color: '#222', lineHeight: 20, marginBottom: 12 },
  answerRow: { flexDirection: 'row', gap: 10 },
  answerBtn: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 2, borderColor: '#ddd', alignItems: 'center', backgroundColor: '#f9f9f9' },
  answerBtnYes: { borderColor: '#4CAF50', backgroundColor: '#E8F5E9' },
  answerBtnNo: { borderColor: '#F44336', backgroundColor: '#FFEBEE' },
  answerBtnText: { fontWeight: '600', fontSize: 14, color: '#555' },
  answerBtnTextActive: { color: '#222' },
  submitBtn: { margin: 12, backgroundColor: '#1a73e8', borderRadius: 12, padding: 16, alignItems: 'center' },
  submitBtnDisabled: { backgroundColor: '#90CAF9' },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  resultContainer: { alignItems: 'center', padding: 24 },
  resultEmoji: { fontSize: 72, marginBottom: 8 },
  resultScore: { fontSize: 18, color: '#555', marginBottom: 4 },
  resultLevel: { fontSize: 28, fontWeight: '700', marginBottom: 16 },
  resultCard: { width: '100%', borderWidth: 2, borderRadius: 14, padding: 18, marginBottom: 16 },
  resultDesc: { fontSize: 15, color: '#333', lineHeight: 22, textAlign: 'center' },
  referralBox: { width: '100%', backgroundColor: '#FFF3E0', borderRadius: 12, padding: 16, marginBottom: 16 },
  referralTitle: { fontSize: 15, fontWeight: '700', color: '#E65100', marginBottom: 8 },
  referralText: { fontSize: 13, color: '#333', lineHeight: 20 },
  disclaimer: { fontSize: 12, color: '#888', textAlign: 'center', lineHeight: 18, paddingHorizontal: 16 },
});