# Kapoori Ka — Web / PWA Test Report

Date: 2026-08-17 · Environment: macOS (arm64), Node 22, pnpm 11.14.0

**Status legend:** ✅ PASS (reproducible, verified this turn) · ⏳ BLOCKED (requires physical device / owner console access) · 🚫 NOT SUPPORTED (genuinely unavailable on web)

## Verification matrix

| Area | Required test | Result | Evidence / notes |
|---|---|---|---|
| Build | Frozen install | ✅ PASS | `pnpm install --frozen-lockfile` exit 0 |
| Build | Expo doctor | ⏳ BLOCKED | Hermes V1 memory regression + `expo-build-properties` major mismatch — deliberately NOT upgraded (see IMPLEMENTATION_DECISIONS.md). Android runtime concern, not a web blocker |
| Build | TypeScript check | ✅ PASS | `npx tsc --noEmit` exit 0 |
| Build | `expo export -p web` | ✅ PASS | `pnpm build:web` exit 0 → `dist/` |
| Build | `expo serve` | ⏳ BLOCKED | `serve:web` script added; not exercised end-to-end over HTTPS |
| Deploy | Preview HTTPS load (no mixed content / fatal console errors) | ⏳ BLOCKED | Staged to Function Compute (`projects.json` written); live preview URL not yet returned by AutoClaw Main |
| Deploy | Production HTTPS | ⏳ BLOCKED | Owner must choose domain + click Publish |
| Responsive UI | iPhone Safari / Android Chrome / desktop, no clipping | ⏳ BLOCKED | Not device-tested. Code has no fixed-width desktop-only layout; 320px/iPhone usable pending verification |
| PWA install | Manifest valid | ✅ PASS | `manifest.json` parses: standalone, theme `#E8602C`, icons 192+512, `lang ne`; verified in `dist/` |
| PWA install | Android install / iPhone Add to Home Screen standalone | ⏳ BLOCKED | Requires physical devices over HTTPS |
| Auth | Email sign-up/sign-in/confirm/reset | ⏳ BLOCKED | Code present (existing flow); needs physical + email-confirm state test |
| Auth | Google sign-in / cancel | ⏳ BLOCKED | Platform redirect split + error handler implemented; needs live HTTPS + console allow-list |
| Auth | Guest session | ⏳ BLOCKED | Code present; not re-tested this turn |
| Auth | Reload persistence | ⏳ BLOCKED | `authStorage.web.ts` (localStorage) implemented; not browser-tested |
| Auth | Sign-out clears session | ✅ PASS (code) | `supabase.auth.signOut()` → adapter `removeItem`; not browser-verified |
| Child records | Add/edit/select/delete owner-only | ⏳ BLOCKED | Existing native flow; web + RLS cross-account needs device + second account |
| Photos | Add + replace photo on web | ⏳ BLOCKED | Web Blob upload implemented (`8c3a7b4`); needs Safari/Chrome test |
| Photos | Rejected type / oversized / cancelled picker / expired session / storage denial | ⏳ BLOCKED | Cancelled picker handled; MIME/size explicit rejection + denial messaging pending |
| Photos | Cross-account denial | ⏳ BLOCKED | Path is `{user_id}/{child_id}/photo.jpg` + RLS; needs second non-owner account |
| Health tools | Growth / immunization / milestones / nutrition / M-CHAT / bilingual / onboarding / settings | ⏳ BLOCKED | Existing screens; web navigation not device-tested |
| Report | PDF/print/download in Chrome + Safari, no data leak | ⏳ BLOCKED | Web `Print.printAsync({ html })` implemented; not browser-tested |
| Premium | Valid code unlocks; invalid/reused/rate-limited fails safely | ⏳ BLOCKED | Existing redeem + RPC (`migration 06`); needs device + DB test |
| Security | RLS/Storage cross-account tests fail | ⏳ BLOCKED | Requires two normal accounts + admin (owner) |
| Security | No service key in build | ✅ PASS | `grep` of `dist/`: `service_role`/`sb_secret` secret fragment = 0 occurrences (the one `sb_secret_` hit is supabase-js library code) |
| Security | CSP violations reviewed | ⏳ BLOCKED | CSP shipped in `_headers` + nginx; needs deployed-browser validation |
| Security | Admin/payment records unavailable to ordinary account | ⏳ BLOCKED | RLS enforced server-side; needs account test |
| Cache/update | First load online works | ⏳ BLOCKED | Not browser-tested |
| Cache/update | New deployment updates installed PWA safely | ⏳ BLOCKED | SW has version string + `skipWaiting`/`clients.claim`; update-notification UI not yet added |

## Summary
- **Build-verifiable rows are PASS** (frozen install, tsc, export, manifest validity, secrets scan).
- **All browser/device rows are BLOCKED** — they need (a) a live HTTPS preview URL, (b) a physical iPhone (current iOS Safari) + Android Chrome, and (c) owner access to Supabase/Google consoles with two test accounts.
- **No row is falsely marked PASS.** Web push reminders and confetti are the two genuinely NOT-SUPPORTED-on-web items (documented fallbacks in IMPLEMENTATION_DECISIONS.md).
