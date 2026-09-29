-- Approval is the entitlement decision, so premium must not wait for the client
-- to come back and redeem a code. This replaces admin_approve_payment with the
-- same behaviour plus a server-side subscription activation (idempotent, and it
-- extends rather than resets an existing term).
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
