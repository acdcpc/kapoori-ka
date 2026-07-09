/**
 * Authentication Context
 * 
 * Manages authentication state and provides auth methods throughout the app
 */

import React, { createContext, useState, useEffect, useCallback } from 'react';
import {
  User,
  signInAnonymously,
  signInWithCredential,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { auth, db } from '../../firebase';
import { UserProfile, Subscription, FIRESTORE_COLLECTIONS } from '../types/firestore';

WebBrowser.maybeCompleteAuthSession();

export interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  subscription: Subscription | null;
  loading: boolean;
  error: string | null;
  signInAsGuest: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  upgradeToGoogle: () => Promise<void>;
  upgradeToPremium: (paymentData: any) => Promise<void>;
  refreshUserData: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Google Auth hooks
  const [requestGoogle, responseGoogle, promptGoogle] = Google.useAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_FIREBASE_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_FIREBASE_IOS_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_FIREBASE_WEB_CLIENT_ID,
  });
  
  const [googleAuthMode, setGoogleAuthMode] = useState<'signin' | 'upgrade'>('signin');

  /**
   * Initialize user profile in Firestore
   */
  const initializeUserProfile = useCallback(async (firebaseUser: User) => {
    try {
      const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, firebaseUser.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        const newProfile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || null,
          displayName: firebaseUser.displayName || 'User',
          photoURL: firebaseUser.photoURL || null,
          language: 'ne',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          isAnonymous: firebaseUser.isAnonymous,
        };

        await setDoc(userRef, newProfile);

        const subscriptionRef = doc(db, FIRESTORE_COLLECTIONS.SUBSCRIPTIONS, firebaseUser.uid);
        const newSubscription: Subscription = {
          status: 'free',
          plan: 'free',
          autoRenew: false,
          price: 0,
          consultationsRemaining: 0,
        };

        await setDoc(subscriptionRef, newSubscription);

        setUserProfile(newProfile);
        setSubscription(newSubscription);
      } else {
        const profile = userSnap.data() as UserProfile;
        setUserProfile(profile);

        const subscriptionRef = doc(db, FIRESTORE_COLLECTIONS.SUBSCRIPTIONS, firebaseUser.uid);
        const subscriptionSnap = await getDoc(subscriptionRef);
        if (subscriptionSnap.exists()) {
          setSubscription(subscriptionSnap.data() as Subscription);
        } else {
            // Create default free subscription if missing
            const newSubscription: Subscription = {
                status: 'free',
                plan: 'free',
                autoRenew: false,
                price: 0,
                consultationsRemaining: 0,
            };
            await setDoc(subscriptionRef, newSubscription);
            setSubscription(newSubscription);
        }
      }
    } catch (err) {
      console.error('Error initializing user profile:', err);
      setError('Failed to load user profile');
    }
  }, []);

  /**
   * Sign in with Email and Password
   */
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      const result = await signInWithEmailAndPassword(auth, email, password);
      await initializeUserProfile(result.user);
    } catch (err: any) {
      console.error('Email sign-in error:', err);
      setError(err.message || 'Failed to sign in with email');
      throw err; // Re-throw to be caught by LoginScreen
    } finally {
      setLoading(false);
    }
  }, [initializeUserProfile]);

  /**
   * Sign up with Email and Password
   */
  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await initializeUserProfile(result.user);
    } catch (err: any) {
      console.error('Email sign-up error:', err);
      setError(err.message || 'Failed to sign up with email');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [initializeUserProfile]);

  /**
   * Sign in anonymously
   */
  const signInAsGuest = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const result = await signInAnonymously(auth);
      await initializeUserProfile(result.user);
    } catch (err: any) {
      console.error('Anonymous sign-in error:', err);
      setError(err.message || 'Failed to sign in anonymously');
    } finally {
      setLoading(false);
    }
  }, [initializeUserProfile]);

  /**
   * Sign in with Google
   */
  const signInWithGoogle = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      setGoogleAuthMode('signin');
      await promptGoogle();
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      setError(err.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  }, [promptGoogle]);

  /**
   * Upgrade anonymous user to Google account
   */
  const upgradeToGoogle = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      if (!user) throw new Error('No user logged in');
      setGoogleAuthMode('upgrade');
      await promptGoogle();
    } catch (err: any) {
      console.error('Upgrade to Google error:', err);
      setError(err.message || 'Failed to upgrade account');
    } finally {
      setLoading(false);
    }
  }, [user, promptGoogle]);

  useEffect(() => {
    if (responseGoogle?.type === 'success') {
      const { authentication } = responseGoogle;
      const credential = GoogleAuthProvider.credential(authentication?.idToken);
      
      if (googleAuthMode === 'signin') {
        signInWithCredential(auth, credential)
          .then((result) => initializeUserProfile(result.user))
          .catch((err) => {
            console.error('Google sign-in error:', err);
            setError(err.message || 'Failed to sign in with Google');
          });
      } else if (googleAuthMode === 'upgrade') {
        if (!user) return;
        // @ts-ignore - linkWithCredential exists on Firebase User
        user.linkWithCredential(credential)
          .then(() => initializeUserProfile(user))
          .catch((err: any) => {
            console.error('Upgrade to Google error:', err);
            setError(err.message || 'Failed to upgrade account');
          });
      }
    }
  }, [responseGoogle, user, initializeUserProfile, googleAuthMode]);

  /**
   * Upgrade to premium subscription
   */
  const upgradeToPremium = useCallback(async (paymentData: any) => {
    try {
      setError(null);
      setLoading(true);
      if (!user) throw new Error('No user logged in');

      const subscriptionRef = doc(db, FIRESTORE_COLLECTIONS.SUBSCRIPTIONS, user.uid);

      const updatedSubscription: Subscription = {
        status: 'pending', // Initially pending for manual verification
        plan: paymentData.plan || 'premium',
        startDate: Timestamp.now(),
        endDate: Timestamp.fromMillis(Date.now() + 365 * 24 * 60 * 60 * 1000),
        autoRenew: true,
        paymentMethod: paymentData.method || 'unknown',
        transactionId: paymentData.transactionId || null,
        price: paymentData.amount || 0,
        consultationsRemaining: paymentData.plan === 'yearly' ? 100 : 5,
      };

      await setDoc(subscriptionRef, updatedSubscription);
      setSubscription(updatedSubscription);
      
      // Also log payment record
      const paymentRef = doc(db, FIRESTORE_COLLECTIONS.PAYMENTS, `PAY_${Date.now()}_${user.uid}`);
      await setDoc(paymentRef, {
          userId: user.uid,
          amount: updatedSubscription.price,
          method: updatedSubscription.paymentMethod,
          transactionId: updatedSubscription.transactionId,
          status: 'pending',
          createdAt: Timestamp.now()
      });

    } catch (err: any) {
      console.error('Upgrade to premium error:', err);
      setError(err.message || 'Failed to upgrade to premium');
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Refresh user data
   */
  const refreshUserData = useCallback(async () => {
    if (!user) return;
    await initializeUserProfile(user);
  }, [user, initializeUserProfile]);

  /**
   * Sign out user
   */
  const signOutUser = useCallback(async () => {
    try {
      setError(null);
      await signOut(auth);
      setUser(null);
      setUserProfile(null);
      setSubscription(null);
    } catch (err: any) {
      console.error('Sign-out error:', err);
      setError(err.message || 'Failed to sign out');
    }
  }, []);

  /**
   * Listen to auth state changes
   */
  useEffect(() => {
    setLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          setUser(firebaseUser);
          await initializeUserProfile(firebaseUser);
        } else {
          setUser(null);
          setUserProfile(null);
          setSubscription(null);
        }
      } catch (err) {
        console.error('Auth state change error:', err);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, [initializeUserProfile]);

  const value: AuthContextType = {
    user,
    userProfile,
    subscription,
    loading,
    error,
    signInAsGuest,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOutUser,
    upgradeToGoogle,
    upgradeToPremium,
    refreshUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
