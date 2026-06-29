# Kapoori-Ka: Setup and Testing Guide

**Version:** 1.0.0  
**Status:** Production-Ready  
**Last Updated:** June 26, 2026

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [Installation](#installation)
3. [Firebase Setup](#firebase-setup)
4. [Authentication Setup](#authentication-setup)
5. [Payment Gateway Setup](#payment-gateway-setup)
6. [Testing Guide](#testing-guide)
7. [Local Development](#local-development)
8. [Deployment](#deployment)

---

## Project Structure

```
kapoori-ka-final/
├── src/
│   ├── screens/
│   │   ├── LoginScreen.tsx              # Authentication UI
│   │   ├── PaymentScreen.tsx            # Payment gateway integration
│   │   ├── ConsultationScreen.tsx       # Online consultation booking
│   │   └── ...other screens
│   ├── context/
│   │   ├── AuthContext.tsx              # Auth state management
│   │   └── LanguageContext.ts           # Language preferences
│   ├── hooks/
│   │   └── usePremiumGuard.ts           # Premium feature guards
│   ├── types/
│   │   └── firestore.ts                 # Database schema types
│   └── utils/
├── firebase.ts                          # Firebase configuration
├── firestore-security-rules.txt         # Firestore security rules
├── App.tsx                              # Main app component
├── app.json                             # Expo configuration
├── package.json                         # Dependencies
└── SETUP_AND_TESTING_GUIDE.md          # This file
```

---

## Installation

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Expo CLI: `npm install -g expo-cli`
- Firebase account: https://console.firebase.google.com

### Step 1: Install Dependencies

```bash
cd kapoori-ka-final
npm install --legacy-peer-deps
```

### Step 2: Verify Installation

```bash
npx expo-doctor
```

Expected output: **21/21 checks passed**

---

## Firebase Setup

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create a new project"
3. Enter project name: **kapoori-ka**
4. Enable Google Analytics (optional but recommended)
5. Click "Create project"

### Step 2: Register Web App

1. In Firebase Console, click the Web icon (</> symbol)
2. App nickname: **kapoori-ka-web**
3. Click "Register app"
4. Copy the Firebase configuration
5. Update `firebase.ts`:

```typescript
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### Step 3: Enable Firestore Database

1. Go to Firebase Console → Firestore Database
2. Click "Create database"
3. Select "Start in production mode"
4. Choose region: **asia-south1** (for Nepal)
5. Click "Create database"

### Step 4: Apply Security Rules

1. Go to Firestore → Rules tab
2. Copy the rules from `firestore-security-rules.txt`
3. Paste into the Rules editor
4. Click "Publish"

### Step 5: Enable Authentication

1. Go to Firebase Console → Authentication
2. Click "Get started"
3. Enable these providers:
   - **Google** (for Google Sign-In)
   - **Anonymous** (for free version)

#### For Google Sign-In:

1. Click "Google" provider
2. Enable it
3. Set project support email
4. Click "Save"

#### For Anonymous:

1. Click "Anonymous" provider
2. Enable it
3. Click "Save"

---

## Authentication Setup

### Google Sign-In Configuration

#### For Web:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your Firebase project
3. Go to APIs & Services → Credentials
4. Create OAuth 2.0 Client ID:
   - Application type: **Web application**
   - Authorized redirect URIs:
     - `http://localhost:8081`
     - `http://localhost:19006`
     - Your production domain
5. Copy Client ID and Client Secret

#### For Android:

1. Get your app's SHA-1 fingerprint:
   ```bash
   cd android && ./gradlew signingReport
   ```
2. In Firebase Console → Project Settings → Your apps
3. Add SHA-1 fingerprint to Android app

#### For iOS:

1. In Firebase Console → Project Settings → Your apps
2. Download `GoogleService-Info.plist`
3. Add to Xcode project

### Anonymous Authentication

No additional setup required. It's enabled by default in Firebase.

---

## Payment Gateway Setup

### eSewa Integration

#### Step 1: Create eSewa Merchant Account

1. Visit [eSewa Merchant Portal](https://merchant.esewa.com.np)
2. Register as merchant
3. Complete KYC verification
4. Get merchant code and API credentials

#### Step 2: Test Credentials

For testing, use:
- **Merchant Code:** `EPAYTEST`
- **Test URL:** `https://uat.esewa.com.np/epay/main`
- **Test Mobile:** `9841881234`
- **Test Password:** `123456`

#### Step 3: Integration

In `PaymentScreen.tsx`, update eSewa configuration:

```typescript
const ESEWA_CONFIG = {
  merchantCode: 'YOUR_MERCHANT_CODE',
  successUrl: 'https://yourdomain.com/payment/success',
  failureUrl: 'https://yourdomain.com/payment/failure',
  testMode: true, // Set to false in production
};
```

### Khalti Integration

#### Step 1: Create Khalti Merchant Account

1. Visit [Khalti Merchant Dashboard](https://khalti.com/merchants)
2. Register as merchant
3. Complete verification
4. Get Public Key and Secret Key

#### Step 2: Test Credentials

For testing, use:
- **Public Key:** `test_public_key_xxxxx`
- **Secret Key:** `test_secret_key_xxxxx`
- **Test Phone:** `9841881234`
- **Test OTP:** `123456`

#### Step 3: Integration

In `PaymentScreen.tsx`, update Khalti configuration:

```typescript
const KHALTI_CONFIG = {
  publicKey: 'YOUR_PUBLIC_KEY',
  secretKey: 'YOUR_SECRET_KEY',
  testMode: true, // Set to false in production
};
```

---

## Testing Guide

### Test User Accounts

#### Anonymous User

1. Launch app
2. Click "Anonymous Login"
3. Access free features only
4. Cannot access premium features

#### Google Sign-In User

1. Click "Google Sign-In"
2. Select test Google account
3. Grant permissions
4. Account created in Firestore

### Test Premium Features

#### Upgrade to Premium

1. Sign in as any user
2. Navigate to Payment Screen
3. Select payment method (eSewa or Khalti)
4. Click "Test Payment"
5. Confirm payment
6. Subscription status updated to "active"

#### Access Premium Features

After upgrading:
- Advanced Charts: ✓ Accessible
- Nutrition Tracking: ✓ Accessible
- M-CHAT Screening: ✓ Accessible
- PDF Reports: ✓ Accessible
- Online Consultations: ✓ Accessible (5 free)

### Test Data Preservation

#### Anonymous to Google Upgrade

1. Sign in anonymously
2. Add child profile
3. Add health records
4. Sign out
5. Sign in with Google
6. Verify data is preserved

### Test Firestore Security Rules

#### Verify Access Control

```bash
# Test 1: User can access own data
# Expected: ✓ Success

# Test 2: User cannot access other user's data
# Expected: ✗ Denied

# Test 3: Anonymous user has limited access
# Expected: ✓ Limited access

# Test 4: Premium user can access all features
# Expected: ✓ Full access
```

---

## Local Development

### Run Web Preview

```bash
npm run web
```

Opens: `http://localhost:8081`

### Run Android

```bash
npm run android
```

### Run iOS

```bash
npm run ios
```

### Enable Firestore Emulator (Optional)

For local testing without Firebase:

```typescript
// In firebase.ts, uncomment:
if (__DEV__) {
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
  } catch (error) {
    console.log('Firestore emulator already running');
  }
}
```

Start emulator:

```bash
firebase emulators:start
```

---

## Testing Checklist

### Authentication

- [ ] Anonymous login works
- [ ] Google sign-in works
- [ ] User profile created in Firestore
- [ ] Subscription document created
- [ ] Anonymous user can upgrade to Google
- [ ] Data preserved after upgrade

### Payments

- [ ] eSewa payment flow works
- [ ] Khalti payment flow works
- [ ] Payment status updates in Firestore
- [ ] Subscription activated after payment
- [ ] Consultations counter set to 5

### Premium Features

- [ ] Free users cannot access premium features
- [ ] Premium users can access all features
- [ ] Consultation counter decrements
- [ ] Cannot book more than 5 consultations
- [ ] Upgrade prompt shows for free users

### Firestore

- [ ] Users collection created
- [ ] Child records saved
- [ ] Health records saved
- [ ] Consultations booked
- [ ] Security rules enforced

### UI/UX

- [ ] Bilingual UI works (Nepali/English)
- [ ] Loading states display correctly
- [ ] Error messages show
- [ ] Responsive design on all devices
- [ ] Accessibility features work

---

## Deployment

### Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Firebase security rules deployed
- [ ] Payment gateways configured (production credentials)
- [ ] Google Sign-In configured for production
- [ ] App version bumped in `app.json`
- [ ] Environment variables set for production

### Build for Production

#### Android

```bash
eas build --platform android --profile production
```

#### iOS

```bash
eas build --platform ios --profile production
```

#### Web

```bash
npm run web:build
```

### Submit to Stores

#### Google Play Store

```bash
eas submit --platform android --latest
```

#### Apple App Store

```bash
eas submit --platform ios --latest
```

---

## Troubleshooting

### Firebase Connection Issues

**Problem:** "Firebase configuration not found"

**Solution:**
1. Verify `firebase.ts` has correct credentials
2. Check Firebase project is created
3. Verify API keys are enabled

### Payment Gateway Issues

**Problem:** "Payment gateway not responding"

**Solution:**
1. Verify merchant credentials
2. Check test mode is enabled
3. Verify callback URLs are correct

### Authentication Issues

**Problem:** "Google Sign-In not working"

**Solution:**
1. Verify Google provider is enabled in Firebase
2. Check OAuth credentials
3. Verify redirect URIs are configured

### Firestore Security Rules Issues

**Problem:** "Permission denied" errors

**Solution:**
1. Verify security rules are deployed
2. Check user is authenticated
3. Verify user ID matches rule conditions

---

## Support and Resources

### Documentation

- [Firebase Documentation](https://firebase.google.com/docs)
- [Expo Documentation](https://docs.expo.dev)
- [React Native Documentation](https://reactnative.dev)
- [eSewa API Documentation](https://developer.esewa.com.np)
- [Khalti API Documentation](https://docs.khalti.com)

### Community

- [Firebase Community](https://stackoverflow.com/questions/tagged/firebase)
- [Expo Community](https://forums.expo.dev)
- [React Native Community](https://reactnative.dev/help/overview)

---

## Next Steps

1. **Complete Firebase Setup** - Follow Firebase Setup section
2. **Configure Authentication** - Set up Google Sign-In and Anonymous
3. **Setup Payment Gateways** - Get merchant accounts for eSewa and Khalti
4. **Run Tests** - Follow Testing Guide section
5. **Deploy** - Follow Deployment section

---

**Ready to launch!** 🚀

For questions or issues, refer to the troubleshooting section or contact support.
