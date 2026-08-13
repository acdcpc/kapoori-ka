-- ============================================================================
-- Immunization: enforce a unique (child_id, vaccine_name) constraint on the
-- vaccinations table so the app can upsert (onConflict) idempotently.
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'vaccinations'
  ) THEN
    -- Dedupe any existing duplicate rows (keep the most recent tuple)
    EXECUTE 'DELETE FROM public.vaccinations a
             USING public.vaccinations b
             WHERE a.child_id = b.child_id
               AND a.vaccine_name = b.vaccine_name
               AND a.ctid < b.ctid';

    -- Unique index used by upsert onConflict: 'child_id,vaccine_name'
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS vaccinations_child_vaccine_uniq
             ON public.vaccinations (child_id, vaccine_name)';
  END IF;
END $$;
