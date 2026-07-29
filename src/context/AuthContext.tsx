/**
 * Authentication Context — Supabase
 *
 * Auth: supabase.auth.{signInWithPassword, signUp, signInAnonymously, signInWithOAuth, signOut}
 * Data: supabase.from('profiles'/'subscriptions') for user profile & subscription
 * API shape preserved for zero screen changes.
 */

import React, { createContext, useState, useEffect, useCallback, useRef, useContext } from 'react';
import { Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { functions } from '../../firebase';
import { httpsCallable } from 'firebase/functions';
import { supabase } from '../lib/supabase';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';

// ── Bridge type: Supabase user → familiar shape for screens ──
interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
  phoneNumber?: string | null;
  emailVerified: boolean;
  metadata?: Record<string, any>;
}

export interface AuthContextType {
  user: AppUser | null;
  userProfile: any;
  subscription: any;
  loading: boolean;
  error: string | null;
  language: string;
  isPremium: boolean;
  setLanguage: (lang: string) => void;
  signInAsGuest: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<any>;
  signUpWithEmail: (email: string, password: string) => Promise<any>;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  redeemCode: (code: string) => Promise<any>;
  sendPasswordReset: (email?: string) => Promise<void>;
  resendVerificationEmail: (email?: string) => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ── Helpers ──
function toAppUser(su: SupabaseUser): AppUser {
  return {
    uid: su.id,
    email: su.email ?? null,
    displayName: su.user_metadata?.full_name ?? su.email?.split('@')[0] ?? null,
    photoURL: su.user_metadata?.avatar_url ?? null,
    isAnonymous: su.is_anonymous ?? false,
    emailVerified: su.email_confirmed_at != null,
    metadata: su.user_metadata ?? {},
  };
}

/** Shallow equality check on identity-relevant fields — avoids setUser churn */
function isSameUser(a: AppUser | null, b: AppUser | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.uid === b.uid &&
    a.email === b.email &&
    a.displayName === b.displayName &&
    a.photoURL === b.photoURL &&
    a.isAnonymous === b.isAnonymous &&
    a.emailVerified === b.emailVerified
  );
}

