# Kapoori Ka Payment Edge Functions

These functions are the **only** trusted route for manual-payment submissions and payment administration. Browser code must not insert into `payments`, upload to `payment-screenshots`, read receipt paths, update payment status, or insert activation-code hashes directly.

| Function | Caller | Responsibility |
|---|---|---|
| `submit-payment` | A signed-in Kapoori Ka user | Validates account/email ownership, applies rate limits, validates image receipt type/size/signature, stores a private receipt, and creates one pending payment. |
| `admin-payments` | A signed-in row in `public.app_admins` | Lists payments with five-minute signed receipt links; approves, rejects, and regenerates activation codes through audited database RPCs. |

## Required production configuration

Set the variables named in `.env.example` through the Supabase Edge Function secrets console or `supabase secrets set`. `SUPABASE_SERVICE_ROLE_KEY` is a server-only secret and must never be placed in Netlify, Firebase Hosting, Expo, static HTML, a Git repository, or a public environment variable.

Set `ALLOWED_ORIGINS` to the exact final HTTPS origins hosting the payment and admin pages. Do not enable preview domains, wildcards, or `localhost` in the production secret. Deploy the migration before deploying the functions, then deploy both functions:

```bash
supabase db push
supabase secrets set --env-file supabase/functions/.env.production
supabase functions deploy submit-payment
supabase functions deploy admin-payments
```

The `.env.production` file is intentionally **not** supplied and must remain outside Git. After deployment, test a normal account, a Premium account, and the dedicated administrator account with the payment-flow checklist before publishing the pages.
