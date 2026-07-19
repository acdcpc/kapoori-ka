# 🍼 कपूरी क (Kapoori Ka)

> **AI-powered child growth tracking — offline first, bilingual, made for Nepali parents.**

Kapoori Ka is a React Native (Expo) app that helps parents track their child's growth, vaccinations, nutrition, and developmental milestones. The standout feature is **camera-based height measurement** using on-device AI — no internet, no subscriptions required for core features.

<p align="center">
  <img src="assets/icon.png" alt="Kapoori Ka icon" width="120"/>
</p>

---

## ✨ Features

### 📏 AI Height Measurement (Offline)
Place your child in front of the camera and get an instant height estimate. Runs entirely on-device using **Google BlazePose GHUM** pose estimation — no cloud, no delay.

**Two-stage pipeline:**
1. **Detector** (`blazepose_detector_fp16.tflite`) — finds the person in frame
2. **Landmark** (`blazepose_landmark_lite_fp16.tflite`) — extracts 39 GHUM body keypoints

Multi-signal confidence scoring: detector confidence × landmark visibility × body completeness × camera angle × temporal stability.

> ⚠️ Height measurement requires a physical device with a camera (Android/iOS). Not available on web.

### 📊 Growth Charts
WHO/CDC percentile curves for height, weight, and head circumference. Visualize your child's growth trajectory over time.

### 💉 Immunization Tracker
Nepal's national vaccine schedule built-in. Automatic 7-day reminders, B.S. (Bikram Sambat) date support, custom date picker with both Nepali and English calendars.

### 🧠 M-CHAT Screening
Standardized M-CHAT autism screening questionnaire with bilingual interface and PDF report export.

### 🎯 Milestone Tracking
Track developmental milestones by age group. Mark achievements, add notes and photos.

### 🍎 Nutrition Guide
Age-appropriate Nepali food recommendations and feeding schedules (*premium feature*).

### 🔐 Authentication & Data
- Email/password + Google Sign-In (Firebase Auth)
- Firestore database with per-user security rules
- Premium gating with subscription management

### 🌐 Bilingual (Nepali / English)
Full UI translation — toggle between Nepali and English anytime.

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native 0.85 + Expo SDK 56 |
| Language | TypeScript 6.0 |
| Auth | Firebase Authentication |
| Database | Cloud Firestore |
| Pose AI | BlazePose GHUM (39-keypoint), TensorFlow Lite |
| Camera | react-native-vision-camera v4 + Frame Processors |
| Build | EAS Build (Expo Application Services) |
| Notifications | expo-notifications (device push) |
| Payments | In-app subscriptions (NPR 100/month, NPR 500/year) |
| Charts | Victory Native |
| Dates | dayjs + nepali-date-converter |

---

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 18
- pnpm
- EAS CLI (`npm i -g eas-cli`)
- Expo account (for EAS Build)
- Firebase project (for Auth + Firestore)

### Setup

```bash
git clone https://github.com/acdcpc/kapoori-ka.git
cd kapoori-ka

# Install dependencies
pnpm install

# Create .env file with your Firebase config
cp .env.example .env
# Edit .env with your Firebase project values

# Start dev server
pnpm start
```

### Environment Variables

