// Admin announcements: send a push message to users (all, premium only, or free only).
// Gated to app admins; tokens come from push_tokens (Expo push API).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.112.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',').map((o) => o.trim()).filter(Boolean);

function corsHeaders(request: Request): HeadersInit | null {
  const origin = request.headers.get('origin') ?? '';
  if (!origin) return corsBase('');
  if (!allowedOrigins.includes(origin)) return null;
  return corsBase(origin);
}
function corsBase(origin: string): HeadersInit {
  return {
    ...(origin ? { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin' } : {}),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}
function response(body: Record<string, unknown>, status: number, cors: HeadersInit | null) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

const EXPO_BATCH = 100;   // Expo accepts at most 100 messages per request

Deno.serve(async (request) => {
  const cors = corsHeaders(request);
  if (request.method === 'OPTIONS') return cors ? new Response('ok', { headers: cors }) : new Response('ok', { status: 403 });
  if (!cors) return response({ error: 'This origin is not authorized.' }, 403, null);
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return response({ error: 'Server configuration is incomplete.' }, 500, cors);

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: request.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: userError } = await authClient.auth.getUser();
  if (userError || !user?.id) return response({ error: 'Sign in required.' }, 401, cors);

  const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  // Read the admin table directly: the is_app_admin RPC is not granted to service_role.
  const { data: adminRow } = await adminClient
    .from('app_admins').select('user_id').eq('user_id', user.id).is('revoked_at', null).maybeSingle();
  if (!adminRow) return response({ error: 'Not authorized.' }, 403, cors);

  let body: { title?: string; body?: string; audience?: string; dry_run?: boolean };
  try { body = await request.json(); } catch { return response({ error: 'Invalid JSON body.' }, 400, cors); }

  const title = String(body.title ?? '').trim();
  const message = String(body.body ?? '').trim();
  const audience = ['all', 'premium', 'free'].includes(String(body.audience)) ? String(body.audience) : 'all';
  if (title.length < 3 || title.length > 100) return response({ error: 'A title between 3 and 100 characters is required.' }, 400, cors);
  if (message.length < 3 || message.length > 400) return response({ error: 'A message between 3 and 400 characters is required.' }, 400, cors);

  const { data: tokenRows, error: tokenErr } = await adminClient.from('push_tokens').select('token, user_id');
  if (tokenErr) return response({ error: 'Unable to load push tokens.' }, 500, cors);

  let targets = tokenRows ?? [];
  if (audience !== 'all') {
    const { data: subs } = await adminClient.from('subscriptions').select('user_id, status, end_date');
    const active = new Set(
      (subs ?? [])
        .filter((s) => String(s.status).toLowerCase() === 'active' && (!s.end_date || new Date(s.end_date).getTime() > Date.now()))
        .map((s) => s.user_id),
    );
    targets = targets.filter((t) => (audience === 'premium' ? active.has(t.user_id) : !active.has(t.user_id)));
  }
  const tokens = [...new Set(targets.map((t) => t.token))];

  if (body.dry_run) return response({ ok: true, dry_run: true, audience, targeted: tokens.length }, 200, cors);
  if (tokens.length === 0) return response({ ok: true, audience, targeted: 0, sent: 0, failed: 0, note: 'No devices registered yet.' }, 200, cors);

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];
  for (let i = 0; i < tokens.length; i += EXPO_BATCH) {
    const chunk = tokens.slice(i, i + EXPO_BATCH).map((to) => ({
      to, title, body: message, sound: 'default', data: { type: 'announcement' },
    }));
    try {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(chunk),
      });
      const json = await res.json().catch(() => null);
      const tickets = Array.isArray(json?.data) ? json.data : [];
      for (const t of tickets) {
        if (t?.status === 'error') { failed += 1; if (errors.length < 5) errors.push(String(t.message ?? 'error')); }
        else sent += 1;
      }
    } catch (e) {
      failed += chunk.length;
      if (errors.length < 5) errors.push(e instanceof Error ? e.message : String(e));
    }
    await new Promise((r) => setTimeout(r, 500));   // gentle pacing between batches
  }

  console.log(`[admin-broadcast] ${user.id} -> audience=${audience} targeted=${tokens.length} sent=${sent} failed=${failed}`);
  return response({ ok: true, audience, targeted: tokens.length, sent, failed, errors }, 200, cors);
});
