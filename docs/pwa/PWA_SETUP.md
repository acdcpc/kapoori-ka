# Kapoori Ka — PWA (Web) Setup & OAuth Whitelist

Companion to `IMPLEMENTATION_DECISIONS.md`. Documents how the Expo web build is
wired into an installable PWA and the manual steps required for Google sign-in
on web.

## 1. PWA files (all under `public/`)

`public/` is copied verbatim into `dist/` by `expo export -p web`.

| File | Purpose |
|---|---|
| `manifest.json` | Web app manifest (standalone, `theme_color` `#E8602C`, icons 192/512) |
| `service-worker.js` | Network-first service worker with offline `index.html` fallback |
| `icon-192.png`, `icon-512.png` | Resized from `assets/icon.png` |
| `index.html` | Custom HTML template (manifest `<link>`, iOS meta, SW registration) |

## 2. How the HTML template works

- Generated via `npx expo customize public/index.html` — note it is
  `public/index.html`, NOT `web/index.html` (that path is not supported).
- Expo replaces the `%WEB_TITLE%` and `%LANG_ISO_CODE%` placeholders and injects
  `theme-color` + `favicon` from the `web` block in `app.config.js`.
- Do NOT hand-add `theme-color` or `<link rel="icon">` in the template — Expo
  injects them too, which produces duplicates. The template adds only the
  manifest link, the apple-touch / `mobile-web-app` meta, and the SW
  registration script.

## 3. Gotchas

- `expo-service-worker` does NOT exist on npm (404). The service worker is
  written manually (`public/service-worker.js`).
- `npx expo customize` prompts interactively; pass the path explicitly:
  `npx expo customize public/index.html`.
- `public/` must NOT contain the payment/admin pages — those live in `netlify/`
  (the separate Netlify surface). `dist/` must not ship `admin/` or
  `payment.html`.

## 4. Google sign-in redirect whitelist (manual, REQUIRED)

The web OAuth flow redirects the browser to:

```
https://<deployed-domain>/auth/callback
```

(`AuthContext.tsx` → `makeRedirectUri({ scheme: 'com.kapoori.ka', path: 'auth/callback' })`.
On web this resolves to `window.location.origin/auth/callback`; on native to
`com.kapoori.ka://auth/callback`.)

Add this URL in BOTH places, otherwise Google sign-in fails on web:

1. **Supabase Dashboard** → Authentication → URL Configuration → Redirect URLs:
   add `https://<domain>/auth/callback`.
2. **Google Cloud Console** → APIs & Services → Credentials → the OAuth 2.0
   client used by the Google provider → Authorized redirect URIs: add
   `https://<domain>/auth/callback`.

Confirm the exact value in a browser via the dev-console log:
`[AuthContext] Google sign-in redirect URL: ...`.

## 5. Deployment notes

- SPA fallback is required: `nginx.conf` uses
  `location / { try_files $uri $uri/ /index.html; }` so `/auth/callback` and
  React Navigation deep links resolve to `index.html`.
- Only the public anon key ships in the JS bundle. `service_role` or any private
  key must never appear in the repo / bundle / env.