// ── Provider ──
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>({ status: 'free', plan: 'free' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState('ne');
  const initializedRef = useRef(false);

  const nowISO = () => new Date().toISOString();

  // ── Profile init from Supabase ──
  // Takes AppUser fields explicitly (not via closure) so deps are stable.
  const initProfile = useCallback(async (
    uid: string,
    email: string | null,
    displayName: string | null,
    photoURL: string | null,
    isAnonymous: boolean,
  ) => {
    const { data: p, error: pe } = await supabase
      .from('profiles').select('*').eq('user_id', uid).maybeSingle();

    if (pe && pe.code !== 'PGRST116') {
      console.error('[AuthContext] Profile read error:', pe);
    }

    const now = nowISO();
    if (!p) {
      // Create profile + subscription
      supabase.from('profiles').insert({
        user_id: uid, email: email || null,
        display_name: displayName || 'User',
        photo_url: photoURL || null,
        language: 'ne', created_at: now, updated_at: now,
        is_anonymous: isAnonymous || false,
      }).then(r => r.error && console.error('Insert profile:', r.error));

      supabase.from('subscriptions').insert({
        user_id: uid, status: 'free', plan: 'free', auto_renew: false,
        price: 0, consultations_remaining: 0, created_at: now, updated_at: now,
      }).then(r => r.error && console.error('Insert sub:', r.error));

      setUserProfile({
        uid, email: email || null, displayName: displayName || 'User',
        photoURL: photoURL || null, language: 'ne',
        createdAt: now, updatedAt: now, isAnonymous: isAnonymous || false,
      });
      setSubscription({ status: 'free', plan: 'free', autoRenew: false, price: 0, consultationsRemaining: 0 });
    } else {
      setUserProfile({
        uid: p.user_id, email: p.email, displayName: p.display_name || 'User',
        photoURL: p.photo_url, language: p.language || 'ne',
        createdAt: p.created_at, updatedAt: p.updated_at, isAnonymous: !!p.is_anonymous,
      });

      const { data: s } = await supabase
        .from('subscriptions').select('*').eq('user_id', uid).maybeSingle();
      if (s) {
        setSubscription({
          status: s.status, plan: s.plan, autoRenew: s.auto_renew, price: s.price,
          consultationsRemaining: s.consultations_remaining,
          startDate: s.start_date, endDate: s.end_date,
        });
      }
    }
  }, []); // ← FIX 1: no deps — closes over nothing from state

  // ── Session listener ──
  // Registered exactly once (empty dep array). Uses refs for stable callbacks.
  const initProfileRef = useRef(initProfile);
  initProfileRef.current = initProfile;

  useEffect(() => {
    let mounted = true;

    console.log('[AuthContext] Setting up Supabase session listener');

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return;
      if (s?.user) {
        const appUser = toAppUser(s.user);
        setUser(prev => {
          // FIX 2: only update if identity actually changed (reference-stable)
          if (isSameUser(prev, appUser)) return prev;
          console.log('[AuthContext] Initial session — setting user:', appUser.uid);
          return appUser;
        });
        if (!initializedRef.current) {
          initializedRef.current = true;
          initProfileRef.current(appUser.uid, appUser.email, appUser.displayName, appUser.photoURL, appUser.isAnonymous);
        }
      }
      setLoading(false);
    });

    const { data: { subscription: sub } } = supabase.auth.onAuthStateChange((_ev, s) => {
      if (!mounted) return;
      console.log('[AuthContext] onAuthStateChange:', _ev, s?.user?.id ?? 'no user');
      if (s?.user) {
        const appUser = toAppUser(s.user);
        setUser(prev => {
          // FIX 2: only update if identity actually changed
          if (isSameUser(prev, appUser)) {
            console.log('[AuthContext] User unchanged — skipping setUser');
            return prev;
          }
          console.log('[AuthContext] User changed — setting user:', appUser.uid);
          return appUser;
        });
        if (!initializedRef.current) {
          initializedRef.current = true;
          initProfileRef.current(appUser.uid, appUser.email, appUser.displayName, appUser.photoURL, appUser.isAnonymous);
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setSubscription({ status: 'free', plan: 'free' });
        initializedRef.current = false;
      }
      setLoading(false);
    });

    // FIX 3: cleanup properly unsubscribes
    return () => {
      console.log('[AuthContext] Tearing down Supabase session listener');
      mounted = false;
      sub.unsubscribe();
    };
  }, []); // ← FIX 1: empty deps — registered exactly once

  // ── Auth actions ──
  const signInWithEmail = async (email: string, password: string) => {
    setError(null); setLoading(true);
    const { data, error: e } = await supabase.auth.signInWithPassword({ email, password });
    if (e) { setError(e.message); setLoading(false); throw e; }
    if (data.session?.user) {
      const au = toAppUser(data.session.user);
      setUser(prev => isSameUser(prev, au) ? prev : au);
      if (!initializedRef.current) { initializedRef.current = true; initProfile(au.uid, au.email, au.displayName, au.photoURL, au.isAnonymous); }
    }
    setLoading(false);
    return data;
  };

  const signUpWithEmail = async (email: string, password: string) => {
    setError(null); setLoading(true);
    const { data, error: e } = await supabase.auth.signUp({ email, password, options: { data: { full_name: email.split('@')[0] } } });
    if (e) { setError(e.message); setLoading(false); throw e; }
    if (data.session?.user) {
      const au = toAppUser(data.session.user);
      setUser(prev => isSameUser(prev, au) ? prev : au);
      if (!initializedRef.current) { initializedRef.current = true; initProfile(au.uid, au.email, au.displayName, au.photoURL, au.isAnonymous); }
    }
    setLoading(false);
    return data;
  };

  const signInAsGuest = async () => {
    setError(null); setLoading(true);
    const { data, error: e } = await supabase.auth.signInAnonymously();
    if (e) { setError(e.message); setLoading(false); throw e; }
    if (data.session?.user) {
      const au = toAppUser(data.session.user);
      setUser(prev => isSameUser(prev, au) ? prev : au);
      initializedRef.current = true;
      initProfile(au.uid, au.email, au.displayName, au.photoURL, au.isAnonymous);
    }
    setLoading(false);
  };

  const signInWithGoogle = async () => {
    setError(null); setLoading(true);
    const { data, error: e } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        skipBrowserRedirect: false,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
    if (e) { setError(e.message); setLoading(false); throw e; }
    setLoading(false);
  };

  const signOutUser = async () => {
    setError(null);
    try {
      await supabase.auth.signOut();
      setUser(null); setUserProfile(null);
      setSubscription({ status: 'free', plan: 'free' });
      initializedRef.current = false;
    } catch (e: any) {
      console.error('Sign out error:', e);
      setError(e.message || 'Failed to sign out');
    }
  };

  const redeemCode = async (code: string) => {
    const fn = httpsCallable(functions, 'redeemCode');
    const result = await fn({ code });
    return result.data;
  };

  const sendPasswordReset = async (_email?: string) => {
    console.log('[AuthContext] Password reset not yet ported from Firebase');
  };

  const resendVerificationEmail = async (_email?: string) => {
    console.log('[AuthContext] Verification email not yet ported from Firebase');
  };

  const refreshUserData = async () => {
    if (user) await initProfile(user.uid, user.email, user.displayName, user.photoURL, user.isAnonymous);
  };

  const isPremium = subscription?.status === 'active' || subscription?.plan === 'premium';

  const value: AuthContextType = {
    user, userProfile, subscription, loading, error, language, isPremium,
    setLanguage, signInAsGuest, signInWithEmail, signUpWithEmail,
    signInWithGoogle, signOutUser, redeemCode,
    sendPasswordReset, resendVerificationEmail, refreshUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export default AuthContext;
