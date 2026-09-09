-- ============================================================================
-- Scale indexes: every RLS policy filters user_id/child_id — without these,
-- per-row policy checks and app queries degrade to sequential scans as the
-- user base grows. CONCURRENTLY-safe pattern via IF NOT EXISTS (lock time is
-- trivial at current data sizes; switch to CREATE INDEX CONCURRENTLY for
-- large-table rebuilds later).
-- ============================================================================

-- Owner-scoped lookups (RLS + dashboard queries)
CREATE INDEX IF NOT EXISTS idx_children_user_id ON public.children(user_id);
CREATE INDEX IF NOT EXISTS idx_growth_records_user_id ON public.growth_records(user_id);
CREATE INDEX IF NOT EXISTS idx_vaccinations_user_id ON public.vaccinations(user_id);
CREATE INDEX IF NOT EXISTS idx_milestones_user_id ON public.milestones(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);

-- Child-scoped reads (caregiver access + charts + timelines)
CREATE INDEX IF NOT EXISTS idx_growth_records_child_date ON public.growth_records(child_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_clinic_visits_child_id ON public.clinic_visits(child_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_autism_screenings_child_id ON public.autism_screenings(child_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_record_export_audit_child ON public.record_export_audit(child_id, created_at DESC);

-- Payments hot paths (payer status check + owner review queue)
CREATE INDEX IF NOT EXISTS idx_payments_user_created ON public.payments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status_created ON public.payments(status, created_at DESC);
