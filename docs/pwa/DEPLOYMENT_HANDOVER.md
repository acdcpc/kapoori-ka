# Kapoori Ka — Deployment Handover

Date: 2026-08-17 · No secrets are recorded here.

## Host topology (two surfaces, intentionally separate)
| Surface | Host | Paths |
|---|---|---|
| App / PWA (Expo web export) | Function Compute — nginx static | `dist/` contents + `nginx.conf` (SPA fallback `try_files $uri $uri/ /index.html`) |
| Payment + admin + guide (separate website) | Netlify | `netlify/payment.html`, `netlify/admin/`, `netlify/payment-guide.html`, `netlify/esewa-qr.png` (`publish = "netlify"`, `/` → `/payment.html`) |

The PWA never ships `admin/` or payment pages (spec: no admin capability in the PWA, no payment CTAs).

## Build & verify
```
pnpm install --frozen-lockfile
pnpm build:web        # expo export -p web  →  dist/
npx tsc --noEmit      # must pass
# secrets scan of dist/ before any deploy:
grep -Rl "service_role\|sb_secret_cw" dist/ || echo "clean"
```
`dist/` is gitignored (source-only repo). Build on the host, not from a committed `dist/`.

## Environment (public client config only)
- `EXPO_PUBLIC_WEB_APP_URL` — production HTTPS origin (e.g. `https://app.kapoorika.com.np`). Non-secret.
- Only the Supabase URL + publishable/anon key may be browser-exposed. `service_role` and private keys stay out of Git, the bundle, and the host env.

## Manual console steps (owner only — cannot be automated)
1. **Choose production domain** (e.g. `app.kapoorika.com.np`). OAuth + PWA install depend on the exact HTTPS origin.
2. **Supabase Dashboard → Authentication → URL Configuration → Redirect URLs** — add the exact values:
   - `https://<domain>/auth/callback`
   - `https://<domain>` (and any preview origin while testing)
   No wildcards, no guessed URLs.
3. **Google Cloud Console → APIs & Services → Credentials → the OAuth client used by the Google provider → Authorized redirect URIs** — add `https://<domain>/auth/callback`.
4. **Set `EXPO_PUBLIC_WEB_APP_URL`** on the selected static host (encrypted build config).
5. **Disable `mailer_autoconfirm`** in Supabase if email confirmation is desired (registration UX).
6. **Physical iPhone Safari test** — Add to Home Screen, OAuth, photo, report. Desktop emulation is not an iPhone test.

## Preview → production
1. Deploy to a **preview** URL first; test there (HTTPS is required for camera/install/OAuth).
2. Only then add the final custom domain and update Supabase/Google redirect URLs to match the final HTTPS domain **exactly**.
3. Do **not** publish to production while the OAuth callback still points at localhost or a temporary preview URL.
4. Formal publication (Function Compute `Publish`, or Netlify promote) is an owner action.

## Rollback
A rollback must restore **both** the prior static deployment **and** the matching OAuth redirect configuration (the deployed origin and the Supabase/Google allow-list must stay consistent). The prior deployment is recoverable from Git history (`git log` → previous commit → rebuild `dist/`).

## Secret handling
- `.env` / `.env.*` are gitignored (`.env.example` is the committed template).
- Never commit `google-services.json`, `GoogleService-Info.plist`, service-role keys, test-account credentials, or raw payment receipts.
