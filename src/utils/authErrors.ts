// src/utils/authErrors.ts
// Centralized Firebase + Supabase auth error → user-friendly bilingual messages

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
  // Supabase Auth errors
  'user_already_exists': {
    en: 'An account with this email already exists. Please login instead.',
    ne: 'यो इमेलमा पहिले नै खाता छ। कृपया लगइन गर्नुहोस्।',
  },
  'User already registered': {
    en: 'An account with this email already exists. Please login instead.',
    ne: 'यो इमेलमा पहिले नै खाता छ। कृपया लगइन गर्नुहोस्।',
  },
  'Unable to validate email address': {
    en: 'Please enter a valid email address.',
    ne: 'कृपया मान्य इमेल ठेगाना राख्नुहोस्।',
  },
  'Password should be at least 6 characters': {
    en: 'Password must be at least 8 characters with one letter and one number.',
    ne: 'पासवर्ड कम्तिमा ८ अक्षरको हुनुपर्छ, जसमा एक अक्षर र एक अंक हुनुपर्छ।',
  },
  'weak_password': {
    en: 'Password must be at least 8 characters with one letter and one number.',
    ne: 'पासवर्ड कम्तिमा ८ अक्षरको हुनुपर्छ, जसमा एक अक्षर र एक अंक हुनुपर्छ।',
  },
  'validation_failed': {
    en: 'Please check your email and password and try again.',
    ne: 'कृपया आफ्नो इमेल र पासवर्ड जाँच गरेर पुन: प्रयास गर्नुहोस्।',
  },
  'email_not_confirmed': {
    en: 'Please verify your email before logging in. Check your inbox for a confirmation link.',
    ne: 'कृपया लगइन गर्नु अघि आफ्नो इमेल भेरिफाइ गर्नुहोस्। आफ्नो इनबक्समा भेरिफिकेसन लिङ्क जाँच गर्नुहोस्।',
  },
  'Email not confirmed': {
    en: 'Please verify your email before logging in. Check your inbox for a confirmation link.',
    ne: 'कृपया लगइन गर्नु अघि आफ्नो इमेल भेरिफाइ गर्नुहोस्। आफ्नो इनबक्समा भेरिफिकेसन लिङ्क जाँच गर्नुहोस्।',
  },
  'Invalid login credentials': {
    en: 'Incorrect email or password. Please try again.',
    ne: 'गलत इमेल वा पासवर्ड। कृपया पुन: प्रयास गर्नुहोस्।',
  },
  'For security purposes, you can only request this after': {
    en: 'Too many attempts. Please wait a moment and try again.',
    ne: 'धेरै प्रयास भयो। कृपया केही समय पर्खेर पुन: प्रयास गर्नुहोस्।',
  },
};


/**
 * Get a user-friendly error message for a Firebase/Supabase auth error code.
 */
export function getAuthErrorMessage(error: unknown, language: Language): string {
  const defaultMsg =
    language === 'ne'
      ? 'प्रमाणीकरण त्रुटि। कृपया पछि पुन: प्रयास गर्नुहोस्।'
      : 'Authentication error. Please try again later.';

  if (!error) return defaultMsg;

  // Check error.code first (Supabase: user_already_exists, weak_password, etc.)
  const code = (error as any)?.code;
  if (code && errorMap[code]) {
    return language === 'ne' ? errorMap[code].ne : errorMap[code].en;
  }

  // Also check error.message as key (Supabase: 'Unable to validate email address', 'Password should be at least 6 characters')
  const msg = (error as any)?.message;
  if (typeof msg === 'string') {
    // Try exact message match in errorMap
    if (errorMap[msg]) {
      return language === 'ne' ? errorMap[msg].ne : errorMap[msg].en;
    }
    // Try partial match for long messages (e.g. 'For security purposes, you can only request this after...')
    for (const key of Object.keys(errorMap)) {
      if (key.length > 20 && msg.startsWith(key.substring(0, 30))) {
        return language === 'ne' ? errorMap[key].ne : errorMap[key].en;
      }
    }
    // Fallback: show the raw message, stripping Firebase prefix
    return msg.replace(/^Firebase:\s*/i, '');
  }

  return defaultMsg;
}
