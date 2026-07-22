import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase App — singleton
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// ── Auth — persistent across app restarts │ ISSUE 2/4 FIX ──
// The Web SDK re-exports getReactNativePersistence from @firebase/auth at runtime
// but TypeScript types don't include it. Dynamic require avoids the TS error.
let authInstance: any = null;

if (Platform.OS === 'web') {
  authInstance = getAuth(app);
} else {
  try {
    // Dynamically import initializeAuth + getReactNativePersistence from RN bundle
    const authModule = require('firebase/auth');
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const getRNPersistence = authModule.getReactNativePersistence || authModule.initializeAuth?.getReactNativePersistence;
    
    if (getRNPersistence && authModule.initializeAuth) {
      authInstance = authModule.initializeAuth(app, {
        persistence: getRNPersistence(AsyncStorage),
      });
    } else {
      authInstance = getAuth(app);
    }
  } catch (e: any) {
    if (e?.code === 'auth/app-already-initialized' || e?.code === 'auth/already-initialized') {
      authInstance = getAuth(app);
    } else {
      console.warn('Firebase Auth init with AsyncStorage failed, using default:', e?.message);
      authInstance = getAuth(app);
    }
  }
}

// ── Firestore — offline persistence │ ISSUE 4 FIX ──
const db = getFirestore(app);
const storage = getStorage(app);

// Enable offline persistence for better UX during network/token refresh gaps
// FALLS BACK gracefully: if IndexedDB persistence fails, Firestore still works online-only
if (Platform.OS !== 'web') {
  enableIndexedDbPersistence(db).catch((err: any) => {
    if (err.code === 'failed-precondition') {
      console.warn('Firestore persistence unavailable (multiple tabs open) — using online-only mode');
    } else if (err.code === 'unimplemented') {
      console.warn('Firestore persistence not supported — using online-only mode');
    } else {
      console.warn('Firestore persistence init failed — using online-only mode:', err.message);
    }
    // Online-only mode still works; getDocs() will just always hit the network.
    // Children won't disappear because AuthContext now guards against transient nulls.
  });
}

export const auth = authInstance;
const functions = getFunctions(app);
export { db, storage, functions };
export default app;
