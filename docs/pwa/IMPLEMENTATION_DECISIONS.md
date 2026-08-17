# Kapoori Ka — Expo Web / PWA Implementation Decisions

- Status: Phase 1 + platform-safe implementation (2.1, 2.2, 2.5) complete; device tests and console steps pending (see WEB_PWA_TEST_REPORT.md / DEPLOYMENT_HANDOVER.md)
- Date: 2026-08-17
- Branch: `main`

## Baseline
| Item | Value |
|---|---|
| Expo SDK | 56 (`expo@56.0.18`) |
| React Native | 0.85.3 |
| Package manager | pnpm 11.14.0 |
| Web build | `pnpm build:web` → `expo export -p web` → `dist/` (SUCCESS) |
| Production domain | TBD — final HTTPS origin must be chosen by owner (e.g. `app.kapoorika.com.np`) |

## Web output mode (explicit decision)
The default **single-page (SPA) output is retained** and not set to `output: "static"`.
This app uses **React Navigation**, not Expo Router. Setting `web.output: "static"`
makes Expo pull in `@expo/router-server` + `expo-router` + `@expo/metro-runtime`
(not installed), which fails the export. The SPA is served with a host-level
`try_files $uri $uri/ /index.html` fallback (nginx) / `/* /index.html 200` (Netlify).

## Platform-resolved auth storage (2.1)
- `src/lib/authStorage.ts` — `AuthStorage` interface + safe no-op fallback (type contract only).
- `src/lib/authStorage.native.ts` — `expo-secure-store` (Keychain/Keystore). Never imported on web.
- `src/lib/authStorage.web.ts` — `window.localStorage` with SSR/storage-unavailable guards; fails safe (returns null / no-op, never throws).
- `src/lib/supabase.ts` imports `./authStorage` (Metro resolves `.native.ts`/`.web.ts`).
- `persistSession: true`, `autoRefreshToken: true`, `detectSessionInUrl: true` are all required (session persistence, token refresh, web OAuth callback). `signOut` clears the session via the active adapter.

## Web origin configuration (1.1)
- `EXPO_PUBLIC_WEB_APP_URL` is the single public (non-secret) web-origin value, set per environment.
- `src/lib/webConfig.ts` `getWebAppUrl()` validates it at startup: malformed/missing → clear `console.error`/`warn` in dev, falls back to `window.location.origin` so the app still runs.
- Wired into `App.tsx` startup. Declared in `.env.example`; `expo-env.d.ts` enables typed `process.env`.

## Google OAuth redirect (2.2)
- `makeRedirectUri({ scheme: 'com.kapoori.ka', path: 'auth/callback' })` → native `com.kapoori.ka://auth/callback`, web `https://<origin>/auth/callback` (verified against `expo-linking` `createURL.web.js`).
- Web uses the standard browser redirect (`signInWithOAuth` without `skipBrowserRedirect`); `detectSessionInUrl` completes the session. Native keeps `openAuthSessionAsync` + manual token extraction.
- **Failure handling**: supabase-js leaves the `error` fragment in the URL on failure (only clears on success). `App.tsx` detects it and shows a localized (Nepali/English), recoverable alert, then clears the fragment.

## Native module → web compatibility matrix (2.5)
| Module | Where | Web outcome |
|---|---|---|
| `expo-secure-store` | `authStorage.native.ts` only | ✅ Platform-resolved (web never imports it) |
| `expo-notifications` | `utils/notifications.ts` | ⚠️ Web-specific equivalent: all schedule fns no-op on web; `setNotificationHandler` wrapped. **Web push is not implemented** — reminders are device/calendar dependent on web |
| `expo-device` | `utils/notifications.ts` | Native push path only (guarded) |
| `expo-file-system/legacy` | ChildDashboard, AddChildScreen, PDFReport | ✅ Web-specific equivalent: web branches skip it (Blob upload / browser print); native keeps FileSystem |
| `expo-image-picker` | ChildDashboard, AddChildScreen | ⚠️ Works on web (returns File/URI) — needs physical Safari + Chrome test |
| `expo-image-manipulator` | ChildDashboard, AddChildScreen | ✅ Works on web (canvas resize → JPEG) |
| `expo-sharing` | PDFReportScreen | ⚠️ Web-specific equivalent: skipped on web (browser print/download instead) |
| `expo-print` | PDFReportScreen | ✅ `Print.printAsync({ html })` on web; `printToFileAsync` native |
| `react-native-confetti-cannon` | ImmunizationScreen | ✅ Explicitly unavailable on web: `Platform.OS !== 'web'` guard; milestone completion unaffected |
| `expo-web-browser` | AuthContext, App | ✅ Web-specific equivalent: browser redirect on web; `openAuthSessionAsync` native |
| `expo-auth-session` | AuthContext | ✅ `makeRedirectUri` is platform-correct |
| `expo-speech` | ImmunizationScreen, MilestoneScreen | ⚠️ Works on web (Web Speech API) — browser-dependent |
| `react-native-webview` / `expo-sensors` | (unused) | n/a — not referenced |

## Photo upload (2.3)
- Storage path is user-scoped: `child-photos/{user_id}/{child_id}/photo.jpg`; `contentType: image/jpeg`.
- Web uploads a `Blob` via `supabase.storage.upload`; native uses `FileSystem.uploadAsync` (multipart).
- Size ceiling is structurally enforced: every photo is resized to 512px JPEG (≈50–150 KB), far below the 5 MB ceiling. MIME is normalised to JPEG by `expo-image-manipulator`. Explicit MIME/size rejection + bilingual errors remain a device-test item.

## Security (3.2)
- `public/_headers` (Netlify) + nginx `add_header` (Function Compute) apply: `nosniff`, `Referrer-Policy`, `X-Frame-Options: DENY`, `Permissions-Policy`, and a restrictive CSP (`script-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`, `connect-src 'self' https://*.supabase.co https://accounts.google.com`, `upgrade-insecure-requests`).
- SW registration is an **external** file (`register-sw.js`) so `script-src 'self'` holds (no inline script).
- Secrets scan of `dist/` confirms only the public anon key is present; no `service_role`/private keys.

## Residual limitations (honest)
- Web push reminders are **not** implemented → no "notification scheduled" claims on web.
- HEIC upload on web is not verified (Safari HEIC → JPEG conversion depends on the picker/manipulator).
- Physical-device tests (iPhone Safari install, photo/OAuth/report, two-account RLS) are pending — see WEB_PWA_TEST_REPORT.md.

## Delivery identity (Function Compute)
- `projectId` / `folderName`: `website-7910e8a18bd46fa127240ce4`
- `deliveryMode`: `create`; nginx SPA fallback `try_files $uri $uri/ /index.html`.
