-- Product analytics: coarse event names only — never health values, child
-- names, notes, photos, or identifiers beyond the account itself.
-- Opt-in is enforced client-side (user_privacy_preferences.analytics_opt_in)
-- and the table is write-only for users: no client read policy.
CREATE TABLE IF NOT EXISTS public.product_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  platform TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_events_name_created ON public.product_events(event_name, created_at DESC);

ALTER TABLE public.product_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product events own insert" ON public.product_events;
CREATE POLICY "product events own insert" ON public.product_events
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "product events admin read" ON public.product_events;
CREATE POLICY "product events admin read" ON public.product_events
  FOR SELECT TO authenticated USING (public.is_app_admin(auth.uid()));

GRANT INSERT ON public.product_events TO authenticated;
GRANT SELECT ON public.product_events TO authenticated;
GRANT ALL ON public.product_events TO service_role;
