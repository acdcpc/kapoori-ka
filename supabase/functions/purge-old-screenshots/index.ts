// Deletes payment-screenshot objects older than RETENTION_DAYS and clears the
// matching payments.screenshot_path. Storage is the tightest quota (1 GB on the
// free tier) and a receipt only matters while a human is verifying a payment.
//
// Called by .github/workflows/purge-screenshots.yml with the same
// x-reminder-secret header the vaccine reminders use, so no new secret is needed.
// Add ?dry_run=1 to list what would be removed without touching anything.
const RETENTION_DAYS = 7;
const BUCKET = 'payment-screenshots';

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.112.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const cronSecret = Deno.env.get('REMINDER_CRON_SECRET') ?? '';

function response(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

Deno.serve(async (request) => {
  const provided = request.headers.get('x-reminder-secret') ?? '';
  if (!cronSecret || provided !== cronSecret) return response({ error: 'Not authorized.' }, 403);
  if (!supabaseUrl || !serviceRoleKey) return response({ error: 'Server configuration is incomplete.' }, 500);

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const dryRun = new URL(request.url).searchParams.get('dry_run') === '1';
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;

  // Two layouts exist: legacy flat files and <user_id>/<uuid>.jpg folders.
  const stale: string[] = [];
  let scanned = 0;
  const { data: top } = await admin.storage.from(BUCKET).list('', { limit: 1000 });
  for (const entry of top ?? []) {
    if (entry.id) {                       // a file
      scanned += 1;
      if (entry.created_at && new Date(entry.created_at).getTime() < cutoff) stale.push(entry.name);
    } else {                              // a folder
      const { data: inner } = await admin.storage.from(BUCKET).list(entry.name, { limit: 1000 });
      for (const obj of inner ?? []) {
        scanned += 1;
        if (obj.created_at && new Date(obj.created_at).getTime() < cutoff) stale.push(`${entry.name}/${obj.name}`);
      }
    }
  }

  if (dryRun) return response({ dry_run: true, retention_days: RETENTION_DAYS, scanned, would_delete: stale.length, sample: stale.slice(0, 10) }, 200);
  if (stale.length === 0) return response({ ok: true, scanned, deleted: 0 }, 200);

  const { error: removeError } = await admin.storage.from(BUCKET).remove(stale);
  if (removeError) return response({ error: 'Storage delete failed.', detail: removeError.message }, 502);

  // Clear the pointers so the admin panel does not show a missing image.
  const { error: dbError } = await admin.from('payments').update({ screenshot_path: null }).in('screenshot_path', stale);
  if (dbError) return response({ ok: true, scanned, deleted: stale.length, warning: `pointers not cleared: ${dbError.message}` }, 200);

  console.log(`[purge-old-screenshots] scanned=${scanned} deleted=${stale.length} retention=${RETENTION_DAYS}d`);
  return response({ ok: true, scanned, deleted: stale.length }, 200);
});
