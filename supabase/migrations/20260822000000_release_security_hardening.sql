-- Kapoori Ka production security hardening.
--
-- This migration is forward-only. It removes Premium-as-admin authorization,
-- makes code redemption single-use under concurrency, closes anonymous payment
-- writes, and moves payment state transitions into trusted SQL functions.

-- ---------------------------------------------------------------------------
-- 1. Dedicated administrators: Premium subscribers are never administrators.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  granted_by UUID REFERENCES auth.users(id),
  revoked_at TIMESTAMPTZ,
  note TEXT
);

ALTER TABLE public.app_admins ENABLE ROW LEVEL SECURITY;

-- The intended first administrator is seeded only when that Auth user already
-- exists. If it does not, provision the user first and then use the owner SQL
-- in the release checklist. There is deliberately no client-side insert path.
INSERT INTO public.app_admins (user_id, note)
SELECT id, 'Initial Kapoori Ka administrator'
FROM auth.users
WHERE lower(email) = 'thisispratha@gmail.com'
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_app_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.app_admins AS a
    WHERE a.user_id = p_user_id
      AND a.revoked_at IS NULL
  );
$$;

REVOKE ALL ON FUNCTION public.is_app_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_app_admin(UUID) TO authenticated;

-- Remove every legacy policy that accidentally granted administrator powers to
-- any Premium subscriber.
DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can update payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can create codes" ON public.activation_codes;
DROP POLICY IF EXISTS "Admins can update codes" ON public.activation_codes;

-- Users may continue to read only their own submissions. Privileged reads and
-- state changes now run through the server-side admin handler below.
DROP POLICY IF EXISTS "Dedicated administrators can view all payments" ON public.payments;
CREATE POLICY "Dedicated administrators can view all payments"
ON public.payments
FOR SELECT
TO authenticated
USING (public.is_app_admin(auth.uid()));

-- Subscription status and plan are entitlements. The mobile client may read
-- its own subscription, but no browser/app role may insert, update, or delete
-- a subscription row. Redeeming a code uses the hardened definer function.
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE
  v_policy RECORD;
BEGIN
  FOR v_policy IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'subscriptions'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.subscriptions', v_policy.policyname);
  END LOOP;
END;
$$;
CREATE POLICY "Users can view own subscription"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM anon, authenticated;
GRANT SELECT ON public.subscriptions TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. Protect payment submission and receipt storage from anonymous direct use.
-- ---------------------------------------------------------------------------
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'yearly';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS mobile TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS activation_code_issued_at TIMESTAMPTZ;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS activation_code_issued_by UUID REFERENCES auth.users(id);

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_plan_check;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_plan_check CHECK (plan IN ('monthly', 'yearly')) NOT VALID;

DROP POLICY IF EXISTS "Anon can submit payments" ON public.payments;
DROP POLICY IF EXISTS "Users can insert own payments" ON public.payments;
REVOKE INSERT, UPDATE, DELETE ON public.payments FROM anon, authenticated;
REVOKE ALL ON public.activation_codes FROM anon, authenticated;

DROP POLICY IF EXISTS "Anon can upload payment screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload payment screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own screenshots" ON storage.objects;

-- Explicitly retain a private bucket. The trusted Edge Function uses the
-- service role to write objects; no browser role is allowed to upload or read.
UPDATE storage.buckets
SET public = false,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'payment-screenshots';

