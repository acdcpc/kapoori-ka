// Kapoori Ka release-security design: authenticated parent submission only;
// all validation, receipt storage, rate limiting, and database writes remain
// on the trusted server boundary.
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

function validString(value: FormDataEntryValue | null, min: number, max: number) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length >= min && normalized.length <= max ? normalized : null;
}

async function receiptSignatureMatchesType(file: File) {
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const isJpeg = header.length >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  const isPng = header.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => header[index] === byte);
  const isWebp = header.length >= 12 && String.fromCharCode(...header.slice(0, 4)) === 'RIFF' && String.fromCharCode(...header.slice(8, 12)) === 'WEBP';
  return (file.type === 'image/jpeg' && isJpeg) ||
    (file.type === 'image/png' && isPng) ||
    (file.type === 'image/webp' && isWebp);
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
  if (userError || !user?.id || !user.email) return response({ error: 'Please sign in with your Kapoori Ka account before submitting payment proof.' }, 401, cors);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return response({ error: 'Invalid submission format.' }, 400, cors);
  }

  const name = validString(form.get('name'), 2, 120);
  const mobile = validString(form.get('mobile'), 0, 24) ?? '';
  const remarks = validString(form.get('remarks'), 0, 500) ?? '';
  const rawTransaction = validString(form.get('transaction_id'), 6, 128);
  const plan = form.get('plan') === 'monthly' ? 'monthly' : form.get('plan') === 'yearly' ? 'yearly' : null;
  const submittedEmail = validString(form.get('email'), 3, 254)?.toLowerCase();

  if (!name || !rawTransaction || !plan || !submittedEmail || submittedEmail !== user.email.toLowerCase()) {
    return response({ error: 'Use the email on your signed-in Kapoori Ka account and complete all required fields.' }, 400, cors);
  }

  const transactionId = rawTransaction.toUpperCase();
  if (!/^[A-Z0-9_-]{6,128}$/.test(transactionId)) {
    return response({ error: 'Transaction ID may contain only letters, numbers, hyphens, and underscores.' }, 400, cors);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const potentialReceipt = form.get('screenshot');
  const receipt = potentialReceipt instanceof File && potentialReceipt.size > 0 ? potentialReceipt : null;
  let receiptPath: string | null = null;

  if (receipt) {
    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
    if (!allowedTypes.has(receipt.type) || receipt.size > 5 * 1024 * 1024) {
      return response({ error: 'Receipt must be a JPG, PNG, or WebP image no larger than 5 MB.' }, 400, cors);
    }
    if (!await receiptSignatureMatchesType(receipt)) {
      return response({ error: 'Receipt file contents do not match the selected image type.' }, 400, cors);
    }
    const extension = receipt.type === 'image/png' ? 'png' : receipt.type === 'image/webp' ? 'webp' : 'jpg';
    receiptPath = `${user.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await adminClient.storage
      .from('payment-screenshots')
      .upload(receiptPath, receipt, { contentType: receipt.type, upsert: false });
    if (uploadError) return response({ error: 'Unable to store the receipt. Please try again.' }, 502, cors);
  }

  const { data: paymentId, error: submissionError } = await adminClient.rpc('create_payment_submission', {
    p_user_id: user.id,
    p_email: user.email,
    p_name: name,
    p_mobile: mobile,
    p_plan: plan,
    p_transaction_id: transactionId,
    p_screenshot_path: receiptPath,
    p_remarks: remarks,
  });

  if (submissionError) {
    if (receiptPath) await adminClient.storage.from('payment-screenshots').remove([receiptPath]);
    const duplicate = /already been submitted/i.test(submissionError.message);
    const throttled = /Too many submissions/i.test(submissionError.message);
    return response({ error: duplicate ? 'This transaction ID has already been submitted.' : throttled ? 'Too many submissions. Please wait before trying again.' : 'Unable to submit payment proof.' }, duplicate ? 409 : throttled ? 429 : 400, cors);
  }

  return response({ success: true, payment_id: paymentId }, 201, cors);
});
