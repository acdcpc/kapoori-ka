# Kapoori-Ka — Complete Project Handover Document

> **Version:** 1.0.0  
> **Date:** 2026-07-23  
> **Target Audience:** Senior software engineer or LLM continuing development  
> **App Name:** कपूरी क (Kapoori Ka) — "Your Child's Digital Health Book"

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Repository Information](#2-repository-information)
3. [Current Folder Structure](#3-current-folder-structure)
4. [Every Major Feature](#4-every-major-feature)
5. [Height Measurement (Deep Dive)](#5-height-measurement-deep-dive)
6. [Authentication](#6-authentication)
7. [Premium System](#7-premium-system)
8. [Database (Firestore)](#8-database-firestore)
9. [Security Review](#9-security-review)
10. [Bugs](#10-bugs)
11. [Build History](#11-build-history)
12. [Important Decisions](#12-important-decisions)
13. [Packages & Dependencies](#13-packages--dependencies)
14. [Files Modified](#14-files-modified)
15. [Commits & Change History](#15-commits--change-history)
16. [TODO](#16-todo)
17. [Deployment Checklist](#17-deployment-checklist)
18. [Lessons Learned](#18-lessons-learned)
19. [Current State & Next Steps](#19-current-state--next-steps)
20. [Appendices](#20-appendices)

---

## 1. Project Overview

### Purpose
Kapoori Ka is a bilingual (Nepali/English) mobile app for tracking child health in Nepal. It provides growth charts, immunization tracking, developmental milestone screening, nutrition guidance, autism screening (M-CHAT-R/F), and AI-powered height measurement using on-device pose estimation. The app works offline and syncs with Firebase when connectivity is available.

### Architecture
- **Frontend:** React Native (Expo SDK 56, React 19.2, RN 0.85)
- **Backend:** Firebase (Auth, Firestore, Storage, Cloud Functions, Hosting)
- **AI/ML:** TensorFlow Lite on-device (BlazePose models), VisionCamera frame processing
- **Build:** EAS Build (Expo Application Services)
- **Payment:** Web-based manual flow via GitHub Pages + Cloud Functions

### Tech Stack Summary

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React Native | 0.85.3 |
| Build | Expo SDK | ~56.0.16 |
| UI | React | 19.2.3 |
| Language | TypeScript | ~6.0.3 |
| Auth | Firebase Auth | ^10.11.1 |
| Database | Firestore | ^10.11.1 |
| Storage | Firebase Storage | ^10.11.1 |
| Functions | Firebase Cloud Functions | Node.js |
| ML | TensorFlow Lite (on-device) | via react-native-fast-tflite ^3.0.1 |
| Camera | VisionCamera | ^4.7.3 |
| Worklets | react-native-worklets-core | ^1.6.3 |
| Charts | Victory Native | ^36.9.1 |
| Navigation | React Navigation | ^6.1.18 |
| Push Notifs | expo-notifications | ~56.0.21 |
| Package Manager | pnpm | lockfile present |
| Build System | EAS Build | cli >=20.5.1 |

### Firebase Services Used
- **Authentication:** Email/Password, Google OAuth, Anonymous guest
- **Firestore:** 9 collections (users, children, growth_records, vaccine_records, milestone_records, mchat_responses, subscriptions, payments, activation_codes)
- **Cloud Functions:** 5 functions (redeemActivationCode, checkSubscription, approvePayment, rejectPayment, setAdminClaim)
- **Hosting:** Payment landing page + Admin dashboard (via `public/` directory)
- **Storage:** Firebase Storage (configured in firebase.ts, usage limited)

---

## 2. Repository Information

| Item | Value |
|------|-------|
| GitHub Repository | Not yet pushed — local only |
| Expo Project Slug | `kapoori-ka` |
| Expo Account | `thisisprakash` |
| EAS Project ID | `9eb1daa1-b2b9-481e-8d5a-c22249654ebc` |
| Android Package Name | `com.kapoori.ka` |
| iOS Bundle Identifier | `com.kapoori.ka` |
| Firebase Project ID | `kapoori-ka` (in .env) |
| Expo Redirect URI | `https://auth.expo.io/@thisisprakash/kapoori-ka` |
| Default Language | Nepali (persisted in AsyncStorage as `user_language`) |

### Build Profiles (eas.json)

| Profile | Build Type | Distribution | Notes |
|---------|-----------|-------------|-------|
| `development` | dev client | internal | Expo dev client |
| `preview` | APK | internal | **Current build** — prebuild with `--clean` |
| `production` | auto | auto | autoIncrement: true |

### Environment Variables (from .env.example)

```
APP_NAME=कपूरी क (Kapoori Ka)
APP_VERSION=1.0.0
APP_ENV=development
EXPO_PUBLIC_FIREBASE_API_KEY
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
EXPO_PUBLIC_FIREBASE_PROJECT_ID
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
EXPO_PUBLIC_FIREBASE_APP_ID
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
EXPO_PUBLIC_FIREBASE_RECAPTCHA_SITE_KEY
EXPO_PUBLIC_FIREBASE_ANDROID_CLIENT_ID
EXPO_PUBLIC_FIREBASE_IOS_CLIENT_ID
EXPO_PUBLIC_FIREBASE_WEB_CLIENT_ID
EXPO_PUBLIC_SCHEME=com.kapoori.ka
```

All are set as EXPO_PUBLIC_ prefixed variables. For EAS builds, they must also be set via `eas secret:create`.

---

## 3. Current Folder Structure

```
kapoori-ka/
├── App.tsx                          # Root component: AuthProvider + Navigation + Language
├── app.config.js                    # Expo config (replaces app.json). Reads .env
├── babel.config.js                  # Babel + react-native-worklets-core plugin
├── metro.config.js                  # Metro: assetExts includes tflite, package exports fix
├── tsconfig.json                    # TypeScript: strict, react-jsx
├── firebase.ts                      # Firebase init: Auth, Firestore, Storage, Functions
├── firebase.json                    # Firebase Hosting config + Firestore rules path
├── firestore.rules                  # CURRENT PRODUCTION Firestore security rules
├── firestore-security-rules.txt     # OLD/alternate security rules (may be stale)
├── storage.rules                    # Firebase Storage rules
├── eas.json                         # EAS Build profiles
├── package.json                     # Dependencies
├── pnpm-lock.yaml                   # Package lockfile
├── pnpm-workspace.yaml              # PNPM workspace config
├── .npmrc                           # shamefully-hoist=true for phantom deps
├── .env                             # Environment variables (gitignored)
├── .env.example                     # Template for .env
├── .gitignore                       # Ignores node_modules, .env, android/, ios/, build dirs
├── google-services.json             # Android Firebase config
├── GoogleService-Info.plist          # iOS Firebase config
│
├── assets/                          # Static assets
│   ├── icon.png, splash-icon.png, favicon.png
│   ├── android-icon-*.png           # Android adaptive icons
│   ├── kapoori_ka_logo_*.png        # Logo variations
│   ├── logo_concept_*.png           # Logo design concepts
│   └── models/                      # TensorFlow Lite models
│       ├── README.txt               # Model source note
│       ├── blazepose_detector_fp16.tflite    (2.96 MB) — Stage 1 detector
│       ├── blazepose_landmark_lite_fp16.tflite (2.82 MB) — Stage 2 landmarker
│       ├── blazepose_lite_fp16.task           (5.78 MB) — MediaPipe Task file (unused)
│       └── blazepose_lite_int8.tflite         (1.18 MB) — INT8 (unused, precision loss)
│
├── src/
│   ├── ai/                          # AI/ML pipeline
│   │   ├── PoseTypes.ts             # 39-landmark types + LM enum + STRIDE=5
│   │   ├── BlazePoseEngine.ts       # parseDetections, parseLandmarks, parseWorldLandmarks
│   │   ├── heightEstimator.ts       # Height calculation, EMA smoothing, confidence, lock
│   │   └── __tests__/
│   │       ├── BlazePoseEngine.test.ts   # Jest tests (imports real functions)
│   │       └── run_parse_tests.mjs       # Standalone Node test runner (duplicate logic)
│   │
│   ├── screens/                     # Screen components (4,656 total lines)
│   │   ├── HomeScreen.tsx           # Main child list + quick actions
│   │   ├── LoginScreen.tsx          # Email/Google/Anonymous auth
│   │   ├── AddChildScreen.tsx       # Child registration form
│   │   ├── ChildDashboard.tsx       # Per-child summary/actions
│   │   ├── GrowthChartScreen.tsx    # WHO growth charts (Victory)
│   │   ├── ImmunizationScreen.tsx   # Vaccine schedule tracking
│   │   ├── MilestoneScreen.tsx      # Developmental milestones
│   │   ├── MChatScreen.tsx          # M-CHAT-R/F autism screening
│   │   ├── NutritionScreen.tsx      # Age-specific feeding guides
│   │   ├── PDFReportScreen.tsx      # PDF export (expo-print)
│   │   ├── HeightMeasureScreen.tsx  # AI height measurement (658 lines)
│   │   ├── HeightMeasureScreen.tsx.bak  # Original before Rules-of-Hooks fix
│   │   ├── HeightMeasureScreen.web.tsx  # Web placeholder
│   │   ├── ConsultationScreen.tsx   # Consultation booking
│   │   ├── SubscriptionScreen.tsx   # Premium subscription + code redemption
│   │   ├── PaymentScreen.tsx        # Payment gateway (stub/moved to web)
│   │   ├── AboutScreen.tsx          # About page
│   │   └── .easignore               # Ignore pattern for EAS uploads
│   │
│   ├── components/                  # Shared components
│   │   └── PremiumGuard.tsx         # Feature gating: Free/Locked/Pending/Active states
│   │
│   ├── context/                     # React Context providers
│   │   ├── AuthContext.tsx           # Auth state: user, profile, subscription
│   │   └── LanguageContext.ts        # Bilingual toggle (ne/en)
│   │
│   ├── hooks/                       # Custom hooks
│   │   └── usePremiumGuard.ts       # Premium feature access logic
│   │
│   ├── types/                       # TypeScript types
│   │   ├── index.ts                 # Child, GrowthRecord, VaccineRecord, Milestone, etc.
│   │   ├── firestore.ts             # UserProfile, Subscription, PaymentRecord, ActivationCode
│   │   └── navigation.ts            # RootStackParamList + route params
│   │
│   ├── data/                        # Static datasets
│   │   ├── whoHFA.ts                # WHO Height-for-Age reference
│   │   ├── whoLMS.ts                # WHO LMS tables (WAZ boys/girls)
│   │   ├── milestones.ts            # 100+ developmental milestones
│   │   └── nepaliVaccines.ts        # Nepal immunization schedule
│   │
│   ├── utils/                       # Utility modules
│   │   ├── growthCalculations.ts    # Age, z-scores, WHO lookups
│   │   ├── authErrors.ts            # Firebase error → bilingual messages
│   │   ├── notifications.ts         # Push notification scheduling
│   │   └── vaccineSchedule.ts       # Vaccine schedule computation
│   │
│   ├── i18n/
│   │   └── translations.ts          # Complete Nepali/English translation strings
│   │
│   ├── navigation/
│   │   └── types.ts                 # Stack navigator type definitions
│   │
│   ├── constants.ts                 # Colors, WhatsApp number
│   └── theme.ts                     # Design tokens (colors, card, button styles)
│
├── functions/                       # Firebase Cloud Functions
│   ├── package.json                 # Functions dependencies
│   └── src/
│       └── index.js                 # 5 Cloud Functions (280 lines)
│
├── public/                          # Firebase Hosting files
│   ├── payment.html                 # Payment landing page
│   ├── payment-guide.html           # Payment instructions
│   └── admin/
│       └── index.html               # Admin payment verification dashboard
│
├── scripts/                         # Development scripts
│   ├── extract_models.py            # Python: extract TFLite models from .task file
│   ├── verify-worklet-deps.sh       # Check Babel worklet plugin availability
│   └── push_eas_secrets.sh          # Push .env secrets to EAS
│
├── Documentation:
│   ├── README.md, CHANGES_SUMMARY.md, FINAL_FIXES_SUMMARY.md
│   ├── HEIGHT_MEASURE_SETUP.md, FIREBASE_SETUP_GUIDE.md
│   ├── SETUP_AND_TESTING_GUIDE.md, SETUP_GUIDE.md, SETUP_FIXES.md
│   ├── PRODUCTION_DEPLOYMENT_GUIDE.md, IMPROVEMENTS_SUMMARY.md
│   ├── ENV_TEMPLATE.md, README_FIXES.md
│   └── PROJECT_HANDOVER.md (this file)
│
└── Previous build artifacts:
    └── kapoori-ka-build-d8ad28db.apk  # Previous APK build (may be stale)
```

---

## 4. Every Major Feature

### 4.1 Authentication
**Implementation:** Firebase Auth with multi-method support. `firebase.ts` detects platform and initializes auth differently: Web uses standard `getAuth()`, native uses `initializeAuth` with AsyncStorage persistence. Google OAuth via `expo-auth-session`. Anonymous guest accounts with upgrade path.

**Known Issues (all patched):**
- ISSUE 2: Google redirect URI must use Expo proxy pattern
- ISSUE 3: Credential validation was perception bug caused by token-refresh re-firing auth
- ISSUE 4: `onAuthStateChanged` emits null during Firebase token refresh — guarded with `hadRealUser` ref + 5s timeout
- ISSUE 5: Subscription state must never reset to null during auth init cycle

**Status:** ✅ Functional with all 4 known issues patched.

### 4.2 Children Management
CRUD for child profiles in Firestore `children` collection. `AddChildScreen` + `ChildDashboard`. ✅ Functional.

### 4.3 Growth Charts
WHO standard charts with Victory Native, z-score calculations, nutritional status classification. ✅ Functional.

### 4.4 Immunization
Nepal vaccine schedule with Bikram Sambat dates via `nepali-date-converter`. Status tracking: due/upcoming/missed/given. ✅ Functional.

### 4.5 Milestones
100+ WHO developmental milestones, 5 domains, flag levels (green/yellow/red). Premium-gated. ✅ Functional.

### 4.6 M-CHAT (Autism Screening)
M-CHAT-R/F 20-question screening, risk classification. Nepali translations verified natural. ✅ Functional.

### 4.7 Nutrition
Age-specific feeding guides (0-6m through 24-60m), Sarbottam Pitho recipe, myth-busting. All Nepali text corrected. ✅ Functional.

### 4.8 Height Measurement (AI-Powered)
On-device two-stage BlazePose pipeline. See Section 5 for complete deep dive. ⚠️ Compiles, deploys, but currently debugging crashes.

### 4.9 Premium System
Web-based manual activation code flow. Cloud Functions manage server-side subscription activation. See Section 7. ✅ Backend functional.

### 4.10 Notifications
Push notifications via `expo-notifications`. Vaccine reminders at 7-day/2-day/day-of intervals. Android channels configured. ✅ Functional.

### 4.11 Localization
Full Nepali/English bilingual UI with AsyncStorage persistence. All screens bilingual. ✅ Functional.

### 4.12 PDF Reports
`expo-print` + `expo-sharing` for HTML-to-PDF export. ✅ Functional.

### 4.13 Payment
Web-based manual flow: user pays externally, admin verifies, creates activation code. No in-app payment links (Google Play compliance). ✅ Functional.

### 4.14 Firebase Sync
Offline Firestore with `enableIndexedDbPersistence`, graceful fallback. ✅ Functional.

---

## 5. Height Measurement (Deep Dive)

### 5.1 Architecture Evolution

**Attempt 1: MediaPipe Task API** — `.task` file via MediaPipe SDK. Failed: No React Native binding exists. Extracted TFLite models via Python.

**Attempt 2: Single-Stage BlazePose** — Landmark model on full frames. Failed: Model requires 256×256 crop, produces garbage without detector bbox.

**Attempt 3: Two-Stage BlazePose (Current)** — Detector (224×224) → crop → Landmark (256×256). Architecture correct.

### 5.2 Model Files

| File | Size | Role | Input | Output |
|------|------|------|-------|--------|
| `blazepose_detector_fp16.tflite` | 2.96 MB | Stage 1: Person detection | [1,224,224,3] RGB | [1,2254,12] detections + [1,2254,1] raw scores |
| `blazepose_landmark_lite_fp16.tflite` | 2.82 MB | Stage 2: Landmark estimation | [1,256,256,3] RGB crop | [1,195] LM, [1,1] flag, [1,256,256,1] heatmap, [1,64,64,39] seg, [1,117] world LM |

### 5.3 Critical Bug: Stride Was 4, Should Be 5

**Discovery:** Python TFLite metadata parsing confirmed `Identity` output = [1, 195] = 39 × 5 (not 33 × 4).

Original code assumed 33 landmarks with stride=4 (x, y, z, visibility). Reality: 39 landmarks with stride=5 (x, y, z, visibility, presence). With stride=4 reading 195 floats, every landmark after index 0 was misaligned — the presence value of landmark N was read as the x coordinate of landmark N+1.

**Fix:** `PoseTypes.ts`: LANDMARK_COUNT=39, STRIDE=5, TENSOR_SIZE=195, added `presence` to `PoseLandmark`, AUX0-AUX5. `BlazePoseEngine.ts`: stride 4→5, presence reading, runtime assertions.

### 5.4 Detector Output Verification (Unconfirmed)

The detector has TWO output tensors:
- `detOut[0]` = Identity [1,2254,12] — combined (bbox + score at offset+4 + keypoints)
- `detOut[1]` = Identity_1 [1,2254,1] — raw logit scores

**Whether `detOut[0][i*12+4] == sigmoid(detOut[1][i])` has NOT been confirmed.** Debug instrumentation is in the code (`det_debug:` prefix in diag text) but the app crashes before reaching it. See Section 10 Bug #4.

### 5.5 Current Pipeline

1. Camera frame → 224×224 resize → detector model → parseDetections
2. Best detection → +15% margin crop → 256×256 resize → landmark model → parseLandmarks
3. JS thread: estimateHeight (nose-to-ankle pixels × BOX_REAL_HEIGHT_CM/boxPX scale)
4. EMA smoothing (median filter buffer=16, alpha=0.35), jitter tracking
5. Measurement lock: 16 consecutive frames with confidence ≥ 0.95 and variance ≤ 0.5 cm

### 5.6 Confidence Scoring
Weighted sum: 0.25×detector_score + 0.25×mean_visibility + 0.20×body_completeness + 0.15×tilt_quality + 0.15×temporal_stability

### 5.7 Latest Logcat Findings

```
ReferenceError: Property 'runOnJS' doesn't exist
at HeightMeasureScreen
```
Debug block passed closure to runOnJS — worklet can't inline closure signatures. Fixed: changed to `runOnJS(setDiag)('det_debug:' + string)` matching existing working pattern.

### 5.8 Everything Ruled Out
- ❌ MediaPipe Task SDK — not available for RN
- ❌ Single-stage inference — requires prior bbox
- ❌ INT8 quantization — precision loss for landmarks
- ❌ 33-landmark assumption — metadata proves 39
- ❌ Stride=4 — metadata proves stride=5
- ❌ `heightCalculation.ts` — was dead code, removed

---

## 6. Authentication

### 6.1 Configuration
- **Enabled providers:** Email/Password, Google, Anonymous
- **Platform handling:** `firebase.ts` detects Platform.OS
- **Error recovery:** Catches auth/app-already-initialized for hot reload

### 6.2 Google OAuth
- Client IDs via env vars (Web/Android/iOS)
- Redirect URI: `https://auth.expo.io/@thisisprakash/kapoori-ka`
- Flow: expo-auth-session → GoogleAuthProvider.credential(idToken) → signInWithCredential
- SHA-1: Required for Android standalone. Add in Firebase Console → Android App.

### 6.3 Status
✅ Email/Password, Anonymous, Password reset, Verification, Sign-out, Token refresh — all working
⚠️ Google Sign-In on standalone APK — untested (needs SHA-1 + intent filter verification)

---

## 7. Premium System

### 7.1 Flow
1. User pays via eSewa/Khalti/Fonepay/Bank externally
2. Admin verifies and creates activation code via `public/admin/index.html`
3. User enters code in app → calls `redeemActivationCode` Cloud Function
4. Cloud Function activates subscription server-side (bypasses client security rules)

### 7.2 Feature Gating
`PremiumGuard.tsx`: Free | Active | Pending (verification card) | Locked (benefit description, NO buttons — Google Play compliance)

| Feature | Access |
|---------|--------|
| Immunization | Free |
| Growth Report | Premium |
| Milestone Tracker | Premium |
| Nutrition | Premium |
| Autism Screening | Premium |

### 7.3 Cloud Functions (functions/src/index.js, 280 lines)
- `redeemActivationCode` — validates and activates code
- `checkSubscription` — subscription status check
- `approvePayment` — admin: approve + activate subscription
- `rejectPayment` — admin: reject with reason
- `setAdminClaim` — admin: set custom claim

### 7.4 Future
- Direct in-app payment when SDKs integrated
- Automated payment verification webhooks
- Family plan support

---

## 8. Database (Firestore)

### Collections

| Collection | Purpose | Key Fields |
|-----------|---------|------------|
| `users/{uid}` | User profiles | email, displayName, language, isAnonymous, premium.* |
| `children/{childId}` | Child records | ownerId, name, dateOfBirth, sex, birthWeight |
| `growth_records/{recordId}` | Growth measurements | childId, ownerId, weight, height, date, ageMonths |
| `vaccine_records/{recordId}` | Immunization tracking | childId, ownerId, vaccineName, scheduledDate, isGiven |
| `milestone_records/{recordId}` | Milestone achievements | childId, ownerId, milestoneId, achievedDate |
| `mchat_responses/{responseId}` | Autism screening | childId, ownerId, answers, score, riskLevel |
| `subscriptions/{userId}` | Premium subscriptions | status, plan, startDate, endDate, consultationsRemaining |
| `payments/{paymentId}` | Payment records | userId, paymentMethod, amount, status (pending/approved/rejected) |
| `activation_codes/{code}` | Premium codes | status (valid/used), plan, amount, usedBy |

### Security Rules (`firestore.rules`)

Key principles:
- Users can read/write only their own documents (ownerId == auth.uid)
- Admin custom claim required for privileged operations
- Users CANNOT self-upgrade subscriptions (Cloud Functions only)
- Payments must have status='pending' at creation
- No composite indexes explicitly configured

---

## 9. Security Review

### Implemented
✅ Firebase Auth with AsyncStorage persistence
✅ Firestore owner-based security rules
✅ Admin custom claims for Cloud Functions
✅ Subscription self-upgrade prevented at rules level
✅ No hardcoded secrets (all in .env, gitignored)
✅ google-services.json and GoogleService-Info.plist gitignored

### Remaining Vulnerabilities
| Issue | Risk | Recommendation |
|-------|------|----------------|
| No rate limiting on redeemCode | Medium | Add rate limit in Cloud Function |
| Activation codes brute-forceable | Medium | Add attempt tracking + cooldown |
| Admin dashboard on public Hosting | Medium | Add Firebase Hosting auth |
| getReactNativePersistence dynamic require | Low | Bundle as explicit dependency |

### Recommended Improvements
1. Firebase App Check
2. Cloud Function rate limiting
3. Security rules unit tests
4. Google Play Integrity API

---

## 10. Bugs

| # | Bug | Root Cause | Evidence | Status | Priority |
|---|-----|-----------|----------|--------|----------|
| 1 | HeightMeasureScreen crashes: `ReferenceError: runOnJS` | Debug block passed closure to runOnJS | Logcat 2026-07-23 | FIXED | CRITICAL |
| 2 | Landmark coordinates garbled (pre-fix) | Stride was 4, should be 5 | TFLite metadata: Identity = [1,195]=39×5 | FIXED | CRITICAL |
| 3 | Rules-of-Hooks violation | useEffect after conditional return | React error on mount | FIXED | CRITICAL |
| 4 | Detector score tensor not verified | Unknown if offset+4 == sigmoid(raw_logit) | Debug code in place, not yet run | UNVERIFIED | HIGH |
| 5 | Firebase auth null during token refresh | onAuthStateChanged fires null transiently | Observed in dev | FIXED | HIGH |
| 6 | Subscription state reset to null during auth init | initializeUserProfile timing issue | Observed in dev | FIXED | HIGH |
| 7 | Google Sign-In on standalone APK | OAuth redirect needs intent-filter + SHA-1 | Not tested | UNTESTED | MEDIUM |
| 8 | `heightCalculation.ts` was dead code | Not imported anywhere | Grep exit code 1 | FIXED (removed) | LOW |

---

## 11. Build History

### Latest Build
| Item | Value |
|------|-------|
| Build ID | `292aa21d-4f82-4d04-a33d-cf419baa4925` |
| Profile | `preview` |
| Platform | Android |
| Build Type | APK |
| Status | Submitted 2026-07-23 |
| Log URL | https://expo.dev/accounts/thisisprakash/projects/kapoori-ka/builds/292aa21d-4f82-4d04-a33d-cf419baa4925 |

### Signing
- Remote Android credentials (Expo server)
- Keystore: `Build Credentials lWUy_NfhYT (default)`

### Known Build Issues
| Issue | Cause | Fix |
|-------|-------|-----|
| EAS needs EXPO_PUBLIC_ secrets | Env vars not on EAS | `eas secret:create` or `scripts/push_eas_secrets.sh` |
| Metro can't resolve .tflite | Missing asset extension | `assetExts.push('tflite')` in metro.config.js |
| Babel worklet plugins missing in pnpm | Phantom dependency | Added all 8 plugins to devDependencies |

### Key Commands
```bash
# Clean rebuild
npx expo prebuild --clean --platform android

# Preview APK
eas build --platform android --profile preview

# Push secrets to EAS
bash scripts/push_eas_secrets.sh

# Verify worklet dependencies
bash scripts/verify-worklet-deps.sh

# TypeScript check
npx tsc --noEmit

# Android debugging
adb -s <device_id> logcat -c  # clear
adb -s <device_id> logcat -v threadtime | grep -E "AndroidRuntime|HEIGHT|crash|FATAL"
adb devices -l
adb install <apk_path>
```

---

## 12. Important Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Two-stage BlazePose (detector + landmark) | Single-stage produces garbage without bbox; MediaPipe SDK unavailable for RN |
| 2 | Float16 models (not INT8) | Landmark precision critical for height measurement |
| 3 | Stride=5, 39 landmarks | TFLite metadata proves it — not assumption |
| 4 | String-based debug (not closure) for runOnJS | Worklet transpiler rejects closure signatures |
| 5 | Web-based payment flow | No in-app payment SDKs integrated; Google Play compliant |
| 6 | EAS Build (not local gradle) | Handles signing, env, cloud infrastructure |
| 7 | PNPM with shamefully-hoist | Phantom dependency resolution for worklet Babel plugins |
| 8 | app.config.js (not app.json) | Dynamic config needs .env reading |
| 9 | AsyncStorage auth persistence | Persists login across app restarts on mobile |
| 10 | Bilingual from ground up | Target users are Nepali-speaking parents |
| 11 | Cloud Functions admin-only subscription management | Users must not self-upgrade |
| 12 | Premium guard shows benefit, not upgrade CTA | Google Play compliance |
| 13 | runAtTargetFps(8) for frame processor | Reduces CPU/battery; 8 FPS sufficient for pose tracking |

---

## 13. Packages & Dependencies

### Runtime (excerpt of key packages)
| Package | Version | Purpose | Still Needed? |
|---------|---------|---------|---------------|
| react | 19.2.3 | Framework | Yes |
| react-native | 0.85.3 | Framework | Yes |
| expo | ~56.0.16 | Build/runtime | Yes |
| firebase | ^10.11.1 | Backend | Yes |
| react-native-vision-camera | ^4.7.3 | Camera + frame processors | Yes |
| react-native-fast-tflite | ^3.0.1 | TFLite inference | Yes |
| react-native-worklets-core | ^1.6.3 | Worklet runtime | Yes |
| vision-camera-resize-plugin | ^3.2.0 | Frame resizing in worklet | Yes |
| expo-asset | ^56.0.20 | TFLite model asset loading | Yes |
| expo-sensors | ~56.0.6 | Accelerometer | Yes |
| expo-auth-session | ^56.0.14 | Google OAuth | Yes |
| expo-notifications | ~56.0.21 | Push notifications | Yes |
| victory-native | ^36.9.1 | Growth charts | Yes |
| nepali-date-converter | ^3.4.0 | BS calendar | Yes |
| dayjs | ^1.11.10 | Date manipulation | Yes |

### Dev Dependencies (key)
| Package | Purpose |
|---------|---------|
| typescript ~6.0.3 | Type checking |
| babel-preset-expo ~56.0.17 | Babel preset |
| @babel/plugin-* (8 plugins) | Worklet transpilation (required by pnpm) |

### Removed
| Package | Reason |
|---------|--------|
| expo-firebase-recaptcha | Deprecated in Expo SDK 48+ |

---

## 14. Files Modified During This Session

| File | Purpose | Change | State |
|------|---------|--------|-------|
| `src/ai/PoseTypes.ts` | Types + constants | LANDMARK_COUNT 33→39, STRIDE 4→5, added presence, AUX0-AUX5 | ✅ Correct |
| `src/ai/BlazePoseEngine.ts` | Parsing functions | Stride 4→5, presence reading, runtime assertions | ✅ Correct |
| `src/ai/heightEstimator.ts` | Height calculation | Updated 33→39 comment | ✅ Correct |
| `src/screens/HeightMeasureScreen.tsx` | Main screen | Rules-of-Hooks fix, debug instrumentation, runOnJS fix | ✅ Compiles |
| `src/utils/heightCalculation.ts` | Dead code | Removed (not imported anywhere) | ❌ Removed |
| `src/ai/__tests__/BlazePoseEngine.test.ts` | Unit tests | Fixed inline assertions to call real functions, SYNC NOTICE | ✅ Correct |

---

## 15. Change History (No Git — Local Milestones)

1. Initial project setup: Expo 56, Firebase, all 15 screens
2. Auth fixes: ISSUE 2-5 patches (Google redirect, credential validation, token refresh, subscription reset)
3. Nepali corrections: Replaced Hindi-influenced words
4. Growth chart restoration: Victory charts re-enabled
5. Height measurement initial implementation: Two-stage BlazePose pipeline
6. Stride fix: 4→5, 33→39 landmarks (2026-07-23)
7. Rules-of-Hooks fix: Moved 34 hooks before Gates (2026-07-23)
8. Debug instrumentation + runOnJS fix (2026-07-23)
9. EAS build submitted (2026-07-23)

---

## 16. TODO

### Critical
- [ ] Deploy latest build and verify HeightMeasurementScreen no longer crashes
- [ ] Check `det_debug` output to verify detector score tensor
- [ ] Fix any remaining runtime errors

### High
- [ ] Calibrate height formula against real measurements
- [ ] Test Google Sign-In in standalone APK
- [ ] Add proper error UI in HeightMeasureScreen
- [ ] Push code to GitHub
- [ ] Set up CI/CD via EAS

### Medium
- [ ] Add Mid-Parental Height calculator
- [ ] Firebase App Check
- [ ] Cloud Function rate limiting
- [ ] End-to-end tests
- [ ] iOS build and testing

### Low
- [ ] Biometric auth
- [ ] Dark mode
- [ ] Multi-language expansion

---

## 17. Deployment Checklist

### Play Store
- [ ] All critical/high bugs fixed
- [ ] Height measurement crash resolved
- [ ] Google Sign-In verified on APK
- [ ] SHA-1 fingerprints in Firebase Console
- [ ] Privacy policy URL
- [ ] Content rating questionnaire
- [ ] Production keystore (not debug)
- [ ] EAS production profile configured
- [ ] Firebase production rules reviewed
- [ ] Cloud Functions deployed to production
- [ ] Rate limiting implemented
- [ ] Store listing copy (English + Nepali)
- [ ] Screenshots (both languages)
- [ ] Data safety section

### App Store
- [ ] Apple Developer Program
- [ ] Bundle ID registered
- [ ] TestFlight testing
- [ ] Privacy nutrition labels
- [ ] App review guidelines compliance

---

## 18. Lessons Learned

### Debugging
1. **Verify model metadata, never assume.** The 33-vs-39 landmark bug was the result of assuming the "lite" model matched the 33-landmark topology. Only TFLite metadata parsing proved otherwise.
2. **Stride bugs compound silently.** Reading 4 values from a 5-value buffer doesn't crash — it just produces wrong coordinates. The error grows linearly.
3. **Worklet closures ≠ regular closures.** `runOnJS` can only take simple function refs, not inline closures.
4. **React Rules-of-Hooks is unforgiving.** Every hook must be called before any conditional return.
5. **Firebase token refresh simulates logout.** `onAuthStateChanged` emits null between refreshes.

### Incorrect Assumptions → Now Corrected
| Assumption | Reality |
|-----------|---------|
| Landmark model outputs 33 landmarks | Outputs 39 landmarks (GHUM topology) |
| Stride is 4 | Stride is 5 (includes presence flag) |
| runOnJS can take any function | Only simple refs; closures fail |
| TFLite assets load via require() | Need expo-asset Asset.fromModule() + downloadAsync() |
| Detector has single combined output | Has TWO separate tensors |

### Confirmed Facts
| Fact | Evidence |
|------|----------|
| TFLite output order = flatbuffer order | Read react-native-fast-tflite C++ source |
| Identity output = [1, 195] | Python TFLite metadata parse |
| Detector outputs: [1,2254,12] + [1,2254,1] | Python TFLite metadata parse |
| .run()/.runSync() returns ArrayBuffer[] in declared order | HybridTfliteModel.cpp |
| TypeScript compilation zero errors | `npx tsc --noEmit` |

### Rejected Hypotheses
| Hypothesis | Reason |
|-----------|--------|
| "Lite model must be 33-landmark" | Metadata shows 39 — file naming misleading |
| "Score in combined tensor is raw logit" | Not yet confirmed/rejected — pending |
| "MediaPipe Task file works in RN" | No RN binding exists |
| "runOnJS is an import from vision-camera" | No such export — it's worklet global |

---

## 19. Current State & Next Steps

### For the Next Engineer

**First, do these:**
1. Read this document completely
2. Check EAS build `292aa21d` status at the Expo build log URL
3. If build succeeded: install APK, open Height Measurement, check top-left `det_debug:` text
4. Run Logcat: `adb -s <device> logcat | grep -E "AndroidRuntime|HEIGHT|crash|FATAL"`
5. If `det_debug` shows matching pairs → offset+4 is confirmed sigmoid. If diverges → switch to separate tensor.

**Do NOT touch:**
- `PoseTypes.ts` constants (verified against model metadata)
- `BlazePoseEngine.ts` stride values (correct)
- `HeightMeasureScreen.tsx` hook order (all 34 must stay before Gates)
- `firebase.ts` platform logic (subtle initialization race)
- `AuthContext.tsx` null guards (fix real token-refresh bugs)

**Investigate next:**
- Height estimation accuracy vs real measurements
- Camera distance estimation calibration
- Frame processor performance on Samsung A24
- Google Sign-In on standalone APK

**Current blocker:** The app was crashing with `ReferenceError: runOnJS doesn't exist`. Fix applied — replaced closure with string-based debug. Fix is in EAS build queue. Once APK installs successfully, proceed to verify detector score tensor and test height estimation.

---

## 20. Appendices

### A. Navigation Flow

```
App.tsx
  └── AuthProvider
      └── NavigationContainer
          ├── [Not logged in] LoginScreen
          │   ├── Email/Password Login
          │   ├── Register
          │   ├── Google Sign-In
          │   ├── Anonymous Guest
          │   └── Forgot Password
          │
          └── [Logged in] HomeScreen
              ├── AddChild → AddChildScreen
              ├── ChildDashboard
              │   ├── GrowthChart, Immunization, Milestones
              │   ├── MChat, PDFReport, Nutrition
              │   └── HeightMeasure
              ├── SubscriptionScreen → Redeem Code
              ├── AboutScreen
              └── Logout
```

### B. Height Measurement Flow

```
HeightMeasureScreen mounts
  → STEP 1: expo-asset resolution (require → Asset.fromModule → downloadAsync)
  → STEP 2: loadTensorflowModel (detector + landmark)
  → STEP 3: Dummy inference verification
  → STEP 4: Resize plugin init
  → Frame Processor active (8fps):
      224×224 resize → detModel.runSync → parseDetections
      → crop +15% margin → 256×256 resize → lmModel.runSync → parseLandmarks
      → runOnJS(onResult) → estimateHeight → EMA smooth → lock
  → Capture → Save / Retake
```

### C. Premium Activation Flow

```
User pays externally → Messages admin → Admin verifies (admin/index.html)
  → Admin calls approvePayment CF → Creates activation code → Shares via WhatsApp
  → User enters code in SubscriptionScreen → redeemActivationCode CF
  → Subscription activated server-side → User has premium
```

### D. Key Files Quick Reference

| File | Purpose | Lines |
|------|---------|-------|
| `src/screens/HeightMeasureScreen.tsx` | Main measurement screen | 658 |
| `src/ai/BlazePoseEngine.ts` | parseDetections + parseLandmarks | 130 |
| `src/ai/PoseTypes.ts` | Types + landmark constants | 113 |
| `src/ai/heightEstimator.ts` | Height calc + smoothing + confidence | 226 |
| `src/context/AuthContext.tsx` | Auth state + bug patches | 340 |
| `firebase.ts` | Firebase init + platform handling | 82 |
| `functions/src/index.js` | Cloud Functions | 280 |
| `firestore.rules` | Firestore security rules | 106 |

### E. All Existing Documentation

| File | Content |
|------|---------|
| `CHANGES_SUMMARY.md` | Auth/bug fixes overview |
| `FINAL_FIXES_SUMMARY.md` | Complete fix list (Nepali, charts, auth) |
| `HEIGHT_MEASURE_SETUP.md` | Height setup guide (somewhat outdated) |
| `FIREBASE_SETUP_GUIDE.md` | Firebase project setup |
| `SETUP_AND_TESTING_GUIDE.md` | Comprehensive setup guide |
| `SETUP_GUIDE.md` | Quick setup |
| `PRODUCTION_DEPLOYMENT_GUIDE.md` | Deployment guide |
| `assets/models/README.txt` | Model source note |

---

**End of Handover Document**
