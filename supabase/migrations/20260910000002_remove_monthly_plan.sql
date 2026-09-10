-- Monthly plan removed from purchase flow (2026-09-10): only 6-month and
-- yearly subscriptions can be submitted. Legacy monthly activation codes
-- still redeem normally (30 days).
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
  IF p_user_id IS NULL OR p_email IS NULL OR length(trim(p_email)) = 0 THEN
    RAISE EXCEPTION 'Authenticated account details are required';
  END IF;

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

  v_amount := CASE WHEN p_plan = '6months' THEN 650 ELSE 850 END;

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
$function$

