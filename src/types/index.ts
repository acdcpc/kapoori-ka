// src/types/index.ts — Complete types for Module 1 + Module 2

export interface Child {
  id: string;
  ownerId: string;        // Firebase Auth UID
  name: string;
  nameNepali?: string;
  dateOfBirth: string;    // ISO format: "2023-06-15"
  sex: 'male' | 'female';
  birthWeight: number;    // kg
  birthLength?: number;   // cm
  gestationalAge?: number;
  parentPhone: string;
  createdAt: string;
}

export interface GrowthRecord {
  id: string;
  childId: string;
  ownerId: string;
  date: string;
  weight: number;         // kg
  height?: number;        // cm
  headCircumference?: number;
  notes?: string;
  recordedBy?: string;
  ageMonths?: number;
  bsDate?: string;         // Nepali date (BS) for display
}

export interface VaccineRecord {
  id: string;
  childId: string;
  ownerId: string;
  vaccineName: string;
  vaccineNameNepali: string;
  scheduledDate: string;
  givenDate?: string;
  isGiven: boolean;
  isMissed: boolean;
  batchNumber?: string;
  notes?: string;
}

export interface ZScoreResult {
  waz: number;
  haz?: number;
  whz?: number;
  nutritionalStatus: 'normal' | 'underweight' | 'severelyUnderweight' | 'overweight' | 'obese';
  nutritionalStatusNepali: string;
  color: string;
}

export interface VaccineScheduleItem {
  id: string;
  name: string;
  nameNepali: string;
  ageInDays: number;
  description: string;
  descriptionNepali: string;
}

// ── Module 2 Types ──────────────────────────────────────────────

export interface Milestone {
  id: string;
  ageMonthsMin: number;
  ageMonthsMax: number;
  domain: 'motor' | 'language' | 'social' | 'cognitive';
  description: string;
  descriptionNepali: string;
  flagLevel: 'green' | 'yellow' | 'red';
}

export interface MilestoneRecord {
  id: string;
  childId: string;
  ownerId: string;
  milestoneId: string;
  achievedDate: string;
  ageAtAchievement: number;
  notes?: string;
}

export interface MChatResponse {
  id: string;
  childId: string;
  ownerId: string;
  date: string;
  ageAtScreening: number;
  answers: Record<string, boolean>;
  score: number;
  riskLevel: 'low' | 'medium' | 'high';
  followUpRequired: boolean;
}

export interface SubscriptionStatus {
  userId: string;
  plan: 'free' | 'beta_free' | 'monthly' | 'yearly' | 'premium';
  status: 'active' | 'expired' | 'cancelled' | 'pending';
  startDate: string;
  endDate: string;
  isActive: boolean;
  paymentMethod?: 'esewa' | 'khalti' | 'manual';
  transactionId?: string;
  paymentReference?: string;
  consultationsRemaining: number;
  purchasedAt?: string;
}

export interface NotificationPreferences {
  vaccineReminders: boolean;
  milestoneReminders: boolean;
  growthReminders: boolean;
}
