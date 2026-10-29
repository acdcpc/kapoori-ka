-- Retire the monthly plan from the approval path.
--
-- Product decision (2026-10-29): exactly two plans are sold — 6 months at NPR 650
-- and yearly at NPR 850. Nothing else.
--
-- `create_payment_submission` already rejects anything else (see
-- 20261029000000_fix_plan_constraint_and_submission.sql), so no new monthly
-- payment can be created. This migration closes the second half: approval.
--
-- admin_approve_payment previously computed
--     v_months := CASE WHEN plan = 'yearly' THEN 12 ELSE 6 END
-- so any non-yearly plan — including a legacy 'monthly' row at NPR 100 — was
-- granted six months. It now knows only the two live plans and raises otherwise.
--
-- A raise aborts the whole call, so the activation code insert and payment status
-- update above it are rolled back; no payment is half-approved.
--
-- NOTE: this does NOT rewrite existing rows. Historical 'monthly' records stay
-- readable, and `payments_plan_check` still permits the value so those rows and
-- their subscriptions remain valid. The constraint is a record of what may exist
-- in history; the functions decide what may be sold or activated today.

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
  -- Only the two plans on sale may be activated. The previous `ELSE 6` silently
  -- granted six months for ANY non-yearly plan — which is how a retired 'monthly'
  -- payment at NPR 100 would have bought a NPR 650 term. A NULL here means an
  -- unknown or retired plan, and the function aborts.
  v_months := CASE
    WHEN v_payment.plan = 'yearly' THEN 12
    WHEN v_payment.plan = '6months' THEN 6
  END;

  IF v_months IS NULL THEN
    RAISE EXCEPTION 'Plan % is retired and cannot be activated', v_payment.plan;
  END IF;

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
