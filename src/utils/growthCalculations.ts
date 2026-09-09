// src/utils/growthCalculations.ts
// WHO growth math — exact LMS z-scores and percentiles from the official
// WHO 2006 Child Growth Standards (0-60mo, day-level LMS) and WHO 2007
// Growth Reference (61-216mo). Data tables live in src/data/who*.ts
// (SD columns for charts/bands + L/M/S columns for exact z-scores).
import dayjs from 'dayjs';
import { GrowthRecord } from '../types';
import {
  WHO_WFA_BOYS, WHO_WFA_GIRLS, WHO_WFA_LMS_BOYS, WHO_WFA_LMS_GIRLS,
} from '../data/whoWFA';
import {
  WHO_HFA_BOYS, WHO_HFA_GIRLS, WHO_HFA_LMS_BOYS, WHO_HFA_LMS_GIRLS,
} from '../data/whoHFA';
import {
  WHO_BFA_BOYS, WHO_BFA_GIRLS, WHO_BFA_LMS_BOYS, WHO_BFA_LMS_GIRLS,
} from '../data/whoBFA';
import {
  WHO_HCFA_BOYS, WHO_HCFA_GIRLS, WHO_HCFA_LMS_BOYS, WHO_HCFA_LMS_GIRLS,
} from '../data/whoHCFA';

// Calculate age in months from DOB with decimal precision for better tracking
export const getAgeInMonths = (dateOfBirth: string, measurementDate?: string): number => {
  const dob = new Date(dateOfBirth);
  const mDate = measurementDate ? new Date(measurementDate) : new Date();
  
  if (isNaN(dob.getTime())) return 0;
  
  const years = mDate.getFullYear() - dob.getFullYear();
  const months = mDate.getMonth() - dob.getMonth();
  const days = mDate.getDate() - dob.getDate();
  
  let ageInMonths = years * 12 + months;
  if (days < 0) {
    ageInMonths -= 1;
  }
  
  return Math.max(0, ageInMonths);
};

