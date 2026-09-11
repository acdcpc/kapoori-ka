// src/lib/webPush.ts — Web Push for the PWA (iOS 16.4+ home-screen apps and
// desktop/mobile browsers). Android APK uses native notifications instead.
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { WEB_PUSH_VAPID_PUBLIC_KEY } from '../config/webPush';

const SW_URL = '/sw.js';

export const isWebPushSupported = (): boolean => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
};

export const getWebPushPermission = (): NotificationPermission | 'unsupported' => {
  if (!isWebPushSupported()) return 'unsupported';
  return Notification.permission;
};

const urlBase64ToUint8Array = (base64: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(normalized);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
};

/** Must be called from a user gesture (button tap) — required by iOS Safari. */
export const enableWebPush = async (): Promise<{ ok: boolean; error?: string }> => {
  if (!isWebPushSupported()) {
    return { ok: false, error: 'This browser cannot receive reminders. On iPhone, first add Kapoori Ka to your Home Screen (Share → Add to Home Screen), then open it from there.' };
  }
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return { ok: false, error: 'Please sign in first.' };

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return { ok: false, error: 'Notifications are blocked. Enable them for this site in your browser settings.' };

    const registration = await navigator.serviceWorker.register(SW_URL);
    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(WEB_PUSH_VAPID_PUBLIC_KEY) as BufferSource,
      });
    }

    const json = subscription.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      return { ok: false, error: 'Could not create the reminder subscription. Please try again.' };
    }

    const { error } = await supabase.from('web_push_subscriptions').upsert({
      user_id: user.id,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 200) : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'endpoint' });
    if (error) return { ok: false, error: 'Could not save the subscription. Please try again.' };

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Could not enable reminders on this device.' };
  }
};

export const disableWebPush = async (): Promise<void> => {
  if (!isWebPushSupported()) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration(SW_URL);
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) {
      await supabase.from('web_push_subscriptions').delete().eq('endpoint', subscription.endpoint);
      await subscription.unsubscribe();
    }
  } catch { /* non-fatal */ }
};

export const isWebPushEnabled = async (): Promise<boolean> => {
  if (!isWebPushSupported()) return false;
  try {
    const registration = await navigator.serviceWorker.getRegistration(SW_URL);
    const subscription = await registration?.pushManager.getSubscription();
    return !!subscription && Notification.permission === 'granted';
  } catch {
    return false;
  }
};
