/**
 * Firestore Database Schema Types
 * 
 * Complete type definitions for all Firestore collections
 * Used for type safety and data consistency
 */

// User Profile
export interface UserProfile {
  uid: string;
  email?: string;
  displayName: string;
  photoURL?: string;
  phone?: string;
  language: 'ne' | 'en';
  createdAt: Date;
  updatedAt: Date;
  isAnonymous: boolean;
}

// Subscription Status
export interface Subscription {
  status: 'free' | 'active' | 'expired' | 'cancelled';
  plan: 'free' | 'premium';
  startDate?: Date;
  endDate?: Date;
  autoRenew: boolean;
  paymentMethod?: 'esewa' | 'khalti';
  transactionId?: string;
  price: number; // Rs 850 for premium
  consultationsRemaining: number; // 5 free online consultations
}

// Child Health Record
export interface Child {
  id: string;
  userId: string;
  name: string;
  dob: Date; // Date of birth
  gender: 'male' | 'female' | 'other';
  bloodType?: string;
  photo?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Growth Measurement
export interface GrowthRecord {
  id: string;
  userId: string;
  childId: string;
  type: 'height' | 'weight' | 'headCircumference';
  value: number;
  unit: 'cm' | 'kg' | 'inches' | 'lbs';
  date: Date;
  notes?: string;
  createdAt: Date;
}

// Immunization Record
export interface ImmunizationRecord {
  id: string;
  userId: string;
  childId: string;
  vaccineName: string;
  dueDate: Date;
  administeredDate?: Date;
  status: 'pending' | 'completed' | 'missed';
  notes?: string;
  nextDueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Nutrition Record
export interface NutritionRecord {
  id: string;
  userId: string;
  childId: string;
  date: Date;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  description: string;
  nutritionScore?: number; // 1-10
  notes?: string;
  createdAt: Date;
}

// Milestone Record
export interface MilestoneRecord {
  id: string;
  userId: string;
  childId: string;
  ageInMonths: number;
  milestone: string;
  achieved: boolean;
  achievedDate?: Date;
  notes?: string;
  category: 'motor' | 'cognitive' | 'language' | 'social';
  createdAt: Date;
}

// M-CHAT Screening
export interface MChatScreening {
  id: string;
  userId: string;
  childId: string;
  date: Date;
  ageInMonths: number;
  responses: {
    [key: string]: boolean;
  };
  totalScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  recommendations?: string;
  createdAt: Date;
}

// Online Consultation Booking
export interface ConsultationBooking {
  id: string;
  userId: string;
  consultantId: string;
  childId: string;
  topic: string;
  description?: string;
  date: Date;
  time: string; // HH:MM format
  duration: number; // in minutes
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  feedbackRating?: number; // 1-5
  feedbackText?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Consultant Profile
export interface ConsultantProfile {
  id: string;
  name: string;
  specialization: string;
  qualifications: string[];
  photo?: string;
  bio?: string;
  rating: number;
  reviewCount: number;
  availableSlots: {
    day: string; // 'monday', 'tuesday', etc.
    startTime: string; // HH:MM
    endTime: string; // HH:MM
  }[];
  isActive: boolean;
  createdAt: Date;
}

// Payment Record
export interface PaymentRecord {
  id: string;
  userId: string;
  amount: number;
  currency: 'NPR';
  paymentMethod: 'esewa' | 'khalti';
  status: 'pending' | 'completed' | 'failed';
  transactionId: string;
  orderId: string;
  subscriptionId?: string;
  createdAt: Date;
  completedAt?: Date;
  errorMessage?: string;
}

// Health Report (for PDF export)
export interface HealthReport {
  id: string;
  userId: string;
  childId: string;
  reportType: 'growth' | 'immunization' | 'nutrition' | 'comprehensive';
  generatedDate: Date;
  periodStart: Date;
  periodEnd: Date;
  summary: string;
  data: {
    growthTrend?: string;
    immunizationStatus?: string;
    nutritionStatus?: string;
  };
  createdAt: Date;
}

// Notification Settings
export interface NotificationSettings {
  userId: string;
  vaccineReminders: boolean;
  vaccineReminderDaysBefore: number; // e.g., 7 days before
  nutritionReminders: boolean;
  milestoneReminders: boolean;
  consultationReminders: boolean;
  pushNotificationsEnabled: boolean;
  emailNotificationsEnabled: boolean;
  updatedAt: Date;
}

// App Configuration (public data)
export interface AppConfig {
  version: string;
  minSupportedVersion: string;
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  features: {
    googleSignIn: boolean;
    anonymousLogin: boolean;
    premiumFeatures: boolean;
    onlineConsultations: boolean;
  };
  pricing: {
    premiumPrice: number;
    currency: string;
    consultationCount: number;
  };
  updatedAt: Date;
}

// Firestore Collection Paths
export const FIRESTORE_COLLECTIONS = {
  USERS: 'users',
  CONSULTANTS: 'consultants',
  PUBLIC: 'public',
} as const;

// Firestore Sub-collection Paths
export const FIRESTORE_SUBCOLLECTIONS = {
  PROFILE: 'profile',
  SUBSCRIPTION: 'subscription',
  CHILDREN: 'children',
  HEALTH_RECORDS: 'healthRecords',
  CONSULTATIONS: 'consultations',
} as const;
