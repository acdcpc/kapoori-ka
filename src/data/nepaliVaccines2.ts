// src/data/nepaliVaccines.ts
// Nepal National Immunization Program Schedule 2024
// Source: Child Health Division, DoHS, Government of Nepal

import { VaccineScheduleItem } from '../types';

export const NEPAL_NIP_SCHEDULE: VaccineScheduleItem[] = [
  {
    id: 'bcg',
    name: 'BCG',
    nameNepali: 'बीसीजी',
    ageInDays: 0,
    description: 'Protects against Tuberculosis (TB). Given at birth.',
    descriptionNepali: 'क्षयरोगबाट सुरक्षा। जन्मदा दिइन्छ।',
  },
  {
    id: 'opv0',
    name: 'OPV 0 (Birth Dose)',
    nameNepali: 'ओपीभी ० (जन्म खोप)',
    ageInDays: 0,
    description: 'Oral Polio Vaccine — first dose at birth.',
    descriptionNepali: 'मुखबाट खुवाउने पोलियो खोप — पहिलो खुराक जन्मदा।',
  },
  {
    id: 'hepb_birth',
    name: 'Hepatitis B (Birth Dose)',
    nameNepali: 'हेपाटाइटिस बी (जन्म खोप)',
    ageInDays: 0,
    description: 'Protects against Hepatitis B liver disease. Given within 24 hours of birth.',
    descriptionNepali: 'कलेजोको रोग हेपाटाइटिस बीबाट सुरक्षा। जन्मको २४ घण्टाभित्र दिइन्छ।',
  },
  {
    id: 'penta1',
    name: 'Pentavalent 1 (DPT-HepB-Hib)',
    nameNepali: 'पेन्टाभ्यालेन्ट १',
    ageInDays: 42,  // 6 weeks
    description: 'Protects against Diphtheria, Pertussis (whooping cough), Tetanus, Hepatitis B, and Hib meningitis. First dose at 6 weeks.',
    descriptionNepali: 'डिप्थेरिया, कुकुरखाने खोकी, टिटानस, हेपाटाइटिस बी र हिब मेनिन्जाइटिसबाट सुरक्षा। ६ हप्तामा पहिलो खुराक।',
  },
  {
    id: 'opv1',
    name: 'OPV 1',
    nameNepali: 'ओपीभी १',
    ageInDays: 42,  // 6 weeks
    description: 'Oral Polio Vaccine — second dose at 6 weeks.',
    descriptionNepali: 'पोलियो खोप — दोस्रो खुराक ६ हप्तामा।',
  },
  {
    id: 'pcv1',
    name: 'PCV 1 (Pneumococcal)',
    nameNepali: 'पीसीभी १',
    ageInDays: 42,  // 6 weeks
    description: 'Protects against pneumonia and meningitis caused by Pneumococcus bacteria.',
    descriptionNepali: 'न्युमोकोकस ब्याक्टेरियाबाट हुने निमोनिया र मेनिन्जाइटिसबाट सुरक्षा।',
  },
  {
    id: 'penta2',
    name: 'Pentavalent 2',
    nameNepali: 'पेन्टाभ्यालेन्ट २',
    ageInDays: 70,  // 10 weeks
    description: 'Second dose of Pentavalent at 10 weeks.',
    descriptionNepali: 'पेन्टाभ्यालेन्टको दोस्रो खुराक १० हप्तामा।',
  },
  {
    id: 'opv2',
    name: 'OPV 2',
    nameNepali: 'ओपीभी २',
    ageInDays: 70,  // 10 weeks
    description: 'Oral Polio Vaccine — third dose at 10 weeks.',
    descriptionNepali: 'पोलियो खोप — तेस्रो खुराक १० हप्तामा।',
  },
  {
    id: 'penta3',
    name: 'Pentavalent 3',
    nameNepali: 'पेन्टाभ्यालेन्ट ३',
    ageInDays: 98,  // 14 weeks
    description: 'Third dose of Pentavalent at 14 weeks.',
    descriptionNepali: 'पेन्टाभ्यालेन्टको तेस्रो खुराक १४ हप्तामा।',
  },
  {
    id: 'opv3',
    name: 'OPV 3',
    nameNepali: 'ओपीभी ३',
    ageInDays: 98,  // 14 weeks
    description: 'Oral Polio Vaccine — fourth dose at 14 weeks.',
    descriptionNepali: 'पोलियो खोप — चौथो खुराक १४ हप्तामा।',
  },
  {
    id: 'pcv2',
    name: 'PCV 2',
    nameNepali: 'पीसीभी २',
    ageInDays: 98,  // 14 weeks
    description: 'Second dose of Pneumococcal vaccine at 14 weeks.',
    descriptionNepali: 'न्युमोकोकल खोपको दोस्रो खुराक १४ हप्तामा।',
  },
  {
    id: 'ipv',
    name: 'IPV (Injectable Polio)',
    nameNepali: 'आईपीभी',
    ageInDays: 98,  // 14 weeks
    description: 'Injectable Polio Vaccine — given at 14 weeks.',
    descriptionNepali: 'सुइबाट दिइने पोलियो खोप — १४ हप्तामा।',
  },
  {
    id: 'frsv',
    name: 'fRSV (Fractional RSV)',
    nameNepali: 'एफआरएसभी',
    ageInDays: 98,  // 14 weeks
    description: 'RSV vaccine — protects against respiratory syncytial virus.',
    descriptionNepali: 'श्वासप्रश्वास सम्बन्धी भाइरसबाट सुरक्षा।',
  },
  {
    id: 'measles1',
    name: 'Measles-Rubella 1 (MR)',
    nameNepali: 'दादुरा-रुबेला १',
    ageInDays: 274,  // 9 months
    description: 'Protects against Measles and Rubella. First dose at 9 months.',
    descriptionNepali: 'दादुरा र रुबेलाबाट सुरक्षा। पहिलो खुराक ९ महिनामा।',
  },
  {
    id: 'je1',
    name: 'Japanese Encephalitis 1 (JE)',
    nameNepali: 'जापानी इन्सेफलाइटिस १',
    ageInDays: 274,  // 9 months
    description: 'Protects against Japanese Encephalitis (brain fever). First dose at 9 months.',
    descriptionNepali: 'जापानी इन्सेफलाइटिस (दिमागी ज्वरो)बाट सुरक्षा। पहिलो खुराक ९ महिनामा।',
  },
  {
    id: 'pcv_booster',
    name: 'PCV Booster',
    nameNepali: 'पीसीभी बुस्टर',
    ageInDays: 274,  // 9 months
    description: 'Booster dose of Pneumococcal vaccine at 9 months.',
    descriptionNepali: 'न्युमोकोकल खोपको बुस्टर खुराक ९ महिनामा।',
  },
  {
    id: 'measles2',
    name: 'Measles-Rubella 2 (MR)',
    nameNepali: 'दादुरा-रुबेला २',
    ageInDays: 548,  // 18 months
    description: 'Second dose of Measles-Rubella vaccine at 18 months.',
    descriptionNepali: 'दादुरा-रुबेला खोपको दोस्रो खुराक १८ महिनामा।',
  },
  {
    id: 'je2',
    name: 'Japanese Encephalitis 2 (JE)',
    nameNepali: 'जापानी इन्सेफलाइटिस २',
    ageInDays: 548,  // 18 months
    description: 'Second dose of JE vaccine at 18 months.',
    descriptionNepali: 'जापानी इन्सेफलाइटिस खोपको दोस्रो खुराक १८ महिनामा।',
  },
  {
    id: 'dpt_booster',
    name: 'DPT Booster',
    nameNepali: 'डीपीटी बुस्टर',
    ageInDays: 548,  // 18 months
    description: 'Booster dose against Diphtheria, Pertussis, Tetanus at 18 months.',
    descriptionNepali: 'डिप्थेरिया, कुकुरखाने खोकी, टिटानसको बुस्टर खुराक १८ महिनामा।',
  },
  {
    id: 'opv_booster',
    name: 'OPV Booster',
    nameNepali: 'ओपीभी बुस्टर',
    ageInDays: 548,  // 18 months
    description: 'Booster dose of Oral Polio Vaccine at 18 months.',
    descriptionNepali: 'पोलियो खोपको बुस्टर खुराक १८ महिनामा।',
  },
  {
    id: 'typhoid',
    name: 'Typhoid Conjugate Vaccine (TCV)',
    nameNepali: 'टाइफाइड खोप',
    ageInDays: 548,  // 18 months (check current DoHS schedule)
    description: 'Protects against Typhoid fever.',
    descriptionNepali: 'टाइफाइड ज्वरोबाट सुरक्षा।',
  },
];

// Helper: Get vaccine display age string
export const getVaccineAgeLabel = (ageInDays: number, language: 'en' | 'ne'): string => {
  if (ageInDays === 0) return language === 'en' ? 'At Birth' : 'जन्मदा';
  if (ageInDays < 7) return language === 'en' ? `${ageInDays} days` : `${ageInDays} दिन`;
  if (ageInDays < 30) {
    const weeks = Math.round(ageInDays / 7);
    return language === 'en' ? `${weeks} weeks` : `${weeks} हप्ता`;
  }
  const months = Math.round(ageInDays / 30.44);
  return language === 'en' ? `${months} months` : `${months} महिना`;
};
