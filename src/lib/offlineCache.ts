// src/lib/offlineCache.ts — read-through cache so saved data stays visible
// offline. Writes are handled separately by offlineSync's mutation queue.
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'cache:';

export type CachedResult<T> = { data: T; fromCache: boolean; cachedAt?: number };

/** Runs the fetcher; on success caches the result, on failure serves the last cache. */
export async function fetchWithCache<T>(key: string, fetcher: () => Promise<T>): Promise<CachedResult<T>> {
  try {
    const data = await fetcher();
    try {
      await AsyncStorage.setItem(PREFIX + key, JSON.stringify({ at: Date.now(), data }));
    } catch { /* cache write is best-effort */ }
    return { data, fromCache: false };
  } catch (error) {
    try {
      const raw = await AsyncStorage.getItem(PREFIX + key);
      if (raw) {
        const parsed = JSON.parse(raw) as { at: number; data: T };
        return { data: parsed.data, fromCache: true, cachedAt: parsed.at };
      }
    } catch { /* fall through */ }
    throw error;
  }
}

/** Update the cache directly (used after optimistic local writes). */
export async function writeCache<T>(key: string, data: T): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify({ at: Date.now(), data }));
  } catch { /* best-effort */ }
}

export async function readCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (!raw) return null;
    return (JSON.parse(raw) as { data: T }).data;
  } catch {
    return null;
  }
}

export async function clearCache(key: string): Promise<void> {
  try { await AsyncStorage.removeItem(PREFIX + key); } catch { /* best-effort */ }
}
