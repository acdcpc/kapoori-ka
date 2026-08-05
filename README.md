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
| 👶 Child Profiles | ✅ | Add and manage multiple children with birth details and photos |
| 📈 WHO Growth Charts | ✅ | Weight-for-age and height-for-age charts based on WHO Child Growth Standards |
| 💉 Immunization Schedule | ✅ | Nepal National Immunization Program (NIP) schedule with BS/AD calendar |
| 🧠 Developmental Milestones | ⭐ Premium | 100+ milestones across motor, language, cognitive, and social domains |
| 🧩 M-CHAT Autism Screening | ⭐ Premium | 20-question M-CHAT-R/F screening (validated tool, Nepali translation) |
| 📄 PDF Reports | ⭐ Premium | Export growth reports as PDF documents |
| 🖼️ Photo Upload | ✅ | Camera/gallery profile photo for each child |
| 🔔 Vaccine Reminders | ✅ | Push notifications for upcoming vaccines |
| 🌐 Bilingual (नेपाली / English) | ✅ | Full UI in both languages with BS calendar support |
| ☁️ Cloud Sync | ✅ | Supabase real-time data sync across devices |

> ⭐ = Premium features unlocked via activation code

### Planned Features

| Feature | Status |
|---------|--------|
| 📏 AI Height Measurement | 🔄 Post-launch — previously in beta, removed for stabilizing |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────┐
│     React Native (Expo SDK 56)      │
│  ┌─────────┐  ┌──────────────────┐  │
│  │ Screens │  │  Premium System   │  │
│  │ (12)    │  │  Activation Codes  │  │
│  └─────────┘  └──────────────────┘  │
│  ┌─────────┐  ┌──────────────────┐  │
│  │ Supabase│  │  Firebase         │  │
│  │ Auth    │  │  Analytics, FCM,   │  │
│  │ Postgres│  │  Crashlytics       │  │
│  └─────────┘  └──────────────────┘  │
└─────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native 0.85.3 / Expo SDK 56 |
| Language | TypeScript |
| Auth | **Supabase Auth** (email, anonymous, Google OAuth) |
| Database | **Supabase Postgres** (7 tables, RLS enabled) |
| Storage | **Supabase Storage** (child-photos, pdf-reports) |
| Charts | Victory Native |
| Navigation | React Navigation |
| Analytics | Firebase Analytics |
| Crash Reporting | Firebase Crashlytics |
| Push | Firebase Cloud Messaging (FCM) |
| Functions | Firebase Cloud Functions (redeemCode) |

### Not in Use (Removed)

| Package | Reason Removed |
|---------|---------------|
| Firebase Auth | Migrated to Supabase Auth |
| Firebase Firestore | Migrated to Supabase Postgres |
| Firebase Storage | Migrated to Supabase Storage |
| react-native-vision-camera | Height Measurement removed |
| react-native-fast-tflite | Height Measurement removed |
| react-native-worklets | Height Measurement removed |

---

## 🛠️ Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```env
# App
APP_NAME=कपूरी क (Kapoori Ka)
APP_VERSION=1.0.0
APP_ENV=development

# Supabase (Required)
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=***

# Firebase (Analytics, Crashlytics, FCM)
EXPO_PUBLIC_FIREBASE_API_KEY=***
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_PROJECT.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
EXPO_PUBLIC_FIREBASE_APP_ID=1:XXXX:web:XXXX
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXX

# OAuth Client IDs
EXPO_PUBLIC_FIREBASE_RECAPTCHA_SITE_KEY=YOUR_KEY
EXPO_PUBLIC_FIREBASE_ANDROID_CLIENT_ID=YOUR_ID.apps.googleusercontent.com
EXPO_PUBLIC_FIREBASE_IOS_CLIENT_ID=YOUR_ID.apps.googleusercontent.com
EXPO_PUBLIC_FIREBASE_WEB_CLIENT_ID=YOUR_ID.apps.googleusercontent.com
```

---

## 🛠️ Getting Started

### Prerequisites
- Node.js 18+
- pnpm (recommended) or npm
- Expo CLI (`npx expo`)
- Supabase project ([supabase.com](https://supabase.com))
- Firebase project ([console.firebase.google.com](https://console.firebase.google.com))

### Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/acdcpc/kapoori-ka.git
   cd kapoori-ka
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Set up environment:**
   ```bash
   cp .env.example .env
   # Fill in your Supabase URL, anon key, and Firebase credentials
   ```

4. **Set up Supabase:**
   - Create a new Supabase project
   - Enable Google OAuth provider in Authentication → Providers
   - Add redirect URL: `com.kapoori.ka://auth/callback`
   - Enable anonymous sign-ins
   - Enable email confirmation
   - Run the database migration (create tables with RLS policies)

5. **Start the development server:**
   ```bash
   npx expo start
   ```

6. **Run on Android:**
   ```bash
   npx expo start --android
   ```

### Building for Production

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to Expo
eas login

# Build preview APK (standalone, no Metro needed)
eas build --profile preview --platform android
```

---

## 🔒 Security

- **Row-Level Security (RLS)** enabled on all Supabase tables — users can only access their own data
- **Email confirmation** required for all new accounts
- **HTTPS/TLS** for all data transmission
- **Session tokens** stored in `expo-secure-store` (Android Keystore encrypted)
- **Google OAuth** with exact redirect URI (no wildcards)
- **Supabase Anon Key** is intentionally public-facing but protected by RLS
- **All secrets** excluded from git history via `.gitignore`

---

## ⚠️ Known Limitations

| Limitation | Mitigation |
|-----------|------------|
| Supabase free tier auto-pauses after 7 days of inactivity | Daily ping workflow (`.github/workflows/supabase-ping.yml`) at 03:00 UTC |
| Height Measurement feature not available | Planned for post-launch reimplementation |
| Firebase Auth/firebase.ts still present for analytics init | Fully migrated to Supabase for auth; Firebase used only for Analytics/Crashlytics/FCM |

---

## 📄 License

MIT — See [LICENSE](LICENSE) for details.

---

## 📧 Contact

- **Developer:** Prakash Thapa
- **Email:** kapoori.ka@gmail.com
- **GitHub:** [acdcpc/kapoori-ka](https://github.com/acdcpc/kapoori-ka)
