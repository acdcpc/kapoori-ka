// Returns the payer's own issued activation code (AES-GCM-encrypted at
// approval time) so their app can redeem it automatically — no typing.
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
  if (origin && !allowedOrigins.includes(origin)) return null; // native/no-origin requests allowed; cross-origin browsers blocked
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

async function decrypt(payload: string): Promise<string> {
  const keyB64 = Deno.env.get('AUTOMATION_KEY');
  if (!keyB64) throw new Error('Server configuration is incomplete.');
  const [version, ivB64, ctB64] = payload.split(':');
  if (version !== 'v1') throw new Error('Unknown payload version.');
  const keyBytes = Uint8Array.from(atob(keyB64), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['decrypt']);
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0)) },
    key,
    Uint8Array.from(atob(ctB64), (c) => c.charCodeAt(0)),
  );
  void b64;
  return new TextDecoder().decode(pt);
}

Deno.serve(async (request) => {
  const cors = corsHeaders(request);
  if (request.method === 'OPTIONS') return cors ? new Response('ok', { headers: cors }) : new Response('ok', { status: 403 });

  if (!(supabaseUrl && anonKey && serviceRoleKey && Deno.env.get('AUTOMATION_KEY'))) {
    return response({ error: 'Server configuration is incomplete.' }, 500, cors);
  }

  const authorization = request.headers.get('Authorization') ?? '';
  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: userError } = await authClient.auth.getUser();
  if (userError || !user?.id) return response({ error: 'Sign in required.' }, 401, cors);

  // Server-side query (service role); the JWT user id scopes the lookup.
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: payment, error: payErr } = await adminClient
    .from('payments')
    .select('id, status, plan, automation_code_encrypted, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (payErr) return response({ error: 'Could not look up your payment.' }, 500, cors);
  if (!payment) return response({ status: 'none' }, 200, cors);
  if (payment.status !== 'approved' || !payment.automation_code_encrypted) {
    return response({ status: payment.status === 'pending' ? 'pending' : payment.status }, 200, cors);
  }

  try {
    const code = await decrypt(payment.automation_code_encrypted);
    return response({ status: 'approved', plan: payment.plan, code }, 200, cors);
  } catch {
    return response({ error: 'Could not read your activation code. Please contact support.' }, 500, cors);
  }
});
