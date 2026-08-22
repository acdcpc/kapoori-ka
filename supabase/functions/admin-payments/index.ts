// Kapoori Ka release-security design: the browser authenticates the operator,
// but the server verifies dedicated admin membership and performs every
// privileged database/storage action with short-lived results only.
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
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...(cors ?? {}) },
  });
}

function activationCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const raw = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value.replace(/[^A-Z0-9]/g, '').toUpperCase());
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (request) => {
  const cors = corsHeaders(request);
  if (request.method === 'OPTIONS') return cors ? new Response('ok', { headers: cors }) : new Response('Forbidden', { status: 403 });
  if (!cors) return response({ error: 'This origin is not authorized.' }, 403, null);
  if (request.method !== 'POST') return response({ error: 'Method not allowed.' }, 405, cors);
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return response({ error: 'Server configuration is incomplete.' }, 500, cors);

  const authorization = request.headers.get('Authorization') ?? '';
  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: userError } = await authClient.auth.getUser();
  if (userError || !user?.id) return response({ error: 'Sign in is required.' }, 401, cors);

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: adminRecord } = await adminClient
    .from('app_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .is('revoked_at', null)
    .maybeSingle();
  if (!adminRecord) return response({ error: 'Dedicated administrator access is required.' }, 403, cors);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return response({ error: 'Invalid request body.' }, 400, cors);
  }
  const action = body.action;

  if (action === 'list') {
    const { data: payments, error } = await adminClient
      .from('payments')
      .select('id, name, email, mobile, amount, plan, transaction_id, screenshot_url, status, created_at, verified_at, rejection_reason')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) return response({ error: 'Unable to load payments.' }, 500, cors);

    const withSignedReceipts = await Promise.all((payments ?? []).map(async (payment) => {
      let screenshot_signed_url: string | null = null;
      if (payment.screenshot_url) {
        const { data } = await adminClient.storage
          .from('payment-screenshots')
          .createSignedUrl(payment.screenshot_url, 300);
        screenshot_signed_url = data?.signedUrl ?? null;
      }
      return { ...payment, screenshot_signed_url };
    }));
    return response({ payments: withSignedReceipts }, 200, cors);
  }

  const paymentId = typeof body.payment_id === 'string' ? body.payment_id : '';
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(paymentId)) return response({ error: 'Invalid payment reference.' }, 400, cors);

  if (action === 'reject') {
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    const { error } = await adminClient.rpc('admin_reject_payment', {
      p_payment_id: paymentId,
      p_reason: reason,
      p_actor_id: user.id,
    });
    if (error) return response({ error: 'Unable to reject this payment.' }, 400, cors);
    return response({ success: true, status: 'rejected' }, 200, cors);
  }

  if (action === 'approve' || action === 'regenerate') {
    const code = activationCode();
    const codeHash = await sha256(code);
    const rpcName = action === 'approve' ? 'admin_approve_payment' : 'admin_regenerate_activation_code';
    const { error } = await adminClient.rpc(rpcName, {
      p_payment_id: paymentId,
      p_code_hash: codeHash,
      p_actor_id: user.id,
    });
    if (error) return response({ error: action === 'approve' ? 'Unable to approve this payment.' : 'Unable to generate a replacement code.' }, 400, cors);
    return response({ success: true, status: 'approved', code }, 200, cors);
  }

  return response({ error: 'Unsupported action.' }, 400, cors);
});
