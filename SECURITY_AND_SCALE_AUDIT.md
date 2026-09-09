# Security, Privacy & Scale Audit — 2026-09-09
Scope: full live-database review (24 tables, 33 policies, 3 storage buckets, indexes), payment automation, and operational readiness. Evidence collected from the live project via the Management API on this date.

## 1. Security & RLS — PASS
- **24/24 tables have RLS enabled.** Zero tables exposed without row-level security.
- **33 policies reviewed.** Every user-data table is owner-scoped (`user_id = auth.uid()`) or caregiver-scoped via `can_access_child(child_id, 'viewer'|'editor')`. Verified policy SQL for: children, growth_records, vaccinations, milestones, feeding_records, clinic_visits, autism_screenings, child_memberships, child_invitations, record_export_audit, profiles, subscriptions, user_privacy_preferences, push_tokens, payments.
- **payments**: SELECT restricted to `auth.uid() = user_id` OR `is_app_admin()` — payers see only their own submissions; only admins see the queue.
- **`activation_codes` and `app_admins` have NO client-readable policies** (RLS on, zero policies) — codes and the admin list are reachable only through SECURITY DEFINER functions and the service role. Even a full client compromise cannot read unused codes or enumerate admins.
- **Storage**: all three buckets (`child-photos`, `payment-screenshots`, `pdf-reports`) are **private** with a 5 MB cap — no public object access.
- **Edge Functions**: `verify_jwt` on all five functions; admin actions double-check `is_app_admin` server-side; the automation code plaintext never touches the database unencrypted (AES-256-GCM, key in server-only secrets; DB holds only the SHA-256 hash + sealed payload).
- Rate limiting exists for payment submissions (`payment_submission_rate_limits`, `rate_limits`).

## 2. Privacy — PASS
- The landing page and website collect nothing (no forms, no analytics by default).
- In-app analytics is opt-in (`user_privacy_preferences`, consent-gated, coarse counts only) with an offline-safe consent queue.
- Private data (photos, health records, payment proofs) lives in private buckets; exports are caregiver-triggered and audited (`record_export_audit`).
- Automated test artifacts from verification were deleted after the check.

## 3. Scale — architecture PASS, tier is the budget line
- **What holds up at 1 lakh (100k) users**: supabase-js talks to PostgREST over HTTP (no per-user DB connections), Edge Functions are stateless, push notifications are sent per-event (1 request), and after this audit every hot query is index-backed.
- **What this audit fixed** (migration `20260909000000_scale_indexes.sql`, applied live): owner-scoped indexes on children/growth_records/vaccinations/milestones/subscriptions, child-scoped composite indexes on growth_records/clinic_visits/autism_screenings/record_export_audit, and payment hot-path indexes `(user_id, created_at DESC)` + `(status, created_at DESC)` for the payer status check and the owner review queue.
- **What cannot hold at 100k on the FREE tier**: Supabase free = 500 MB DB / 5 GB egress / limited compute. 100k users is a Pro-plan + compute add-on reality (~$25–100/mo depending on load) plus daily backups/PITR. Architecture is ready; the tier is a business decision.
- **Recommendations before mass rollout**: enable Supabase daily backups/PITR, add crash reporting (Sentry or equivalent — Crashlytics was removed with the Firebase migration), and ship behind a staged rollout.

## 4. Design & UX — PASS with notes
- Bilingual (Nepali-first) with persistent language choice; dark/light/system theming with quick controls on Home; 44 px+ touch targets; offline-first submissions with automatic retry; clear empty/locked/pending/active states on Subscription.
- Notes: screen-reader + 320–430 px audit remains an owner action (per WEBSITE_RELEASE_NOTES.md); Nepali copy fluency review recommended before mass rollout.

## 5. Admin & maintainability — PASS
- Owner tooling: in-app payment review (push → 2-tap approve/reject), web admin panel fallback, payment audit log (`payment_audit_log`), OWNER_ACTIONS.md runbook, automated keep-alive (weekly heartbeat) and a retry watchdog.
- Health gates: `tsc --noEmit`, `expo-doctor` 21/21, `validate:caregiver-features`, `validate:release-security`, `build:web` — all green on the current tree.
- Deploy runbook is documented; secrets live in Edge Function secrets (never in the repo or client bundle).

## 6. Executive summary (the CEO lens)
The security model is genuinely defensible: RLS everywhere, hash-only codes, private storage, audited admin actions, server-side-only secrets. The failure mode at scale is not architecture — it is **operational budget** (Supabase tier + backups) and **observability** (add crash reporting before mass rollout). Both are purchase/configuration decisions, not rewrites.


## 7. Growth data clinical accuracy audit (2026-09-09, follow-up)
- Full cross-check of every growth table row (weight/height/BMI/HC, both sexes, every declared age) against the official WHO 2006 Standards + WHO 2007 Reference day-level datasets (via the AnthStat WHO2006/WHO2007 data, used by USAID/FANTA nutrition tools).
- **Found and fixed**: the original height-for-age table was wrong above 24 months (24mo median 85.7 vs official 87.1; 60mo 106.0 vs official 110.0; 10y 129.3 vs 137.8 — up to 20 cm drift by adolescence), and weight/BMI tables drifted at older ages.
- **Fix**: all four tables (weight 0–120mo, height 0–216mo, BMI 24–216mo, head circumference 0–60mo) regenerated EXACTLY from official LMS data, with exact L/M/S parameters exported alongside the SD columns; z-scores now computed with the WHO LMS formula (z = ((v/M)^L − 1)/(L·S)) instead of approximations.
- **Verification**: `scripts/audit-growth-tables.py` reports **0 discrepancies** against official data; `scripts/validate-hc-calculations.mjs` passes all published WHO anchors and real-data cases.
- Note: head-circumference-for-age is defined by WHO for 0–60 months only; the app hides the HC tab beyond 5 years.
