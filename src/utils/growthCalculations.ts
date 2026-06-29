// src/utils/growthCalculations.ts
import { WHO_WAZ_BOYS, WHO_WAZ_GIRLS } from '../data/whoLMS';
import { ZScoreResult } from '../types';

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
export const getIdealRanges = (ageMonths: number, sex: 'male' | 'female') => {
  // Simple lookup/interpolation for ranges (approximate for UI guidance)
  // These are roughly -2SD to +2SD values
  const weightTable = sex === 'male' ? WHO_WAZ_BOYS : WHO_WAZ_GIRLS;
  
  // Find closest entry in WHO table
  let closest = weightTable[0];
  for (let entry of weightTable) {
    if (entry[0] <= ageMonths) closest = entry;
    else break;
  }
  
  const L = closest[1];
  const M = closest[2];
  const S = closest[3];
  
  // Z-score formula inverse: X = M * (1 + L*S*Z)^(1/L)
  const calcVal = (z: number) => {
    if (L === 0) return M * Math.exp(S * z);
    return M * Math.pow(1 + L * S * z, 1 / L);
  };

  return {
    weight: {
      min: Math.round(calcVal(-2) * 10) / 10,
      ideal: Math.round(M * 10) / 10,
      max: Math.round(calcVal(2) * 10) / 10,
    },
    height: {
      // Simplified height ranges based on age
      min: Math.round((45 + ageMonths * 1.5) * 10) / 10,
      ideal: Math.round((50 + ageMonths * 2) * 10) / 10,
      max: Math.round((55 + ageMonths * 2.5) * 10) / 10,
    }
  };
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
  return language === 'en' 
    ? `${years} years ${months} months` 
    : `${years} वर्ष ${months} महिना`;
};
