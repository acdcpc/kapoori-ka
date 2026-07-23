# कपूरी क (Kapoori Ka)

> **Your Child's Digital Health Book** — A bilingual (Nepali / English) mobile app for tracking child health in Nepal.

[![Expo](https://img.shields.io/badge/Expo-SDK%2056-000020?logo=expo)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-0.85-61DAFB?logo=react)](https://reactnative.dev)
[![Firebase](https://img.shields.io/badge/Firebase-Cloud%20Functions-orange?logo=firebase)](https://firebase.google.com)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 🚀 Live Build

| Platform | Status | Link |
|----------|--------|------|
| Android (Preview APK) | ✅ Latest build submitted | [Expo Builds](https://expo.dev/accounts/thisisprakash/projects/kapoori-ka) |

---

## 📱 Features

| Feature | Status | Description |
|---------|--------|-------------|
| 👶 Child Profiles | ✅ | Add and manage multiple children with birth details |
| 📈 WHO Growth Charts | ✅ | Height-for-age, weight-for-age with z-scores |
| 💉 Immunization | ✅ | Nepal national vaccine schedule with Bikram Sambat dates |
| 🧠 Developmental Milestones | ⭐ Premium | 100+ WHO milestones across 5 domains |
| 🧩 M-CHAT Autism Screening | ⭐ Premium | 20-question M-CHAT-R/F screening |
| 🥗 Nutrition Guide | ⭐ Premium | Age-specific feeding guides (0–60 months) |
| 📏 AI Height Measurement | 🔄 Beta | On-device BlazePose pose estimation |
| 📄 PDF Reports | ⭐ Premium | Export growth reports as PDF |
| 🔔 Vaccine Reminders | ✅ | Push notifications at 7-day, 2-day, and day-of |
| 🌐 Bilingual (नेपाली / English) | ✅ | Full Nepali and English UI |
| ☁️ Offline + Cloud Sync | ✅ | Works offline, syncs with Firebase when online |

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
│  │ Firebase│  │  Premium System   │  │
│  │ Auth    │  │  Activation Codes │  │
│  │ Firestore  │  └──────────────────┘  │
│  └─────────┘  └──────────────────┘  │
└─────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React Native | 0.85.3 |
| Build | Expo SDK | ~56.0.16 |
| Language | TypeScript | ~6.0.3 |
| Auth | Firebase Auth | ^10.11.1 |
| Database | Cloud Firestore | ^10.11.1 |
| ML | TensorFlow Lite | On-device via react-native-fast-tflite |
| Camera | react-native-vision-camera | ^4.7.3 |
| Charts | Victory Native | ^36.9.1 |
| Navigation | React Navigation | ^6.1.18 |
| Push | expo-notifications | ~56.0.21 |

---

## 🖼️ Screenshots

<!-- Add screenshots here -->
*Screenshots coming soon — add them to `./screenshots/`*

---

## 🛠️ Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **pnpm** (package manager)
- **Firebase CLI** (`npm install -g firebase-tools`)
- **EAS CLI** (`npm install -g eas-cli`)
- **Expo account** — [expo.dev](https://expo.dev)

### 1. Clone & Install

```bash
git clone https://github.com/acdcpc/kapoori-ka.git
cd kapoori-ka
pnpm install
```

### 2. Environment Setup

Copy the env template and fill in your Firebase credentials:

```bash
cp .env.example .env
```

Then set all `EXPO_PUBLIC_FIREBASE_*` variables. See [`ENV_TEMPLATE.md`](./ENV_TEMPLATE.md) for details.

### 3. Firebase Setup

```bash
firebase login
firebase use --add  # select your Firebase project
firebase deploy --only firestore:rules
firebase deploy --only functions
```

> See [`FIREBASE_SETUP_GUIDE.md`](./FIREBASE_SETUP_GUIDE.md) for full setup.

### 4. Build for Development

```bash
# Create a dev client (first time only)
eas build --profile development --platform android

# Or run in Expo Go
npx expo start
```

### 5. Build Preview APK

```bash
# Clean prebuild + EAS build
npx expo prebuild --clean --platform android
eas build --platform android --profile preview
```

> For EAS builds, secrets must also be set via `eas secret:create` or `bash scripts/push_eas_secrets.sh`.

---

## 📂 Project Structure

```
kapoori-ka/
├── App.tsx                    # Root: AuthProvider + Navigation
├── firebase.ts                # Firebase init (platform-aware)
├── app.config.js              # Expo config
├── src/
│   ├── screens/               # 15 screen components
│   │   ├── HomeScreen.tsx
│   │   ├── ChildDashboard.tsx
│   │   ├── HeightMeasureScreen.tsx   # AI height (658 lines)
│   │   ├── GrowthChartScreen.tsx
│   │   ├── ImmunizationScreen.tsx
│   │   ├── MilestoneScreen.tsx
│   │   ├── MChatScreen.tsx
│   │   ├── NutritionScreen.tsx
│   │   └── ...
│   ├── ai/                    # ML pipeline
│   │   ├── PoseTypes.ts       # 39-landmark types
│   │   ├── BlazePoseEngine.ts # TFLite parsing
│   │   └── heightEstimator.ts # Height calc + smoothing
│   ├── components/            # Shared UI (PremiumGuard, etc.)
│   ├── context/               # AuthContext, LanguageContext
│   ├── hooks/                 # Custom hooks
│   ├── types/                 # TypeScript definitions
│   ├── data/                  # WHO tables, milestones, vaccines
│   └── utils/                 # Calculations, notifications, etc.
├── functions/                 # Firebase Cloud Functions
│   └── src/index.js           # 5 functions (280 lines)
├── public/                    # Firebase Hosting
│   ├── payment.html           # Payment landing page
│   └── admin/index.html       # Admin dashboard
├── assets/models/             # TFLite models (BlazePose)
└── scripts/                   # Dev helper scripts
```

---

## 🤖 AI Height Measurement

Kapoori Ka uses a **two-stage BlazePose pipeline** running entirely on-device:

1. **Detector** (224×224) → finds the person in frame
2. **Landmarker** (256×256) → estimates 39 body landmarks
3. **Height Estimator** → nose-to-ankle pixels × real-world scale
4. **EMA Smoothing** → median filter + jitter tracking for stable readings
5. **Lock** → 16 consecutive confident frames → measurement captured

> **Model files:** `assets/models/blazepose_detector_fp16.tflite` + `blazepose_landmark_lite_fp16.tflite`

See [`HEIGHT_MEASURE_SETUP.md`](./HEIGHT_MEASURE_SETUP.md) and [`PROJECT_HANDOVER.md`](./PROJECT_HANDOVER.md) §5 for the full deep dive.

---

## 🔐 Security

- ✅ Firebase Auth with AsyncStorage persistence
- ✅ Firestore owner-based security rules
- ✅ Admin custom claims for Cloud Functions
- ✅ Users cannot self-upgrade subscriptions
- ✅ No hardcoded secrets (all env-based, gitignored)
- ⚠️ Rate limiting recommended for activation code redemption

---

## 📝 Documentation

| File | Purpose |
|------|---------|
| [`PROJECT_HANDOVER.md`](./PROJECT_HANDOVER.md) | Complete project handover (bugs, decisions, TODO) |
| [`FIREBASE_SETUP_GUIDE.md`](./FIREBASE_SETUP_GUIDE.md) | Firebase project setup |
| [`SETUP_AND_TESTING_GUIDE.md`](./SETUP_AND_TESTING_GUIDE.md) | Comprehensive dev setup |
| [`PRODUCTION_DEPLOYMENT_GUIDE.md`](./PRODUCTION_DEPLOYMENT_GUIDE.md) | Play Store / App Store checklist |
| [`HEIGHT_MEASURE_SETUP.md`](./HEIGHT_MEASURE_SETUP.md) | AI height measurement setup |
| [`CHANGES_SUMMARY.md`](./CHANGES_SUMMARY.md) | Auth & bug fix history |

---

## 🧪 Testing

```bash
# TypeScript
npx tsc --noEmit

# AI engine tests
node src/ai/__tests__/run_parse_tests.mjs

# Android debugging
adb logcat -v threadtime | grep -E "AndroidRuntime|HEIGHT|crash|FATAL"
```

---

## 🚢 Deployment

| Checklist | Status |
|-----------|--------|
| Critical bugs fixed | 🔄 In progress (height measure) |
| Google Sign-In verified on APK | ⏳ Pending |
| SHA-1 fingerprints in Firebase | ⏳ Pending |
| Privacy policy URL | ⏳ Pending |
| Play Store screenshots | ⏳ Pending |
| Production keystore | ✅ Expo remote |

> Full checklist: [`PRODUCTION_DEPLOYMENT_GUIDE.md`](./PRODUCTION_DEPLOYMENT_GUIDE.md)

---

## 🤝 Contributing

This project is currently maintained by a small team. For major changes, please open an issue first to discuss what you would like to change.

---

## 📄 License

[MIT](LICENSE)

---

## 🙏 Acknowledgments

- **WHO** — Growth reference standards
- **CDC** — M-CHAT-R/F autism screening tool
- **Nepal Government** — National immunization schedule
- **Google MediaPipe** — BlazePose models

---

> **Made with ❤️ for Nepali parents everywhere.**
