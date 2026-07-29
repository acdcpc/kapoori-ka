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
  const initProfile = useCallback(async (uid: string) => {
    const { data: p, error: pe } = await supabase
      .from('profiles').select('*').eq('user_id', uid).maybeSingle();

    if (pe && pe.code !== 'PGRST116') {
      console.error('[AuthContext] Profile read error:', pe);
    }

    const now = nowISO();
    if (!p) {
      // Create profile + subscription
      supabase.from('profiles').insert({
        user_id: uid, email: user?.email || null,
        display_name: user?.displayName || 'User',
        photo_url: user?.photoURL || null,
        language: 'ne', created_at: now, updated_at: now,
        is_anonymous: user?.isAnonymous || false,
      }).then(r => r.error && console.error('Insert profile:', r.error));

      supabase.from('subscriptions').insert({
        user_id: uid, status: 'free', plan: 'free', auto_renew: false,
        price: 0, consultations_remaining: 0, created_at: now, updated_at: now,
      }).then(r => r.error && console.error('Insert sub:', r.error));

      setUserProfile({
        uid, email: user?.email || null, displayName: user?.displayName || 'User',
        photoURL: user?.photoURL || null, language: 'ne',
        createdAt: now, updatedAt: now, isAnonymous: user?.isAnonymous || false,
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
  }, [user]);

  // ── Session listener ──
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return;
      if (s?.user) {
        const appUser = toAppUser(s.user);
        setUser(appUser);
        if (!initializedRef.current) {
          initializedRef.current = true;
          initProfile(appUser.uid);
        }
      }
      setLoading(false);
    });

    const { data: { subscription: sub } } = supabase.auth.onAuthStateChange((_ev, s) => {
      if (!mounted) return;
      if (s?.user) {
        const appUser = toAppUser(s.user);
        setUser(appUser);
        if (!initializedRef.current) {
          initializedRef.current = true;
          initProfile(appUser.uid);
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setSubscription({ status: 'free', plan: 'free' });
        initializedRef.current = false;
      }
      setLoading(false);
    });

    return () => { mounted = false; sub.unsubscribe(); };
  }, [initProfile]);

  // ── Auth actions ──
  const signInWithEmail = async (email: string, password: string) => {
    setError(null); setLoading(true);
    const { data, error: e } = await supabase.auth.signInWithPassword({ email, password });
    if (e) { setError(e.message); setLoading(false); throw e; }
    if (data.session?.user) {
      setUser(toAppUser(data.session.user));
      if (!initializedRef.current) { initializedRef.current = true; initProfile(data.session.user.id); }
    }
    setLoading(false);
    return data;
  };

  const signUpWithEmail = async (email: string, password: string) => {
    setError(null); setLoading(true);
    const { data, error: e } = await supabase.auth.signUp({ email, password, options: { data: { full_name: email.split('@')[0] } } });
    if (e) { setError(e.message); setLoading(false); throw e; }
    if (data.session?.user) {
      setUser(toAppUser(data.session.user));
      if (!initializedRef.current) { initializedRef.current = true; initProfile(data.session.user.id); }
    }
    setLoading(false);
    return data;
  };

  const signInAsGuest = async () => {
    setError(null); setLoading(true);
    const { data, error: e } = await supabase.auth.signInAnonymously();
    if (e) { setError(e.message); setLoading(false); throw e; }
    if (data.session?.user) {
      setUser(toAppUser(data.session.user));
      initializedRef.current = true;
      initProfile(data.session.user.id);
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
    // Supabase redirect-based recovery; placeholder for API compatibility
    console.log('[AuthContext] Password reset not yet ported from Firebase');
  };

  const resendVerificationEmail = async (_email?: string) => {
    console.log('[AuthContext] Verification email not yet ported from Firebase');
  };

  const refreshUserData = async () => {
    if (user) await initProfile(user.uid);
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
