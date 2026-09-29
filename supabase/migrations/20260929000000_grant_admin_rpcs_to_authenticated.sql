-- Rejecting a payment from the app failed with:
--   42501 permission denied for function admin_reject_payment
-- The in-app admin screen calls admin_reject_payment (and admin_approve_payment)
-- directly as the signed-in admin, i.e. as `authenticated`. The hardening pass
-- revoked those functions from PUBLIC and only the server-side path was
-- re-granted, so approve worked (it goes through the approve-payment Edge
-- Function as service_role) while reject could not.
--
-- Both functions re-check public.is_app_admin(p_actor_id) inside, so a non-admin
-- caller still gets a business error rather than any privilege: granting EXECUTE
-- to `authenticated` cannot escalate anyone.
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
        'admin_approve_payment',
        'admin_reject_payment',
        'admin_regenerate_activation_code'
      )
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated;', f.sig);
  END LOOP;
END
$$;
