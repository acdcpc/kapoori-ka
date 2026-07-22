import { Timestamp } from 'firebase/firestore';

export const FIRESTORE_COLLECTIONS = {
  USERS: 'users',
  CHILDREN: 'children',
  GROWTH_RECORDS: 'growth_records',
  VACCINE_RECORDS: 'vaccine_records',
  MILESTONE_RECORDS: 'milestone_records',
  MCHAT_RESPONSES: 'mchat_responses',
  SUBSCRIPTIONS: 'subscriptions',
  PAYMENTS: 'payments',
  ACTIVATION_CODES: 'activation_codes',
};

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string;
  photoURL: string | null;
  language: 'en' | 'ne';
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
  isAnonymous: boolean;
}

export interface PremiumInfo {
  active: boolean;
  plan: 'monthly' | 'yearly' | 'premium';
  activatedAt?: Date | Timestamp;
  expiresAt?: Date | Timestamp;
  verifiedBy?: string;
  paymentId?: string;
}

export interface Subscription {
  status: 'active' | 'expired' | 'cancelled' | 'free' | 'pending';
  plan: 'free' | 'monthly' | 'yearly' | 'premium';
  startDate?: Date | Timestamp;
  endDate?: Date | Timestamp;
  autoRenew: boolean;
  paymentMethod?: string;
  transactionId?: string;
  price: number;
  consultationsRemaining: number;
}

export interface PaymentRecord {
  id?: string;
  userId: string;
  name: string;
  email: string;
  mobile?: string;
  paymentMethod: 'eSewa' | 'Khalti' | 'Fonepay' | 'Bank Transfer';
  paymentId: string; // transaction ID from payment provider
  amount: number;
  currency: string;
  screenshotUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  plan: 'monthly' | 'yearly';
  createdAt: Date | Timestamp;
  verifiedAt?: Date | Timestamp | null;
  verifiedBy?: string | null;
  notes?: string;
  rejectionReason?: string | null;
}

export interface ActivationCode {
  code: string;
  status: 'valid' | 'used';
  plan: 'monthly' | 'yearly';
  amount: number;
  originalTransactionId?: string;
  createdAt?: Date | Timestamp;
  usedBy?: string;
  usedAt?: Date | Timestamp;
}