CREATE TABLE IF NOT EXISTS public.payment_submission_rate_limits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  request_count INTEGER NOT NULL DEFAULT 1 CHECK (request_count >= 1),
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payment_transaction_references (
  normalized_transaction_id TEXT PRIMARY KEY,
  payment_id UUID UNIQUE REFERENCES public.payments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payment_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  actor_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_submission_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transaction_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_audit_log ENABLE ROW LEVEL SECURITY;

-- The following RPC is intentionally callable only by the service role from
-- the submit-payment Edge Function. It atomically rate-limits, reserves the
-- transaction reference, and creates the pending payment record.
CREATE OR REPLACE FUNCTION public.create_payment_submission(
  p_user_id UUID,
  p_email TEXT,
  p_name TEXT,
  p_mobile TEXT,
  p_plan TEXT,
  p_transaction_id TEXT,
  p_screenshot_path TEXT DEFAULT NULL,
  p_remarks TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
  v_count INTEGER;
  v_window TIMESTAMPTZ;
  v_transaction_id TEXT;
  v_payment_id UUID;
  v_amount NUMERIC;
BEGIN
  IF p_user_id IS NULL OR p_email IS NULL OR length(trim(p_email)) = 0 THEN
    RAISE EXCEPTION 'Authenticated account details are required';
  END IF;

  IF p_plan NOT IN ('monthly', 'yearly') THEN
    RAISE EXCEPTION 'Invalid plan';
  END IF;

  v_transaction_id := upper(regexp_replace(coalesce(p_transaction_id, ''), '[^A-Z0-9_-]', '', 'g'));
  IF length(v_transaction_id) < 6 OR length(v_transaction_id) > 128 THEN
    RAISE EXCEPTION 'Invalid transaction reference';
  END IF;

  IF length(trim(coalesce(p_name, ''))) < 2 OR length(trim(coalesce(p_name, ''))) > 120 THEN
    RAISE EXCEPTION 'Invalid name';
  END IF;

  -- One payment submission per account per 15-minute window. A database upsert
  -- prevents concurrent browser requests from bypassing this limit.
  INSERT INTO public.payment_submission_rate_limits AS r (user_id, request_count, window_started_at)
  VALUES (p_user_id, 1, v_now)
  ON CONFLICT (user_id) DO UPDATE
  SET request_count = CASE
        WHEN r.window_started_at < v_now - interval '15 minutes' THEN 1
        ELSE r.request_count + 1
      END,
      window_started_at = CASE
        WHEN r.window_started_at < v_now - interval '15 minutes' THEN v_now
        ELSE r.window_started_at
      END
  RETURNING request_count, window_started_at INTO v_count, v_window;

  IF v_count > 5 THEN
    RAISE EXCEPTION 'Too many submissions. Please wait before trying again.';
  END IF;

  -- The primary-key insert is the database-level duplicate guard. It blocks a
  -- second concurrent request until the first transaction commits or rolls back.
  INSERT INTO public.payment_transaction_references (normalized_transaction_id)
  VALUES (v_transaction_id)
  ON CONFLICT (normalized_transaction_id) DO NOTHING;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This transaction reference has already been submitted';
  END IF;

  v_amount := CASE WHEN p_plan = 'yearly' THEN 500 ELSE 100 END;

  INSERT INTO public.payments (
    user_id, email, name, mobile, amount, plan, transaction_id,
    screenshot_url, remarks, status
  )
  VALUES (
    p_user_id, lower(trim(p_email)), trim(p_name), nullif(trim(p_mobile), ''),
    v_amount, p_plan, v_transaction_id, nullif(trim(p_screenshot_path), ''),
    nullif(trim(p_remarks), ''), 'pending'
  )
  RETURNING id INTO v_payment_id;

  UPDATE public.payment_transaction_references
  SET payment_id = v_payment_id
  WHERE normalized_transaction_id = v_transaction_id;

  INSERT INTO public.payment_audit_log (payment_id, actor_id, event_type, metadata)
  VALUES (
    v_payment_id,
    p_user_id,
    'submitted',
    jsonb_build_object('plan', p_plan, 'transaction_reference', v_transaction_id)
  );

  RETURN v_payment_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Activation codes: atomic redemption and hardened definer privileges.
-- ---------------------------------------------------------------------------
ALTER TABLE public.activation_codes ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ;
ALTER TABLE public.activation_codes ADD COLUMN IF NOT EXISTS voided_by UUID REFERENCES auth.users(id);
ALTER TABLE public.activation_codes DROP CONSTRAINT IF EXISTS activation_codes_status_check;
ALTER TABLE public.activation_codes
  ADD CONSTRAINT activation_codes_status_check CHECK (status IN ('valid', 'used', 'voided')) NOT VALID;

CREATE OR REPLACE FUNCTION public.redeem_activation_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_code TEXT;
  v_code_hash TEXT;
  v_plan TEXT;
  v_duration_days INTEGER;
  v_end_date TIMESTAMPTZ;
  v_now TIMESTAMPTZ := now();
  v_count INTEGER;
  v_window TIMESTAMPTZ;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Must be signed in.');
  END IF;

  v_code := upper(regexp_replace(coalesce(p_code, ''), '[^A-Z0-9]', '', 'g'));
  IF length(v_code) < 6 OR length(v_code) > 32 THEN
    RETURN jsonb_build_object('error', 'Invalid code format.');
  END IF;

  v_code_hash := encode(extensions.digest(v_code, 'sha256'), 'hex');

  INSERT INTO public.rate_limits AS r (user_id, count, window_start)
  VALUES (v_user_id, 1, v_now)
  ON CONFLICT (user_id) DO UPDATE
  SET count = CASE
        WHEN r.window_start < v_now - interval '15 minutes' THEN 1
        ELSE r.count + 1
      END,
      window_start = CASE
        WHEN r.window_start < v_now - interval '15 minutes' THEN v_now
        ELSE r.window_start
      END
  RETURNING count, window_start INTO v_count, v_window;

  IF v_count > 5 THEN
    RETURN jsonb_build_object(
      'error',
      'Too many attempts. Wait ' || ceil(900 - extract(epoch FROM (v_now - v_window))) || 's.'
    );
  END IF;

  -- This conditional update is the one-time claim. PostgreSQL locks the row;
  -- concurrent callers can never both receive a valid row from RETURNING.
  UPDATE public.activation_codes
  SET status = 'used', used_by = v_user_id, used_at = v_now
  WHERE code_hash = v_code_hash
    AND status = 'valid'
  RETURNING plan INTO v_plan;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Invalid or already used code.');
  END IF;

  v_plan := coalesce(v_plan, 'yearly');
  v_duration_days := CASE WHEN v_plan = 'yearly' THEN 365 ELSE 30 END;
  v_end_date := v_now + (v_duration_days || ' days')::interval;

  INSERT INTO public.subscriptions (user_id, status, plan, start_date, end_date, auto_renew, price)
  VALUES (
    v_user_id, 'active', v_plan, v_now, v_end_date, false,
    CASE WHEN v_plan = 'yearly' THEN 500 ELSE 100 END
  )
  ON CONFLICT (user_id) DO UPDATE
  SET status = 'active',
      plan = excluded.plan,
      start_date = excluded.start_date,
      end_date = excluded.end_date,
      auto_renew = false,
      price = excluded.price;

  DELETE FROM public.rate_limits WHERE user_id = v_user_id;

  RETURN jsonb_build_object('success', true, 'plan', v_plan, 'end_date', v_end_date);
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_activation_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_activation_code(TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.create_payment_submission(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_payment_submission(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- 4. Admin payment transitions: database-atomic, audited, and role-checked.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_approve_payment(
  p_payment_id UUID,
  p_code_hash TEXT,
  p_actor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_now TIMESTAMPTZ := now();
BEGIN
  IF NOT public.is_app_admin(p_actor_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  IF v_payment.status <> 'pending' THEN
    RAISE EXCEPTION 'Payment has already been processed';
  END IF;

  INSERT INTO public.activation_codes (code_hash, status, plan, amount, original_transaction_id)
  VALUES (p_code_hash, 'valid', v_payment.plan, v_payment.amount, v_payment.transaction_id);

  UPDATE public.payments
  SET status = 'approved',
      verified_at = v_now,
      verified_by = p_actor_id,
      activation_code_issued_at = v_now,
      activation_code_issued_by = p_actor_id,
      rejection_reason = NULL
  WHERE id = p_payment_id;

  INSERT INTO public.payment_audit_log (payment_id, actor_id, event_type, metadata)
  VALUES (p_payment_id, p_actor_id, 'approved_code_issued', jsonb_build_object('plan', v_payment.plan));

  RETURN jsonb_build_object('payment_id', p_payment_id, 'status', 'approved');
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reject_payment(
  p_payment_id UUID,
  p_reason TEXT,
  p_actor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_now TIMESTAMPTZ := now();
BEGIN
  IF NOT public.is_app_admin(p_actor_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF length(trim(coalesce(p_reason, ''))) < 3 OR length(trim(p_reason)) > 500 THEN
    RAISE EXCEPTION 'A rejection reason between 3 and 500 characters is required';
  END IF;

  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  IF v_payment.status <> 'pending' THEN
    RAISE EXCEPTION 'Payment has already been processed';
  END IF;

  UPDATE public.payments
  SET status = 'rejected', verified_at = v_now, verified_by = p_actor_id,
      rejection_reason = trim(p_reason)
  WHERE id = p_payment_id;

  INSERT INTO public.payment_audit_log (payment_id, actor_id, event_type, metadata)
  VALUES (p_payment_id, p_actor_id, 'rejected', jsonb_build_object('reason', trim(p_reason)));

  RETURN jsonb_build_object('payment_id', p_payment_id, 'status', 'rejected');
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_regenerate_activation_code(
  p_payment_id UUID,
  p_code_hash TEXT,
  p_actor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_now TIMESTAMPTZ := now();
BEGIN
  IF NOT public.is_app_admin(p_actor_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND OR v_payment.status <> 'approved' THEN
    RAISE EXCEPTION 'Only an approved payment can receive a replacement code';
  END IF;

  IF v_payment.transaction_id IS NULL OR length(trim(v_payment.transaction_id)) = 0 THEN
    RAISE EXCEPTION 'Payment has no transaction reference';
  END IF;

  UPDATE public.activation_codes
  SET status = 'voided', voided_at = v_now, voided_by = p_actor_id
  WHERE original_transaction_id = v_payment.transaction_id
    AND status = 'valid';

  INSERT INTO public.activation_codes (code_hash, status, plan, amount, original_transaction_id)
  VALUES (p_code_hash, 'valid', v_payment.plan, v_payment.amount, v_payment.transaction_id);

  UPDATE public.payments
  SET activation_code_issued_at = v_now,
      activation_code_issued_by = p_actor_id
  WHERE id = p_payment_id;

  INSERT INTO public.payment_audit_log (payment_id, actor_id, event_type, metadata)
  VALUES (p_payment_id, p_actor_id, 'activation_code_regenerated', '{}'::jsonb);

  RETURN jsonb_build_object('payment_id', p_payment_id, 'status', 'approved');
END;
$$;

-- Retain the historical RPC only for an authenticated, dedicated administrator;
-- it is no longer used by the browser dashboard.
CREATE OR REPLACE FUNCTION public.admin_void_codes(p_original_transaction_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_app_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_original_transaction_id IS NULL OR length(trim(p_original_transaction_id)) = 0 THEN
    RAISE EXCEPTION 'A transaction reference is required';
  END IF;

  UPDATE public.activation_codes
  SET status = 'voided', voided_at = now(), voided_by = auth.uid()
  WHERE original_transaction_id = p_original_transaction_id
    AND status = 'valid';
END;
$$;

REVOKE ALL ON FUNCTION public.admin_void_codes(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_void_codes(TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_approve_payment(UUID, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_reject_payment(UUID, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_regenerate_activation_code(UUID, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_approve_payment(UUID, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_reject_payment(UUID, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_regenerate_activation_code(UUID, TEXT, UUID) TO service_role;
