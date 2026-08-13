-- ============================================================================
-- RPC: void activation codes for a transaction.
--
-- Used by the admin "New Code" (regenerate) flow. When the admin regenerates
-- a code for an approved payment, any previous VALID code for that transaction
-- is voided first. SECURITY DEFINER bypasses RLS (the client-side "Admins can
-- update codes" policy is unreliable); authorization is enforced inside.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_void_codes(p_original_transaction_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = auth.uid() AND status = 'active' AND plan = 'premium'
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.activation_codes
     SET status = 'used', used_at = now()
   WHERE original_transaction_id IS NOT DISTINCT FROM p_original_transaction_id
     AND status = 'valid';
END;
$$;
