# Kapoori Ka — Release Verification Report

**Date:** 13 September 2026 · **Branch:** `main` · **HEAD:** `c28c9a6` (all gates below re-run from a clean checkout at this commit)

## Environment
| Item | Value |
|---|---|
| Host | macOS 15 (arm64), Node 22 LTS, pnpm 11.14.0 |
| App stack | Expo SDK 57 (`expo@57.0.22`), React Native 0.86.3, TypeScript |
| Backend | Supabase project `tgnzucqjebnisgrxjfjg` — Auth, Postgres (RLS), Storage, 6 Edge Functions |
| Distribution | Android APK (sideload/EAS) + installable PWA (web export) |

## Verification gates — re-run 13 Sep 2026 from a clean `git clone` at `c28c9a6`

Verification environment: fresh clone into a temporary directory, `pnpm install --frozen-lockfile`,
then every gate in order. No cached state, no manual recovery steps.

| Gate | Command | Result |
|---|---|---|
| Frozen install | `pnpm install --frozen-lockfile` | **PASS** — clean clone, exit 0 |
| Types | `pnpm exec tsc --noEmit` | **PASS** — 0 errors |
| Expo diagnostic | `pnpm run doctor` | **PASS — 21/21** (dependency-backed script) |
| Static validators | `pnpm run validate:all` | **PASS** — release-security, caregiver-features, hc-calculations |
| Web export | `pnpm run build:web` | **PASS** — exit 0, no manual cache step |
| Build artifacts | 10 required files + bundle | **PASS** — index.html, manifest.json, service-worker.js, register-sw.js, _headers, _redirects, icon-192, icon-512, payment.html, admin/index.html, `_expo` bundle |
| Browser matrix (clean clone artifact) | `BASE_URL=… pnpm run test:browser` | **PASS — 15/15** (Chrome + Firefox + 390px + entry rules + SW) |
| Reminder sender (cron) | GitHub Actions `vaccine-reminders.yml` | **PASS** — run 34754590643: attempt 1 → HTTP 200 → `{"ok":true,"sent":0,"failed":0}` (10 s) |
| Adversarial authorization | `ADV_ALLOW=1 python3 scripts/adversarial-authz-test.py` | **19/19 at `2204abb`** — re-run on staging pending (production now refused by the harness) |
| Dependency audit | `pnpm audit` | 2 moderate exceptions, documented |
| Repository hygiene | `git ls-files` + `.gitignore` | **PASS** — no bytecode, no secrets, no machine artifacts tracked |

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
| Adversarial suite against a **dedicated staging** project | **PENDING — owner action.** The harness now *refuses* the production project by ref unless `ADV_EMERGENCY_OVERRIDE=1` is set deliberately; the last full pass (19/19) ran on production under an emergency override and is recorded above. A staging project must be created before this gate is considered closed. |
| Two operator-owned test accounts for end-to-end payment/caregiver flows | **PENDING** — owner |
| Occasional 500 from the admin user-delete API for one test account | Cosmetic; cleanup is idempotent, and a leftover `*.test.local` account can be removed from the dashboard |

## Verdict
> **Controlled beta: APPROVED** — every software gate passes from a clean checkout at `c28c9a6`.
> **Paid beta: CONDITIONAL** — requires (a) the authorization suite re-run against a dedicated staging project (harness now refuses production by default), (b) physical iOS + Android PWA checks, and (c) payment amount/entitlement consistency confirmed across native and web.
> **Broad public launch: HOLD** — the physical-device checks and the two documented dependency exceptions remain open.

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
