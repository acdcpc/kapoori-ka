// src/lib/featureAnalytics.ts — Consent-gated, aggregated metrics only; no PII or child identifiers.
import { supabase } from './supabase';
import { PrivacyPreferences } from '../types';

export async function loadPrivacyPreferences(userId: string): Promise<PrivacyPreferences> {
  const { data, error } = await supabase.from('user_privacy_preferences').select('analytics_opt_in, share_crash_diagnostics').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return { analyticsOptIn: Boolean(data?.analytics_opt_in), shareCrashDiagnostics: Boolean(data?.share_crash_diagnostics) };
}

export async function savePrivacyPreferences(userId: string, value: PrivacyPreferences): Promise<void> {
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
