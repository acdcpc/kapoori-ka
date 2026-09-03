# OWNER_ACTIONS.md — Kapoori Ka remaining work

Status: ✅ **DONE (verified live 2026-08-24)** · ⏳ **Requires Owner**

This file is the single source of truth for what is left. Everything marked
DONE was applied and verified on the live Supabase project
`tgnzucqjebnisgrxjfjg` via the Management API / Supabase CLI, not just written.

---

## ✅ Done on the live backend (2026-08-24)

| Item | Evidence |
| --- | --- |
| Migration `20260818000000_child_photos_private` | applied (HTTP 201) |
| Migration `20260822000000_release_security_hardening` | applied; `app_admins` exists with RLS on |
| Migration `20260823000000_caregiver_health_foundations` | applied; all new tables exist with RLS on |
| Admin granted | `thisispratha@gmail.com` present in `app_admins` (join-verified, `revoked_at` null) |
| Edge Function secret `ALLOWED_ORIGINS` | set to `https://kapoori-ka.netlify.app` (SUPABASE_URL/ANON/SERVICE_ROLE are auto-injected, not settable) |
| `submit-payment` deployed | ACTIVE v1, JWT-gated |
| `admin-payments` deployed | ACTIVE v1, JWT-gated |
| `aggregate-health-metrics` deployed | ACTIVE v1, JWT-gated |
| `service_role` SELECT grants fixed | granted SELECT on `app_admins`, `payments`, `user_privacy_preferences` (edge functions read these directly; formerly "permission denied") |

## ⏳ Requires Owner

### 1. Two-account end-to-end tests (Supabase live)
Create two real test accounts (owner + caregiver) and verify, using the
deployed functions:
- Payment: submit → pending → approve → exactly one code; reject with reason;
  regenerate voids the old code.
- Code race: redeem the same code concurrently → exactly one success.
- Caregiver: invite → accept → revoke; unrelated account denied; owner-only
  export audit entries.
- Analytics: opt-in, opt-out, and confirm `aggregated_health_metrics` gets
  only counts (`metric_date/country/bucket`), no child identifiers.
- Offline: queue while offline on one device, replay after reconnect, then
  log out and log in as a different account → queued rows stay put.

### 2. `ALLOWED_ORIGINS` expansion
Currently only `https://kapoori-ka.netlify.app`. Add the Firebase Hosting URL
and the PWA origin once live, or CORS will reject those origins' calls.

### 3. Static pages + headers
Deploy `netlify/` (Netlify) and `public/` (Firebase Hosting), then verify:
`curl -I https://<domain>/payment.html` shows CSP, `x-frame-options: DENY`,
`x-content-type-options: nosniff`, `cache-control: no-store`.

### 4. Legacy removal
Delete the old Firestore-based Cloud Functions from the Firebase console
(git deletion does not undeploy).

### 5. OAuth / Auth console
- Supabase → Authentication → Redirect URLs: add `https://<domain>/auth/callback` + `https://<domain>`.
- Google Cloud → OAuth client → Authorized redirect URIs: same `/auth/callback`.
- [x] `mailer_autoconfirm` dashboard toggle — **DONE 2026-09-03** (email confirmation OFF; verified via live signup returning a session). Tradeoff accepted: no email-ownership proof at signup; password + RLS still protect data.

### 6. Android + device
- `eas login` (as `alokthapas-team`) → `eas build --profile preview --platform android` (SDK 57 path unverified since upgrade).
- Physical iPhone Safari + PWA install test once a live URL exists.

### 7. Clinical & content governance
- Nepal-based clinician sign-off before activating any non-Nepal schedule,
  feeding guidance, or growth-threshold content (`clinical_content_versions`
  ships with `is_active=false`).
- Curate a real clinic-facility directory (do not ship guessed data).

### 8. Housekeeping
- Domain application: confirm spelling (`docpraksh.com.np` vs `docprakash`),
  cover letter JPG <200 KB, Cloudflare nameservers, DNS + redirect.
- `git fetch --unshallow`.
- Revoke the `sbp_…` personal access token that was shared in chat
  (Dashboard → Account → Access Tokens).
