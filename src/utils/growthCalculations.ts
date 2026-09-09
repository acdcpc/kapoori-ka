// src/utils/growthCalculations.ts
import dayjs from 'dayjs';
import { WHO_WAZ_BOYS, WHO_WAZ_GIRLS } from '../data/whoLMS';
import { WHO_HFA_BOYS, WHO_HFA_GIRLS } from '../data/whoHFA';
import { WHO_WFA_BOYS, WHO_WFA_GIRLS } from '../data/whoWFA';
import { WHO_BFA_BOYS, WHO_BFA_GIRLS } from '../data/whoBFA';
import { WHO_HCFA_BOYS, WHO_HCFA_GIRLS } from '../data/whoHCFA';
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


// ============================================================================
// Head circumference + z-score/percentile machinery (WHO 2006 standards)
// ============================================================================

// Linear interpolation between monthly SD rows: returns {sd-3, sd-2, med, sd+2, sd+3}
function interpolateSDRow(table: number[][], ageMonths: number): number[] {
  if (ageMonths <= table[0][0]) return table[0].slice(1);
  const last = table[table.length - 1];
  if (ageMonths >= last[0]) return last.slice(1);
  for (let i = 0; i < table.length - 1; i++) {
    const a = table[i], b = table[i + 1];
    if (ageMonths >= a[0] && ageMonths <= b[0]) {
      const f = (ageMonths - a[0]) / (b[0] - a[0]);
      return [1, 2, 3, 4, 5].map(k => a[k] + f * (b[k] - a[k]));
    }
  }
  return last.slice(1);
}

// Head circumference ideal range (WHO HC-for-age, 0-60 months only)
export const hcFromSD = (ageMonths: number, sex: 'male' | 'female'): CentileRange => {
  const table = sex === 'male' ? WHO_HCFA_BOYS : WHO_HCFA_GIRLS;
  const clamped = Math.min(Math.max(ageMonths, 0), 60);
  const row = interpolateSDRow(table, clamped);
  return { min: row[0], ideal: row[2], max: row[3] };
};

// Classify head circumference (microcephaly / normal / macrocephaly by ±2SD)
export const classifyHC = (hc: number | null | undefined, ageMonths: number, sex: 'male' | 'female'): GrowthStatusResult => {
  if (!hc || ageMonths > 60) {
    return { status: ageMonths > 60 ? 'grey' : 'grey', labelEn: ageMonths > 60 ? 'N/A (WHO table ends at 5y)' : 'Not yet measured', labelNe: ageMonths > 60 ? 'लागू छैन (WHO तालिका ५ वर्षसम्म)' : 'नाप भएको छैन' };
  }
  const table = sex === 'male' ? WHO_HCFA_BOYS : WHO_HCFA_GIRLS;
  const row = interpolateSDRow(table, ageMonths);
  const z = (hc - row[2]) / ((row[3] - row[1]) / 4); // (value-med)/sd; cols 1 and 3 are ±2SD
  if (z < -2) return { status: 'red', labelEn: 'Microcephaly range — see a doctor', labelNe: 'माइक्रोसेफेली दायरा — डाक्टर देखाउनुहोस्' };
  if (z > 2) return { status: 'red', labelEn: 'Macrocephaly range — see a doctor', labelNe: 'म्याक्रोसेफेली दायरा — डाक्टर देखाउनुहोस्' };
  if (z < -1) return { status: 'yellow', labelEn: 'Smaller than typical — mention at next visit', labelNe: 'सामान्यभन्दा सानो — अर्को जाँचमा भन्नुहोस्' };
  if (z > 1) return { status: 'yellow', labelEn: 'Larger than typical — mention at next visit', labelNe: 'सामान्यभन्दा ठूलो — अर्को जाँचमा भन्नुहोस्' };
  return { status: 'green', labelEn: 'Normal', labelNe: 'सामान्य' };
};

// WHO LMS z-score (exact for weight 0-60mo from the monthly LMS table)
export const weightZScore = (weight: number, ageMonths: number, sex: 'male' | 'female'): number => {
  if (ageMonths > 60) return NaN;
  const table = sex === 'male' ? WHO_WAZ_BOYS : WHO_WAZ_GIRLS;
  const row = interpolateSDRow(table, ageMonths);
  void row;
  // interpolate L/M/S columns from the LMS table (cols: age, L, M, S)
  const lms = sex === 'male' ? WHO_WAZ_BOYS : WHO_WAZ_GIRLS;
  const clamped = Math.min(Math.max(ageMonths, 0), 60);
  let a = lms[0], b = lms[lms.length - 1];
  for (let i = 0; i < lms.length - 1; i++) {
    if (clamped >= lms[i][0] && clamped <= lms[i + 1][0]) { a = lms[i]; b = lms[i + 1]; break; }
  }
  const f = b[0] === a[0] ? 0 : (clamped - a[0]) / (b[0] - a[0]);
  const L = a[1] + f * (b[1] - a[1]);
  const M = a[2] + f * (b[2] - a[2]);
  const S = a[3] + f * (b[3] - a[3]);
  if (L === 0) return (Math.log(weight) - Math.log(M)) / S;
  return (Math.pow(weight / M, L) - 1) / (L * S);
};

// Generic z-score from an SD table (height / head circumference)
export const zFromSDTable = (value: number, ageMonths: number, sex: 'male' | 'female', kind: 'height' | 'hc'): number => {
  const table = kind === 'hc'
    ? (sex === 'male' ? WHO_HCFA_BOYS : WHO_HCFA_GIRLS)
    : (sex === 'male' ? WHO_HFA_BOYS : WHO_HFA_GIRLS);
  const row = interpolateSDRow(table, ageMonths);
  const sd = (row[3] - row[1]) / 4; // columns 1 and 3 are the ±2SD cutoffs
  if (sd <= 0) return NaN;
  return (value - row[2]) / sd;
};

// Height z-score (WHO height/length-for-age table, 0-216mo)
export const heightZScore = (height: number, ageMonths: number, sex: 'male' | 'female'): number =>
  zFromSDTable(height, ageMonths, sex, 'height');

// Head circumference z-score (0-60 months)
export const hcZScore = (hc: number, ageMonths: number, sex: 'male' | 'female'): number => {
  if (ageMonths > 60) return NaN;
  return zFromSDTable(hc, ageMonths, sex, 'hc');
};

// Standard normal CDF (Abramowitz & Stegun 7.1.26 erf approximation)
export const percentileFromZ = (z: number): number => {
  if (isNaN(z)) return NaN;
  const zz = Math.abs(z);
  const tt = 1 / (1 + 0.2316419 * zz);
  const poly = tt * (0.319381530 + tt * (-0.356563782 + tt * (1.781477937 + tt * (-1.821255978 + tt * 1.330274429))));
  const pdf = Math.exp(-zz * zz / 2) / Math.sqrt(2 * Math.PI);
  const pTail = pdf * poly;
  const p = z >= 0 ? 1 - pTail : pTail;
  return Math.round(Math.min(99.9, Math.max(0.1, p * 100)) * 10) / 10;
};