Create a `.env` file with:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
EXPO_PUBLIC_FIREBASE_APP_ID=your-app-id
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id
EXPO_PUBLIC_FIREBASE_ANDROID_CLIENT_ID=your-android-client-id
EXPO_PUBLIC_FIREBASE_IOS_CLIENT_ID=your-ios-client-id
EXPO_PUBLIC_FIREBASE_WEB_CLIENT_ID=your-web-client-id
EXPO_PUBLIC_FIREBASE_GOOGLE_CLIENT_ID=your-google-client-id
APP_NAME="कपूरी क (Kapoori Ka)"
APP_VERSION=1.0.0
```

### Build APK

```bash
eas build --platform android --profile preview
```

The APK is built with `com.kapoori.ka` package name using EAS Build's `preview` profile.

### Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

---

## 📁 Project Structure

```
src/
├── screens/
│   ├── HomeScreen.tsx              # Dashboard with child cards
│   ├── ChildDashboard.tsx          # Per-child stats & menu
│   ├── HeightMeasureScreen.tsx     # AI camera height measurement
│   ├── HeightMeasureScreen.web.tsx # Web placeholder (camera unavailable)
│   ├── GrowthChartScreen.tsx       # WHO percentile charts
│   ├── ImmunizationScreen.tsx      # Vaccine tracker + reminders
│   ├── MChatScreen.tsx             # M-CHAT screening
│   ├── MilestoneScreen.tsx         # Developmental milestones
│   ├── NutritionScreen.tsx         # Food guides & schedules
│   ├── PDFReportScreen.tsx         # Shareable PDF reports
│   ├── LoginScreen.tsx             # Auth with email + Google
│   ├── AddChildScreen.tsx          # Register a child
│   ├── SubscriptionScreen.tsx      # Premium plan management
│   ├── PaymentScreen.tsx           # Payment processing
│   ├── ConsultationScreen.tsx      # Doctor consultation
│   └── AboutScreen.tsx             # App info & credits
├── ai/
│   ├── PoseTypes.ts                # 39-keypoint GHUM types + constants
│   ├── BlazePoseEngine.ts          # Two-stage detector→landmark parsing
│   └── heightEstimator.ts          # Tilt, distance, smoothing, confidence
├── context/
│   ├── AuthContext.tsx              # Firebase auth state
│   └── LanguageContext.ts           # Bilingual (en/ne) context
└── hooks/
    └── usePoseDetector.ts           # Frame processor → React bridge

assets/
└── models/
    ├── blazepose_lite_fp16.task           # MediaPipe Tasks bundle (both models)
    ├── blazepose_detector_fp16.tflite     # Stage 1: person detector
    ├── blazepose_landmark_lite_fp16.tflite# Stage 2: 39-keypoint landmark
    └── blazepose_lite_int8.tflite         # Detector only (int8 quantized)

firestore.rules    # Firestore security rules
metro.config.js    # Metro bundler config (+tflite asset support)
```

---

## 🔧 Key Configuration

### Metro Config (`metro.config.js`)
The `.tflite` model files are bundled as assets. Metro requires explicit config:

```js
config.resolver.assetExts.push('tflite');
```

### Web Support
Height measurement uses `vision-camera-resize-plugin` and `react-native-fast-tflite`, which are **native-only**. The web build uses a platform-specific stub (`HeightMeasureScreen.web.tsx`) that shows a "Mobile Only" placeholder without importing any native modules.

### B.S. Date Support
All date inputs support Bikram Sambat (Nepali calendar) via `nepali-date-converter`. The immunization screen lets parents toggle between B.S. and A.D. calendars.

---

## 📋 Security

- Firebase Authentication for all data access
- Firestore security rules enforce per-user document ownership
- `allow read` split into `allow get` + `allow list` per Firestore best practices
- No API keys in source code — all Firebase config via environment variables

---

## 🔒 Premium Gating

| Feature | Free | Premium |
|---|---|---|
| Height measurement | ✅ | ✅ |
| Growth charts | ✅ | ✅ |
| Basic milestone tracking | ✅ | ✅ |
| M-CHAT screening | ✅ | ✅ |
| Immunization tracker | ⚠️ Limited | ✅ |
| Nutrition guide | ❌ | ✅ |
| PDF reports | ❌ | ✅ |
| Auto vaccine reminders | ❌ | ✅ |

Pricing: **NPR 100/month** or **NPR 500/year**

---

## 🐛 Known Issues

- **Google Sign-In**: Requires manual configuration of OAuth redirect URIs in Google Cloud Console and SHA-1 fingerprint in Firebase Android app. Login with email/password works without extra setup.
- **Height measurement accuracy**: Still being validated. Camera distance estimation uses a fixed focal length — real-world testing with actual subjects is ongoing.
- **Web**: Camera-based features are unavailable. The web build shows a placeholder.

---

## 🛠 Development Notes

### Model Pipeline
The AI pipeline uses two separate TFLite models extracted from MediaPipe's `.task` bundle. If you need to update the models:

1. Place the new `.task` file in `assets/models/`
2. Extract individual models using `mediapipe-py` or the FlatBuffers tools
3. Update model paths in `src/screens/HeightMeasureScreen.tsx`
4. Verify input/output tensor shapes match what `BlazePoseEngine.ts` expects

### Running Checks
```bash
# Type check
npx tsc --noEmit

# Expo doctor
npx expo-doctor

# Lint (if configured)
npx eslint .
```

---

## 📄 License

MIT

---

Built with ❤️ for Nepali families. 🏔️
