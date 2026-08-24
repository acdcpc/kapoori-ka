-- Kapoori Ka caregiver-health roadmap foundations.
--
-- This migration deliberately stores clinical content as versioned data, grants
-- child access through explicit memberships, and keeps analytics aggregated.
-- It must be reviewed by a qualified clinician before any non-Nepal schedule
-- or clinical threshold is marked active in production.

-- ---------------------------------------------------------------------------
-- Child access: owners retain their existing children.user_id authority; any
-- additional adult needs an explicit accepted membership.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.child_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('viewer', 'editor')),
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (child_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.child_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('viewer', 'editor')),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  redeemed_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS child_memberships_child_active_idx
  ON public.child_memberships (child_id, user_id)
  WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS child_invitations_token_active_idx
  ON public.child_invitations (token_hash)
  WHERE redeemed_at IS NULL AND revoked_at IS NULL;

ALTER TABLE public.child_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_invitations ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_access_child(p_child_id UUID, p_min_role TEXT DEFAULT 'viewer')
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.children AS c
    WHERE c.id = p_child_id AND c.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.child_memberships AS m
    WHERE m.child_id = p_child_id
      AND m.user_id = auth.uid()
      AND m.revoked_at IS NULL
      AND CASE p_min_role
        WHEN 'editor' THEN m.role = 'editor'
        ELSE m.role IN ('viewer', 'editor')
      END
  );
$$;

REVOKE ALL ON FUNCTION public.can_access_child(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_child(UUID, TEXT) TO authenticated;

CREATE POLICY "Members can view their child memberships"
ON public.child_memberships FOR SELECT TO authenticated
USING (public.can_access_child(child_id, 'viewer'));

CREATE POLICY "Owners can revoke child memberships"
ON public.child_memberships FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.children c WHERE c.id = child_id AND c.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.children c WHERE c.id = child_id AND c.user_id = auth.uid()));

CREATE POLICY "Owners can view child invitations"
ON public.child_invitations FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.children c WHERE c.id = child_id AND c.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.create_child_invitation(p_child_id UUID, p_role TEXT DEFAULT 'viewer')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_token TEXT := replace(upper(gen_random_uuid()::text), '-', '');
  v_expires TIMESTAMPTZ := now() + interval '7 days';
  v_invitation_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.children WHERE id = p_child_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Only the child owner can create a caregiver invitation';
  END IF;
  IF p_role NOT IN ('viewer', 'editor') THEN
    RAISE EXCEPTION 'Invalid caregiver role';
  END IF;
  INSERT INTO public.child_invitations (child_id, role, token_hash, expires_at, created_by)
  VALUES (p_child_id, p_role, encode(extensions.digest(v_token, 'sha256'), 'hex'), v_expires, auth.uid())
  RETURNING id INTO v_invitation_id;
  RETURN jsonb_build_object('invitation_id', v_invitation_id, 'code', v_token, 'expires_at', v_expires, 'role', p_role);
END;
$$;

