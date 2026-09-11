// src/lib/featureAnalytics.ts — Consent-gated, aggregated metrics only; no PII or child identifiers.
import { supabase } from './supabase';
import { PrivacyPreferences } from '../types';

export async function loadPrivacyPreferences(userId: string): Promise<PrivacyPreferences> {
  const { data, error } = await supabase.from('user_privacy_preferences').select('analytics_opt_in, share_crash_diagnostics').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  setAnalyticsOptInCache(Boolean(data?.analytics_opt_in));
  return { analyticsOptIn: Boolean(data?.analytics_opt_in), shareCrashDiagnostics: Boolean(data?.share_crash_diagnostics) };
}

export async function savePrivacyPreferences(userId: string, value: PrivacyPreferences): Promise<void> {
  setAnalyticsOptInCache(value.analyticsOptIn);
  const { error } = await supabase.from('user_privacy_preferences').upsert({
    user_id: userId,
    analytics_opt_in: value.analyticsOptIn,
    share_crash_diagnostics: value.shareCrashDiagnostics,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function recordAggregatedMetric(preferences: PrivacyPreferences, metricName: string, bucketKey: string): Promise<void> {
  if (!preferences.analyticsOptIn) return;
  await supabase.functions.invoke('aggregate-health-metrics', {
    body: { metric_name: metricName, bucket_key: bucketKey, country_code: 'NP' },
  });
}


// ── Safe product analytics ──────────────────────────────────────────────────
// Coarse event names only: never health values, child names, notes, photos or
// free text. Gated on the user's analytics opt-in, cached to avoid a query per
// event. See supabase/migrations/*_product_events.sql.
export const PRODUCT_EVENTS = [
  'onboarding_completed',
  'child_profile_created',
  'measurement_added',
  'vaccine_recorded',
  'reminder_opt_in',
  'clinic_summary_generated',
  'health_report_generated',
  'payment_submitted',
] as const;
export type ProductEvent = typeof PRODUCT_EVENTS[number];

let analyticsOptInCache: boolean | null = null;

export function setAnalyticsOptInCache(value: boolean): void {
  analyticsOptInCache = value;
}

export async function recordProductEvent(userId: string | null | undefined, event: ProductEvent, platform?: string): Promise<void> {
  if (!userId) return;
  try {
    if (analyticsOptInCache === null) {
      const prefs = await loadPrivacyPreferences(userId);
      analyticsOptInCache = prefs.analyticsOptIn;
    }
    if (!analyticsOptInCache) return;
    await supabase.from('product_events').insert({
      user_id: userId,
      event_name: event,
      platform: platform ?? (typeof navigator !== 'undefined' ? 'web' : 'native'),
    });
  } catch {
    // Analytics must never break a user flow.
  }
}
