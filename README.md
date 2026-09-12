# कपूरी क (Kapoori Ka)

> **Your child's digital health book** — a bilingual (नेपाली / English) child-health app for Nepali families: WHO growth tracking, Nepal NIP immunization records with reminders, milestones, clinic-ready reports, and caregiver continuity.

[![Expo](https://img.shields.io/badge/Expo-SDK%2057-000020?logo=expo)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-0.86-61DAFB?logo=react)](https://reactnative.dev)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%2B%20Postgres%20%2B%20Storage-3ECF8E?logo=supabase)](https://supabase.com)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**Distribution:** Android APK (sideload) for Android users · installable **PWA** for iPhone and desktop.
No app-store dependency; premium unlocking is code-based with owner-verified payments.

---

## 📱 Features

| Feature | Access | Description |
|---------|--------|-------------|
| 👶 Child profiles + photos | Free | Multiple children, birth details, private photos |
| 📈 WHO growth charts | Free (basic) / ⭐ Premium (full) | Weight, height **and head circumference** on exact WHO 2006/2007 references, with z-score and percentile interpretation |
| 💉 Immunization schedule + reminders | **Free** | Nepal NIP schedule (BS/AD calendar), 7-day / 2-day / day-of reminders, and overdue catch-up reminders — on Android via OS notifications, on PWA via Web Push |
| 🧠 Developmental milestones | ⭐ Premium | Milestone tracking across motor, language, cognitive, social domains |
| 🧩 M-CHAT autism screening | ⭐ Premium | M-CHAT-R/F screening, Nepali translation |
| 📄 Health report PDF | ⭐ Premium | One consolidated report: WHO charts, z-score/percentile table, growth records, vaccinations |
| 🩺 Clinic summary | Free | Short caregiver-triggered hand-off PDF |
| 🌙 Dark mode + accessibility | Free | Light/dark/system, text scaling, high contrast, voice guidance |
| 🌐 Bilingual | Free | Nepali-first UI with English, persistent language choice |
| ☁️ Cloud sync | Free | Supabase Auth + Postgres + private storage, offline-first with retry |

### Pricing (Nepal)

| Plan | Price | Notes |
|---|---|---|
| 6 Months | **NPR 650** | ≈ NPR 108 / month |
| Yearly | **NPR 850** | ≈ NPR 71 / month — best value |

One-time payment, no auto-charge. Pay by QR (eSewa / Khalti / bank apps) inside the app, submit the transaction ID, and the owner verifies it — the app then activates premium automatically (no code typing).

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────┐
│  Expo / React Native (SDK 57, RN 0.86)       │
│  ┌──────────────┐  ┌───────────────────────┐ │
│  │ Screens (20) │  │ Premium / entitlements│ │
│  └──────────────┘  └───────────────────────┘ │
│  ┌──────────────┐  ┌───────────────────────┐ │
│  │ Supabase SDK │  │ Expo push (native) +  │ │
│  │ Auth/DB/Store│  │ Web Push (PWA/iOS)    │ │
│  └──────────────┘  └───────────────────────┘ │
└──────────────────────────────────────────────┘
        │ HTTPS (PostgREST + Edge Functions)
        ▼
┌──────────────────────────────────────────────┐
│ Supabase: Auth · Postgres (24 tables, RLS)   │
│ · Storage (3 private buckets)                │
│ · Edge Functions: submit-payment,            │
│   approve-payment, my-activation-code,       │
│   admin-payments, aggregate-health-metrics,  │
│   send-vaccine-reminders                     │
└──────────────────────────────────────────────┘
```

### Tech stack

| Layer | Technology |
|---|---|
| Framework | Expo SDK 57 / React Native 0.86.3, TypeScript |
| Auth | Supabase Auth (email/password, Google OAuth, anonymous) |
| Database | Supabase Postgres — RLS on every table, owner-scoped policies |
| Storage | Supabase Storage — `child-photos`, `payment-screenshots`, `pdf-reports` (all private) |
| Charts | Victory Native |
| Navigation | React Navigation (native stack) |
| Native push | `expo-notifications` (OS-scheduled local reminders) |
| Web push | Service worker + VAPID (`send-vaccine-reminders`) |
| Payments | In-app QR + transaction reference → owner review (in-app or web admin) |
| Functions | Supabase Edge Functions (Deno) |
| Web | Expo web export (SPA) + landing page; PWA with offline service worker |

### Removed / not in use

| Package | Reason |
|---|---|
| Firebase Auth / Firestore / Storage | Migrated to Supabase |
| Firebase Analytics / Crashlytics / FCM / Cloud Functions | Removed with the Firebase migration (crash reporting is on the pre-launch checklist) |
| react-native-vision-camera, react-native-fast-tflite, react-native-worklets | Height-measurement feature removed (planned post-launch) |

---

## 🛠️ Getting started

### Prerequisites
- Node.js 20+ and pnpm
- A Supabase project (Auth + Postgres + Storage)
- Optional: EAS CLI for Android builds (`npm i -g eas-cli`)

### Local development

```bash
git clone https://github.com/acdcpc/kapoori-ka.git
cd kapoori-ka
pnpm install
cp .env.example .env        # fill in your Supabase values
npx expo start              # then: 'a' for Android, 'w' for web
```

### Supabase setup
- Enable Email provider (auto-confirm ON for launch — no email round-trip)
- Enable Google OAuth; add redirect URLs for your web origin and `com.kapoori.ka://auth/callback`
- Apply migrations in `supabase/migrations/` (forward-only, timestamped)
- Edge Function secrets: `ALLOWED_ORIGINS`, `AUTOMATION_KEY` (activation-code encryption), `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `REMINDER_CRON_SECRET`
- Reminder cron runs from GitHub Actions (`vaccine-reminders.yml`) using the `REMINDER_CRON_SECRET` repo secret

### Android build (sideload)

```bash
eas login                                   # account: thisisprakashs-team
eas build --profile preview --platform android
```

### Quality gates (run before every push)

```bash
pnpm install --frozen-lockfile             # reproducible install
pnpm exec tsc --noEmit                     # types
pnpm run doctor                            # Expo diagnostics — 21/21 required
pnpm run validate:all                      # release-security + caregiver + HC math
pnpm build:web                             # web/PWA export -> dist/
npx serve -l 4173 dist &                   # serve the exact artifact
BASE_URL=http://localhost:4173 pnpm run test:browser   # Chrome/Firefox/mobile matrix
pnpm audit                                 # see DEPENDENCY_EXCEPTIONS.md
```

The full release state, evidence and verdict live in [RELEASE_REPORT.md](RELEASE_REPORT.md).

---

## 📚 Documentation

| Document | Purpose |
|---|---|
| [OWNER_ACTIONS.md](OWNER_ACTIONS.md) | Owner-only tasks and verified live-backend state |
| [SECURITY_AND_SCALE_AUDIT.md](SECURITY_AND_SCALE_AUDIT.md) | RLS/privacy/scale audit + growth-data verification |
| [DEPENDENCY_EXCEPTIONS.md](DEPENDENCY_EXCEPTIONS.md) | Advisories triaged, patch overrides, accepted exceptions |
| [RELEASE_REPORT.md](RELEASE_REPORT.md) | Release gates, evidence, device gaps and verdict |
| [DARK_MODE_IMPLEMENTATION.md](DARK_MODE_IMPLEMENTATION.md) | Theming architecture and palette roles |
| [WEBSITE_DECISION_RECORD.md](WEBSITE_DECISION_RECORD.md) | Landing-page scope, privacy and route map |
| [todo.md](todo.md) | Running record of completed work |

---

## ⚠️ Clinical safety

Kapoori Ka records information and reminders; it does not diagnose illness and does not replace a health professional. Growth interpretation uses exact WHO standards (2006 standards 0–60 months, 2007 reference 61–216 months) with calm, non-diagnostic caregiver wording; the PDF report keeps clinical terminology for health workers.
