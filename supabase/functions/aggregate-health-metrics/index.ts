// Kapoori Ka aggregate metrics: this endpoint accepts only consented, coarse
// counts. It intentionally excludes child IDs, precise locations, notes, and
// health measurements.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.112.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map((origin) => origin.trim()).filter(Boolean);
const allowedMetrics = new Set(['feature_opened', 'reminder_created', 'clinic_summary_exported']);
const allowedBuckets = new Set(['growth', 'immunization', 'feeding', 'clinic', 'accessibility', 'offline_sync']);

function headers(request: Request): HeadersInit | null {
  const origin = request.headers.get('origin') ?? '';
  if (!origin || !allowedOrigins.includes(origin)) return null;
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    'Vary': 'Origin',
  };
}

function respond(body: Record<string, unknown>, status: number, cors: HeadersInit | null) {
  return new Response(JSON.stringify(body), { status, headers: cors ?? { 'Content-Type': 'application/json' } });
}

Deno.serve(async (request) => {
  const cors = headers(request);
  if (request.method === 'OPTIONS') return cors ? new Response('ok', { headers: cors }) : new Response('Forbidden', { status: 403 });
  if (!cors) return respond({ error: 'Origin is not authorized.' }, 403, null);
  if (request.method !== 'POST') return respond({ error: 'Method not allowed.' }, 405, cors);
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return respond({ error: 'Server configuration is incomplete.' }, 500, cors);

  const authorization = request.headers.get('Authorization') ?? '';
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return respond({ error: 'Sign in is required.' }, 401, cors);

  const { data: preference, error: preferenceError } = await userClient
    .from('user_privacy_preferences')
    .select('analytics_opt_in')
    .eq('user_id', user.id)
    .maybeSingle();
  if (preferenceError || !preference?.analytics_opt_in) return respond({ accepted: false }, 202, cors);

  let payload: { metric_name?: string; bucket_key?: string; country_code?: string };
  try { payload = await request.json(); } catch { return respond({ error: 'Invalid JSON.' }, 400, cors); }
  const metric = payload.metric_name ?? '';
  const bucket = payload.bucket_key ?? '';
  const country = payload.country_code === 'NP' ? 'NP' : '';
  if (!allowedMetrics.has(metric) || !allowedBuckets.has(bucket) || !country) return respond({ error: 'Invalid aggregate metric.' }, 400, cors);

  const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await adminClient.rpc('increment_aggregated_health_metric', {
    p_country_code: country,
    p_metric_name: metric,
    p_bucket_key: bucket,
  });
  if (error) return respond({ error: 'Metric was not recorded.' }, 502, cors);
  return respond({ accepted: true }, 202, cors);
});
