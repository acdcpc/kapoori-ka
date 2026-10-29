-- Retire 'monthly' from the data model entirely.
--
-- Product decision (2026-10-29): two plans only — 6 months at NPR 650 and yearly
-- at NPR 850. The owner confirmed there are no monthly customers and no pending
-- monthly payments, so 'monthly' has no legitimate rows to preserve.
--
-- 20261029000000 left the constraint permissive — ('monthly','6months','yearly')
-- — so that historical rows stayed updatable. That allowance is no longer needed.
--
-- This constraint is added VALIDATED on purpose: if any row still carries
-- 'monthly' (or any other value), the migration fails and changes nothing. A
-- migration is atomic, so a failure leaves payments_plan_check exactly as it was
-- in 20261029000000 — permissive but correct. That failure is the signal that the
-- "no monthly customers" assumption needs re-checking before shipping.

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_plan_check;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_plan_check
  CHECK (plan IN ('6months', 'yearly'));
