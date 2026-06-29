# Kapoori Ka (SetoKitab) — Setup Guide

## This build targets: Expo SDK 56 · React Native 0.85 · React 19.2

---

## Clean Install (run these in order)

```bash
# Step 1 — Wipe everything old
rm -rf node_modules pnpm-lock.yaml package-lock.json yarn.lock android ios

# Step 2 — Install with SDK 56 package.json (already set in this zip)
pnpm install
# or: npm install

# Step 3 — Check for any issues
npx expo-doctor@latest

# Step 4 — Run on Android
expo start --android
```

> ✅ Yes — you can delete all old content (node_modules, android, ios) and run fresh.
> The source code files do NOT change, only node_modules gets reinstalled.

---

## Firebase Setup (One-time, required for login)

1. Go to **Firebase Console → Project Settings → Your Android App**
2. Run `eas credentials` to get your SHA-1 and SHA-256 fingerprints
3. Add both fingerprints in Firebase Console
4. Download `google-services.json` → place in project root
5. Enable **Phone Authentication** in Firebase → Authentication → Sign-in method

---

## SDK 56 Breaking Changes (already handled in this source)

| Change | Status |
|---|---|
| `@expo/vector-icons` must be explicit in package.json | ✅ Added explicitly |
| React Native 0.85 + React 19.2 | ✅ Correct versions set |
| `expo-notifications` updated to ~0.30.0 | ✅ Done |
| `react-native-screens` updated to 4.5.0 | ✅ Done |
| `react-native-safe-area-context` updated to 5.4.0 | ✅ Done |

---

## What Was Implemented

### ✅ Home Screen UX (Request 1)
- Welcome banner with expandable Nepali/English "How to use" guide
- Feature chips on empty state so parents know what the app does
- FAB has visible "बच्चा थप्नुहोस् / Add Child" label

### ✅ Immunization Nepali Labels (Request 2)
- All status labels fully Nepali: दिइयो / दिनुपर्छ / आउँदो / छुट्यो
- Next vaccine banner at top of screen
- 2-day + same-day push notifications
- Full bilingual schedule table

### ✅ Free vs Paid (Request 3)
- Free: 1 child, basic growth, full immunization + reminders, nutrition guide
- Paid: unlimited children, WHO diagnostics, PDF, milestones, M-CHAT
- eSewa + Khalti: NPR 100/month or NPR 750/year
- Beta free until 2026-07-07

### ✅ WHO Growth Diagnostics (Request 4)
- Normal / Underweight / Severely Underweight / Stunted / Severely Stunted / Overweight / Obese
- Non-urgent doctor recommendation message on abnormal readings
- Push notification scheduled automatically after each save

### ✅ Nutrition Section (Request 5)
- Nepal MoHP + IYCF guidelines for 0–6m through 2–5yr
- Four Star Food groups, Child Food Plate, malnutrition tips
- DoHS Nepal link

### ✅ Growth → Nutrition Link (Request 6)
- "View Nutrition Advice" button on all abnormal growth statuses
- Nutrition screen highlights the child's current age group

### ✅ Security + Individualisation (Requests 7 & 8)
- Phone OTP login (Firebase Auth)
- All records scoped to logged-in user only
- Orphaned records auto-claimed on first login

---

## Troubleshooting

**"undefined is not a function"** → Old node_modules. Run `rm -rf node_modules && pnpm install`

**Notifications not firing** → Ensure `google-services.json` is in root. Test on a real device (not emulator).

**Firebase phone auth failing** → SHA fingerprint not added to Firebase Console. Run `eas credentials`.
