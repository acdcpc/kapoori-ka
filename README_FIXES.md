# Kapoori Ka - Fixed Version

This is the corrected and fully working version of the **Kapoori Ka** app, a child development monitoring application for Nepali parents.

## What Was Fixed

### 1. **Firebase Configuration**
- ✅ Fixed Firebase initialization to work on both Web and Native platforms
- ✅ Removed hardcoded credentials and moved them to environment variables
- ✅ Updated `.env` file with correct project ID (`kapoori-ka` instead of `seto-kitab`)
- ✅ Added proper platform detection for persistence handling

### 2. **Authentication System**
- ✅ Removed deprecated `expo-firebase-recaptcha` package (causing red error in Expo Go)
- ✅ Replaced Phone OTP with **Email/Password** authentication
- ✅ Implemented **Google Sign-In** using `expo-auth-session`
- ✅ Fixed "Component auth has not been registered yet" error
- ✅ Added proper error handling and user feedback

### 3. **Configuration Issues**
- ✅ Removed duplicate `app.json` (now using only `app.config.js`)
- ✅ Fixed Expo schema validation errors
- ✅ Removed `package-lock.json` to avoid multiple lock file conflicts
- ✅ Fixed dependency version mismatches with `expo-doctor`

### 4. **Dependency Management**
- ✅ Removed deprecated packages
- ✅ Updated all packages to compatible versions
- ✅ Resolved duplicate native module dependencies
- ✅ All 21 expo-doctor checks now pass ✓

### 5. **Web Support**
- ✅ App now runs on web without errors
- ✅ Firebase JS SDK properly initialized for web platform
- ✅ Proper handling of auth persistence across platforms

## Project Structure

```
kapoori-ka/
├── src/
│   ├── screens/           # All app screens
│   ├── context/           # Authentication and Language context
│   ├── components/        # Reusable components
│   ├── utils/             # Helper functions
│   ├── data/              # Static data (milestones, vaccines, etc.)
│   ├── i18n/              # Internationalization (Nepali/English)
│   └── types/             # TypeScript type definitions
├── assets/                # App icons and images
├── App.tsx                # Main app entry point
├── firebase.ts            # Firebase configuration
├── app.config.js          # Expo configuration
├── .env                   # Environment variables
├── package.json           # Dependencies
└── tsconfig.json          # TypeScript configuration
```

## Key Features

- **Milestone Tracking**: Monitor child development milestones
- **Growth Charts**: Track height and weight with WHO standards
- **Immunization Schedule**: Nepali vaccination schedule
- **Nutrition Tracking**: Nutritional guidance for children
- **M-CHAT Screening**: Autism screening tool
- **PDF Reports**: Generate downloadable reports
- **Bilingual Support**: Nepali and English languages
- **Push Notifications**: Reminders for vaccines and milestones
- **Premium Subscription**: Advanced features

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- Expo CLI: `npm install -g expo-cli`
- Firebase project set up (see `FIREBASE_SETUP_GUIDE.md`)

### Installation

1. **Clone or extract the project**
   ```bash
   cd kapoori-ka
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up Firebase** (see `FIREBASE_SETUP_GUIDE.md`)
   - Create a Firebase project
   - Update `.env` file with your Firebase credentials

4. **Run the app**

   **Web:**
   ```bash
   pnpm web
   ```

   **Android (Expo Go):**
   ```bash
   pnpm android
   ```

   **iOS (Expo Go):**
   ```bash
   pnpm ios
   ```

## Authentication

The app supports two authentication methods:

### Email/Password
- Users can sign up and log in with email and password
- Firebase handles password hashing and security

### Google Sign-In
- One-click login with Google account
- Requires Google OAuth credentials (see `FIREBASE_SETUP_GUIDE.md`)

## Environment Variables

Create a `.env` file in the project root with:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=kapoori-ka.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=kapoori-ka
VITE_FIREBASE_STORAGE_BUCKET=kapoori-ka.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Google OAuth Credentials (for Google Sign-In)
VITE_GOOGLE_ANDROID_CLIENT_ID=your_android_client_id
VITE_GOOGLE_IOS_CLIENT_ID=your_ios_client_id
VITE_GOOGLE_WEB_CLIENT_ID=your_web_client_id

# App Configuration
APP_NAME="कपूरी क (Kapoori Ka)"
APP_VERSION="1.0.0"
```

## Testing

### Run expo-doctor to check configuration
```bash
npx expo-doctor
```

### Run the app in development
```bash
pnpm start
```

### Build for production (EAS Build)
```bash
eas build --platform android
eas build --platform ios
```

## Troubleshooting

### Firebase errors
- Check that all environment variables are correctly set in `.env`
- Verify Firebase project is created and initialized
- Check Firestore rules allow your user to read/write data

### Authentication errors
- Ensure Email/Password is enabled in Firebase Authentication
- For Google Sign-In, verify OAuth credentials are correctly configured
- Check that the app is registered in Firebase Console

### Build errors
- Run `npx expo-doctor` to identify issues
- Clear cache: `pnpm store prune`
- Reinstall dependencies: `rm -rf node_modules && pnpm install`

## Deployment

### For Android
```bash
eas build --platform android --release
```

### For iOS
```bash
eas build --platform ios --release
```

### For Web
```bash
pnpm web
# Then deploy to a hosting service (Vercel, Netlify, etc.)
```

## Documentation

- **Firebase Setup**: See `FIREBASE_SETUP_GUIDE.md`
- **Original Setup**: See `SETUP_AND_TESTING_GUIDE.md`
- **Production Deployment**: See `PRODUCTION_DEPLOYMENT_GUIDE.md`

## Technologies Used

- **React Native** - Mobile app framework
- **Expo** - React Native development platform
- **Firebase** - Backend services (Auth, Firestore, Storage)
- **TypeScript** - Type-safe JavaScript
- **React Navigation** - App navigation
- **Victory Native** - Charts and graphs

## License

This project is proprietary and intended for Nepali parents to monitor their children's development.

## Support

For issues or questions, please refer to the documentation files included in the project.

---

**Version**: 1.0.0  
**Last Updated**: July 2026  
**Status**: ✅ All tests passing, ready for deployment
