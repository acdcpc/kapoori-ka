/**
 * Authentication Context — Supabase
 *
 * Auth: supabase.auth.{signInWithPassword, signUp, signInAnonymously, signInWithOAuth, signOut}
 * Data: supabase.from('profiles'/'subscriptions') for user profile & subscription
 * API shape preserved for zero screen changes.
 */

import React, { createContext, useState, useEffect, useCallback, useRef, useContext } from 'react';
import { Alert, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
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
      // Create profile + subscription — use upsert to prevent race condition
      // when initProfile is called multiple times in quick succession
      supabase.from('profiles').upsert({
        user_id: uid, email: email || null,
        display_name: displayName || 'User',
        photo_url: photoURL || null,
        language: 'ne', created_at: now, updated_at: now,
        is_anonymous: isAnonymous || false,
      }, { onConflict: 'user_id' }).then(r => r.error && console.error('Insert profile:', r.error));

      // Subscription entitlement rows are created only by the trusted
      // redemption/payment flow. Keeping a free default in local state avoids
      // granting a client database permission to create or modify entitlement.

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
          // console.log PII removed: user uid
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
      // console.log PII removed: auth event with user id
      if (s?.user) {
        const appUser = toAppUser(s.user);
        setUser(prev => {
          // FIX 2: only update if identity actually changed
          if (isSameUser(prev, appUser)) {
            // debug log removed in production audit
            return prev;
          }
          // console.log PII removed: user uid
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
    if (e) {
      // Detect unconfirmed email: Supabase returns 'Email not confirmed' when
      // email confirmation is enabled in the dashboard and the user hasn't verified.
      const msg = e.message || '';
      if (msg.includes('Email not confirmed') || msg.includes('email_not_confirmed')) {
        setError('email_not_confirmed');
      } else {
        setError(msg);
      }
      setLoading(false);
      throw e;
    }
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
    try {
      const { data, error: e } = await supabase.auth.signUp({ email, password, options: { data: { full_name: email.split('@')[0] } } });
      
      if (e) {
        setError(e.message || 'Registration failed');
        // Preserve original error object so getAuthErrorMessage can match on Supabase error codes
        throw e;
      }
      
      if (!data?.user) {
        // No user returned and no error — unexpected state
        const msg = 'Registration failed: no response from server.';
        setError(msg);
        throw new Error(msg);
      }
      
      if (data.session?.user) {
        // Email confirmation is disabled → user is logged in immediately
        const au = toAppUser(data.session.user);
        setUser(prev => isSameUser(prev, au) ? prev : au);
        if (!initializedRef.current) { initializedRef.current = true; initProfile(au.uid, au.email, au.displayName, au.photoURL, au.isAnonymous); }
      } else {
        // data.user exists but data.session is null → email confirmation is enabled
      }
      
      return data;
    } finally {
      setLoading(false);
    }
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


/** Parse hash fragment params from a redirect URL (e.g. com.kapoori.ka://auth/callback#access_token=...&refresh_token=...) */
function parseUrlParams(url: string): URLSearchParams {
  const hashIdx = url.indexOf('#');
  if (hashIdx === -1) return new URLSearchParams('');
  const fragment = url.substring(hashIdx + 1);
  // Remove leading '#' if present, then split on '&'
  const clean = fragment.startsWith('#') ? fragment.substring(1) : fragment;
  return new URLSearchParams(clean);
}

  const signInWithGoogle = async () => {
    setError(null); setLoading(true);
    try {
      const isWeb = Platform.OS === 'web';
      // makeRedirectUri returns the native scheme on native and window.location.origin on web.
      const redirectTo = makeRedirectUri({ scheme: 'com.kapoori.ka', path: 'auth/callback' });
      console.log('[AuthContext] Google sign-in redirect URL:', redirectTo);

      if (isWeb) {
        // Web: let the browser handle the OAuth redirect. supabase detectSessionInUrl
        // (enabled in lib/supabase.ts) picks up the session when the callback returns.
        const { error: e } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo,
            queryParams: { access_type: 'offline', prompt: 'consent' },
          },
        });
        if (e) {
          console.error('[AuthContext] Google sign-in OAuth error:', e.message);
          setError(e.message);
          setLoading(false);
          throw e;
        }
        return; // browser navigates away; session detected on return
      }

      const { data, error: e } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      });

      if (e) {
        console.error('[AuthContext] Google sign-in OAuth error:', e.message);
        setError(e.message);
        setLoading(false);
        throw e;
      }

      if (!data?.url) {
        const msg = 'No OAuth URL returned from Supabase';
        console.error('[AuthContext]', msg);
        setError(msg);
        setLoading(false);
        throw new Error(msg);
      }

      console.log('[AuthContext] Opening browser for Google sign-in...');
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, {
        showInRecents: true,
      });

      console.log('[AuthContext] Browser result type:', result.type);

      if (result.type === 'success') {
        // Bug fix: after Google redirect, extract session tokens from the URL
        // WebBrowser.openAuthSessionAsync returns the redirect URL with tokens
        // but onAuthStateChange won't fire — we must set the session manually
        if (result.url) {
          const params = parseUrlParams(result.url);
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');
          if (access_token && refresh_token) {
            console.log('[AuthContext] Extracted session tokens, setting session...');
            await supabase.auth.setSession({ access_token, refresh_token });
          } else {
            console.log('[AuthContext] No tokens in redirect URL, checking session...');
            await supabase.auth.getSession();
          }
        }
        console.log('[AuthContext] Google sign-in browser returned success');
      } else if (result.type === 'cancel') {
        console.log('[AuthContext] Google sign-in cancelled by user');
        setLoading(false);
      } else {
        console.log('[AuthContext] Google sign-in browser returned:', result.type);
        setLoading(false);
      }
    } catch (error: any) {
      console.error('[AuthContext] Google sign-in failed:', error?.message || error);
      setError(error?.message || 'Google sign-in failed');
      setLoading(false);
      throw error;
    }
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
    const trimmedCode = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (trimmedCode.length < 6 || trimmedCode.length > 32) {
      throw new Error('Invalid activation code format');
    }
    // Call Supabase RPC function (replaces Firebase Cloud Function)
    const { data, error: rpcError } = await supabase.rpc('redeem_activation_code', {
      p_code: trimmedCode,
    });
    if (rpcError) throw new Error(rpcError.message);
    if (data?.error) throw new Error(data.error);
    // Refresh user data to pick up new subscription
    await refreshUserData();
    return data;
  };

  const sendPasswordReset = async (email?: string) => {
    if (!email) throw new Error('Email is required');
    const { error: e } = await supabase.auth.resetPasswordForEmail(email);
    if (e) throw new Error(e.message);
  };

  const resendVerificationEmail = async (email?: string) => {
    const targetEmail = email || user?.email;
    if (!targetEmail) throw new Error('No email available for verification');
    const { error: e } = await supabase.auth.resend({
      type: 'signup',
      email: targetEmail,
    });
    if (e) throw new Error(e.message);
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
