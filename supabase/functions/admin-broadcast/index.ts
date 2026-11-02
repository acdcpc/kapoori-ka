// Admin announcements: send a push message to users (all, premium only, or free only).
// Gated to app admins; tokens come from push_tokens (Expo push API).
//
// The message is persisted before the push goes out, so it exists in the app
// inbox even if delivery fails, and so a message that the admin allows replies
// on has something for those replies to belong to.
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

  let body: {
    title?: string; body?: string; title_ne?: string; body_ne?: string;
    audience?: string; allow_replies?: boolean; dry_run?: boolean;
  };
  try { body = await request.json(); } catch { return response({ error: 'Invalid JSON body.' }, 400, cors); }

  const title = String(body.title ?? '').trim();
  const titleNe = String(body.title_ne ?? '').trim();
  const message = String(body.body ?? '').trim();
  const messageNe = String(body.body_ne ?? '').trim();
  const audience = ['all', 'premium', 'free'].includes(String(body.audience)) ? String(body.audience) : 'all';
  const allowReplies = body.allow_replies === true;

  if (title.length < 3 || title.length > 100) return response({ error: 'A title between 3 and 100 characters is required.' }, 400, cors);
  if (message.length < 3 || message.length > 400) return response({ error: 'A message between 3 and 400 characters is required.' }, 400, cors);
  if (titleNe && titleNe.length > 120) return response({ error: 'The Nepali title is too long.' }, 400, cors);
  if (messageNe && messageNe.length > 2000) return response({ error: 'The Nepali message is too long.' }, 400, cors);

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

  // Persist first: the inbox row is what makes the message readable later, and
  // what a reply attaches to. A push failure must not lose the message.
  const { data: saved, error: saveErr } = await adminClient
    .from('broadcasts')
    .insert({
      title,
      title_ne: titleNe || null,
      body: message,
      body_ne: messageNe || null,
      audience,
      allow_replies: allowReplies,
      created_by: user.id,
    })
    .select('id, created_at')
    .single();
  if (saveErr || !saved) {
    console.error('[admin-broadcast] could not persist broadcast', saveErr?.message);
    return response({ error: 'Could not save the message.' }, 500, cors);
  }

  if (tokens.length === 0) {
    await adminClient.from('broadcasts').update({ pushed_at: new Date().toISOString() }).eq('id', saved.id);
    return response({ ok: true, broadcast_id: saved.id, audience, targeted: 0, sent: 0, failed: 0, note: 'No devices registered yet; the message is in the in-app inbox.' }, 200, cors);
  }

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];
  for (let i = 0; i < tokens.length; i += EXPO_BATCH) {
    const chunk = tokens.slice(i, i + EXPO_BATCH).map((to) => ({
      to,
      title: titleNe || title,
      body: messageNe || message,
      sound: 'default',
      data: { type: 'broadcast', broadcast_id: saved.id, allow_replies: allowReplies },
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

  await adminClient
    .from('broadcasts')
    .update({ pushed_at: new Date().toISOString(), recipient_count: tokens.length, delivered_count: sent })
    .eq('id', saved.id);

  console.log(`[admin-broadcast] ${user.id} -> broadcast=${saved.id} audience=${audience} replies=${allowReplies} targeted=${tokens.length} sent=${sent} failed=${failed}`);
  return response({ ok: true, broadcast_id: saved.id, audience, allow_replies: allowReplies, targeted: tokens.length, sent, failed, errors }, 200, cors);
});
