// src/utils/authErrors.ts
// Centralized Firebase auth error → user-friendly bilingual messages

import type { Language } from '../i18n/translations';

const errorMap: Record<string, { en: string; ne: string }> = {
  'auth/invalid-credential': {
    en: 'Incorrect email or password. Please try again.',
    ne: 'गलत इमेल वा पासवर्ड। कृपया पुन: प्रयास गर्नुहोस्।',
  },
  'auth/user-not-found': {
    en: 'No account found with this email address.',
    ne: 'यो इमेल ठेगानासँग कुनै खाता भेटिएन।',
  },
  'auth/wrong-password': {
    en: 'Incorrect password. Please try again.',
    ne: 'गलत पासवर्ड। कृपया पुन: प्रयास गर्नुहोस्।',
  },
  'auth/invalid-email': {
    en: 'Please enter a valid email address.',
    ne: 'कृपया वैध इमेल ठेगाना प्रविष्ट गर्नुहोस्।',
  },
  'auth/user-disabled': {
    en: 'This account has been disabled. Please contact support.',
    ne: 'यो खाता निष्क्रिय गरिएको छ। कृपया सहयोग टोलीलाई सम्पर्क गर्नुहोस्।',
  },
  'auth/email-already-in-use': {
    en: 'This email is already registered. Please login instead.',
    ne: 'यो इमेल पहिले नै दर्ता भएको छ। कृपया लगइन गर्नुहोस्।',
  },
  'auth/email-already-exists': {
    en: 'This email is already registered. Please login instead.',
    ne: 'यो इमेल पहिले नै दर्ता भएको छ। कृपया लगइन गर्नुहोस्।',
  },
  'auth/weak-password': {
    en: 'Password must be at least 6 characters.',
    ne: 'पासवर्ड कम्तिमा ६ characters को हुनुपर्छ।',
  },
  'auth/too-many-requests': {
    en: 'Too many attempts. Please wait a moment and try again.',
    ne: 'धेरै प्रयास भयो। कृपया केही समय पर्खेर पुन: प्रयास गर्नुहोस्।',
  },
  'auth/network-request-failed': {
    en: 'Please check your internet connection and try again.',
    ne: 'कृपया इन्टरनेट जडान जाँच गर्नुहोस् र पुन: प्रयास गर्नुहोस्।',
  },
  'auth/popup-closed-by-user': {
    en: 'Sign-in was cancelled. Please try again.',
    ne: 'लगइन रद्द गरियो। कृपया पुन: प्रयास गर्नुहोस्।',
  },
  'auth/cancelled-popup-request': {
    en: 'Sign-in was cancelled. Please try again.',
    ne: 'लगइन रद्द गरियो। कृपया पुन: प्रयास गर्नुहोस्।',
  },
  'auth/operation-not-allowed': {
    en: 'This sign-in method is not enabled. Please contact support.',
    ne: 'यो लगइन विधि सक्षम गरिएको छैन। कृपया सहयोग टोलीलाई सम्पर्क गर्नुहोस्।',
  },
  'auth/requires-recent-login': {
    en: 'Please sign in again to continue.',
    ne: 'कृपया जारी राख्न पुन: लगइन गर्नुहोस्।',
  },
  'auth/account-exists-with-different-credential': {
    en: 'An account already exists with the same email. Please login using your previous method.',
    ne: 'यो इमेलसँग पहिले नै खाता छ। कृपया अघिल्लो विधिबाट लगइन गर्नुहोस्।',
  },
  'auth/missing-verification-email': {
    en: 'A verification email could not be sent. Please try again later.',
    ne: 'भेरिफिकेसन इमेल पठाउन सकिएन। कृपया पछि पुन: प्रयास गर्नुहोस्।',
  },
  'auth/expired-action-code': {
    en: 'This link has expired. Please request a new one.',
    ne: 'यो लिङ्कको म्याद सकियो। कृपया नयाँ अनुरोध गर्नुहोस्।',
  },
};

/**
 * Get a user-friendly error message for a Firebase auth error code.
 */
export function getAuthErrorMessage(error: unknown, language: Language): string {
  const defaultMsg =
    language === 'ne'
      ? 'प्रमाणीकरण त्रुटि। कृपया पछि पुन: प्रयास गर्नुहोस्।'
      : 'Authentication error. Please try again later.';

  if (!error) return defaultMsg;

  // Firebase errors have a `code` property
  const code = (error as any)?.code;
  if (code && errorMap[code]) {
    return language === 'ne' ? errorMap[code].ne : errorMap[code].en;
  }

  // Fallback: try to extract meaningful text from message
  const msg = (error as any)?.message;
  if (typeof msg === 'string') {
    // Strip "Firebase: " prefix
    return msg.replace(/^Firebase:\s*/i, '');
  }

  return defaultMsg;
}
