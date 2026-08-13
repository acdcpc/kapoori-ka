-- ============================================================================
-- Fix missing table privileges for migration-00 tables.
--
-- These tables (payments, activation_codes, rate_limits) were created via raw
-- SQL in 20240807000000_payment_activation.sql and did not receive Supabase's
-- default role grants. As a result, every direct client access returned
-- "permission denied for table" (403) — payment submission, admin review, and
-- admin code creation were all broken. This restores the required grants and
-- adds the missing anonymous payment-submission policy.
-- ============================================================================

-- payments: users view own + admins view/update all + public page submits
GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;
GRANT INSERT ON public.payments TO anon;

-- activation_codes: admins create/update codes. SELECT is required so the
-- "Admins can update codes" policy can read the row before updating (RLS still
-- blocks client-side reads since there is no SELECT policy after hashing).
GRANT SELECT, INSERT, UPDATE ON public.activation_codes TO authenticated;

-- rate_limits: accessed only by the SECURITY DEFINER redeem RPC — no grants needed.

-- Allow anonymous payment submissions from the public payment page (payment.html).
DROP POLICY IF EXISTS "Anon can submit payments" ON public.payments;
CREATE POLICY "Anon can submit payments" ON public.payments
  FOR INSERT WITH CHECK (auth.uid() IS NULL AND user_id IS NULL);
