// Admin-only payment approval from the owner's phone.
// Same security model as the web admin panel: the activation code plaintext is
// generated here, only its SHA-256 hash is stored (via admin_approve_payment),
// and the plaintext is stored AES-GCM-encrypted on the payments row so the
// PAYER's own app can fetch and redeem it automatically.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.112.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

function corsHeaders(request: Request): HeadersInit | null {
  const origin = request.headers.get('origin') ?? '';
  if (!origin || !allowedOrigins.includes(origin)) return null;
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

function response(body: Record<string, unknown>, status: number, cors: HeadersInit | null) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

function b64(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function hex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no look-alike characters
function generateCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const chars = Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]);
  return `KK-${chars.slice(0, 4).join('')}-${chars.slice(4, 8).join('')}-${chars.slice(8, 12).join('')}`;
}

async function sha256Hex(plaintext: string): Promise<string> {
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(plaintext))));
}

async function encrypt(plaintext: string): Promise<string> {
  const keyB64 = Deno.env.get('AUTOMATION_KEY');
  if (!keyB64) throw new Error('Server configuration is incomplete.');
  const keyBytes = Uint8Array.from(atob(keyB64), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext)));
  return `v1:${b64(iv)}:${b64(ct)}`;
}

Deno.serve(async (request) => {
  const cors = corsHeaders(request);
  if (request.method === 'OPTIONS') return cors ? new Response('ok', { headers: cors }) : new Response('ok', { status: 403 });

  const supabaseUrlReady = supabaseUrl && anonKey && serviceRoleKey && Deno.env.get('AUTOMATION_KEY');
  if (!supabaseUrlReady) return response({ error: 'Server configuration is incomplete.' }, 500, cors);

  const authorization = request.headers.get('Authorization') ?? '';
  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: userError } = await authClient.auth.getUser();
  if (userError || !user?.id) return response({ error: 'Sign in required.' }, 401, cors);

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Server-side admin check (defense in depth; the RPC re-checks too).
  const { data: isAdmin, error: adminErr } = await adminClient.rpc('is_app_admin', { p_actor_id: user.id });
  if (adminErr || isAdmin !== true) return response({ error: 'Not authorized.' }, 403, cors);

  let body: { payment_id?: string };
  try { body = await request.json(); } catch { return response({ error: 'Invalid JSON body.' }, 400, cors); }
  const paymentId = body.payment_id ?? '';
  if (!/^[0-9a-fA-F-]{36}$/.test(paymentId)) return response({ error: 'A valid payment_id is required.' }, 400, cors);

  const { data: payment, error: payErr } = await adminClient
    .from('payments').select('id, user_id, status, plan').eq('id', paymentId).single();
  if (payErr || !payment) return response({ error: 'Payment not found.' }, 404, cors);
  if (payment.status !== 'pending') return response({ error: 'Payment has already been processed.' }, 409, cors);

  const plaintext = generateCode();
  const codeHash = await sha256Hex(plaintext);

  const { error: rpcErr } = await adminClient.rpc('admin_approve_payment', {
    p_payment_id: paymentId,
    p_code_hash: codeHash,
    p_actor_id: user.id,
  });
  if (rpcErr) return response({ error: rpcErr.message || 'Approval failed.' }, 400, cors);

  try {
    const encrypted = await encrypt(plaintext);
    const { error: upErr } = await adminClient
      .from('payments').update({ automation_code_encrypted: encrypted }).eq('id', paymentId);
    if (upErr) return response({ error: 'Approved, but storing the in-app code failed. Use the web admin panel to view it.' }, 500, cors);
  } catch {
    return response({ error: 'Approved, but storing the in-app code failed. Use the web admin panel to view it.' }, 500, cors);
  }

  // Tell the parent immediately — their app will auto-redeem on next open.
  try {
    const { data: tokenRows } = await adminClient
      .from('push_tokens').select('token').eq('user_id', payment.user_id);
    if (tokenRows?.length) {
      const messages = tokenRows.map((r: { token: string }) => ({
        to: r.token,
        title: '🎉 Premium activated! प्रिमियम सक्रिय भयो!',
        body: 'Enjoy Kapoori Ka Premium · कपूरी क प्रिमियमको आनन्द लिनुहोस्।',
        data: { type: 'premium_activated', payment_id: paymentId },
        sound: 'default',
      }));
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messages),
      });
    }
  } catch { /* non-fatal: the in-app auto-redeem still works */ }

  return response({ ok: true, plan: payment.plan }, 200, cors);
});
