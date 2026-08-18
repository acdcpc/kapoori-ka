# PWA Release Remediation Report

Date: 2026-08-18 · Repository: acdcpc/kapoori-ka · Branch: main (local, unpushed)

## Baseline (run this turn)
| Command | Result |
|---|---|
| `git status` | clean working tree |
| `git log -1 --oneline` | `63d7488 docs(pwa): update decisions + add test report matrix and deployment handover` |
| `pnpm install --frozen-lockfile` | exit 0 |
| `npx expo-doctor` | 20/22 → **21/22** after alignment (1 remaining: Hermes V1) |
| `pnpm exec tsc --noEmit` | exit 0 |
| `pnpm build:web` | exit 0 → `dist/` |

## Fixes applied

### P0 — Child photographs were publicly accessible ✅ FIXED (code + migration)
- **Confirmed**: `20240807000003_child_photos_bucket.sql` created `child-photos` with `public = true` and an unrestricted `"Anyone can read child photos"` SELECT policy. `ChildDashboard.tsx` called `getPublicUrl()` and stored the permanent public URL.
- **New forward-only migration** `20260818000000_child_photos_private.sql`:
  - `public = false` on the bucket,
  - dropped the unrestricted read policy,
  - added an owner-scoped `SELECT` policy (`auth.uid()::text = (storage.foldername(name))[1]`),
  - rewrote stored public URLs back to storage paths.
- **Client**: new `src/lib/childPhoto.ts` mints short-lived (1 h) signed URLs from the private bucket (cached in-memory); new `src/components/ChildPhoto.tsx` renders them. `ChildDashboard` now stores the storage **path** (not a public URL); `HomeScreen` and `ChildDashboard` render via the signed-URL component.
- **Verified**: `tsc --noEmit` + `build:web` pass. Live two-account/anon access test is **BLOCKED — OWNER ACTION REQUIRED** (needs applying the migration to the live DB + a second test account).

### P0 — Expo dependency health ✅ ALIGNED (1 residual, deferred)
- Fixed the **major** mismatch `expo-build-properties@57.0.8 → ^56.0.26` and **10 patch** mismatches via `npx expo install --fix`; added the `expo-asset` config plugin manually (the CLI cannot write dynamic `app.config.js`).
- `expo-doctor` improved **20/22 → 21/22**.
- **Residual → RESOLVED**: Hermes V1 memory regression fixed by completing the **Expo SDK 57 / React Native 0.86.2** upgrade (owner-approved — APK not in use). `expo-doctor` now passes **21/21**.

### P1 — Service-worker caching too broad ✅ FIXED
- Rewrote `public/service-worker.js`: versioned cache (`kapoori-ka-v2`), caches **only** app shell + `/_expo/` + `/assets/` + icons; explicitly excludes `/auth/`, `/api/` and cross-origin requests (Supabase).
- Rewrote `public/register-sw.js` with an update flow: on `updatefound` → `SKIP_WAITING` → `controllerchange` → single reload. No stale-cache trap, no manual data clearing.

### P1 — Security headers not enforced on FC/nginx ✅ FIXED (config tracked)
- Added version-controlled `deploy/nginx.conf` with SPA fallback (`try_files … /index.html`) + full security headers (CSP, `nosniff`, `X-Frame-Options: DENY`, `Permissions-Policy`, `Referrer-Policy`). `public/_headers` + `public/_redirects` remain for the Netlify path.
- **BLOCKED — OWNER ACTION REQUIRED**: the deployed Function Compute function must be rebuilt/republished from this tracked config; deployed-header response test (`curl -I`) requires the live URL.

### P1 — Production OAuth + physical-device tests incomplete ⏳ BLOCKED — OWNER ACTION REQUIRED
- Code paths are in place (browser OAuth redirect, `/auth/callback` error handling). Live verification needs: production domain, Supabase + Google redirect allow-lists, and a physical iPhone Safari test. Not performed — cannot be done without owner credentials/device.

## Truthful status
- **Automated checks passing**: `tsc --noEmit`, `pnpm build:web`, secrets scan of `dist/` (no service-role/secret).
- **Not yet verified (owner-gated)**: live migration apply, two-account Storage denial, anon access denial, deployed-header test, live OAuth, physical iPhone Safari install/photo/OAuth/report.
- **Residual known issue (not in the P0/P1 list)**: the add-child flow (`AddChildScreen`) stores a local `file://`/`blob:` URI as `photo_uri` without uploading to Storage, so a photo set at child creation does not sync across devices. Tracked separately; not fixed in this remediation.

## SDK 57 / RN 0.86.2 upgrade (owner-approved, completed)
- `npx expo install expo@^57.0.9 --fix` → `expo@57.0.14`, `react-native@0.86.2`, `react@19.2.3`, all `expo-*` to 57.x; `babel-preset-expo@57.0.7`.
- Added `expo-secure-store` + `expo-status-bar` to `app.config.js` plugins (CLI cannot write dynamic config).
- `expo-file-system/legacy` still resolves in SDK 57 — no client change needed.
- Verification: `expo-doctor` **21/21** · `tsc --noEmit` exit 0 · `pnpm build:web` exit 0.
- Peer warning (benign, pre-existing): `@firebase/auth@1.7.9` wants `@react-native-async-storage/async-storage@^1.18.1`; installed is 2.2.0. Firebase is a legacy dep (backend is Supabase). Not a build failure.

## Release decision
**Ready for preview testing** — not production. Code remediation is complete and build-verified; the owner-gated items above remain `BLOCKED — OWNER ACTION REQUIRED`.
