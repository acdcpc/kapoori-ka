# Dependency Exception Register — Kapoori Ka

Reviewed: 2026-09-11 · Repo: `acdcpc/kapoori-ka` · Tooling: pnpm 11.14.0, Expo SDK 57

## Summary

| Stage | Result |
|---|---|
| Before review | **26 advisories** (20 high, 6 moderate) |
| After patch overrides | **2 advisories** (2 moderate, both documented below) |

Every advisory was traced with `pnpm why` to decide whether it ships to users.

## Fixed — patch overrides (build tooling only)

| Package | Before | After | Chain | Why it is safe |
|---|---|---|---|---|
| `@xmldom/xmldom` | 0.8.13 | **0.8.15** | `@expo/plist` → `@expo/cli` (build/dev only) | 17 advisories patched by 0.8.15; range-compatible within `^0.8`, never bundled into the app |
| `js-yaml` | 4.3.1 | **4.3.2** | `@expo/xcpretty` → `@expo/cli` (build/dev only) | Patch fix within `^4.0.0`; build-only |

Both overrides live in `pnpm-workspace.yaml` (`overrides:`) with a pointer to this file. After the change: `tsc` 0, `expo-doctor` 21/21, `validate:*` suites pass, web export builds.

## Accepted exceptions (2 remaining)

| Package | Installed | Patched at | Chain | Ship risk | Decision |
|---|---|---|---|---|---|
| `decode-uri-component` | 0.2.2 | >= 0.4.3 | `query-string@7` → `@react-navigation/core` → **app bundle** | Moderate DoS via a crafted URL; client-side only, no server path; the fix requires a major that changes the module format and would force `query-string` up two majors inside React Navigation 6 | **Accept for beta.** Revisit when React Navigation is upgraded (their v7 line moves to the patched decoder). |
| `uuid` | 7.0.3 | >= 11.1.1 | `xcode@3` → `@expo/config-plugins` (build-only, iOS project files) | Build-time only; never shipped; the app is distributed as an Android APK and a PWA | **Accept.** Overriding 7 → 11 across majors would risk the prebuild toolchain for no user-facing benefit. |

## Re-review triggers

1. Any Expo SDK upgrade (may refresh `@expo/plist`, `@expo/xcpretty`, `@expo/config-plugins`).
2. Upgrade of React Navigation 6 → 7 (clears `decode-uri-component`).
3. Before a broad paid launch, re-run `pnpm audit` and update this file.

## How to re-run the review

```bash
pnpm audit                       # summary
pnpm audit --json > audit.json   # machine-readable
pnpm why <package>               # which chain pulls it
pnpm install                     # apply overrides from pnpm-workspace.yaml
npx expo-doctor && pnpm exec tsc --noEmit && pnpm build:web
```
