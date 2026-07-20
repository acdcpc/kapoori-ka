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
import * as AuthSession from 'expo-auth-session';
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
  signInWithEmail: (email: string, password: string) => Promise<any>;
  signUpWithEmail: (email: string, password: string) => Promise<any>;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  upgradeToGoogle: () => Promise<void>;
  upgradeToPremium: (paymentData: any) => Promise<void>;
  refreshUserData: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Google Auth — redirect URI computed explicitly for reliable native→web handoff
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'com.kapoori.ka',
    path: undefined,
  });

  const [requestGoogle, responseGoogle, promptGoogle] = Google.useAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_FIREBASE_WEB_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_FIREBASE_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_FIREBASE_IOS_CLIENT_ID,
    redirectUri,
    selectAccount: true,
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
      // Check email verification — gate-keeping is done in LoginScreen,
      // but we report the status so the UI can act
      if (!result.user.emailVerified) {
        // Still allow login — LoginScreen will show a verification reminder banner
      }
      await initializeUserProfile(result.user);
      return result.user;
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
      const { createUserWithEmailAndPassword, sendEmailVerification } = await import('firebase/auth');
      const result = await createUserWithEmailAndPassword(auth, email, password);
      // Send verification email immediately
      await sendEmailVerification(result.user);
      await initializeUserProfile(result.user);
      // Return the user for the caller to show verification prompt
      return result.user;
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
      // DO NOT setLoading(false) here — the browser flow is async;
      // the responseGoogle effect below handles completion.
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      setError(err.message || 'Failed to sign in with Google');
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
      // DO NOT setLoading(false) here — browser flow handled by responseGoogle effect
    } catch (err: any) {
      console.error('Upgrade to Google error:', err);
      setError(err.message || 'Failed to upgrade account');
      setLoading(false);
    }
  }, [user, promptGoogle]);

  useEffect(() => {
    if (responseGoogle?.type === 'success') {
      const { authentication } = responseGoogle;
      if (!authentication?.idToken) {
        setError('Google sign-in failed: no ID token received');
        setLoading(false);
        return;
      }
      const credential = GoogleAuthProvider.credential(authentication.idToken);
      
      if (googleAuthMode === 'signin') {
        signInWithCredential(auth, credential)
          .then((result) => {
            setLoading(false);
            return initializeUserProfile(result.user);
          })
          .catch((err) => {
            console.error('Google sign-in error:', err);
            setError(err.message || 'Failed to sign in with Google');
            setLoading(false);
          });
      } else if (googleAuthMode === 'upgrade') {
        if (!user) {
          setLoading(false);
          return;
        }
        // @ts-ignore - linkWithCredential exists on Firebase User
        user.linkWithCredential(credential)
          .then(() => {
            setLoading(false);
            return initializeUserProfile(user);
          })
          .catch((err: any) => {
            console.error('Upgrade to Google error:', err);
            setError(err.message || 'Failed to upgrade account');
            setLoading(false);
          });
      }
    } else if (responseGoogle?.type === 'error' || responseGoogle?.type === 'cancel') {
      // User cancelled or auth error — reset loading
      setLoading(false);
      if (responseGoogle?.type === 'error' && responseGoogle?.error) {
        setError(responseGoogle.error?.message || 'Google sign-in failed');
      }
    }
  }, [responseGoogle, user, initializeUserProfile, googleAuthMode]);

  /**
   * Send password reset email
   */
  const sendPasswordReset = useCallback(async (email: string) => {
    try {
      setError(null);
      setLoading(true);
      const { sendPasswordResetEmail } = await import('firebase/auth');
      await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      console.error('Password reset error:', err);
      setError(err.message || 'Failed to send reset email');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Resend verification email
   */
  const resendVerificationEmail = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      if (!user) throw new Error('No user logged in');
      const { sendEmailVerification } = await import('firebase/auth');
      await sendEmailVerification(user);
    } catch (err: any) {
      console.error('Resend verification error:', err);
      setError(err.message || 'Failed to resend verification');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

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
    sendPasswordReset,
    resendVerificationEmail,
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
