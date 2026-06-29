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
    id: 'rota1',
    name: 'Rota 1',
    nameNepali: 'रोटा १',
    ageInDays: 42,  // 6 weeks
    description: 'Protects against Rotavirus diarrhea.',
    descriptionNepali: 'रोटाभाइरस झाडापखालाबाट सुरक्षा।',
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
    id: 'pcv2',
    name: 'PCV 2',
    nameNepali: 'पीसीभी २',
    ageInDays: 70,  // 10 weeks
    description: 'Second dose of Pneumococcal vaccine at 10 weeks.',
    descriptionNepali: 'न्युमोकोकल खोपको दोस्रो खुराक १० हप्तामा।',
  },
  {
    id: 'rota2',
    name: 'Rota 2',
    nameNepali: 'रोटा २',
    ageInDays: 70,  // 10 weeks
    description: 'Second dose of Rotavirus vaccine at 10 weeks.',
    descriptionNepali: 'रोटाभाइरस खोपको दोस्रो खुराक १० हप्तामा।',
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
    id: 'fipv1',
    name: 'fIPV 1',
    nameNepali: 'एफ-आईपीभी १',
    ageInDays: 98,  // 14 weeks
    description: 'Fractional Inactivated Polio Vaccine — first dose at 14 weeks.',
    descriptionNepali: 'पोलियो विरुद्धको सुइ — १४ हप्तामा पहिलो खुराक।',
  },
  {
    id: 'mr1',
    name: 'Measles-Rubella 1 (MR)',
    nameNepali: 'दादुरा-रुबेला १',
    ageInDays: 274,  // 9 months
    description: 'Protects against Measles and Rubella. First dose at 9 months.',
    descriptionNepali: 'दादुरा र रुबेलाबाट सुरक्षा। पहिलो खुराक ९ महिनामा।',
  },
  {
    id: 'pcv3',
    name: 'PCV 3',
    nameNepali: 'पीसीभी ३',
    ageInDays: 274,  // 9 months
    description: 'Third dose of Pneumococcal vaccine at 9 months.',
    descriptionNepali: 'न्युमोकोकल खोपको तेस्रो खुराक ९ महिनामा।',
  },
  {
    id: 'fipv2',
    name: 'fIPV 2',
    nameNepali: 'एफ-आईपीभी २',
    ageInDays: 274,  // 9 months
    description: 'Fractional Inactivated Polio Vaccine — second dose at 9 months.',
    descriptionNepali: 'पोलियो विरुद्धको सुइ — ९ महिनामा दोस्रो खुराक।',
  },
  {
    id: 'je',
    name: 'Japanese Encephalitis (JE)',
    nameNepali: 'जापानी इन्सेफलाइटिस',
    ageInDays: 365,  // 12 months
    description: 'Protects against Japanese Encephalitis (brain fever). Given at 12 months.',
    descriptionNepali: 'जापानी इन्सेफलाइटिस (दिमागी ज्वरो)बाट सुरक्षा। १२ महिनामा दिइन्छ।',
  },
  {
    id: 'mr2',
    name: 'Measles-Rubella 2 (MR)',
    nameNepali: 'दादुरा-रुबेला २',
    ageInDays: 456,  // 15 months
    description: 'Second dose of Measles-Rubella vaccine at 15 months.',
    descriptionNepali: 'दादुरा-रुबेला खोपको दोस्रो खुराक १५ महिनामा।',
  },
  {
    id: 'typhoid',
    name: 'Typhoid Conjugate Vaccine (TCV)',
    nameNepali: 'टाइफाइड खोप',
    ageInDays: 456,  // 15 months
    description: 'Protects against Typhoid fever. Given at 15 months.',
    descriptionNepali: 'टाइफाइड ज्वरोबाट सुरक्षा। १५ महिनामा दिइन्छ।',
  },
];

// Helper: Get vaccine display age string
export const getVaccineAgeLabel = (ageInDays: number, language: 'en' | 'ne'): string => {
  if (ageInDays === 0) return language === 'en' ? 'At Birth' : 'जन्मदा';
  if (ageInDays === 42) return language === 'en' ? '6 weeks' : '६ हप्ता';
  if (ageInDays === 70) return language === 'en' ? '10 weeks' : '१० हप्ता';
  if (ageInDays === 98) return language === 'en' ? '14 weeks' : '१४ हप्ता';
  if (ageInDays === 274) return language === 'en' ? '9 months' : '९ महिना';
  if (ageInDays === 365) return language === 'en' ? '12 months' : '१२ महिना';
  if (ageInDays === 456) return language === 'en' ? '15 months' : '१५ महिना';
  
  if (ageInDays < 7) return language === 'en' ? `${ageInDays} days` : `${ageInDays} दिन`;
  if (ageInDays < 30) {
    const weeks = Math.round(ageInDays / 7);
    return language === 'en' ? `${weeks} weeks` : `${weeks} हप्ता`;
  }
  const months = Math.round(ageInDays / 30.44);
  return language === 'en' ? `${months} months` : `${months} महिना`;
};
