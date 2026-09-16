/**
 * Native Google Sign-In configuration.
 *
 * When EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is set (the *Web* OAuth client ID from
 * the Google Cloud project that also holds the Android client for
 * `com.kapoori.ka`, SHA-1 f970a853c20cf6d5c91adf5f1c37de4fe819b16a), the app
 * signs in through the native Google account picker and exchanges the ID token
 * with Supabase — no browser, no deep-link round trip.
 *
 * While it is empty the app automatically keeps using the browser OAuth flow,
 * so shipping this code changes nothing until the client ID is configured.
 */
export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
export const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';
export const NATIVE_GOOGLE_ENABLED = !!GOOGLE_WEB_CLIENT_ID;
