# कपूरी क (Kapoori Ka)

> **Your Child's Digital Health Book** — A bilingual (Nepali / English) mobile app for tracking child health in Nepal.

[![Expo](https://img.shields.io/badge/Expo-SDK%2056-000020?logo=expo)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-0.85-61DAFB?logo=react)](https://reactnative.dev)
[![Supabase](https://img.shields.io/badge/Supabase-Auth_%2B_Data-3ECF8E?logo=supabase)](https://supabase.com)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 🚀 Live Build

| Platform | Status | Link |
|----------|--------|------|
| Android (Preview APK) | ✅ Active | [Expo Builds](https://expo.dev/accounts/thisisprakashthapa/projects/kapoori-ka) |

---

## 📱 Features

| Feature | Status | Description |
|---------|--------|-------------|
| 👶 Child Profiles | ✅ | Add and manage multiple children with birth details |
| 📈 WHO Growth Charts | ✅ | Height-for-age (WHO HFA table, interpolated) with z-scores |
| 💉 Immunization | ✅ | Nepal vaccine schedule with Bikram Sambat dates |
| 🧠 Developmental Milestones | ⭐ Premium | 100+ WHO milestones across 5 domains |
| 🧩 M-CHAT Autism Screening | ⭐ Premium | 20-question M-CHAT-R/F screening |
| 🥗 Nutrition Guide | ⭐ Premium | Age-specific feeding guides (0–60 months) |
| 📏 AI Height Measurement | 🔄 Beta | On-device BlazePose (39 landmarks) |
| 📄 PDF Reports | ⭐ Premium | Export growth reports as PDF |
| 🔔 Vaccine Reminders | ✅ | Push notifications at 7-day, 2-day, and day-of |
| 🌐 Bilingual (नेपाली / English) | ✅ | Full Nepali and English UI |
| ☁️ Cloud Sync | ✅ | Supabase real-time data sync |

> ⭐ = Premium features unlocked via activation code

---

## 🏗️ Architecture

```
┌─────────────────────────────────────┐
│     React Native (Expo SDK 56)      │
│  ┌─────────┐  ┌──────────────────┐  │
│  │  Screens│  │  AI / ML Pipeline │  │
│  │ (15)    │  │  BlazePose TFLite │  │
│  └─────────┘  └──────────────────┘  │
│  ┌─────────┐  ┌──────────────────┐  │
│  │ Supabase│  │  Premium System   │  │
│  │ Auth    │  │  Activation Codes │  │
│  │ Postgres│  └──────────────────┘  │
│  └─────────┘                        │
│  ┌─────────┐                        │
│  │ Firebase│ ← Analytics, Crashlytics,  │
│  │ FCM     │     Push, Cloud Functions │
│  └─────────┘                        │
└─────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native 0.85.3 / Expo SDK 56 |
| Language | TypeScript |
| Auth | Supabase Auth (email, anonymous, Google OAuth) |
| Database | Supabase Postgres (7 tables, RLS) |
| Storage | Supabase Storage (child-photos, pdf-reports) |
| ML | TensorFlow Lite (BlazePose, on-device) |
| Camera | react-native-vision-camera |
| Charts | Victory Native |
| Navigation | React Navigation |
| Analytics | Firebase Analytics |
| Push | Firebase Cloud Messaging |
| Functions | Firebase Cloud Functions (redeemCode) |

---

## 🛠️ Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **pnpm** (package manager)
- **EAS CLI** (`npm install -g eas-cli`)
- **Expo account** — [expo.dev](https://expo.dev)
- **Supabase project** — free tier works

### 1. Clone & Install

```bash
git clone https://github.com/acdcpc/kapoori-ka.git
cd kapoori-ka
pnpm install
```

### 2. Environment Setup

Copy the env template and fill in your credentials:

```bash
cp .env.example .env
```

Required env vars:

```bash
# Supabase (Auth + Data + Storage)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Firebase (Analytics + Crashlytics + FCM + Cloud Functions only)
EXPO_PUBLIC_FIREBASE_API_KEY=***
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=***
EXPO_PUBLIC_FIREBASE_APP_ID=***
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=***
```

For EAS builds, push secrets via:
```bash
eas env:push --environment preview
```

### 3. Supabase Setup

Create a Supabase project, then in the **SQL Editor** run the full schema SQL. See [`SUPABASE_SCHEMA.md`](./SUPABASE_SCHEMA.md) for the complete DDL.

In the **Dashboard** → Authentication → Settings:
- Turn OFF "Confirm email" 
- Turn ON "Allow anonymous sign-ins"

In **Dashboard** → Authentication → Providers → Google:
- Enable Google provider
- Add redirect URL: `com.kapoori.ka://auth/callback`

### 4. Build Preview APK

```bash
eas build --platform android --profile preview
```

---

## 📂 Project Structure

```
kapoori-ka/
├── App.tsx                    # Root: AuthProvider + Navigation
├── firebase.ts                # Firebase init (Analytics/Crashlytics/FCM)
├── app.config.js              # Expo config
├── src/
│   ├── lib/
│   │   └── supabase.ts        # Supabase client (Auth + Data + Storage)
│   ├── screens/               # 15 screen components
│   │   ├── HomeScreen.tsx     # Child list + onboarding
│   │   ├── ChildDashboard.tsx # Per-child health dashboard
│   │   ├── AddChildScreen.tsx # Add/edit child profiles
│   │   ├── HeightMeasureScreen.tsx   # AI height (BlazePose)
│   │   ├── GrowthChartScreen.tsx     # WHO growth charts
│   │   ├── ImmunizationScreen.tsx    # Vaccine tracking
│   │   ├── MilestoneScreen.tsx       # Development milestones
│   │   ├── MChatScreen.tsx           # M-CHAT autism screening
│   │   ├── NutritionScreen.tsx       # Feeding guides
│   │   ├── PDFReportScreen.tsx       # PDF export
│   │   ├── LoginScreen.tsx           # Auth screen
│   │   └── ...
│   ├── ai/                    # ML pipeline
│   │   ├── PoseTypes.ts       # 39-landmark types
│   │   ├── BlazePoseEngine.ts # TFLite parsing
│   │   └── heightEstimator.ts # Height calc + smoothing
│   ├── components/            # Shared UI (PremiumGuard, InfoBubble, Onboarding)
│   ├── context/               # AuthContext (Supabase), LanguageContext
│   ├── types/                 # TypeScript definitions
│   ├── data/                  # WHO tables, milestones, vaccines
│   └── utils/                 # Calculations, notifications, etc.
├── functions/                 # Firebase Cloud Functions (redeemCode)
├── assets/models/             # TFLite models (BlazePose)
├── .github/workflows/         # CI (daily Supabase ping)
└── scripts/                   # Dev helper scripts
```

---

## 🤖 AI Height Measurement

Two-stage BlazePose pipeline running entirely on-device:

1. **Detector** (224×224) → finds the person in frame
2. **Landmarker** (256×256, stride=5) → 39 body landmarks
3. **Height Estimator** → nose-to-ankle pixels × real-world scale
4. **EMA Smoothing** → median filter + jitter tracking
5. **Lock** → 16 consecutive confident frames → measurement

> **Model files:** `assets/models/blazepose_detector_fp16.tflite` + `blazepose_landmark_lite_fp16.tflite`

See [`HEIGHT_MEASURE_SETUP.md`](./HEIGHT_MEASURE_SETUP.md) and [`PROJECT_HANDOVER.md`](./PROJECT_HANDOVER.md).

---

## 🔐 Security

- ✅ Supabase Auth with AsyncStorage persistence
- ✅ Postgres Row-Level Security (RLS) on all 7 tables
- ✅ Google OAuth via Supabase provider
- ✅ Anonymous/guest access with RLS-gated read/write
- ✅ No hardcoded secrets (all env-based, gitignored)

---

## 🧪 Testing

```bash
# TypeScript
npx tsc --noEmit

# AI engine tests
node src/ai/__tests__/run_parse_tests.mjs

# Android debugging
adb logcat -v threadtime | grep -E "AndroidRuntime|FATAL"
```

---

## 📝 Documentation

| File | Purpose |
|------|---------|
| [`PROJECT_HANDOVER.md`](./PROJECT_HANDOVER.md) | Complete handover (bugs, decisions, TODO) |
| [`SUPABASE_SCHEMA.md`](./SUPABASE_SCHEMA.md) | Database schema + RLS policies |
| [`HEIGHT_MEASURE_SETUP.md`](./HEIGHT_MEASURE_SETUP.md) | AI height measurement setup |
| [`PRODUCTION_DEPLOYMENT_GUIDE.md`](./PRODUCTION_DEPLOYMENT_GUIDE.md) | Play Store / App Store checklist |

---

## 🚢 Deployment

| Checklist | Status |
|-----------|--------|
| Supabase RLS + GRANT policies | ✅ |
| Supabase daily ping (anti-pause) | ✅ |
| Google Sign-In (APK) | 🔄 Testing |
| Privacy policy URL | ⏳ Pending |
| Play Store screenshots | ⏳ Pending |

---

## 🙏 Acknowledgments

- **WHO** — Growth reference standards
- **CDC** — M-CHAT-R/F autism screening
- **Nepal Government** — National immunization schedule
- **Google MediaPipe** — BlazePose models

---

> **Made with ❤️ for Nepali parents everywhere.**
