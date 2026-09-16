/**
 * Native Google Sign-In configuration.
 *
 * Client IDs live in the Google Cloud project `kapoori-ka` (verified in the
 * console on 2026-09-16):
 *   Web application  "Web client (auto created by Google Service)"
 *                      -> EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID, because it is the
 *                      client Supabase Auth already authorises as an ID-token
 *                      audience: the browser flow has always used it, so the
 *                      native flow needs no dashboard change.
 *   Web application  "Kapoori Ka Web"  -> spare Web client, unused for now
 *   Android          "kapoori.ka"      -> EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
 *                      (matched by package com.kapoori.ka + signing SHA-1
 *                       f970a853c20cf6d5c91adf5f1c37de4fe819b16a, not by code)
 *
 * Only a Web-type client makes Google mint an ID token, so the Web client is
 * what the app must pass. When it is set, the app signs in through the native
 * Google account picker and exchanges the ID token with Supabase — no browser,
 * no deep-link round trip.
 *
 * While it is empty the app automatically keeps using the browser OAuth flow,
 * so shipping this code changes nothing until the client ID is configured.
 */
export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
export const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '';
export const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';

/**
 * Value handed to the library as `webClientId`, which it forwards to Google's
 * requestIdToken(). Google only mints an ID token for a Web-type client, so a
 * Web client ID is the correct value. An Android client ID is tried only as a
 * last resort: if Google refuses it the caller silently falls back to the
 * browser flow, so a wrong value degrades instead of breaking sign-in.
 */
export const NATIVE_SERVER_CLIENT_ID = GOOGLE_WEB_CLIENT_ID || GOOGLE_ANDROID_CLIENT_ID;
export const NATIVE_GOOGLE_ENABLED = !!NATIVE_SERVER_CLIENT_ID;
