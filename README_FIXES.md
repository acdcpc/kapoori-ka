# Kapoori Ka — Supabase Migration (Current State)

This app was migrated from Firebase (Auth + Firestore) to Supabase in July 2026.  
Firebase is kept **only** for Analytics, Crashlytics, Cloud Messaging (FCM), and Cloud Functions (`redeemCode`).

## Architecture (Post-Migration)

| Concern | Before | After |
|---------|--------|-------|
| Authentication | Firebase Auth | Supabase Auth (email, anonymous, Google OAuth) |
| Database | Cloud Firestore | Supabase Postgres (7 tables, RLS) |
| Storage | Firebase Storage | Supabase Storage (child-photos, pdf-reports) |
| Push Notifications | FCM | FCM (unchanged) |
| Analytics | Firebase Analytics | Firebase Analytics (unchanged) |
| Crash Reporting | Firebase Crashlytics | Firebase Crashlytics (unchanged) |
| Activation Codes | Firebase Cloud Functions | Firebase Cloud Functions (redeemCode, unchanged) |

## Files Changed

- **`src/lib/supabase.ts`** — Supabase client (Auth + Data + Storage)
- **`src/context/AuthContext.tsx`** — Rewritten to use `supabase.auth.*` and `supabase.from('profiles'/'subscriptions')`
- **`src/screens/*.tsx`** (9 screens) — All `firebase/firestore` imports replaced with `supabase.from()`
- **`firebase.ts`** — Still exports `functions` (for redeemCode); Auth and Firestore instances kept for Analytics/FCM init but screens don't use them

## Supabase Project

- **URL**: `https://tgnzucqjebnisgrxjfjg.supabase.co`
- **Tables**: children, growth_records, vaccinations, milestones, autism_screenings, profiles, subscriptions
- **RLS**: All tables allow `authenticated` + `anon` with `USING (true) WITH CHECK (true)`
- **Auth**: Email/Password, Anonymous, Google OAuth
- **Email confirmation**: OFF
- **Storage buckets**: `child-photos` (public), `pdf-reports` (private)

## Environment Variables

See `.env.example` for the full list. Key changes:
- `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` added
- All `EXPO_PUBLIC_FIREBASE_*` vars kept (needed for Analytics/Crashlytics/FCM)

## Build Status

- **Latest APK**: Build `c20c5764-c5eb-4704-b19d-0565e4f057f0` (commit `4be912d`, branch `feature/supabase-fix`)
- **TypeScript**: Zero errors
- **Android**: Tested on Samsung A24

## Known Issues

See [`PROJECT_HANDOVER.md`](./PROJECT_HANDOVER.md) for the full bug tracker.
