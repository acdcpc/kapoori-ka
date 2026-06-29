# Environment Variables Template

Create a `.env` file in the project root with the following variables:

```bash
# Firebase Configuration
FIREBASE_API_KEY=your_api_key_here
FIREBASE_AUTH_DOMAIN=kapoori-ka.firebaseapp.com
FIREBASE_PROJECT_ID=kapoori-ka
FIREBASE_STORAGE_BUCKET=kapoori-ka.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
FIREBASE_APP_ID=your_app_id_here

# eSewa Configuration (Test)
ESEWA_MERCHANT_CODE=EPAYTEST
ESEWA_TEST_MODE=true

# Khalti Configuration (Test)
KHALTI_PUBLIC_KEY=test_public_key_xxxxx
KHALTI_TEST_MODE=true

# App Configuration
APP_ENV=development
```

## How to Get Firebase Credentials

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **kapoori-ka**
3. Go to Project Settings (gear icon)
4. Copy the Web app credentials
5. Paste into `.env` file

## How to Get Payment Gateway Credentials

### eSewa
- Test Merchant Code: `EPAYTEST`
- Production: Register at https://merchant.esewa.com.np

### Khalti
- Test Public Key: Available in Khalti dashboard
- Production: Register at https://khalti.com/merchants

## Important Notes

⚠️ **NEVER commit `.env` file to version control**
- Add `.env` to `.gitignore`
- Only commit `.env.example` with placeholder values
- Each developer should have their own `.env` file

## Loading Environment Variables

The app loads these variables from `app.config.js`:

```javascript
extra: {
  firebaseApiKey: process.env.FIREBASE_API_KEY,
  firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN,
  // ... other variables
}
```

Access them in your code:

```typescript
import Constants from 'expo-constants';

const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebaseApiKey,
  authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain,
  // ...
};
```
