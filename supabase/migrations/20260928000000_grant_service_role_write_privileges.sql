-- Approval succeeded but the activation code was never stored, so the payer's app
-- had nothing to auto-redeem and the account stayed on the free tier.
--
-- Cause: the release-hardening pass revoked table privileges from PUBLIC and
-- re-granted only SELECT to service_role. approve-payment runs as service_role and
-- its post-approval write failed with:
--   42501 permission denied for table payments
--       hint: GRANT UPDATE ON public.payments TO service_role;
-- Every payments row therefore has automation_code_encrypted = NULL, and
-- my-activation-code returns nothing when that column is null.
--
-- This grants the writes the Edge Functions actually perform. Keep it in sync with
-- supabase/functions/*/index.ts:
--   approve-payment           -> payments.update(automation_code_encrypted)
--   send-vaccine-reminders    -> web_push_subscriptions.update/delete,
--                                reminder_delivery_log.insert
DO $$
DECLARE
  t text;
  targets text[] := ARRAY['payments', 'web_push_subscriptions', 'reminder_delivery_log'];
BEGIN
  FOREACH t IN ARRAY targets LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO service_role;', t);
    ELSE
      RAISE NOTICE 'skipping missing table public.%', t;
    END IF;
  END LOOP;
END
$$;
