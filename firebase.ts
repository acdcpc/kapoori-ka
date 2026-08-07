import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFunctions } from 'firebase/functions';

export const firebaseConfig = {
  apiKey: 'AIzaSyBOz4s4fesgDf8QlqDfKb4fJN4J5_CGcM',
  authDomain: 'kapoori-ka.firebaseapp.com',
  projectId: 'kapoori-ka',
  storageBucket: 'kapoori-ka.firebasestorage.app',
  messagingSenderId: '391729474242',
  appId: '1:391729474242:web:ffded3abd5817e5ab2295b',
  measurementId: 'G-ZQLWYB0SRS',
};

// Initialize Firebase App — singleton
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// ── Firebase used ONLY for: Analytics, Crashlytics, FCM (push), and Cloud Functions ──
// Auth, Firestore, Storage → all migrated to Supabase
const functions = getFunctions(app);
export { functions };
export default app;
