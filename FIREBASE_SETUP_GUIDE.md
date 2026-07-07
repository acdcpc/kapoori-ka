# Firebase Setup Guide for Kapoori Ka

This guide will help you set up your Firebase project for the **Kapoori Ka** app.

## Prerequisites

- A Google account
- Access to [Firebase Console](https://console.firebase.google.com/)
- Your app's package name: `com.kapoorika.app`

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Create a project"** or **"Add project"**
3. Enter the project name: `kapoori-ka`
4. Click **"Continue"**
5. Disable Google Analytics (optional) and click **"Create project"**
6. Wait for the project to be created

## Step 2: Register Your Web App

1. In the Firebase Console, click the **Web** icon (`</>`)`
2. Enter the app nickname: `Kapoori Ka Web`
3. Check the box for **"Also set up Firebase Hosting for this app"** (optional)
4. Click **"Register app"**
5. Copy the Firebase config (you'll see it on the next screen)
6. Click **"Continue to console"**

## Step 3: Register Your Android App

1. In the Firebase Console, go to **Project Settings** (gear icon)
2. Click **"Your apps"** tab
3. Click **"Add app"** and select **Android**
4. Fill in the following:
   - **Package name**: `com.kapoorika.app`
   - **App nickname**: `Kapoori Ka Android`
   - **SHA-1 certificate fingerprint**: (See Step 4 below)
5. Click **"Register app"**
6. Download the `google-services.json` file (you won't need it for Expo, but keep it for reference)

## Step 4: Get Your SHA-1 Certificate Fingerprint (Android)

For Expo projects, you can get the certificate fingerprint using:

```bash
eas credentials
```

Or use the Expo CLI:

```bash
expo fetch:android:keystore
```

If you're building with EAS Build, the SHA-1 will be automatically configured.

## Step 5: Register Your iOS App

1. In the Firebase Console, click **"Add app"** and select **iOS**
2. Fill in the following:
   - **Bundle ID**: `com.kapoorika.app`
   - **App nickname**: `Kapoori Ka iOS`
   - **App Store ID**: (Leave blank for now)
3. Click **"Register app"**
4. Download the `GoogleService-Info.plist` file (optional for Expo)

## Step 6: Enable Authentication Methods

1. In the Firebase Console, go to **Authentication** > **Sign-in method**
2. Enable the following providers:
   - **Email/Password**: Click the toggle to enable
   - **Google**: 
     - Click to enable
     - Add your OAuth consent screen details
     - Add your Google Cloud project OAuth 2.0 credentials

### For Google Sign-In:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Go to **APIs & Services** > **Credentials**
4. Create OAuth 2.0 credentials:
   - **Web application**: Get the `Web Client ID`
   - **Android**: Get the `Android Client ID`
   - **iOS**: Get the `iOS Client ID`

## Step 7: Set Up Firestore Database

1. In the Firebase Console, go to **Firestore Database**
2. Click **"Create database"**
3. Choose **"Start in test mode"** (for development)
4. Select your region (e.g., `us-central1`)
5. Click **"Create"**

### Set Firestore Rules

Replace the default rules with the following (for development):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write their own data
    match /users/{uid} {
      allow read, write: if request.auth.uid == uid;
    }
    
    match /subscriptions/{uid} {
      allow read, write: if request.auth.uid == uid;
    }
    
    match /children/{childId} {
      allow read, write: if request.auth.uid == resource.data.parentUid;
    }
    
    match /milestones/{document=**} {
      allow read: if request.auth != null;
    }
    
    match /payments/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Step 8: Set Up Cloud Storage

1. In the Firebase Console, go to **Storage**
2. Click **"Get started"**
3. Choose your region
4. Click **"Done"**

### Set Storage Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{uid}/{allPaths=**} {
      allow read, write: if request.auth.uid == uid;
    }
  }
}
```

## Step 9: Update Your .env File

Update the `.env` file in your project with the Firebase credentials:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=kapoori-ka.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=kapoori-ka
VITE_FIREBASE_STORAGE_BUCKET=kapoori-ka.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

VITE_GOOGLE_ANDROID_CLIENT_ID=your_android_client_id
VITE_GOOGLE_IOS_CLIENT_ID=your_ios_client_id
VITE_GOOGLE_WEB_CLIENT_ID=your_web_client_id
```

## Step 10: Test the App

### Run on Web

```bash
pnpm web
```

### Run on Android (with Expo Go)

```bash
pnpm android
```

### Run on iOS (with Expo Go)

```bash
pnpm ios
```

## Troubleshooting

### "Component auth has not been registered yet"

This error usually means Firebase is not initialized correctly. Make sure your `.env` file has all the required Firebase credentials.

### Google Sign-In not working

1. Verify that Google Sign-In is enabled in Firebase Authentication
2. Check that your OAuth credentials are correctly configured
3. Make sure your `.env` file has the correct Google Client IDs

### Firestore permission denied

1. Check your Firestore rules
2. Make sure you're logged in with a valid Firebase user
3. Verify that the user UID matches the document path

## Next Steps

1. Create user accounts and test the authentication flow
2. Add children and test the milestone tracking
3. Test growth chart calculations
4. Test notifications
5. Deploy to EAS Build for production

For more information, visit the [Firebase Documentation](https://firebase.google.com/docs).
