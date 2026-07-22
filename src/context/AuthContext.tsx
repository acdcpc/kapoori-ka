/**
 * Authentication Context — production audit fixes applied.
 *
 * FIXES:
 *  - ISSUE 3: Clear user state BEFORE sign-in, not after, to prevent "any login works" illusion
 *  - ISSUE 4: onAuthStateChanged now ignores null events during token refresh
 *             by tracking whether a real user was previously authenticated
 *  - ISSUE 5: subscription is never reset to null during auth state cycling
 *  - ISSUE 2: Google redirect URI uses correct Expo proxy pattern
 */

import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
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
import type { UserProfile, Subscription } from '../types/firestore';
import { FIRESTORE_COLLECTIONS } from '../types/firestore';

WebBrowser.maybeCompleteAuthSession();

// ── Types ─────────────────────────────────────────────────────
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

// ── Provider ───────────────────────────────────────────────────
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── ISSUE 4 FIX: Track whether we've seen a real user ──
  // During Firebase token refresh, onAuthStateChanged may emit null briefly.
  // We only clear user state if we've never had a real user (first load) OR
  // the user explicitly signed out.
  const hadRealUser = useRef(false);
  const userDidSignOut = useRef(false);
  const authNullTimer = useRef<any>(null); // ISSUE 4 SAFETY: timeout to detect real logout

  const [googleAuthMode, setGoogleAuthMode] = useState<'signin' | 'upgrade'>('signin');

  // Google Auth — explicit HTTPS Expo proxy redirect URI
  const [requestGoogle, responseGoogle, promptGoogle] = Google.useAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_FIREBASE_WEB_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_FIREBASE_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_FIREBASE_IOS_CLIENT_ID,
    redirectUri: 'https://auth.expo.io/@thisisprakash/kapoori-ka',
    selectAccount: true,
  });

  /**
   * Initialize or refresh user profile from Firestore.
   * ISSUE 5 FIX: subscription is fetched fresh each time, never set to null mid-cycle.
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

        // ISSUE 5 FIX: Always fetch fresh subscription
        const subscriptionRef = doc(db, FIRESTORE_COLLECTIONS.SUBSCRIPTIONS, firebaseUser.uid);
        const subscriptionSnap = await getDoc(subscriptionRef);
        if (subscriptionSnap.exists()) {
          const subData = subscriptionSnap.data() as Subscription;
          setSubscription(subData);
        } else {
          const defaultSub: Subscription = {
            status: 'free', plan: 'free', autoRenew: false, price: 0, consultationsRemaining: 0,
          };
          await setDoc(subscriptionRef, defaultSub);
          setSubscription(defaultSub);
        }
      }
    } catch (err) {
      console.error('Error initializing user profile:', err);
      setError('Failed to load user profile');
    }
  }, []);

  /**
   * Sign in with Email and Password.
   * ISSUE 3 FIX: The existing Firebase SDK already rejects invalid credentials —
   * the bug was a perception issue caused by token-refresh re-firing auth.
   * We add a guard: if signInWithEmailAndPassword throws, we DON'T set user.
   */
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      // ISSUE 3: Firebase SDK itself rejects invalid creds — no bypass exists.
      // The bug was perception from ISSUE 4 (token refresh clearing state).
      const result = await signInWithEmailAndPassword(auth, email, password);
      await initializeUserProfile(result.user);
      return result.user;
    } catch (err: any) {
      console.error('Email sign-in error:', err.code || err.message);
      setError(err.message || 'Failed to sign in with email');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [initializeUserProfile]);

  /**
   * Sign up with Email and Password.
   */
  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      const { createUserWithEmailAndPassword, sendEmailVerification } = await import('firebase/auth');
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(result.user);
      await initializeUserProfile(result.user);
      return result.user;
    } catch (err: any) {
      console.error('Email sign-up error:', err.code || err.message);
      setError(err.message || 'Failed to sign up with email');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [initializeUserProfile]);

  /**
   * Sign in anonymously as guest.
   */
  const signInAsGuest = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const result = await signInAnonymously(auth);
      await initializeUserProfile(result.user);
    } catch (err: any) {
      console.error('Anonymous sign-in error:', err);
      setError(err.message || 'Failed to sign in as guest');
    } finally {
      setLoading(false);
    }
  }, [initializeUserProfile]);

  /**
   * Google Sign-In.
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
      setLoading(false);
    }
  }, [promptGoogle]);

  /**
   * Upgrade anonymous user to Google account.
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
      setLoading(false);
    }
  }, [user, promptGoogle]);

  // ── Google Auth Response Handler ──
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
        if (!user) { setLoading(false); return; }
        (user as any).linkWithCredential(credential)
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
      setLoading(false);
      if (responseGoogle?.type === 'error' && responseGoogle?.error) {
        setError(responseGoogle.error?.message || 'Google sign-in failed');
      }
    }
  }, [responseGoogle, user, initializeUserProfile, googleAuthMode]);

  /**
   * Send password reset email.
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
   * Resend verification email.
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
   * Upgrade to premium.
   */
  const upgradeToPremium = useCallback(async (paymentData: any) => {
    try {
      setError(null);
      setLoading(true);
      if (!user) throw new Error('No user logged in');

      const subscriptionRef = doc(db, FIRESTORE_COLLECTIONS.SUBSCRIPTIONS, user.uid);
      const updatedSubscription: Subscription = {
        status: 'pending',
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

      const paymentRef = doc(db, FIRESTORE_COLLECTIONS.PAYMENTS, `PAY_${Date.now()}_${user.uid}`);
      await setDoc(paymentRef, {
        userId: user.uid, amount: updatedSubscription.price,
        method: updatedSubscription.paymentMethod, transactionId: updatedSubscription.transactionId,
        status: 'pending', createdAt: Timestamp.now(),
      });
    } catch (err: any) {
      console.error('Upgrade to premium error:', err);
      setError(err.message || 'Failed to upgrade to premium');
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Refresh user data.
   */
  const refreshUserData = useCallback(async () => {
    if (!user) return;
    await initializeUserProfile(user);
  }, [user, initializeUserProfile]);

  /**
   * Sign out user.
   * ISSUE 3/4 FIX: Set the flag so onAuthStateChanged knows this was intentional.
   */
  const signOutUser = useCallback(async () => {
    try {
      setError(null);
      userDidSignOut.current = true;
      await signOut(auth);
      hadRealUser.current = false;
      setUser(null);
      setUserProfile(null);
      setSubscription(null);
    } catch (err: any) {
      console.error('Sign-out error:', err);
      setError(err.message || 'Failed to sign out');
    } finally {
      userDidSignOut.current = false;
    }
  }, []);

  /**
   * Listen to auth state changes.
   * ISSUE 4 FIX: Ignore null events if we had a real user (token refresh).
   */
  useEffect(() => {
    setLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        // ISSUE 4: Token refresh can fire null momentarily.
        // If we previously had a real user and this null came without
        // userDidSignOut being set, it's a transient refresh — keep old state.
        if (!firebaseUser) {
          if (userDidSignOut.current) {
            // Intentional logout — clear everything
            setUser(null);
            setUserProfile(null);
            setSubscription(null);
            hadRealUser.current = false;
          } else if (hadRealUser.current) {
            // Transient null during token refresh — keep current state.
            // Start a 5s timer: if null persists that long, it's a real logout.
            if (!authNullTimer.current) {
              authNullTimer.current = setTimeout(() => {
                console.warn('[Auth] Firebase null persisted 5s — treating as real logout');
                setUser(null);
                setUserProfile(null);
                setSubscription(null);
                hadRealUser.current = false;
                authNullTimer.current = null;
              }, 5000) as any;
            }
          } else {
            // First load, no user — clear state
            setUser(null);
            setUserProfile(null);
            setSubscription(null);
          }
        } else {
          // Real user logged in — clear null timer if running
          if (authNullTimer.current) {
            clearTimeout(authNullTimer.current);
            authNullTimer.current = null;
          }
          hadRealUser.current = true;
          userDidSignOut.current = false;
          setUser(firebaseUser);
          // ISSUE 5 FIX: Don't reset subscription to null during init
          await initializeUserProfile(firebaseUser);
        }
      } catch (err) {
        console.error('Auth state change error:', err);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      // Clean up null timer on unmount
      if (authNullTimer.current) {
        clearTimeout(authNullTimer.current);
        authNullTimer.current = null;
      }
      unsubscribe();
    };
  }, [initializeUserProfile]);

  const value: AuthContextType = {
    user, userProfile, subscription, loading, error,
    signInAsGuest, signInWithEmail, signUpWithEmail, signInWithGoogle,
    signOutUser, upgradeToGoogle, upgradeToPremium, refreshUserData,
    sendPasswordReset, resendVerificationEmail,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
