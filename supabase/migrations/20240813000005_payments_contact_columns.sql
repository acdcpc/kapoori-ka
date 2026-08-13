-- ============================================================================
-- Add customer contact fields (name, mobile) to payments.
--
-- Needed for the admin "Send via WhatsApp" flow — the payment page collects
-- name and mobile but they were never persisted.
-- ============================================================================

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS mobile TEXT;
