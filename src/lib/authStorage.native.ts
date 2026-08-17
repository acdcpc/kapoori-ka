import * as SecureStore from 'expo-secure-store';
import { AuthStorage } from './authStorage';

/**
 * Native adapter — stores the Supabase session in expo-secure-store
 * (Keychain on iOS / Keystore-backed on Android). Never imported on web.
 */
export const authStorage: AuthStorage = {
  getItem: async (key) => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (e) {
      console.error('[authStorage.native] getItem failed:', e);
      return null;
    }
  },
  setItem: async (key, value) => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (e) {
      console.error('[authStorage.native] setItem failed:', e);
    }
  },
  removeItem: async (key) => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.error('[authStorage.native] removeItem failed:', e);
    }
  },
};
