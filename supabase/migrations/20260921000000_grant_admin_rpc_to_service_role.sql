-- Payment approval returned "Not authorized." because 20260822000000 revoked
-- EXECUTE on public.is_app_admin(uuid) from PUBLIC and granted it only to
-- `authenticated`. The Edge Functions call it as `service_role`, which then got
-- 42501 permission denied, so approve-payment rejected every real approval.
-- service_role is the server boundary: grant it explicitly and idempotently,
-- covering overloads and the sibling admin RPCs.
DO $$
DECLARE
  f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'is_app_admin',
        'admin_approve_payment',
        'admin_reject_payment',
        'create_payment_submission',
        'my_activation_code'
      )
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role;', f.sig);
  END LOOP;
END
$$;
