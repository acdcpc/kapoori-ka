# Kapoori Ka Release-Security Implementation Changes

**Status:** Code changes are complete and ready for review. They are committed to Git only after the final validation and do **not** automatically change the live Supabase database, Edge Functions, Netlify site, Firebase Hosting site, or any already-deployed legacy Firebase functions.

This document explains exactly what changed, why it changed, and what the project owner must do before publishing the updated payment flow.

## 1. Security changes at a glance

| Area | Earlier risk | Implemented control | Files |
|---|---|---|---|
| Administrator authority | A Premium subscription could grant database administrator privileges. | A dedicated `public.app_admins` table is the only source of administrator authorization. Premium status no longer confers administrative access. | `supabase/migrations/20260822000000_release_security_hardening.sql` |
| Activation-code redemption | Two simultaneous requests could potentially redeem the same valid code. | Code claiming now uses a conditional `UPDATE ... RETURNING` in a single transaction, so only one request can claim a code. | `supabase/migrations/20260822000000_release_security_hardening.sql` |
| Manual payment submissions | Browser code could write payment rows and receipt objects directly with anonymous/public permissions. | An authenticated Edge Function validates and stores the receipt, creates the payment row, and enforces a per-user submission limit. | `supabase/functions/submit-payment/index.ts` |
| Payment administration | The static dashboard could make direct database writes and relied on a browser email allowlist. | A dedicated administrator Edge Function performs approved operations through audited database RPCs only. | `supabase/functions/admin-payments/index.ts`, `netlify/admin/index.html` |
| Receipt storage | Anonymous storage policies allowed an unnecessarily broad upload surface. | `payment-screenshots` is private; only trusted Edge Functions handle receipt object writes and signed review links. | `supabase/migrations/20260822000000_release_security_hardening.sql` |
| Privileged SQL routines | `SECURITY DEFINER` routines did not consistently fix the schema search path. | All newly created privileged routines use `SET search_path = ''` and schema-qualified objects. | `supabase/migrations/20260822000000_release_security_hardening.sql` |
| Legacy Firebase authority | Obsolete Firebase payment functions remained in the repository. | The unused legacy Firebase Cloud Function source was removed. Firebase is retained in the app only for FCM-related functionality. | `functions/` removed |
| Static page delivery | Netlify/Firebase static hosts did not have the same explicit release headers and pages loaded the client library from a CDN. | Both hosts now use explicit CSP/cache policies and a pinned local Supabase browser client. | `netlify.toml`, `firebase.json`, `public/_headers`, `netlify/vendor/`, `public/vendor/` |
| Expo release health | Expo doctor had SDK patch-version mismatches and the production dependency audit identified patchable transitive vulnerabilities. | Expo SDK 57 dependencies were aligned; patched `undici` and `nanoid` overrides were added. | `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` |

## 2. File-by-file explanation

### Database and authorization

`supabase/migrations/20260822000000_release_security_hardening.sql` is the central security migration. It adds `public.app_admins`, enables and locks down row-level security for that table, removes the former Premium-based administrator checks, and provides two narrow helper functions: `public.current_user_is_admin()` and `public.require_current_admin()`.[1]

The same migration changes activation-code redemption to lock and conditionally update the code from `valid` to `used` before creating the subscription. A second competing request receives no claimed row and fails; it cannot create a second subscription from the same code. The migration also adds a 15-minute / three-submission rate limit for manual payment evidence, makes receipt storage private, and strips direct browser write access from `payments`, `activation_codes`, and `subscriptions`.[1]

| New database routine | Who may call it | Purpose |
|---|---|---|
| `redeem_activation_code(p_code)` | Signed-in user | Atomically consumes one valid code and grants that user their plan. |
| `create_payment_submission(...)` | Service role only | Creates a pending payment after the Edge Function validates and stores the receipt. |
| `admin_list_payments(...)` | Dedicated admin only | Returns a bounded payment list for the protected admin dashboard. |
| `admin_approve_payment(...)` | Dedicated admin only | Approves a pending payment and generates one activation code atomically. |
| `admin_reject_payment(...)` | Dedicated admin only | Rejects a pending payment with a reason. |
| `admin_regenerate_activation_code(...)` | Dedicated admin only | Voids an unredeemed old code and creates a replacement atomically. |

### Protected payment and administrator endpoints

`supabase/functions/submit-payment/index.ts` is a new authenticated Edge Function. It requires a valid Supabase user token, verifies that the form email matches the signed-in account, enforces strict lengths and plan/payment-method values, permits only JPEG/PNG/WebP receipts up to 5 MB, checks image-file signatures rather than trusting the browser MIME label, uploads to a private owner-prefixed path, then calls the privileged database routine. If the database routine fails, it removes the newly uploaded object as cleanup.[2]

`supabase/functions/admin-payments/index.ts` is a new authenticated Edge Function for the administrator page. It verifies the signed-in user against `app_admins`, calls narrow RPCs for list/approve/reject/regenerate operations, and issues receipt links that expire after five minutes. No service-role secret is ever sent to the browser.[3]

`supabase/config.toml` requires JWT verification for both functions. `supabase/functions/.env.example` lists the server-only configuration names, while `supabase/functions/README.md` describes deployment and secret-handling requirements. Never place `SUPABASE_SERVICE_ROLE_KEY` in Expo, Netlify, Firebase Hosting, static HTML, or Git.[4]

### Static payment and admin pages

`netlify/payment.html` now requires sign-in and invokes `submit-payment` instead of uploading directly to Storage or inserting directly into `payments`. `netlify/admin/index.html` now invokes `admin-payments` for every data action; it no longer treats a client-side `adminEmails` array as authorization. The identical hardened pages are copied to `public/payment.html` and `public/admin/index.html` for Firebase Hosting compatibility.[5]