CREATE OR REPLACE FUNCTION public.redeem_child_invitation(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_invitation public.child_invitations%ROWTYPE;
  v_token_hash TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in is required'; END IF;
  v_token_hash := encode(extensions.digest(upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g')), 'sha256'), 'hex');
  SELECT * INTO v_invitation FROM public.child_invitations
  WHERE token_hash = v_token_hash AND redeemed_at IS NULL AND revoked_at IS NULL AND expires_at > now()
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'This caregiver code is invalid, expired, or already used'; END IF;
  IF EXISTS (SELECT 1 FROM public.children WHERE id = v_invitation.child_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'The child owner does not need a caregiver code';
  END IF;
  INSERT INTO public.child_memberships (child_id, user_id, role)
  VALUES (v_invitation.child_id, auth.uid(), v_invitation.role)
  ON CONFLICT (child_id, user_id) DO UPDATE SET role = EXCLUDED.role, revoked_at = NULL, accepted_at = now();
  UPDATE public.child_invitations SET redeemed_at = now() WHERE id = v_invitation.id;
  RETURN jsonb_build_object('child_id', v_invitation.child_id, 'role', v_invitation.role);
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_child_caregiver(p_child_id UUID, p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.children WHERE id = p_child_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Only the child owner can revoke caregiver access';
  END IF;
  UPDATE public.child_memberships SET revoked_at = now() WHERE child_id = p_child_id AND user_id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_child_invitation(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.redeem_child_invitation(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.revoke_child_caregiver(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_child_invitation(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_child_invitation(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_child_caregiver(UUID, UUID) TO authenticated;

-- Shared adults can read existing records. Existing owner-created policies stay
-- in place; editor write policies remain limited to the user who records a row.
CREATE POLICY "Caregivers can read shared growth records"
ON public.growth_records FOR SELECT TO authenticated USING (public.can_access_child(child_id, 'viewer'));
CREATE POLICY "Caregivers can read shared vaccinations"
ON public.vaccinations FOR SELECT TO authenticated USING (public.can_access_child(child_id, 'viewer'));
CREATE POLICY "Caregivers can read shared milestones"
ON public.milestones FOR SELECT TO authenticated USING (public.can_access_child(child_id, 'viewer'));

-- ---------------------------------------------------------------------------
-- Versioned content and care records. Clinical fields are informational and
-- must never be interpreted by the app as diagnosis or emergency triage.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clinical_content_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL CHECK (country_code ~ '^[A-Z]{2}$'),
  content_type TEXT NOT NULL CHECK (content_type IN ('immunization_schedule', 'feeding_guidance', 'growth_thresholds')),
  version_label TEXT NOT NULL,
  source_url TEXT NOT NULL,
  reviewed_by TEXT NOT NULL,
  reviewed_at DATE NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT false,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (country_code, content_type, version_label)
);
ALTER TABLE public.clinical_content_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read active clinical content"
ON public.clinical_content_versions FOR SELECT TO authenticated USING (is_active = true);
REVOKE INSERT, UPDATE, DELETE ON public.clinical_content_versions FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.feeding_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  recorded_by UUID NOT NULL REFERENCES auth.users(id),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breastfeeding', 'formula', 'solid_food', 'snack', 'water', 'other')),
  foods TEXT[] NOT NULL DEFAULT '{}',
  appetite TEXT CHECK (appetite IN ('low', 'usual', 'high')),
  reaction_notes TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS feeding_records_child_occurred_idx ON public.feeding_records (child_id, occurred_at DESC);
ALTER TABLE public.feeding_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Caregivers can read feeding records" ON public.feeding_records FOR SELECT TO authenticated USING (public.can_access_child(child_id, 'viewer'));
CREATE POLICY "Editors can add feeding records" ON public.feeding_records FOR INSERT TO authenticated WITH CHECK (recorded_by = auth.uid() AND public.can_access_child(child_id, 'editor'));
CREATE POLICY "Recorders can update feeding records" ON public.feeding_records FOR UPDATE TO authenticated USING (recorded_by = auth.uid()) WITH CHECK (recorded_by = auth.uid() AND public.can_access_child(child_id, 'editor'));
CREATE POLICY "Recorders can delete feeding records" ON public.feeding_records FOR DELETE TO authenticated USING (recorded_by = auth.uid());

CREATE TABLE IF NOT EXISTS public.clinic_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  recorded_by UUID NOT NULL REFERENCES auth.users(id),
  visit_date DATE NOT NULL,
  facility_name TEXT,
  purpose TEXT,
  clinician_notes TEXT,
  follow_up_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clinic_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Caregivers can read clinic visits" ON public.clinic_visits FOR SELECT TO authenticated USING (public.can_access_child(child_id, 'viewer'));
CREATE POLICY "Editors can add clinic visits" ON public.clinic_visits FOR INSERT TO authenticated WITH CHECK (recorded_by = auth.uid() AND public.can_access_child(child_id, 'editor'));
CREATE POLICY "Recorders can update clinic visits" ON public.clinic_visits FOR UPDATE TO authenticated USING (recorded_by = auth.uid()) WITH CHECK (recorded_by = auth.uid() AND public.can_access_child(child_id, 'editor'));
CREATE POLICY "Recorders can delete clinic visits" ON public.clinic_visits FOR DELETE TO authenticated USING (recorded_by = auth.uid());

CREATE TABLE IF NOT EXISTS public.clinic_facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL CHECK (country_code ~ '^[A-Z]{2}$'),
  name TEXT NOT NULL,
  district TEXT,
  ward TEXT,
  facility_type TEXT,
  phone TEXT,
  address TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  verified_at TIMESTAMPTZ,
  source_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clinic_facilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read clinic facilities" ON public.clinic_facilities FOR SELECT TO authenticated USING (true);
REVOKE INSERT, UPDATE, DELETE ON public.clinic_facilities FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- Privacy and aggregated analytics. No raw child record is ever written to the
-- analytics table. The aggregate endpoint is service-role only.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_privacy_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  analytics_opt_in BOOLEAN NOT NULL DEFAULT false,
  share_crash_diagnostics BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_privacy_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own privacy preferences" ON public.user_privacy_preferences FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.record_export_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES auth.users(id),
  export_type TEXT NOT NULL CHECK (export_type IN ('clinic_summary', 'full_report')),
  fields_included TEXT[] NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.record_export_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Caregivers can create their own export audit" ON public.record_export_audit FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid() AND public.can_access_child(child_id, 'viewer'));
CREATE POLICY "Caregivers can read export audit" ON public.record_export_audit FOR SELECT TO authenticated USING (public.can_access_child(child_id, 'viewer'));

CREATE TABLE IF NOT EXISTS public.aggregated_health_metrics (
  metric_date DATE NOT NULL,
  country_code TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  bucket_key TEXT NOT NULL,
  event_count INTEGER NOT NULL DEFAULT 0 CHECK (event_count >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (metric_date, country_code, metric_name, bucket_key)
);
ALTER TABLE public.aggregated_health_metrics ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.aggregated_health_metrics FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.increment_aggregated_health_metric(
  p_country_code TEXT,
  p_metric_name TEXT,
  p_bucket_key TEXT
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  INSERT INTO public.aggregated_health_metrics (
    metric_date, country_code, metric_name, bucket_key, event_count, updated_at
  ) VALUES (
    CURRENT_DATE, p_country_code, p_metric_name, p_bucket_key, 1, now()
  ) ON CONFLICT (metric_date, country_code, metric_name, bucket_key)
  DO UPDATE SET event_count = public.aggregated_health_metrics.event_count + 1, updated_at = now();
$$;
REVOKE ALL ON FUNCTION public.increment_aggregated_health_metric(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_aggregated_health_metric(TEXT, TEXT, TEXT) TO service_role;

-- Seed a deliberately narrow, clinically reviewed-content registry. The app
-- uses its existing Nepal schedule payload until a clinician approves richer
-- versioned payloads in production.
INSERT INTO public.clinical_content_versions (
  country_code, content_type, version_label, source_url, reviewed_by, reviewed_at, effective_from, is_active, payload
) VALUES (
  'NP', 'immunization_schedule', 'Nepal NIP registry placeholder',
  'https://immunizationdata.who.int/', 'Pending Nepal clinician sign-off', CURRENT_DATE, CURRENT_DATE, false,
  jsonb_build_object('status', 'requires_clinical_review_before_activation')
) ON CONFLICT (country_code, content_type, version_label) DO NOTHING;
