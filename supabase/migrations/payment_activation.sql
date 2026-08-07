-- Kapoori Ka — Payment & Activation Infrastructure (Supabase)

CREATE TABLE IF NOT EXISTS public.payments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  amount        TEXT NOT NULL,
  transaction_id TEXT,
  screenshot_url TEXT,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_at   TIMESTAMPTZ,
  verified_by   UUID REFERENCES auth.users(id)
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own payments" ON public.payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.activation_codes (
  code                  TEXT PRIMARY KEY,
  status                TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'used')),
  plan                  TEXT NOT NULL DEFAULT 'yearly',
  amount                TEXT,
  original_transaction_id TEXT,
  used_by               UUID REFERENCES auth.users(id),
  used_at               TIMESTAMPTZ
);

ALTER TABLE public.activation_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read codes" ON public.activation_codes FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.rate_limits (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  count       INT NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own rate limits" ON public.rate_limits
  FOR SELECT USING (auth.uid() = user_id);

-- RPC: redeem_activation_code (replaces Firebase Cloud Function)
CREATE OR REPLACE FUNCTION public.redeem_activation_code(p_code TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id UUID; v_code TEXT; v_code_record RECORD;
  v_plan TEXT; v_duration_days INT; v_end_date TIMESTAMPTZ;
  v_now TIMESTAMPTZ := now(); v_rate_record RECORD; v_wait_seconds INT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Must be signed in.');
  END IF;

  v_code := upper(regexp_replace(p_code, '[^A-Z0-9]', '', 'g'));
  IF length(v_code) < 6 OR length(v_code) > 32 THEN
    RETURN jsonb_build_object('error', 'Invalid code format.');
  END IF;

  -- Rate limiting: 5 attempts per 15 min
  SELECT * INTO v_rate_record FROM public.rate_limits WHERE user_id = v_user_id;
  IF FOUND THEN
    IF EXTRACT(EPOCH FROM (v_now - v_rate_record.window_start)) > 900 THEN
      UPDATE public.rate_limits SET count = 1, window_start = v_now WHERE user_id = v_user_id;
    ELSIF v_rate_record.count >= 5 THEN
      v_wait_seconds := CEIL(900 - EXTRACT(EPOCH FROM (v_now - v_rate_record.window_start)));
      RETURN jsonb_build_object('error', 'Too many attempts. Wait ' || v_wait_seconds || 's.');
    ELSE
      UPDATE public.rate_limits SET count = count + 1 WHERE user_id = v_user_id;
    END IF;
  ELSE
    INSERT INTO public.rate_limits (user_id, count, window_start) VALUES (v_user_id, 1, v_now);
  END IF;

  SELECT * INTO v_code_record FROM public.activation_codes WHERE code = v_code;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Invalid code.'); END IF;
  IF v_code_record.status != 'valid' THEN RETURN jsonb_build_object('error', 'Code already used.'); END IF;

  v_plan := COALESCE(v_code_record.plan, 'yearly');
  v_duration_days := CASE WHEN v_plan = 'yearly' THEN 365 ELSE 30 END;
  v_end_date := v_now + (v_duration_days || ' days')::INTERVAL;

  UPDATE public.activation_codes SET status = 'used', used_by = v_user_id, used_at = v_now WHERE code = v_code;

  INSERT INTO public.subscriptions (user_id, status, plan, start_date, end_date, auto_renew, price, redeemed_code)
    VALUES (v_user_id, 'active', v_plan, v_now, v_end_date, false,
      CASE WHEN v_plan = 'yearly' THEN 'NPR 2000' ELSE 'NPR 200' END, v_code)
    ON CONFLICT (user_id) DO UPDATE
      SET status = 'active', plan = v_plan, start_date = v_now, end_date = v_end_date, redeemed_code = v_code;

  DELETE FROM public.rate_limits WHERE user_id = v_user_id;

  RETURN jsonb_build_object('success', true, 'plan', v_plan, 'end_date', v_end_date);
END;
$$;
