-- ============================================================================
-- Payment automation: owner push notifications + encrypted code hand-back.
-- Keeps the manual approve step (no gateway) but removes code delivery and
-- typing: approved payments carry an encrypted activation code that the
-- payer's own app can fetch and redeem automatically.
-- ============================================================================

-- Where the payer's approved activation code is stored, AES-GCM encrypted
-- with a key that lives only in Edge Function secrets.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS automation_code_encrypted TEXT;

-- Owner device tokens for push notifications (owner = app admins).
CREATE TABLE IF NOT EXISTS public.push_tokens (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'android',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_tokens own row select" ON public.push_tokens;
CREATE POLICY "push_tokens own row select" ON public.push_tokens
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "push_tokens own row write" ON public.push_tokens;
CREATE POLICY "push_tokens own row write" ON public.push_tokens
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "push_tokens own row update" ON public.push_tokens;
CREATE POLICY "push_tokens own row update" ON public.push_tokens
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "push_tokens own row delete" ON public.push_tokens;
CREATE POLICY "push_tokens own row delete" ON public.push_tokens
  FOR DELETE TO authenticated USING (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_tokens TO authenticated;
GRANT ALL ON public.push_tokens TO service_role;
