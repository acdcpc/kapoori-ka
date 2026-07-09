import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Dynamic import for getReactNativePersistence — works across npm/pnpm
let ReactNativePersistence: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const authModule = require('@firebase/auth/dist/rn/index.js');
  ReactNativePersistence = authModule.getReactNativePersistence;
} catch {
  console.warn('getReactNativePersistence not available, using default auth');
}

export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
let authInstance: any = null;

if (Platform.OS === 'web') {
  authInstance = getAuth(app);
} else if (ReactNativePersistence) {
  try {
    authInstance = initializeAuth(app, {
      persistence: ReactNativePersistence(AsyncStorage),
    });
  } catch (error: any) {
    if (error.code === 'auth/app-already-initialized') {
      authInstance = getAuth(app);
    } else {
      console.error('Firebase Auth init error:', error);
      authInstance = getAuth(app);
    }
  }
} else {
  authInstance = getAuth(app);
}

// Initialize Firestore & Storage
const db = getFirestore(app);
const storage = getStorage(app);

export const auth = authInstance;
export { db, storage };
export default app;
