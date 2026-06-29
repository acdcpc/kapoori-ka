/**
 * Authentication Context
 * 
 * Manages authentication state and provides auth methods throughout the app
 */

import React, { createContext, useState, useEffect, useCallback } from 'react';
import {
  User,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { SubscriptionStatus } from '../types';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  language: 'ne' | 'en';
  createdAt: Date;
  updatedAt: Date;
  isAnonymous: boolean;
}

export interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  subscription: SubscriptionStatus | null;
  loading: boolean;
  error: string | null;
  signInAnonymously: () => Promise<void>;
  signOutUser: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Initialize user profile in Firestore
   */
  const initializeUserProfile = useCallback(async (firebaseUser: User) => {
    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        const newProfile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || null,
          displayName: firebaseUser.displayName || 'User',
          photoURL: firebaseUser.photoURL || null,
          language: 'ne',
          createdAt: new Date(),
          updatedAt: new Date(),
          isAnonymous: firebaseUser.isAnonymous,
        };

        await setDoc(userRef, newProfile);
        setUserProfile(newProfile);
      } else {
        const profile = userSnap.data() as UserProfile;
        setUserProfile(profile);
      }

      // Load subscription
      const subRef = doc(db, 'subscriptions', firebaseUser.uid);
      const subSnap = await getDoc(subRef);
      if (subSnap.exists()) {
        setSubscription(subSnap.data() as SubscriptionStatus);
      }
    } catch (err) {
      console.error('Error initializing user profile:', err);
      setError('Failed to load user profile');
    }
  }, []);

  /**
   * Sign in anonymously
   */
  const handleSignInAnonymously = useCallback(async () => {
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
   * Refresh user data
   */
  const handleRefreshUserData = useCallback(async () => {
    if (!user) return;
    await initializeUserProfile(user);
  }, [user, initializeUserProfile]);

  /**
   * Sign out user
   */
  const handleSignOut = useCallback(async () => {
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
    signInAnonymously: handleSignInAnonymously,
    signOutUser: handleSignOut,
    refreshUserData: handleRefreshUserData,
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
