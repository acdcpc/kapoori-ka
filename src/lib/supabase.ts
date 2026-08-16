/**
 * Supabase client — platform-aware storage
 * Uses SecureStore on native (encrypted) and localStorage on web.
 */
import 'react-native-url-polyfill';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://tgnzucqjebnisgrxjfjg.supabase.co";
const supabaseAnonKey = "sb_publishable_DzI94YKcBeomrcWogOJPnQ__rOC7fMs";

// Lazy-load SecureStore only on native so the web bundle never imports expo-secure-store.
// On web `secureStoreAdapter` stays undefined → supabase-js falls back to localStorage.
let secureStoreAdapter: any;
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const SecureStore = require('expo-secure-store');
  secureStoreAdapter = {
    getItem: async (key: string): Promise<string | null> => {
      try {
        return await SecureStore.getItemAsync(key);
      } catch {
        return null;
      }
    },
    setItem: async (key: string, value: string): Promise<void> => {
      try {
        await SecureStore.setItemAsync(key, value);
      } catch (e) {
        console.error('SecureStore setItem failed:', e);
      }
    },
    removeItem: async (key: string): Promise<void> => {
      try {
        await SecureStore.deleteItemAsync(key);
      } catch (e) {
        console.error('SecureStore removeItem failed:', e);
      }
    },
  };
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: secureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
