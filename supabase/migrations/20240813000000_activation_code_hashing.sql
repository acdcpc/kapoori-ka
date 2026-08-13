-- ============================================================================
-- Security: store activation codes as SHA-256 hashes, not plaintext.
-- Also removes the public read policy that exposed every code in plaintext.
-- ============================================================================

-- SHA-256 requires pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Add the hash column (idempotent)
ALTER TABLE public.activation_codes ADD COLUMN IF NOT EXISTS code_hash TEXT;

-- 2. One-time data migration: hash any existing plaintext codes, drop the
--    plaintext column, and promote code_hash to the primary key.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'activation_codes' AND column_name = 'code'
  ) THEN
    EXECUTE 'UPDATE public.activation_codes SET code_hash = encode(digest(code, ''sha256''), ''hex'') WHERE code_hash IS NULL AND code IS NOT NULL';
    -- Orphaned rows (no plaintext to hash) can never be redeemed — remove them
    EXECUTE 'DELETE FROM public.activation_codes WHERE code_hash IS NULL';
    EXECUTE 'ALTER TABLE public.activation_codes DROP CONSTRAINT IF EXISTS activation_codes_pkey';
    EXECUTE 'ALTER TABLE public.activation_codes DROP COLUMN IF EXISTS code';
    EXECUTE 'ALTER TABLE public.activation_codes ADD PRIMARY KEY (code_hash)';
  ELSIF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'activation_codes_pkey'
  ) THEN
    EXECUTE 'ALTER TABLE public.activation_codes ADD PRIMARY KEY (code_hash)';
  END IF;
END $$;

-- 3. Remove the public read policy — codes must never be readable client-side.
DROP POLICY IF EXISTS "Anyone can read codes" ON public.activation_codes;

-- 4. Replace the redeem RPC with a hash-comparing version.
--    Rate limiting (5 attempts / 15 min) is preserved and strictly enforced.
CREATE OR REPLACE FUNCTION public.redeem_activation_code(p_code TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id UUID; v_code TEXT; v_code_hash TEXT; v_code_record RECORD;
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
  v_code_hash := encode(digest(v_code, 'sha256'), 'hex');

  -- Rate limiting: max 5 attempts per 15 minutes
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

  SELECT * INTO v_code_record FROM public.activation_codes WHERE code_hash = v_code_hash;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Invalid code.'); END IF;
  IF v_code_record.status != 'valid' THEN RETURN jsonb_build_object('error', 'Code already used.'); END IF;

  v_plan := COALESCE(v_code_record.plan, 'yearly');
  v_duration_days := CASE WHEN v_plan = 'yearly' THEN 365 ELSE 30 END;
  v_end_date := v_now + (v_duration_days || ' days')::INTERVAL;

  UPDATE public.activation_codes SET status = 'used', used_by = v_user_id, used_at = v_now WHERE code_hash = v_code_hash;

  INSERT INTO public.subscriptions (user_id, status, plan, start_date, end_date, auto_renew, price, redeemed_code)
    VALUES (v_user_id, 'active', v_plan, v_now, v_end_date, false,
      CASE WHEN v_plan = 'yearly' THEN 'NPR 2000' ELSE 'NPR 200' END, v_code)
    ON CONFLICT (user_id) DO UPDATE
      SET status = 'active', plan = v_plan, start_date = v_now, end_date = v_end_date, redeemed_code = v_code;

  DELETE FROM public.rate_limits WHERE user_id = v_user_id;

  RETURN jsonb_build_object('success', true, 'plan', v_plan, 'end_date', v_end_date);
END;
$$;
