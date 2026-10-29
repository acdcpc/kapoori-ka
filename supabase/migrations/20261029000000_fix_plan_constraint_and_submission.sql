-- Fix: the 6-month plan could not be purchased at all.
--
-- `payments_plan_check` was created in 20260822000000 as
--   CHECK (plan IN ('monthly','yearly'))
-- and never updated. The purchase flow moved to '6months' in 20260910000001, so
-- every six-month submission inserted a value the constraint forbids and failed
-- with SQLSTATE 23514 (check_violation). `NOT VALID` exempts only rows that
-- existed at creation time — new INSERTs are always checked.
--
-- Second problem fixed here: 20261007000000 redefined create_payment_submission
-- by copying an older body, silently reverting the 20260910000002 removal of the
-- monthly plan. That re-admitted 'monthly' at NPR 100 while admin_approve_payment
-- grants "anything not yearly" six months — i.e. NPR 100 for a NPR 650 term.
-- The allowlist and amounts are restored below, keeping the auth.uid() actor
-- binding that 20261007000000 added.

-- ── 1. Constraint ────────────────────────────────────────────────────────────
-- 'monthly' stays allowed here because legacy monthly payments already exist and
-- 20260910000002 states legacy monthly codes must still redeem. Blocking new
-- monthly sales is a business rule, so it lives in the function allowlist below,
-- not in the data-integrity constraint.
--
-- Added NOT VALID on purpose: it is enforced for every new INSERT/UPDATE
-- immediately, but does not fail this migration if a row predating 20260822
-- carries some unexpected value. Validate historical rows afterwards with:
--   ALTER TABLE public.payments VALIDATE CONSTRAINT payments_plan_check;

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_plan_check;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_plan_check
  CHECK (plan IN ('monthly', '6months', 'yearly')) NOT VALID;

-- ── 2. Submission allowlist and amounts, restored ────────────────────────────
CREATE OR REPLACE FUNCTION public.create_payment_submission(p_user_id uuid, p_email text, p_name text, p_mobile text, p_plan text, p_transaction_id text, p_screenshot_path text DEFAULT NULL::text, p_remarks text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_now TIMESTAMPTZ := now();
  v_count INTEGER;
  v_window TIMESTAMPTZ;
  v_transaction_id TEXT;
  v_payment_id UUID;
  v_amount NUMERIC;
BEGIN
  -- A signed-in caller may only submit for themselves; service-role callers (the
  -- submit-payment function) have no session. Anonymous callers cannot reach this
  -- function at all: EXECUTE is not granted to anon.
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_user_id IS NULL OR p_email IS NULL OR length(trim(p_email)) = 0 THEN
    RAISE EXCEPTION 'Authenticated account details are required';
  END IF;

  -- Only the plans actually on sale. 'monthly' was retired on 2026-09-10 and is
  -- deliberately absent: it remains legal only for codes issued before that date.
  IF p_plan NOT IN ('6months', 'yearly') THEN
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

  -- No ELSE branch on purpose. A silent default is what allowed NPR 100 to buy a
  -- six-month term; if an unknown plan ever reaches here the INSERT fails loudly
  -- on a NULL amount instead of undercharging.
  v_amount := CASE
    WHEN p_plan = '6months' THEN 650
    WHEN p_plan = 'yearly'   THEN 850
  END;

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
$function$;

-- CREATE OR REPLACE preserves existing privileges, but state them explicitly so
-- a future re-run in a fresh environment cannot leave this callable by anon.
REVOKE ALL ON FUNCTION public.create_payment_submission(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_payment_submission(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;

-- ── Known follow-up, deliberately not changed here ───────────────────────────
-- admin_approve_payment still computes
--   v_months := CASE WHEN v_payment.plan = 'yearly' THEN 12 ELSE 6 END
-- so a *legacy pending* monthly payment, if one is still sitting in the queue,
-- would grant 6 months for NPR 100. Monthly submissions are now blocked, so this
-- can only affect rows created before 2026-09-10. Resolve those manually in the
-- admin queue, or patch the function separately — changing approval semantics
-- silently inside a pricing fix is how the previous regression happened.
