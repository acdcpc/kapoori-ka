-- Reminder delivery observability: per-send log + per-device health, visible
-- to app admins. Push is only dependable when failures are recorded.
ALTER TABLE public.web_push_subscriptions
  ADD COLUMN IF NOT EXISTS last_success_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_failure_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failure_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.reminder_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID,
  vaccine_id TEXT,
  kind TEXT,                    -- '7d' | '2d' | 'day' | 'overdue'
  subscription_id UUID,
  status TEXT NOT NULL,         -- 'sent' | 'failed'
  provider_status INTEGER,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reminder_log_created ON public.reminder_delivery_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reminder_log_user ON public.reminder_delivery_log(user_id, created_at DESC);

ALTER TABLE public.reminder_delivery_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reminder log admin read" ON public.reminder_delivery_log;
CREATE POLICY "reminder log admin read" ON public.reminder_delivery_log
  FOR SELECT TO authenticated USING (public.is_app_admin(auth.uid()));

GRANT SELECT ON public.reminder_delivery_log TO authenticated;
GRANT ALL ON public.reminder_delivery_log TO service_role;

-- Admins can see device health (own-row policy still applies to everyone else)
DROP POLICY IF EXISTS "web_push admin read" ON public.web_push_subscriptions;
CREATE POLICY "web_push admin read" ON public.web_push_subscriptions
  FOR SELECT TO authenticated USING (public.is_app_admin(auth.uid()));
