# Care Team Nepali Localization

## Purpose of the Care Team tab

The Care team tab is a controlled collaboration area for a child’s trusted caregivers. It lets a parent or primary caregiver create a short-lived, single-use caregiver code, share that code privately with another trusted adult, and revoke access when collaboration is no longer appropriate. Depending on the granted role, the invited caregiver can view or edit permitted child-care records without receiving access to unrelated accounts or children.

The same tab also provides caregiver-facing records for observed feeding entries, clinic visits, verified-facility lookup placeholders, and retrying records saved while offline. These records are memory and coordination aids; they are not diagnoses, prescriptions, vaccination decisions, or feeding instructions.

## Change made

`src/screens/CaregiverToolsScreen.tsx` now uses the app-wide `LanguageContext`. Every rendered Care team heading, description, warning, input placeholder, accessibility label, role label, action label, success message, error message, feeding label, clinic label, facility-directory notice, and offline-sync message has a Nepali translation with English fallback.

Nepali is selected automatically whenever the app language is Nepali. English remains available through the existing global language toggle. Dynamic values such as the child’s name, synced count, remaining count, and caregiver role are inserted into both language variants rather than being translated as static text.

The localization change does not weaken the existing security behavior. Caregiver access continues to use the established caregiver-access functions; child-tool operations remain gated to the selected child context; offline mutations remain bound to the authenticated user; and the offline-sync callback now safely handles a missing session before attempting a user-owned queue flush.

## Validation evidence

The review checkout passed `pnpm exec tsc --noEmit` with status 0. A targeted scan found no remaining English-only rendered strings for the Care team headings, caregiver-sharing actions, feeding actions, clinic actions, access-revocation action, or offline-sync action. The secure calls for caregiver redemption, access revocation, owner-bound offline mutation creation, and owner-bound queue flushing remain present.

## Manual test plan

| Test | Expected result |
|---|---|
| Switch the app language to Nepali, open Care team, and scroll through the whole screen | Headings, guidance, controls, labels, and feedback appear in Nepali. |
| Switch back to English and reopen the screen | The same content appears in English without changing the underlying records. |
| Open Care team without a selected child | The warning is localized and child-record actions remain unavailable. |
| Redeem a valid caregiver code | The success message is localized and the returned role is shown safely. |
| Attempt to revoke access as an unauthorized user | The existing authorization boundary remains enforced; localization changes only the displayed message. |
| Save a feeding or clinic record while offline | The record is placed in the authenticated user’s offline queue and the localized retry message appears. |
| Sign out, then attempt offline sync | The localized session-required message appears and no queue is flushed for another user. |

> Clinical content and caregiver records should be reviewed by a qualified Nepal-based clinician before public release. This screen is a coordination and record-keeping feature, not medical advice.
