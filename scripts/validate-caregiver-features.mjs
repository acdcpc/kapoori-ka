import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const requireTrue = (condition, message) => {
  if (!condition) throw new Error(message);
};

const migration = read('supabase/migrations/20260823000000_caregiver_health_foundations.sql');
const offlineSync = read('src/lib/offlineSync.ts');
const analytics = read('src/lib/featureAnalytics.ts');
const access = read('src/lib/caregiverAccess.ts');
const safety = read('src/lib/clinicalSafety.ts');
const preferences = read('src/screens/PreferencesScreen.tsx');
const caregiverTools = read('src/screens/CaregiverToolsScreen.tsx');
const clinicSummary = read('src/screens/ClinicSummaryScreen.tsx');
const immunization = read('src/screens/ImmunizationScreen.tsx');

requireTrue(migration.includes('CREATE TABLE IF NOT EXISTS public.child_memberships'), 'Missing shared-care access table.');
requireTrue(migration.includes('CREATE TABLE IF NOT EXISTS public.user_privacy_preferences'), 'Missing privacy preference table.');
requireTrue(migration.includes('CREATE TABLE IF NOT EXISTS public.feeding_records'), 'Missing feeding record table.');
requireTrue(migration.includes('CREATE TABLE IF NOT EXISTS public.clinic_visits'), 'Missing clinic visit table.');
requireTrue(migration.includes('CREATE TABLE IF NOT EXISTS public.record_export_audit'), 'Missing record-export audit table.');
requireTrue(migration.includes('ALTER TABLE public.child_memberships ENABLE ROW LEVEL SECURITY;'), 'Shared-care memberships must enable row-level security.');
requireTrue(migration.includes('ALTER TABLE public.feeding_records ENABLE ROW LEVEL SECURITY;'), 'Feeding records must enable row-level security.');
requireTrue(migration.includes('ALTER TABLE public.clinic_visits ENABLE ROW LEVEL SECURITY;'), 'Clinic visits must enable row-level security.');
requireTrue(migration.includes('ALTER TABLE public.user_privacy_preferences ENABLE ROW LEVEL SECURITY;'), 'Privacy preferences must enable row-level security.');
requireTrue(migration.includes("SET search_path = ''"), 'Privileged functions must clear search_path.');
requireTrue(migration.includes('create_child_invitation'), 'Missing caregiver invitation function.');
requireTrue(migration.includes('redeem_child_invitation'), 'Missing caregiver redemption function.');
requireTrue(migration.includes('increment_aggregated_health_metric'), 'Missing aggregate-only analytics function.');
requireTrue(!migration.includes('CREATE POLICY "Any authenticated user can'), 'Feature migration must not contain open authenticated-user policies.');

requireTrue(offlineSync.includes('ALLOWED_MUTATIONS'), 'Offline synchronization must whitelist supported mutations.');
requireTrue(offlineSync.includes("mutation.ownerId !== ownerId"), 'Offline queue must only replay its owner’s mutations.');
requireTrue(analytics.includes('if (!preferences.analyticsOptIn) return;'), 'Analytics must require explicit consent.');
requireTrue(!analytics.includes('child_id'), 'Analytics helper must not send child identifiers.');
requireTrue(access.includes("supabase.rpc('create_child_invitation'") && access.includes("supabase.rpc('redeem_child_invitation'"), 'Caregiver access changes must use protected server-side database functions.');
requireTrue(safety.includes('does not diagnose'), 'Growth guidance requires a non-diagnostic safety boundary.');
requireTrue(preferences.includes('analyticsOptIn'), 'Preferences must expose analytics consent.');
requireTrue(preferences.includes('flushOfflineQueue'), 'Preferences must provide a user-triggered offline sync path.');
requireTrue(caregiverTools.includes('queueOfflineMutation'), 'Caregiver tools must queue failed local mutations.');
requireTrue(clinicSummary.includes('record_export_audit'), 'Clinic summary generation must create an audit event.');
requireTrue(immunization.includes('not an automated catch-up plan'), 'Immunization screen must not present automated catch-up dosing as clinical advice.');

console.log('Caregiver-feature static regression checks passed.');
