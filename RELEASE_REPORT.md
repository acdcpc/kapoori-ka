# Kapoori Ka — Release Verification Report

**Date:** 12 September 2026 · **Branch:** `main` · **HEAD:** `3dd98a2` (verification gates run at `2204abb`; this report adds only documentation)

## Environment
| Item | Value |
|---|---|
| Host | macOS 15 (arm64), Node 22 LTS, pnpm 11.14.0 |
| App stack | Expo SDK 57 (`expo@57.0.22`), React Native 0.86.3, TypeScript |
| Backend | Supabase project `tgnzucqjebnisgrxjfjg` — Auth, Postgres (RLS), Storage, 6 Edge Functions |
| Distribution | Android APK (sideload/EAS) + installable PWA (web export) |

## Verification gates — all executed at `2204abb` (HEAD `3dd98a2` documents them)

| Gate | Command | Result |
|---|---|---|
| Frozen install | `pnpm install --frozen-lockfile` | **PASS** (clean clone) |
| Types | `pnpm exec tsc --noEmit` | **PASS** (0 errors) |
| Expo diagnostic | `pnpm run doctor` | **PASS — 21/21** (now dependency-backed) |
| Web export | `pnpm run build:web` | **PASS** — no manual cache step required |
| Static validators | `pnpm run validate:all` | **PASS** (release-security, caregiver-features, hc-calculations) |
| Browser matrix | `pnpm run test:browser` (Chrome, Firefox, 390px) | **PASS — 15/15** |
| Adversarial authorization | `ADV_ALLOW=1 python3 scripts/adversarial-authz-test.py` | **PASS — 19/19** |
| Reminder sender (cron) | GitHub Actions `vaccine-reminders.yml` | **PASS** — `{"ok":true,"sent":0,"failed":0,"removedExpired":0}` (no subscribers yet) |
| Dependency audit | `pnpm audit` | 2 moderate exceptions, documented |

### Build artifacts confirmed in `dist/`
`index.html` · `manifest.json` · `service-worker.js` · `register-sw.js` · `_headers` · `_redirects` · `icon-192.png` · `icon-512.png` · `favicon.ico` · `payment.html` · `esewa-qr.png` · `admin/index.html` · `_expo/static/js/web/*.js` (3.1 MB)

## Product promises verified in code
| Promise | Evidence |
|---|---|
| Single root service worker owns caching **and** Web Push | `public/service-worker.js` (v3) contains install/activate/fetch/SKIP_WAITING + push + notificationclick |
| No API/auth/health data cached by the service worker | Explicit skip list: `/auth`, `/api`, `/rest`, `/graphql`, `/functions`, `/storage`, `/admin` |
| Reminder cadence — 7d, 2d, day-of, then overdue day 1/4/7 + weekly (365-day cap) | `send-vaccine-reminders` + local arming in `notifications.ts` |
| Reminder delivery logging, provider status, failure counts, expired-endpoint cleanup | `reminder_delivery_log`, device health columns, sender logging + cleanup |
| Analytics consent-gated and coarse | `recordProductEvent` gated on the cached opt-in; 8 event names; no names, values, notes, photos or free text |
| Vaccine reminders free for all users | Dashboard tile + screen gates removed; premium keeps diagnostics/PDF/HC |
| Web entry rules | Installed PWA and signed-in sessions skip the landing; first visit shows it; remembered per device |

## Dependency exceptions (2, both moderate)
See [DEPENDENCY_EXCEPTIONS.md](DEPENDENCY_EXCEPTIONS.md).
1. `decode-uri-component@0.2.2` (via `query-string` → React Navigation — ships in the bundle): moderate client-side DoS on crafted URLs; fix requires a major inside React Navigation 6. **Accepted for beta; revisit on RN upgrade.**
2. `uuid@7.0.3` (via `xcode` → `@expo/config-plugins` — build-only, iOS tooling): never shipped; overriding across majors risks the prebuild toolchain. **Accepted.**

## Known gaps — device-dependent or owner-gated
| Item | Status |
|---|---|
| iOS Safari / Home Screen PWA: install, login, push permission, reminder receipt, update behaviour | **NOT VERIFIED** — requires a physical iPhone |
| Android Chrome: install, login, offline recovery, push permission, reminder receipt | **NOT VERIFIED** — requires a physical device |
| App update during data entry (no silent loss) | **NOT VERIFIED** — device test |
| Adversarial suite against a **dedicated staging** project | **PENDING** — current runs target the live project under an explicit `ADV_ALLOW=1` guard; a separate staging project is an owner task |
| Two operator-owned test accounts for end-to-end payment/caregiver flows | **PENDING** — owner |
| Occasional 500 from the admin user-delete API for one test account | Cosmetic; cleanup is idempotent, and a leftover `*.test.local` account can be removed from the dashboard |

## Verdict
> **Controlled beta: APPROVED.**
> **Paid beta: APPROVED only after** (a) the authorization suite runs against a dedicated staging project, and (b) physical iOS + Android PWA checks pass, and (c) payment amount/entitlement state is confirmed consistent across native and web.
> **Broad public launch: HOLD** until the physical-device checks and the two dependency exceptions are addressed.

No claim of "production ready" is made: the clean build, doctor gate, `validate:all`, browser matrix and reminder sender are all accounted for, while the device checks and the staging authorization run remain outstanding.

## Reproduce everything
```bash
git clone https://github.com/acdcpc/kapoori-ka.git && cd kapoori-ka
pnpm install --frozen-lockfile
pnpm exec tsc --noEmit
pnpm run doctor                # 21/21
pnpm run validate:all
pnpm run build:web             # generates dist/
npx serve -l 4173 dist &       # serve the exact artifact
BASE_URL=http://localhost:4173 pnpm run test:browser   # 15/15
# authorization suite (staging target; creates + deletes throwaway users)
SUPABASE_URL=<staging-url> ADV_ALLOW=1 python3 scripts/adversarial-authz-test.py
```
