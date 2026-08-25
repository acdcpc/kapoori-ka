# Clinic Summary and Settings & Privacy — Nepali Localization Handoff

## Purpose

This change makes the **Clinic summary** and **Settings & privacy** flows Nepali-first when the app language is Nepali, while retaining English when the user selects English. The update follows the existing Care Team localization pattern: user-facing strings are selected at render time from the shared `LanguageContext`, and sensitive data-access, audit, privacy, and offline-sync logic remains unchanged.

> Important: This is a localization and usability change. It does not replace clinical review, Supabase RLS review, production HTTPS checks, or physical-device testing.

## Files changed

| File | Change | Security or behavior impact |
|---|---|---|
| `src/screens/ClinicSummaryScreen.tsx` | Added language-aware labels, notices, alerts, accessibility labels, and Nepali/English PDF content. | Preserves the existing child-scoped queries, export audit insert, offline audit fallback, and caregiver-triggered sharing flow. |
| `src/screens/PreferencesScreen.tsx` | Localized headings, accessibility controls, care-team instructions, privacy explanations, offline-sync copy, alerts, and switch labels. | Preserves the existing account-bound privacy preference writes, owner-bound offline queue, and manual sync action. |
| `todo.md` | Added tracking items for this localization work and its validation/reporting. | Documentation only. |

## Clinic summary changes

The screen now uses `LanguageContext` and a small `tr(nepali, english)` helper. In Nepali mode, the title, explanation, selected-record notice, date-of-birth label, measurement count, PDF button, loading state, and fallback alerts are Nepali-first. In English mode, the existing English experience remains available.

The generated PDF is localized as well. The PDF heading, metadata labels, table headings, empty states, immunization statuses, sharing dialog title, safety notice, and caregiver observation heading follow the selected language. When available, Nepali vaccine names are used from `vaccineNameNepali`; the existing vaccine name is used as a safe fallback when a Nepali label is unavailable.

The export continues to include only the existing selected fields. It still queries records by the current `child.id`, writes the `record_export_audit` entry using the signed-in user as `actor_id`, queues the audit mutation if the write is temporarily unavailable, and shares the generated PDF only through the existing device sharing path. No new database permissions, storage access, or entitlement logic was introduced.

## Settings & privacy changes

The screen now uses `LanguageContext` and renders Nepali-first copy whenever the active language is Nepali. The following sections were localized:

| Section | Nepali-first content included |
|---|---|
| Readability and access | Text-size options, high contrast, reduced motion, voice guidance, and simple-language labels. |
| Care and sharing | Caregiver access description, trusted-adult warning, and child-profile navigation instruction. |
| Privacy choices | Anonymous feature-use counts, crash diagnostics, and the explanation of excluded child data. |
| Offline records | Device-only storage explanation, sign-in requirement, uninstall warning, sync button, and sync result/error alerts. |

The existing privacy boundary is unchanged: preference writes still use the authenticated user ID, failed writes are queued with that same owner ID, and queued operations are flushed only for the signed-in account. The screen does not expose child names, child IDs, notes, measurements, photos, or precise location through the optional analytics explanation.

The accessibility update also adds localized `accessibilityLabel` values to the text-size radio controls, privacy/access switches, caregiver action, loading indicator, and offline-sync button. Existing minimum tap-target styling was retained.

## Validation completed

The following checks passed in `/home/ubuntu/kapoori-ka-care-team-main` after the changes:

```text
pnpm exec tsc --noEmit
# passed with no TypeScript errors

node scripts/validate-caregiver-features.mjs
# Caregiver-feature static regression checks passed.

node scripts/validate-release-security.mjs
# Release-security static regression checks passed.
```

A direct scan of the two updated screen files found no remaining direct user-facing English text outside the intended English branches, localized PDF strings, database field names, technical identifiers, or accessibility-language fallbacks.

## Agent review instructions

The implementation agent should review the two changed screens against the current `LanguageContext` provider and confirm that the provider persists the selected language across navigation. The agent should then test each screen in both Nepali and English modes, including the following states: loading, empty growth records, empty immunization records, populated records, successful PDF creation, unavailable sharing, insufficient storage, privacy-save success, privacy-save offline fallback, sync success with remaining items, sync success with no remaining items, and sync failure.

The agent must not move service-role keys or other secrets into these screens. The agent must not weaken Supabase RLS, change child ownership checks, bypass the export audit, or make Premium status equivalent to an administrator role while reviewing this change.

## Suggested manual acceptance checklist

| Test | Expected result |
|---|---|
| Select Nepali, open Clinic summary | Title, notice, counts, button, disclaimer, alerts, and PDF content are Nepali-first. |
| Select English, open Clinic summary | English labels and PDF content are shown. |
| Export with growth and immunization data | PDF contains the current child’s selected records and the correct language labels. |
| Export with no records | Localized empty-state rows appear without a crash. |
| Select Nepali, open Settings & privacy | Section headings, switches, helper text, and button labels are Nepali-first. |
| Toggle each accessibility option | The existing preference behavior remains functional; voice guidance uses Nepali speech when Nepali is active. |
| Toggle privacy choices while online | Preferences save for the authenticated account. |
| Force an offline privacy save | Localized fallback alert appears and the owner-bound queue is created. |
| Tap offline sync | Localized success, partial-success, or failure alert appears; only the current account’s queue is flushed. |
| Switch language and revisit both screens | No English-only content remains in Nepali mode, and navigation remains intact. |

## Scope boundary

This change covers the two screens requested: **क्लिनिक सारांश / Clinic summary** and **सेटिङ र गोपनीयता / Settings and privacy**. It does not change the separate Care Team screen, immunization calculations, clinical thresholds, Supabase migrations, payment verification, or production deployment configuration.
