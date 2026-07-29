// src/utils/growthCalculations.ts
import dayjs from 'dayjs';
import { WHO_WAZ_BOYS, WHO_WAZ_GIRLS } from '../data/whoLMS';
import { WHO_HFA_BOYS, WHO_HFA_GIRLS } from '../data/whoHFA';
import { WHO_WFA_BOYS, WHO_WFA_GIRLS } from '../data/whoWFA';
import { WHO_BFA_BOYS, WHO_BFA_GIRLS } from '../data/whoBFA';
import { GrowthRecord } from '../types';

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

// Get Ideal Ranges based on WHO data

// Find closest row at or before ageMonths in a sorted centile table
function findClosest(table: number[][], ageMonths: number): number[] {
  let closest = table[0];
  for (const row of table) {
    if (row[0] <= ageMonths) closest = row;
    else break;
  }
  return closest;
}

// Centile-based range (used for height, weight >60mo, BMI)
interface CentileRange { min: number; ideal: number; max: number; }
function centileRange(row: number[]): CentileRange {
  return { min: row[2], ideal: row[3], max: row[4] };
}

// LMS z-score calculation (WHO standard, 0-60mo weight only)
function lmsToZ(L: number, M: number, S: number, z: number): number {
  if (L === 0) return M * Math.exp(S * z);
  const base = 1 + L * S * z;
  if (base <= 0) return M;
  return M * Math.pow(base, 1 / L);
}

function weightFromLMS(ageMonths: number, sex: 'male' | 'female'): CentileRange {
  const table = sex === 'male' ? WHO_WAZ_BOYS : WHO_WAZ_GIRLS;
  const row = findClosest(table, ageMonths);
  const L = row[1], M = row[2], S = row[3];
  return {
    min: Math.round(lmsToZ(L, M, S, -2) * 10) / 10,
    ideal: Math.round(M * 10) / 10,
    max: Math.round(lmsToZ(L, M, S, 2) * 10) / 10,
  };
}

function weightFromCentile(ageMonths: number, sex: 'male' | 'female'): CentileRange {
  const table = sex === 'male' ? WHO_WFA_BOYS : WHO_WFA_GIRLS;
  return centileRange(findClosest(table, ageMonths));
}

function heightFromCentile(ageMonths: number, sex: 'male' | 'female'): CentileRange {
  const table = sex === 'male' ? WHO_HFA_BOYS : WHO_HFA_GIRLS;
  return centileRange(findClosest(table, ageMonths));
}

function bmiFromCentile(ageMonths: number, sex: 'male' | 'female'): CentileRange {
  const table = sex === 'male' ? WHO_BFA_BOYS : WHO_BFA_GIRLS;
  return centileRange(findClosest(table, ageMonths));
}

// Get Ideal Ranges for weight, height, and BMI — full 0-216mo range
export const getIdealRanges = (ageMonths: number, sex: 'male' | 'female') => {
  const weight = ageMonths <= 60
    ? weightFromLMS(ageMonths, sex)
    : weightFromCentile(ageMonths, sex);

  const height = heightFromCentile(ageMonths, sex);
  const bmi = bmiFromCentile(ageMonths, sex);

  return { weight, height, bmi };
};

// Classify growth for any metric (weight, height, or BMI).
// Metric defaults to 'weight'. Pass metric='bmi' + bmiValue for BMI classification.
// Returns WHO-based green/yellow/red status.
type GrowthStatusResult = {
  status: 'green' | 'yellow' | 'red' | 'grey';
  labelEn: string;
  labelNe: string;
};

export const classifyGrowthStatus = (
  weight: number | null | undefined,
  _height: number | null | undefined,
  ageMonths: number,
  sex: 'male' | 'female',
  opts?: { metric?: 'weight' | 'bmi'; bmiValue?: number }
): GrowthStatusResult => {
  const metric = opts?.metric || 'weight';
  const ranges = getIdealRanges(ageMonths, sex);

  if (metric === 'bmi') {
    const bmi = opts?.bmiValue;
    if (!bmi || ranges.bmi.ideal <= 0) {
      return { status: 'grey', labelEn: 'Not yet measured', labelNe: 'नाप भएको छैन' };
    }
    const ratio = bmi / ranges.bmi.ideal;
    if (ratio >= 0.85 && ratio <= 1.15) {
      return { status: 'green', labelEn: 'Normal', labelNe: 'सामान्य' };
    } else if (ratio >= 0.75 && ratio <= 1.25) {
      return { status: 'yellow', labelEn: 'Needs attention', labelNe: 'ध्यान दिनुहोस्' };
    } else {
      return { status: 'red', labelEn: 'See doctor', labelNe: 'डाक्टर देखाउनुहोस्' };
    }
  }

  // weight classification (default)
  if (!weight) {
    return { status: 'grey', labelEn: 'Not yet measured', labelNe: 'नाप भएको छैन' };
  }
  if (ranges.weight.ideal > 0) {
    const ratio = weight / ranges.weight.ideal;
    if (ratio >= 0.85 && ratio <= 1.15) {
      return { status: 'green', labelEn: 'Normal', labelNe: 'सामान्य' };
    } else if (ratio >= 0.75 && ratio <= 1.25) {
      return { status: 'yellow', labelEn: 'Needs attention', labelNe: 'ध्यान दिनुहोസ്' };
    } else {
      return { status: 'red', labelEn: 'See doctor', labelNe: 'डाक्टर देखाउनुहोस्' };
    }
  }
  return { status: 'grey', labelEn: 'Weight needed', labelNe: 'तौल चाहिन्छ' };
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
