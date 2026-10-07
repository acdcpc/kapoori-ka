-- Security fix: admin RPCs trusted a caller-supplied actor id.
--
-- Reproduced before this fix: a normal signed-in user calling admin_reject_payment
-- with p_actor_id set to the administrator's UUID passed the admin check and reached
-- 'Payment not found' — only the dummy payment id stopped it. With a real id that user
-- could approve or reject payments, and through the approval path that now activates
-- subscriptions, grant premium to any account.
--
-- Each function now binds p_actor_id (or p_user_id) to auth.uid() whenever a session
-- exists. Service-role callers are unaffected: the Edge Functions are the server
-- boundary and pass a verified user id.

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
  v_months INT;
BEGIN
  -- Bind the audit actor to the caller's session. Clients could previously pass
  -- any UUID as p_actor_id, so a normal signed-in user who knew an administrator's
  -- id could act as that administrator. Service-role calls (the Edge Functions)
  -- have no session and remain permitted: they are the server boundary.
  IF auth.uid() IS NOT NULL AND p_actor_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

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

  -- Activate the payer now. Keep the longest term if they already have one.
  v_months := CASE WHEN v_payment.plan = 'yearly' THEN 12 ELSE 6 END;

  UPDATE public.subscriptions
  SET status = 'active',
      plan = v_payment.plan,
      end_date = GREATEST(COALESCE(end_date, v_now), v_now) + make_interval(months => v_months),
      price = v_payment.amount,
      updated_at = v_now
  WHERE user_id = v_payment.user_id;

  IF NOT FOUND THEN
    INSERT INTO public.subscriptions
      (user_id, status, plan, start_date, end_date, auto_renew, price, consultations_remaining)
    VALUES
      (v_payment.user_id, 'active', v_payment.plan, v_now,
       v_now + make_interval(months => v_months), false, v_payment.amount, 0);
  END IF;

  INSERT INTO public.payment_audit_log (payment_id, actor_id, event_type, metadata)
  VALUES (p_payment_id, p_actor_id, 'approved_code_issued',
          jsonb_build_object('plan', v_payment.plan, 'activated_until_months', v_months));

  RETURN jsonb_build_object('payment_id', p_payment_id, 'status', 'approved', 'premium_months', v_months);
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
  -- Bind the audit actor to the caller's session. Clients could previously pass
  -- any UUID as p_actor_id, so a normal signed-in user who knew an administrator's
  -- id could act as that administrator. Service-role calls (the Edge Functions)
  -- have no session and remain permitted: they are the server boundary.
  IF auth.uid() IS NOT NULL AND p_actor_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

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
  -- Bind the audit actor to the caller's session. Clients could previously pass
  -- any UUID as p_actor_id, so a normal signed-in user who knew an administrator's
  -- id could act as that administrator. Service-role calls (the Edge Functions)
  -- have no session and remain permitted: they are the server boundary.
  IF auth.uid() IS NOT NULL AND p_actor_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

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

  IF p_plan NOT IN ('monthly', '6months', 'yearly') THEN
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

  v_amount := CASE WHEN p_plan = 'yearly' THEN 850 WHEN p_plan = '6months' THEN 650 ELSE 100 END;

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
