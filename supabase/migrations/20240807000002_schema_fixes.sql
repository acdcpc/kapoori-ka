-- Schema fix #1: Change payments.amount from TEXT to NUMERIC
ALTER TABLE public.payments 
  ALTER COLUMN amount TYPE NUMERIC USING CASE WHEN amount ~ '^\d+(\.\d+)?$' THEN amount::NUMERIC ELSE 0 END;

-- Schema fix #2: Add admin RLS policies for payments
DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
CREATE POLICY "Admins can view all payments" ON public.payments
  FOR SELECT USING (auth.uid() IN (SELECT user_id FROM public.subscriptions WHERE status = 'active' AND plan = 'premium'));

DROP POLICY IF EXISTS "Admins can update payments" ON public.payments;
CREATE POLICY "Admins can update payments" ON public.payments
  FOR UPDATE USING (auth.uid() IN (SELECT user_id FROM public.subscriptions WHERE status = 'active' AND plan = 'premium'));

-- Schema fix #3: Add admin RLS for activation_codes
DROP POLICY IF EXISTS "Admins can create codes" ON public.activation_codes;
CREATE POLICY "Admins can create codes" ON public.activation_codes
  FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM public.subscriptions WHERE status = 'active' AND plan = 'premium'));

DROP POLICY IF EXISTS "Admins can update codes" ON public.activation_codes;
CREATE POLICY "Admins can update codes" ON public.activation_codes
  FOR UPDATE USING (auth.uid() IN (SELECT user_id FROM public.subscriptions WHERE status = 'active' AND plan = 'premium'));

-- Schema fix #4: Add consultations_remaining to subscriptions
ALTER TABLE public.subscriptions 
  ADD COLUMN IF NOT EXISTS consultations_remaining INTEGER DEFAULT 0;

-- Schema fix #5: Service role bypass for activation_codes (already have "Anyone can read")
-- The redeem_activation_code RPC uses SECURITY DEFINER so it can bypass RLS
