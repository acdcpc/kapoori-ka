import { Platform } from 'react-native';

/**
 * Resolves the configured public web origin (EXPO_PUBLIC_WEB_APP_URL).
 *
 * This is public, non-secret client configuration (safe to bundle). It is
 * validated at startup; when missing or malformed in development it logs a
 * clear error and falls back to window.location.origin so the app still runs.
 */
export function getWebAppUrl(): string | null {
  if (Platform.OS !== 'web') return null;

  const raw = (process.env.EXPO_PUBLIC_WEB_APP_URL as string | undefined)?.trim();
  if (raw) {
    try {
      return new URL(raw).origin;
    } catch {
      if (__DEV__) {
        console.error(
          '[webConfig] EXPO_PUBLIC_WEB_APP_URL is malformed — using window.location.origin instead:',
          raw,
        );
      }
    }
  } else if (__DEV__) {
    console.warn(
      '[webConfig] EXPO_PUBLIC_WEB_APP_URL is not set — using window.location.origin. ' +
        'Set it to the production HTTPS origin before release.',
    );
  }

  if (typeof window !== 'undefined') return window.location.origin;
  return null;
}
