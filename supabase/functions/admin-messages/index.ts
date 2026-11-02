// Admin view of broadcast messages and the replies users sent back.
// Admin-gated like the other admin functions; replies are read with the service
// role because users may only ever see their own.
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

Deno.serve(async (request) => {
  const cors = corsHeaders(request);
  if (request.method === 'OPTIONS') return cors ? new Response('ok', { headers: cors }) : new Response('ok', { status: 403 });
  if (!cors) return response({ error: 'This origin is not authorized.' }, 403, null);
  if (request.method !== 'POST') return response({ error: 'Method not allowed.' }, 405, cors);
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return response({ error: 'Server configuration is incomplete.' }, 500, cors);

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: request.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: userError } = await authClient.auth.getUser();
  if (userError || !user?.id) return response({ error: 'Sign in required.' }, 401, cors);

  const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: adminRow } = await adminClient
    .from('app_admins').select('user_id').eq('user_id', user.id).is('revoked_at', null).maybeSingle();
  if (!adminRow) return response({ error: 'Not authorized.' }, 403, cors);

  let body: { action?: string; broadcast_id?: string; reply_ids?: string[] };
  try { body = await request.json(); } catch { return response({ error: 'Invalid JSON body.' }, 400, cors); }
  const action = String(body.action ?? 'list');

  if (action === 'list') {
    const { data: broadcasts, error: bErr } = await adminClient
      .from('broadcasts')
      .select('id, title, body, allow_replies, audience, created_at, pushed_at, recipient_count, delivered_count, archived_at')
      .order('created_at', { ascending: false })
      .limit(100);
    if (bErr) return response({ error: 'Could not load messages.' }, 500, cors);

    const { data: replies } = await adminClient
      .from('broadcast_replies')
      .select('broadcast_id, read_at')
      .limit(5000);

    const stats = new Map<string, { total: number; unread: number }>();
    for (const reply of replies ?? []) {
      const current = stats.get(reply.broadcast_id) ?? { total: 0, unread: 0 };
      current.total += 1;
      if (!reply.read_at) current.unread += 1;
      stats.set(reply.broadcast_id, current);
    }

    return response({
      ok: true,
      broadcasts: (broadcasts ?? []).map((b) => ({
        ...b,
        reply_count: stats.get(b.id)?.total ?? 0,
        unread_reply_count: stats.get(b.id)?.unread ?? 0,
      })),
    }, 200, cors);
  }

  if (action === 'thread') {
    const broadcastId = String(body.broadcast_id ?? '');
    if (!broadcastId) return response({ error: 'broadcast_id is required.' }, 400, cors);

    const { data: broadcast } = await adminClient
      .from('broadcasts')
      .select('id, title, body, title_ne, body_ne, allow_replies, audience, created_at')
      .eq('id', broadcastId)
      .maybeSingle();
    if (!broadcast) return response({ error: 'Message not found.' }, 404, cors);

    const { data: replies, error: rErr } = await adminClient
      .from('broadcast_replies')
      .select('id, user_id, body, created_at, read_at')
      .eq('broadcast_id', broadcastId)
      .order('created_at', { ascending: true })
      .limit(500);
    if (rErr) return response({ error: 'Could not load replies.' }, 500, cors);

    // Attach a human label to each reply. Bounded so a long thread cannot fan
    // out into hundreds of auth calls.
    const userIds = [...new Set((replies ?? []).map((r) => r.user_id))].slice(0, 100);
    const labels = new Map<string, { email?: string; name?: string }>();
    await Promise.all(userIds.map(async (id) => {
      try {
        const { data } = await adminClient.auth.admin.getUserById(id);
        if (data?.user) {
          labels.set(id, {
            email: data.user.email ?? undefined,
            name: (data.user.user_metadata?.full_name as string | undefined) ?? undefined,
          });
        }
      } catch { /* label is optional */ }
    }));

    return response({
      ok: true,
      broadcast,
      replies: (replies ?? []).map((r) => ({ ...r, user: labels.get(r.user_id) ?? null })),
    }, 200, cors);
  }

  if (action === 'mark_read') {
    const broadcastId = String(body.broadcast_id ?? '');
    const replyIds = Array.isArray(body.reply_ids) ? body.reply_ids.map(String).filter(Boolean) : [];
    const stamp = new Date().toISOString();

    if (replyIds.length) {
      const { error } = await adminClient.from('broadcast_replies').update({ read_at: stamp }).in('id', replyIds).is('read_at', null);
      if (error) return response({ error: 'Could not mark replies as read.' }, 500, cors);
      return response({ ok: true, marked: replyIds.length }, 200, cors);
    }
    if (!broadcastId) return response({ error: 'broadcast_id or reply_ids is required.' }, 400, cors);

    const { error } = await adminClient
      .from('broadcast_replies').update({ read_at: stamp }).eq('broadcast_id', broadcastId).is('read_at', null);
    if (error) return response({ error: 'Could not mark the thread as read.' }, 500, cors);
    return response({ ok: true, broadcast_id: broadcastId }, 200, cors);
  }

  return response({ error: 'Unknown action.' }, 400, cors);
});