// Get age in days
export const getAgeInDays = (dateOfBirth: string, referenceDate?: string): number => {
  const dob = new Date(dateOfBirth);
  const ref = referenceDate ? new Date(referenceDate) : new Date();
  if (isNaN(dob.getTime())) return 0;
  
  const diffTime = ref.getTime() - dob.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

// ── Table helpers ────────────────────────────────────────────────────────────

function lmsAt(table: number[][], ageMonths: number): [number, number, number] {
  if (ageMonths <= table[0][0]) return [table[0][1], table[0][2], table[0][3]];
  const last = table[table.length - 1];
  if (ageMonths >= last[0]) return [last[1], last[2], last[3]];
  for (let i = 0; i < table.length - 1; i++) {
    const a = table[i], b = table[i + 1];
    if (ageMonths >= a[0] && ageMonths <= b[0]) {
      const f = (ageMonths - a[0]) / (b[0] - a[0]);
      return [a[1] + f * (b[1] - a[1]), a[2] + f * (b[2] - a[2]), a[3] + f * (b[3] - a[3])];
    }
  }
  return [last[1], last[2], last[3]];
}

function sdRowAt(table: number[][], ageMonths: number): [number, number, number, number, number] {
  if (ageMonths <= table[0][0]) return [table[0][1], table[0][2], table[0][3], table[0][4], table[0][5]];
  const last = table[table.length - 1];
  if (ageMonths >= last[0]) return [last[1], last[2], last[3], last[4], last[5]];
  for (let i = 0; i < table.length - 1; i++) {
    const a = table[i], b = table[i + 1];
    if (ageMonths >= a[0] && ageMonths <= b[0]) {
      const f = (ageMonths - a[0]) / (b[0] - a[0]);
      return [1, 2, 3, 4, 5].map(k => a[k] + f * (b[k] - a[k])) as [number, number, number, number, number];
    }
  }
  return [last[1], last[2], last[3], last[4], last[5]];
}

// Exact WHO LMS z-score: z = ((v/M)^L − 1) / (L·S); L=0 → z = ln(v/M)/S
export const zFromLMS = (value: number, L: number, M: number, S: number): number => {
  if (value <= 0 || M <= 0 || S <= 0) return NaN;
  if (L === 0) return Math.log(value / M) / S;
  return (Math.pow(value / M, L) - 1) / (L * S);
};

// Standard normal CDF (Abramowitz & Stegun 7.1.26) → percentile 0.1–99.9
export const percentileFromZ = (z: number): number => {
  if (isNaN(z)) return NaN;
  const zz = Math.abs(z);
  const tt = 1 / (1 + 0.2316419 * zz);
  const poly = tt * (0.319381530 + tt * (-0.356563782 + tt * (1.781477937 + tt * (-1.821255978 + tt * 1.330274429))));
  const pdf = Math.exp(-zz * zz / 2) / Math.sqrt(2 * Math.PI);
  const p = z >= 0 ? 1 - pdf * poly : pdf * poly;
  return Math.round(Math.min(99.9, Math.max(0.1, p * 100)) * 10) / 10;
};

export interface CentileRange { min: number; ideal: number; max: number; }
export type GrowthStatusResult = {
  status: 'green' | 'yellow' | 'red' | 'grey';
  labelEn: string;
  labelNe: string;
};

// Get the latest growth record from a sorted array
// Get the latest growth record from a sorted array
export const getLatestRecord = (records: GrowthRecord[]): GrowthRecord | null => {
  if (records.length === 0) return null;
  return records[records.length - 1];
};

// Format age for display
export const formatAge = (dateOfBirth: string, language: 'en' | 'ne'): string => {
  const ageDays = getAgeInDays(dateOfBirth);
  const ageMonths = getAgeInMonths(dateOfBirth);
  if (ageDays < 30) {
    return language === 'en' ? `${ageDays} days` : `${ageDays} दिन`;
  }
  if (ageMonths < 24) {
    return language === 'en' ? `${ageMonths} months` : `${ageMonths} महिना`;
  }
  const years = Math.floor(ageMonths / 12);
  const months = ageMonths % 12;
  if (months === 0) {
    return language === 'en' ? `${years} years` : `${years} वर्ष`;
  }
  return language === 'en' ? `${years} years ${months} months` : `${years} वर्ष ${months} महिना`;
};

// ── Metric z-scores (exact LMS) ──────────────────────────────────────────────

// Weight-for-age: WHO 2006 (0-60mo) + WHO 2007 (61-120mo). NaN beyond 10y.
export const weightZScore = (weight: number, ageMonths: number, sex: 'male' | 'female'): number => {
  if (weight <= 0 || ageMonths > 120) return NaN;
  const table = sex === 'male' ? WHO_WFA_LMS_BOYS : WHO_WFA_LMS_GIRLS;
  const [L, M, S] = lmsAt(table, ageMonths);
  return zFromLMS(weight, L, M, S);
};

// Height/length-for-age: WHO 2006 (0-60mo) + WHO 2007 (61-216mo)
export const heightZScore = (height: number, ageMonths: number, sex: 'male' | 'female'): number => {
  if (height <= 0 || ageMonths > 216) return NaN;
  const table = sex === 'male' ? WHO_HFA_LMS_BOYS : WHO_HFA_LMS_GIRLS;
  const [L, M, S] = lmsAt(table, ageMonths);
  return zFromLMS(height, L, M, S);
};

// Head-circumference-for-age: WHO 2006, defined for 0-60 months only
export const hcZScore = (hc: number, ageMonths: number, sex: 'male' | 'female'): number => {
  if (hc <= 0 || ageMonths > 60) return NaN;
  const table = sex === 'male' ? WHO_HCFA_LMS_BOYS : WHO_HCFA_LMS_GIRLS;
  const [L, M, S] = lmsAt(table, ageMonths);
  return zFromLMS(hc, L, M, S);
};

// BMI-for-age: WHO 2006 (24-60mo) + WHO 2007 (61-216mo)
export const bmiZScore = (bmi: number, ageMonths: number, sex: 'male' | 'female'): number => {
  if (bmi <= 0 || ageMonths < 24 || ageMonths > 216) return NaN;
  const table = sex === 'male' ? WHO_BFA_LMS_BOYS : WHO_BFA_LMS_GIRLS;
  const [L, M, S] = lmsAt(table, ageMonths);
  return zFromLMS(bmi, L, M, S);
};

// Head circumference ideal range (0-60 months)
export const hcFromSD = (ageMonths: number, sex: 'male' | 'female'): CentileRange => {
  const row = sdRowAt(sex === 'male' ? WHO_HCFA_BOYS : WHO_HCFA_GIRLS, Math.min(ageMonths, 60));
  return { min: row[1], ideal: row[2], max: row[3] };
};

// ── Classification (WHO z-bands, family-friendly wording) ───────────────────

const zBand = (z: number): 'green' | 'yellow' | 'red' => {
  const az = Math.abs(z);
  if (az <= 2) return 'green';
  if (az <= 3) return 'yellow';
  return 'red';
};

export const classifyGrowthStatus = (
  weight: number | null | undefined,
  height: number | null | undefined,
  ageMonths: number,
  sex: 'male' | 'female',
  opts?: { metric?: 'weight' | 'bmi' | 'height'; bmiValue?: number }
): GrowthStatusResult => {
  const metric = opts?.metric || 'weight';

  if (metric === 'bmi') {
    const bmi = opts?.bmiValue;
    const z = bmi ? bmiZScore(bmi, ageMonths, sex) : NaN;
    if (isNaN(z)) return { status: 'grey', labelEn: 'Not yet measurable', labelNe: 'नाप भएको छैन' };
    const band = zBand(z);
    const labels: Record<string, { en: string; ne: string }> = {
      green: { en: 'Healthy weight', ne: 'स्वस्थ तौल' },
      yellow: { en: band === 'yellow' && z < 0 ? 'Underweight range' : 'Overweight range', ne: band === 'yellow' && z < 0 ? 'कम तौल दायरा' : 'बढी तौल दायरा' },
      red: { en: z < 0 ? 'Severely underweight — see a doctor' : 'Obese range — see a doctor', ne: z < 0 ? 'गम्भीर रूपमा कम तौल — डाक्टर देखाउनुहोस्' : 'मोटोपना दायरा — डाक्टर देखाउनुहोस्' },
    };
    return { status: band, labelEn: labels[band].en, labelNe: labels[band].ne };
  }

  if (metric === 'height') {
    const z = height ? heightZScore(height, ageMonths, sex) : NaN;
    if (isNaN(z)) return { status: 'grey', labelEn: 'Not yet measured', labelNe: 'नाप भएको छैन' };
    const band = zBand(z);
    const labels: Record<string, { en: string; ne: string }> = {
      green: { en: 'Normal height', ne: 'सामान्य उचाइ' },
      yellow: { en: z < 0 ? 'Stunting risk — monitor' : 'Taller than typical', ne: z < 0 ? 'पाकेको जोखिम — निगरानी' : 'सामान्यभन्दा अग्लो' },
      red: { en: z < 0 ? 'Severe stunting — see a doctor' : 'Unusually tall — see a doctor', ne: z < 0 ? 'गम्भीर पाकेको — डाक्टर देखाउनुहोस्' : 'अस्वाभाविक अग्लो — डाक्टर देखाउनुहोस्' },
    };
    return { status: band, labelEn: labels[band].en, labelNe: labels[band].ne };
  }

  // Weight (default). WHO defines weight-for-age to 10 years; after that we
  // fall back to height-for-age (or BMI when provided) for classification.
  if (weight && ageMonths <= 120) {
    const z = weightZScore(weight, ageMonths, sex);
    const band = zBand(z);
    const labels: Record<string, { en: string; ne: string }> = {
      green: { en: 'Normal weight', ne: 'सामान्य तौल' },
      yellow: { en: z < 0 ? 'Underweight range — monitor' : 'Overweight range — monitor', ne: z < 0 ? 'कम तौल दायरा — निगरानी' : 'बढी तौल दायरा — निगरानी' },
      red: { en: z < 0 ? 'Severely underweight — see a doctor' : 'Overweight — see a doctor', ne: z < 0 ? 'गम्भीर रूपमा कम तौल — डाक्टर देखाउनुहोस्' : 'बढी तौल — डाक्टर देखाउनुहोस्' },
    };
    return { status: band, labelEn: labels[band].en, labelNe: labels[band].ne };
  }

  if (height) return classifyGrowthStatus(null, height, ageMonths, sex, { metric: 'height' });
  return { status: 'grey', labelEn: 'Weight needed', labelNe: 'तौल चाहिन्छ' };
};

// Head circumference classification (micro/macrocephaly by WHO ±2SD)
export const classifyHC = (hc: number | null | undefined, ageMonths: number, sex: 'male' | 'female'): GrowthStatusResult => {
  const z = hc ? hcZScore(hc, ageMonths, sex) : NaN;
  if (isNaN(z)) return { status: 'grey', labelEn: 'Not yet measured', labelNe: 'नाप भएको छैन' };
  if (z < -2) return { status: 'red', labelEn: 'Microcephaly range — see a doctor', labelNe: 'माइक्रोसेफेली दायरा — डाक्टर देखाउनुहोस्' };
  if (z > 2) return { status: 'red', labelEn: 'Macrocephaly range — see a doctor', labelNe: 'म्याक्रोसेफेली दायरा — डाक्टर देखाउनुहोस्' };
  if (z < -1) return { status: 'yellow', labelEn: 'Smaller than typical — mention at next visit', labelNe: 'सामान्यभन्दा सानो — अर्को जाँचमा भन्नुहोस्' };
  if (z > 1) return { status: 'yellow', labelEn: 'Larger than typical — mention at next visit', labelNe: 'सामान्यभन्दा ठूलो — अर्को जाँचमा भन्नुहोस्' };
  return { status: 'green', labelEn: 'Normal', labelNe: 'सामान्य' };
};

// ── Ideal ranges for the dashboard/charts (exact SD cutoffs) ────────────────

export const getIdealRanges = (ageMonths: number, sex: 'male' | 'female') => {
  const wRow = sdRowAt(sex === 'male' ? WHO_WFA_BOYS : WHO_WFA_GIRLS, ageMonths);
  const hRow = sdRowAt(sex === 'male' ? WHO_HFA_BOYS : WHO_HFA_GIRLS, ageMonths);
  const bRow = sdRowAt(sex === 'male' ? WHO_BFA_BOYS : WHO_BFA_GIRLS, ageMonths);
  const hcRow = sdRowAt(sex === 'male' ? WHO_HCFA_BOYS : WHO_HCFA_GIRLS, Math.min(ageMonths, 60));
  return {
    weight: { min: wRow[1], ideal: wRow[2], max: wRow[3] },
    height: { min: hRow[1], ideal: hRow[2], max: hRow[3] },
    bmi: { min: bRow[1], ideal: bRow[2], max: bRow[3] },
    hc: { min: hcRow[1], ideal: hcRow[2], max: hcRow[3] },
  };
};

