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
  photoUri?: string | null;
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
  isSupplement?: boolean;
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

export type CaregiverRole = 'viewer' | 'editor';

export interface ChildMembership {
  id: string;
  childId: string;
  userId: string;
  role: CaregiverRole;
  acceptedAt: string;
  revokedAt?: string | null;
}

export interface FeedingRecord {
  id: string;
  childId: string;
  recordedBy: string;
  occurredAt: string;
  mealType: 'breastfeeding' | 'formula' | 'solid_food' | 'snack' | 'water' | 'other';
  foods: string[];
  appetite?: 'low' | 'usual' | 'high' | null;
  reactionNotes?: string | null;
  notes?: string | null;
}

export interface ClinicVisit {
  id: string;
  childId: string;
  recordedBy: string;
  visitDate: string;
  facilityName?: string | null;
  purpose?: string | null;
  clinicianNotes?: string | null;
  followUpDate?: string | null;
}

export interface ClinicFacility {
  id: string;
  countryCode: string;
  name: string;
  district?: string | null;
  ward?: string | null;
  facilityType?: string | null;
  phone?: string | null;
  address?: string | null;
  verifiedAt?: string | null;
  sourceUrl?: string | null;
}

export interface AccessibilityPreferences {
  textScale: 'standard' | 'large' | 'extra_large';
  highContrast: boolean;
  reduceMotion: boolean;
  voiceGuidance: boolean;
  literacyMode: boolean;
}

export interface PrivacyPreferences {
  analyticsOptIn: boolean;
  shareCrashDiagnostics: boolean;
}

export interface OfflineMutation {
  id: string;
  ownerId: string;
  createdAt: string;
  operation: 'create_feeding_record' | 'create_clinic_visit' | 'update_privacy_preferences' | 'record_export_audit';
  payload: Record<string, unknown>;
  attempts: number;
  lastError?: string;
}

export interface GrowthTrendFlag {
  level: 'info' | 'attention';
  title: string;
  message: string;
  measuredAt: string;
}
