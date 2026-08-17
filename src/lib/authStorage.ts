/**
 * Platform-resolved auth session storage.
 *
 * Metro resolves `authStorage.native.ts` on native (encrypted SecureStore)
 * and `authStorage.web.ts` on web (localStorage with fail-safe guards).
 * This base file is the TypeScript type contract; it is never bundled in
 * practice because a platform file always wins resolution.
 */
export interface AuthStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

// In-memory no-op fallback — safe (never crashes, session simply isn't
// persisted) and should never be reached because platform files resolve first.
export const authStorage: AuthStorage = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
};
