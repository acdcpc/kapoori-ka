# Google Play Data Safety Form — कपूरी क (Kapoori Ka)

## Data Collected

| Data Type | Required/Optional | Purpose | Shared with 3rd Parties? |
|-----------|-------------------|---------|--------------------------|
| **Email address** | Required (account creation) | Authentication, account recovery | No — stored in Supabase, not shared |
| **Name (parent)** | Optional (profile) | Display name | No |
| **Child name, date of birth, sex** | Required (core functionality) | Growth tracking, immunization schedule, milestones | No |
| **Child weight, height measurements** | Optional (manual entry) | WHO growth chart plotting | No |
| **Child immunization status** | Optional (manual entry) | Vaccine schedule tracking, reminders | No |
| **Child developmental milestones** | Optional (manual entry) | Milestone tracking | No |
| **Child M-CHAT screening responses** | Optional (manual entry) | Autism screening | No |
| **Child photo** | Optional (camera/gallery) | Profile avatar | No — stored in Supabase Storage |
| **App activity (screen views, feature usage)** | Automatic | Analytics (Firebase Analytics) | **Yes** — Firebase Analytics (Google) |
| **Crash logs** | Automatic | Crash reporting (Firebase Crashlytics) | **Yes** — Firebase Crashlytics (Google) |
| **Device ID / installation ID** | Automatic | Analytics, crash reporting | **Yes** — via Firebase SDK |
| **Push notification token** | Automatic | Vaccine reminders via FCM | **Yes** — Firebase Cloud Messaging (Google) |

## Data Shared with Third Parties

| Third Party | Data Shared | Purpose |
|-------------|-------------|---------|
| **Google (Firebase)** | App activity (screen views), crash logs, device/installation ID, FCM token | Analytics, crash reporting, push notifications |
| **Supabase** | All user-entered data (email, child data, measurements) | Backend database — this is our infrastructure, not a third party |

**No data is sold. No data is shared with advertisers, data brokers, or other third parties beyond the infrastructure providers listed above.**

## Security Practices

- **Data in transit:** All communication uses HTTPS/TLS encryption
- **Data at rest (Supabase):** Data is encrypted at rest on Supabase servers
- **Data at rest (device):** Session tokens stored in `expo-secure-store` (Android Keystore encrypted). No user data stored unencrypted on device.
- **Access control:** Row-Level Security (RLS) enabled on all database tables — each user can only access their own data
- **Authentication:** Email confirmation required. Google OAuth with verified redirect URIs. No anonymous accounts can access data.

## Data Deletion

Users can delete their account and all associated data through the app:
- Delete individual children (profile → delete) — cascading deletion of all associated records
- Delete account (account settings) — removes all user data from Supabase

Data is deleted from Supabase servers immediately upon user action. Firebase Analytics data retention follows Google's standard retention policies (configurable in Firebase console).

## Families Policy — Children's Data

**This app is NOT directed at children under 13.**

The app is built for parents and guardians to track their own children's health data. All child data is entered by the adult account holder. No child enters data directly into the app.

Children's health data (name, DOB, measurements, immunization records, screening results) is:
- Stored in Supabase with RLS protection (only the parent account can access it)
- Never shared with third parties
- Never used for advertising
- Deletable by the parent at any time

**Family Policy classification:** The app is designed for **adults**. It does not target children as a primary or secondary audience. It should be classified accordingly in the Play Console target audience settings.
