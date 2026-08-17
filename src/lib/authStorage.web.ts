import { AuthStorage } from './authStorage';

/**
 * Web adapter — stores the Supabase session in window.localStorage.
 * Guarded for SSR / build time and for browsers that block storage.
 * Fails safe (returns null / no-op) rather than throwing.
 */
function safeStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    const s = window.localStorage;
    const probe = '__kk_storage_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

export const authStorage: AuthStorage = {
  getItem: async (key) => {
    const s = safeStorage();
    if (!s) return null;
    try {
      return s.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key, value) => {
    const s = safeStorage();
    if (!s) return;
    try {
      s.setItem(key, value);
    } catch (e) {
      console.error('[authStorage.web] setItem failed:', e);
    }
  },
  removeItem: async (key) => {
    const s = safeStorage();
    if (!s) return;
    try {
      s.removeItem(key);
    } catch (e) {
      console.error('[authStorage.web] removeItem failed:', e);
    }
  },
};
