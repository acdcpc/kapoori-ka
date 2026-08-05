# Google Play Console Submission Checklist — कपूरी क (Kapoori Ka)

## Before You Start
- [ ] Play Console account created and $25 registration fee paid
- [ ] Developer name verified

## Step-by-Step Checklist

### 1. Create App Entry
- [ ] Go to Play Console → Create app
- [ ] App name: "कपूरी क — Child Health" (29 characters)
- [ ] Default language: English
- [ ] App type: App (not Game)
- [ ] Select Free

### 2. Store Listing
- [ ] **App name:** "कपूरी क — Child Health"
- [ ] **Short description:** "Bilingual child health tracker with WHO growth charts and Nepal immunization schedule."
- [ ] **Full description (English):** Copy from `docs/play-store/store-listing.md`
- [ ] **Full description (Nepali):** Copy from `docs/play-store/store-listing.md`
- [ ] **Screenshots:** 📸 **NEEDS ACTION FROM YOU** — Take 2-8 screenshots showing:
  - Home dashboard with child profile
  - Growth chart screen
  - Immunization schedule
  - M-CHAT screening
  - Nepali language view
  - 16:9 or 9:16 aspect ratio, PNG or JPEG, min 320px, max 3840px
- [ ] **Feature graphic:** 📸 **NEEDS ACTION FROM YOU** — 1024×500px PNG/JPEG banner
- [ ] **App icon:** ✅ Uses `assets/icon.png` from project
- [ ] **Category:** Parenting (primary), Medical (secondary)

### 3. Content Rating
- [ ] Open Content Rating section → Start Questionnaire
- [ ] Answer using values from `store-listing.md` IARC section
- [ ] Expected rating: **Everyone (E)**
- [ ] Submit and wait for rating to be assigned

### 4. Target Audience
- [ ] Target age: 18+
- [ ] **IMPORTANT:** Under "Target audience and content" → "App content suitable for families?", mark "No" (this app is for parents, not directed at children)
- [ ] Do NOT check "Designed for families" or any child age ranges

### 5. Data Safety
- [ ] Open Data Safety section
- [ ] Copy all answers from `docs/play-store/data-safety.md`
- [ ] Ensure all data types are listed correctly

### 6. Privacy Policy
- [ ] 🔴 **BLOCKER — NEEDS ACTION FROM YOU** — Host the privacy policy
  - Option A: Upload to GitHub Pages (free)
  - Option B: Create a simple public HTML page on any web host
  - Option C: Use a privacy policy generator service
- [ ] Privacy policy URL must be in the app (Settings → Privacy Policy)
- [ ] Enter the hosted URL in Play Console

### 7. App Access
- [ ] Provide login instructions for app reviewers:
  - "The app supports Google Sign-In and email/password registration. A demo account is available: demo@kapoori.app / Demo1234 (temporary). Reviewers may also create their own account."
  - 🔴 **NEEDS ACTION FROM YOU** — Create a demo account and provide credentials

### 8. News Apps Declaration
- [ ] Mark "Not a news app" unless you plan to add news features

### 9. COVID-19 Related Apps
- [ ] Mark "No" — this is a child health app, not COVID-specific

### 10. Financial Features Declaration
- [ ] Mark "No" — no financial transactions in the app

### 11. Ads Declaration
- [ ] Mark "No" — no ads in the app

### 12. App Content Declaration
- [ ] Classification: "No, my app does not contain ads"
- [ ] Content labels: None applicable

### 13. App Bundle / APK Upload
- [ ] 🔴 **NEEDS ACTION FROM YOU** — Build APK/AAB with EAS
  ```bash
  eas build --profile preview --platform android
  ```
- [ ] Upload to Play Console → Testing → Internal testing (first) OR Production

### 14. Pricing and Distribution
- [ ] App price: Free
- [ ] Countries: Select "All countries" or specify Nepal + others
- [ ] Device categories: Android Phone (required), Tablet (optional)

### 15. Pre-Launch Report
- [ ] After uploading APK, Play Console automatically runs tests
- [ ] Review pre-launch report results
- [ ] Fix any issues flagged by automated testing

### 16. Submit for Review
- [ ] Review all sections for completeness
- [ ] Click "Send for review" or "Publish"
- [ ] Wait time: typically 2-7 days for first app
- [ ] Monitor Play Console for any rejection feedback

---

## Manual Actions Required From You

| # | Action | Priority |
|---|--------|----------|
| 1 | **Host the privacy policy at a public URL** | 🔴 Critical — blocking submission |
| 2 | **Create a demo account for app reviewers** | 🔴 Required for login-gated apps |
| 3 | **Take screenshots (6-8) in both English and Nepali** | 🔴 Required for store listing |
| 4 | **Create feature graphic (1024×500px)** | 🔴 Required for store listing |
| 5 | **Build and upload the APK/AAB** | 🔴 Required for submission |
| 6 | **Configure Firebase Analytics data retention** (optional) | 🟡 Post-submission |
| 7 | **Set up Google Play developer email** for user support | 🟡 Post-submission |
| 8 | **Verify OAuth consent screen** in Google Cloud Console | 🟡 Before public launch |
| 9 | **Update app.config.js** with privacy policy URL once hosted | 🟡 Before next build |
