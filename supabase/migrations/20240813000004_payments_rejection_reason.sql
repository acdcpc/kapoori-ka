-- ============================================================================
-- Add rejection_reason to payments.
--
-- The admin panel stores why a payment was rejected when the admin clicks
-- Reject. The column was referenced in public/admin/index.html but never
-- added to the schema, causing:
--   "Could not find the 'rejection_reason' column of 'payments' in the schema cache"
-- ============================================================================

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
