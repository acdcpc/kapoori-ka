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

export interface Subscription {
  status: 'active' | 'expired' | 'cancelled' | 'free' | 'pending';
  plan: 'free' | 'beta_free' | 'monthly' | 'yearly' | 'premium';
  startDate?: Date | Timestamp;
  endDate?: Date | Timestamp;
  autoRenew: boolean;
  paymentMethod?: string;
  transactionId?: string;
  price: number;
  consultationsRemaining: number;
}
