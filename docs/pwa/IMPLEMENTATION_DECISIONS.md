# Kapoori Ka — Expo Web / PWA Implementation Decisions

- Status: Phase 0 baseline complete (no code changes yet)
- Date: 2026-08-16
- Checked-out commit: `8cf41e6` — chore: remove redundant premium compliance note
- Branch: `main` (clean, up to date with `origin/main`)

## Baseline
| Item | Value |
|---|---|
| Expo SDK | 56 (`expo@56.0.18`) |
| React Native | 0.85.3 |
| React | 19.2.3 |
| Package manager | pnpm 11.14.0 (`pnpm install --frozen-lockfile`) |
| Public production URL (source of truth) | target `https://app.kapoorika.com.np` (final domain TBD; not yet wired) |
| Web build | `pnpm expo export -p web` → **SUCCESS** |

## Phase 0 command results
| Command | Result |
|---|---|
| `git status` | clean; `main` == `origin/main` |
| `pnpm install --frozen-lockfile` | exit 0 (30s) |
| `npx expo-doctor` | **FAIL** (2 checks — see below) |
| `npx tsc --noEmit` | exit 0 (0 errors) |
| `pnpm expo export -p web` | exit 0 → `dist/` (3 MB JS + 21 font assets + index.html) |

### expo-doctor findings (documented, NOT blindly fixed)
1. **Hermes V1 memory regression** — expo@56.0.18 ships Hermes V1 `250829098.0.10`; fix first ships in `250829098.0.16` (SDK 57 / RN 0.86.2). This is an Android *runtime memory* issue, not a web blocker. **Decision: do NOT upgrade the SDK for this.** Deferred.
2. **Dependency mismatches**:
   - MAJOR: `expo-build-properties@57.0.8` (SDK 56 expects `~56.0.25`)
   - Patch (7): expo, expo-asset, expo-file-system, expo-image-manipulator, expo-image-picker, expo-notifications, expo-sharing (each ~1 patch behind)
   - **Smallest correction (proposed, deferred pending user approval):** `npx expo install --fix` + pin `expo-build-properties` to `~56.0.25`. Any dependency change risks the working Android build, so this is gated on approval.

## Native API → Web fallback decisions
| Area | Current usage | Web outcome / selected fallback |
|---|---|---|
| Supabase session | `src/lib/supabase.ts`: `Platform.OS==='web' ? undefined : secureStoreAdapter` | ✅ Split already correct (web → localStorage). Refine: make `expo-secure-store` a lazy import so the web bundle never loads it. |
| Google OAuth | `AuthContext.tsx`: `redirectTo='com.kapoori.ka://auth/callback'` (hardcoded) | ⚠️ Needs platform redirect: web → `https://<prod>/auth/callback`, native → `com.kapoori.ka://auth/callback`. Validate redirect URLs in Supabase + Google console. |
| Profile photos | `AddChildScreen.tsx`, `ChildDashboard.tsx`: expo-image-picker + expo-image-manipulator + `expo-file-system/legacy` (`documentDirectory`, `copyAsync`, `uploadAsync`) | ⚠️ Web branch: use picker/manipulator URI directly (no `FileSystem.copyAsync`), upload via `supabase.storage` Blob (not `FileSystem.uploadAsync`). |
| Milestone celebration | `MilestoneScreen.tsx`: `react-native-confetti-cannon` + `expo-speech` + `expo-file-system/legacy` | ⚠️ Omit/fallback confetti on web; keep `expo-speech` (Web Speech API) guarded; drop FileSystem dependency. |
| PDF reports | `PDFReportScreen.tsx`: `expo-print` (`printToFileAsync`) + `expo-sharing` + `FileSystem.copyAsync` | ⚠️ Web: use `expo-print`'s browser path (print/download blob); skip `expo-sharing` (native-only). |
| Vaccine reminders | `src/utils/notifications.ts`: static `expo-notifications` + `expo-device`; module-level `Notifications.setNotificationHandler()` | ⚠️ **No web-push exists.** Guard module load + all calls behind `Platform.OS!=='web'`. Do **not** claim web reminders work without web-push + service worker + device test. |

## Policy decisions
- **Revert the "Buy Premium" CTA + in-app payment WebView** (commits `9fe5efb`, `8cf41e6`): the PWA spec requires a neutral *"Have an activation code? Redeem it"* experience — no payment URLs / QR / instructions / "buy premium" CTAs in the app/PWA UI. `public/payment.html` + admin pages remain **separate website surfaces**.
- **No secrets in the web bundle**: the Supabase publishable/anon key is public client config (acceptable); `service_role`, DB passwords, private keys, and admin bypass keys must never appear in the repo, bundle, PWA files, or browser-exposed env.
- **Browser is untrusted**: authorization stays server-side (Supabase Auth + RLS + RPC + Storage policies). No client-side `isAdmin`/email allowlist as the boundary.

## Delivery identity (Function Compute)
- `projectId` / `folderName`: `website-7910e8a18bd46fa127240ce4`
- `deliveryMode`: `create`

## Next phases
1. Revert app-UI payment CTA (neutral redeem experience).
2. Web-safe guards: notifications, photos, PDF, confetti, OAuth redirect, lazy secure-store import.
3. PWA: manifest + service worker + web favicon + host redirects.
4. Web build + real-browser/iPhone Safari test matrix (success + denied cases).