The browser client bundle is now supplied locally in `netlify/vendor/supabase-js.min.js` and `public/vendor/supabase-js.min.js`, rather than being fetched at runtime from a CDN. This makes Content Security Policy enforcement practical and pins the reviewed client version with the release source.[5]

### Host headers and legacy Firebase functions

`netlify.toml` now declares the publish directory, payment-page redirect, strict Content Security Policy, anti-clickjacking and MIME-sniffing protections, and no-store caching for payment/admin pages. `firebase.json` contains equivalent Firebase Hosting headers. `public/_headers` is aligned for the Expo/PWA static export.[6]

The obsolete `functions/` directory was deleted because its Firestore-based payment and premium functions were no longer used by the Supabase architecture. **If those Firebase functions were previously deployed, deleting repository files does not delete their remote deployment.** The owner must remove them in the Firebase / Google Cloud console after confirming the Supabase flow is operational.[6]

### App code and dependency hygiene

`src/context/AuthContext.tsx` no longer inserts a subscription row from the client after sign-up and no longer logs account email addresses during account creation. Subscription creation is now exclusively a server-controlled action after code redemption.[7]

`package.json` adds `validate:release-security`. `scripts/validate-release-security.mjs` compiles the inline page scripts without running them and asserts that public/Netlify pages remain identical, that direct payment/storage operations are absent, that protected Edge Functions are used, and that the migration includes the critical controls. `pnpm-workspace.yaml` pins patched versions of `undici` and `nanoid`; Expo dependency patches were aligned with SDK 57.[8]

## 3. Verification already performed

| Verification | Result |
|---|---|
| TypeScript | `pnpm exec tsc --noEmit` passed. |
| Expo compatibility | `pnpm dlx expo-doctor` reported **21/21 checks passed**. |
| Web export | `pnpm run build:web` exported the production web bundle successfully. |
| Static payment/admin controls | `pnpm run validate:release-security` passed. |
| Git diff integrity | `git diff --check` passed with no whitespace errors. |

The production dependency audit was reduced from 19 findings (7 high) to three transitive findings: two high `image-size@2.0.2` advisories and one moderate `uuid` advisory inherited through Expo tooling packages. The audit identifies `image-size >= 2.0.3` as fixed, but that version was not available in the registry during this review. Do not force a nonexistent version. Track the upstream package/Expo update and re-run `pnpm audit --prod --audit-level=high` before each release.[8]

## 4. Required owner actions before launch

These are deployment-side actions. They cannot be safely performed by a Git commit because they change live services and require the owner’s credentials.

| Order | Owner action | Why it is required |
|---:|---|---|
| 1 | Apply the new Supabase migration to the intended production project. | The new database tables, RLS policies, private bucket policy, and RPCs do not exist until migrated. |
| 2 | Create the dedicated Supabase Auth user for `thisispratha@gmail.com`, then add that user’s `auth.users.id` to `public.app_admins`. | This is the replacement for the insecure hard-coded browser email allowlist. |
| 3 | Configure the Edge Function secrets, especially `ALLOWED_ORIGINS`, to the exact final HTTPS payment/admin domains. | The service role must remain server-only and CORS must not trust preview/wildcard origins. |
| 4 | Deploy `submit-payment` and `admin-payments` after the migration. | The static pages rely on these protected endpoints. |
| 5 | Deploy either the Netlify static directory or Firebase Hosting static directory, then fetch the real URL and verify the response headers. | Committed header files do not prove a provider applied them. |
| 6 | Run the complete 15-case payment-flow checklist using two normal accounts and the dedicated administrator account. | This validates payment submission, approval, denial, regeneration, expiry, race behavior, and account isolation. |
| 7 | Delete any previously deployed legacy Firebase payment Cloud Functions after confirming Supabase works. | Git deletion does not remove an existing cloud deployment. |

> **Do not publish the payment page before steps 1–4 and the payment-flow test are complete.** Until the migration and functions are deployed, the updated static page intentionally cannot complete a payment submission.

## 5. Commands for the owner or deployment operator

Run these only after authenticating the Supabase CLI to the correct project and setting real secrets outside Git:

```bash
# 1. Apply the reviewed migration.
supabase db push

# 2. Set production secrets from a local, untracked environment file.
supabase secrets set --env-file supabase/functions/.env.production

# 3. Deploy the protected functions.
supabase functions deploy submit-payment
supabase functions deploy admin-payments

# 4. Re-run repository checks before creating the APK/PWA release.
pnpm exec tsc --noEmit
pnpm dlx expo-doctor
pnpm run build:web
pnpm run validate:release-security
pnpm audit --prod --audit-level=high
```

To grant the intended administrator after they have created an Auth account, use the Supabase SQL editor as the project owner:

```sql
insert into public.app_admins (user_id)
select id
from auth.users
where lower(email) = 'thisispratha@gmail.com'
on conflict (user_id) do nothing;
```

## References

[1]: ./supabase/migrations/20260822000000_release_security_hardening.sql "Release-security database migration"
[2]: ./supabase/functions/submit-payment/index.ts "Protected payment submission function"
[3]: ./supabase/functions/admin-payments/index.ts "Protected administrator payment function"
[4]: ./supabase/config.toml "Edge Function JWT configuration"
[5]: ./netlify/payment.html "Protected payment page"
[6]: ./netlify.toml "Netlify static-host security configuration"
[7]: ./src/context/AuthContext.tsx "Authentication context"
[8]: ./scripts/validate-release-security.mjs "Static release-security regression checks"
