# Kapoori-Ka: Production Deployment Guide

**Version:** 1.0.0  
**Last Updated:** June 25, 2026  
**Status:** Production-Ready

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Firebase Configuration](#firebase-configuration)
3. [Security Setup](#security-setup)
4. [Build and Deployment](#build-and-deployment)
5. [Post-Deployment Verification](#post-deployment-verification)
6. [Monitoring and Maintenance](#monitoring-and-maintenance)
7. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

### Environment Setup
- [ ] Node.js 18+ installed
- [ ] npm or yarn package manager configured
- [ ] Expo CLI installed: `npm install -g expo-cli`
- [ ] EAS CLI installed: `npm install -g eas-cli`
- [ ] Firebase CLI installed: `npm install -g firebase-tools`
- [ ] Android SDK configured (for Android builds)
- [ ] Xcode configured (for iOS builds)

### Project Verification
- [ ] All dependencies installed: `npm install`
- [ ] No build errors: `npm run web` (test web build)
- [ ] All tests passing: `npm test` (if applicable)
- [ ] Linting passes: `npm run lint` (if configured)
- [ ] No console warnings or errors
- [ ] App version bumped in `app.json`

### Code Quality
- [ ] Code reviewed by team members
- [ ] Security audit completed
- [ ] Performance optimization done
- [ ] Accessibility compliance verified
- [ ] All features tested on target devices
- [ ] Error handling implemented
- [ ] Loading states implemented
- [ ] Offline functionality tested

---

## Firebase Configuration

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create a new project"
3. Enter project name: "Kapoori-Ka"
4. Enable Google Analytics (recommended)
5. Create the project

### Step 2: Register Your App

**For Web:**
1. In Firebase Console, click the Web icon
2. Register app with name "Kapoori-Ka Web"
3. Copy the Firebase configuration
4. Update `firebaseConfig` in `firebase.ts`

**For Android:**
1. Click the Android icon
2. Enter package name: `com.kapoori.ka` (or your package name)
3. Download `google-services.json`
4. Place in project root directory
5. Update `app.json` with package name

**For iOS:**
1. Click the iOS icon
2. Enter bundle ID: `com.kapoori.ka` (or your bundle ID)
3. Download `GoogleService-Info.plist`
4. Add to Xcode project

### Step 3: Enable Authentication

1. Go to Firebase Console → Authentication
2. Click "Get started"
3. Enable "Phone" authentication provider
4. Configure reCAPTCHA v3:
   - Go to Settings → reCAPTCHA
   - Create new reCAPTCHA v3 key
   - Add domain: `yourdomain.com`
   - Copy site key and secret key

### Step 4: Setup Firestore Database

1. Go to Firebase Console → Firestore Database
2. Click "Create database"
3. Select "Start in production mode"
4. Choose region: `asia-south1` (for Nepal)
5. Create database

### Step 5: Configure Storage

1. Go to Firebase Console → Storage
2. Click "Get started"
3. Choose region: `asia-south1`
4. Create bucket

### Step 6: Setup Firestore Security Rules

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
      allow create: if request.auth.uid != null;
    }
    
    // Children collection (nested under users)
    match /users/{userId}/children/{childId} {
      allow read, write: if request.auth.uid == userId;
      allow create: if request.auth.uid == userId;
    }
    
    // Health records collection
    match /users/{userId}/healthRecords/{recordId} {
      allow read, write: if request.auth.uid == userId;
      allow create: if request.auth.uid == userId;
    }
    
    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Step 7: Setup Storage Security Rules

```storage
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // User profile pictures
    match /users/{userId}/profile/{allPaths=**} {
      allow read: if request.auth.uid == userId;
      allow write: if request.auth.uid == userId && 
                      request.resource.size < 5 * 1024 * 1024 &&
                      request.resource.contentType.matches('image/.*');
    }
    
    // Health documents
    match /users/{userId}/documents/{allPaths=**} {
      allow read: if request.auth.uid == userId;
      allow write: if request.auth.uid == userId && 
                      request.resource.size < 20 * 1024 * 1024;
    }
    
    // Deny all other access
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

---

## Security Setup

### 1. API Key Restrictions

1. Go to Firebase Console → Settings → API keys
2. For each API key:
   - Click the key to edit
   - Restrict to "Android apps" or "iOS apps" or "Web apps"
   - Add package name or domain restrictions
   - Save changes

### 2. reCAPTCHA Configuration

1. Go to Google Cloud Console
2. Select your Firebase project
3. Go to APIs & Services → Credentials
4. Create OAuth 2.0 Client ID for your domain
5. Add authorized redirect URIs:
   - `https://yourdomain.com`
   - `https://yourdomain.com/callback`

### 3. Environment Variables

Create `.env.production` file:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSyA3HLwnxoazJ3ls-s6-v8ma5dq8AhdA0Dc
VITE_FIREBASE_AUTH_DOMAIN=seto-kitab.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seto-kitab
VITE_FIREBASE_STORAGE_BUCKET=seto-kitab.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=42480153860
VITE_FIREBASE_APP_ID=1:42480153860:web:a48bec3ad7f39b8d8d0c51

# reCAPTCHA
VITE_RECAPTCHA_SITE_KEY=your_recaptcha_site_key

# App Configuration
VITE_APP_NAME=Kapoori-Ka
VITE_APP_VERSION=1.0.0
VITE_API_URL=https://api.yourdomain.com
```

### 4. HTTPS Configuration

- Ensure all production domains use HTTPS
- Obtain SSL certificate from Let's Encrypt or your provider
- Configure certificate auto-renewal
- Test SSL configuration: `https://www.ssllabs.com/ssltest/`

---

## Build and Deployment

### Android Build

```bash
# Build APK for testing
eas build --platform android --profile preview

# Build AAB for Google Play Store
eas build --platform android --profile production

# Submit to Google Play Store
eas submit --platform android --latest
```

### iOS Build

```bash
# Build for testing
eas build --platform ios --profile preview

# Build for App Store
eas build --platform ios --profile production

# Submit to Apple App Store
eas submit --platform ios --latest
```

### Web Deployment

```bash
# Build web version
npm run web:build

# Deploy to Firebase Hosting
firebase deploy --only hosting

# Or deploy to your preferred hosting provider
# (Vercel, Netlify, AWS, etc.)
```

### Update app.json for Production

```json
{
  "expo": {
    "name": "Kapoori-Ka",
    "slug": "kapoori-ka",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "updates": {
      "fallbackToCacheTimeout": 0,
      "url": "https://u.expo.dev/your-project-id"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTabletMode": true,
      "bundleIdentifier": "com.kapoori.ka"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/android-icon-foreground.png",
        "backgroundImage": "./assets/android-icon-background.png"
      },
      "package": "com.kapoori.ka"
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/icon.png",
          "color": "#1a73e8"
        }
      ]
    ]
  }
}
```

---

## Post-Deployment Verification

### Functional Testing

- [ ] Login flow works with phone number
- [ ] OTP verification successful
- [ ] User profile creation works
- [ ] Child profile creation works
- [ ] Growth chart displays correctly
- [ ] Immunization schedule loads
- [ ] Nutrition data saves
- [ ] Milestone tracking works
- [ ] PDF report generation works
- [ ] Notifications send correctly

### Performance Testing

- [ ] App loads in < 3 seconds
- [ ] Login completes in < 2 seconds
- [ ] Charts render smoothly
- [ ] No memory leaks detected
- [ ] Battery usage acceptable
- [ ] Network requests optimized

### Security Testing

- [ ] All API calls use HTTPS
- [ ] Firebase rules enforced
- [ ] No sensitive data in logs
- [ ] reCAPTCHA working correctly
- [ ] Session timeout implemented
- [ ] Data encryption verified

### Analytics Setup

1. Enable Firebase Analytics:
   ```bash
   firebase analytics:activate
   ```

2. Track key events:
   - User login
   - Child profile creation
   - Feature usage
   - Error events

---

## Monitoring and Maintenance

### Firebase Console Monitoring

1. **Authentication:**
   - Monitor sign-in methods
   - Check for unusual activity
   - Review failed login attempts

2. **Firestore:**
   - Monitor database size
   - Check query performance
   - Review storage usage

3. **Storage:**
   - Monitor upload/download traffic
   - Check for large files
   - Review storage usage

4. **Analytics:**
   - Track user engagement
   - Monitor feature usage
   - Identify drop-off points

### Regular Maintenance Tasks

**Weekly:**
- Review error logs
- Check performance metrics
- Monitor user feedback

**Monthly:**
- Update dependencies
- Review security logs
- Analyze usage patterns
- Plan feature updates

**Quarterly:**
- Security audit
- Performance optimization
- User satisfaction survey
- Backup verification

### Backup Strategy

1. **Firestore Backups:**
   ```bash
   # Enable automated backups
   gcloud firestore backups create --collection-ids=users,children,healthRecords
   ```

2. **Storage Backups:**
   - Enable versioning in Cloud Storage
   - Configure lifecycle policies
   - Test restore procedures

3. **Database Exports:**
   - Export Firestore data monthly
   - Store in secure location
   - Test data restoration

---

## Troubleshooting

### Common Issues

**Issue: reCAPTCHA not loading**
- Verify domain is added to reCAPTCHA settings
- Check browser console for errors
- Ensure HTTPS is enabled
- Clear browser cache

**Issue: Firebase authentication fails**
- Verify Firebase config in `firebase.ts`
- Check Firebase console for enabled providers
- Ensure phone authentication is enabled
- Review Firebase security rules

**Issue: Firestore queries slow**
- Add indexes for frequently queried fields
- Optimize query filters
- Enable caching
- Review Firebase pricing

**Issue: App crashes on startup**
- Check browser console for errors
- Verify all dependencies installed
- Clear node_modules and reinstall
- Check for TypeScript errors

### Debug Mode

Enable debug logging:

```typescript
// In firebase.ts
import { enableLogging } from 'firebase/firestore';
enableLogging(true);
```

### Support Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Expo Documentation](https://docs.expo.dev)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [Firebase Community](https://stackoverflow.com/questions/tagged/firebase)

---

## Production Rollout Strategy

### Phase 1: Soft Launch (Week 1)
- Release to 10% of target users
- Monitor for critical issues
- Gather user feedback
- Fix any bugs found

### Phase 2: Expanded Release (Week 2-3)
- Release to 50% of target users
- Continue monitoring
- Optimize performance
- Address user feedback

### Phase 3: Full Release (Week 4+)
- Release to 100% of target users
- Maintain monitoring
- Plan next features
- Schedule regular updates

---

## Success Metrics

Track these metrics to measure production success:

- **User Acquisition:** New users per week
- **Retention:** % of users returning after 7 days
- **Engagement:** Average session duration
- **Performance:** App load time, crash rate
- **Satisfaction:** User ratings, feedback sentiment
- **Security:** Zero security incidents

---

## Contact and Support

For production issues or questions:
- Email: support@kapoori-ka.com
- Phone: +977-1-XXXXXXX
- Website: https://kapoori-ka.com
- Documentation: https://docs.kapoori-ka.com

---

**Deployment Date:** _______________  
**Deployed By:** _______________  
**Approved By:** _______________  
**Notes:** _______________
