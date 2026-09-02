# Kapoori Ka Website Release Notes

## Implemented

| Requirement | Status | Evidence |
|---|---|---|
| Responsive public website | Implemented | `src/screens/WebsiteScreen.tsx`, rendered on web in `App.tsx` |
| Bilingual English/Nepali experience | Implemented | Localized `copy.en` and `copy.ne` maps with persistent language toggle |
| Product overview | Implemented | Hero, feature cards, workflow section, trust section, final CTA |
| Existing native app preserved | Implemented | Android/iOS continue through the existing authenticated navigation |
| Accessibility basics | Partially implemented | Text-labeled pressable controls, 44 px minimum control heights, readable contrast, semantic section labels; screen-reader audit remains an owner action |
| Privacy-safe landing page | Implemented | No child-data form, analytics event, payment input, secret, or database request added |
| Security regression checks | Pass | `pnpm run validate:release-security` passed |
| Type checking | Pass | `pnpm exec tsc --noEmit` passed |
| Web export | Pass | `pnpm run build:web` exported `dist` successfully |
| Secret scanner | Blocked by existing repository findings | The required scanner flags existing `.env.example`, `PRODUCTION_DEPLOYMENT_GUIDE.md`, and `firebase.ts`; no new secret was added by the website work |
| Dependency audit | Owner action | `pnpm audit --audit-level high` reports existing high-severity `image-size` advisories in Expo dependency paths |

## Setup

Run `pnpm install`, configure the existing environment variables from `.env.example`, then run `pnpm web` for local browser development or `pnpm run build:web` for a static export. The public website is the web entrypoint; native builds retain the existing app navigation.

## Data and privacy map

The new landing screen is presentation-only. It reads the existing language context and uses the existing persistence helper for the language preference. It does not access Supabase, child profiles, photos, health records, payment proofs, activation codes, or analytics.

## Analytics event dictionary

No new events were added. If website analytics are introduced later, use consent-aware coarse events only, such as `website_cta_clicked` and `website_language_changed`, without names, emails, child data, health values, free-form text, photos, payment data, precise location, or tokens.

## Deletion and retention policy

Not applicable to the public landing page because it creates no account or personal record. Existing in-app deletion and retention controls remain governed by the application’s existing privacy implementation and must be re-tested before release.

## Payment decision

Not applicable to this website pass. Existing activation-code and payment-proof flows remain unchanged and are not unlocked by client-side website state.

## Owner actions before production

A fluent Nepali speaker should review all public copy, especially health and disclaimer language. The owner should also complete a screen-reader and keyboard audit at 320–430 px and desktop widths, review the existing scanner findings, and resolve or formally waive the reported high-severity dependency advisory before a production security claim.
