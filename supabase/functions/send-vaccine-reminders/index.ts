// Sends vaccine reminders as Web Push to PWA/browser subscribers.
// Triggered daily by GitHub Actions (x-reminder-secret header) — the app's
// native Android builds use OS-scheduled local notifications instead.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.112.0';
import webpush from 'npm:web-push@3.6.7';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const cronSecret = Deno.env.get('REMINDER_CRON_SECRET') ?? '';
const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:kapoori.ka@gmail.com';

// Nepal NIP schedule (subset used for reminders): [id, name, nameNepali, ageInDays]
const SCHEDULE: [string, string, string, number][] = [
  ['bcg', 'BCG', 'बीसीजी', 0],
  ['penta1', 'Pentavalent 1', 'पेन्टाभ्यालेन्ट १', 42],
  ['opv1', 'OPV 1', 'ओपीभी १', 42],
  ['pcv1', 'PCV 1', 'पीसीभी १', 42],
  ['rota1', 'Rota 1', 'रोटा १', 42],
  ['penta2', 'Pentavalent 2', 'पेन्टाभ्यालेन्ट २', 70],
  ['opv2', 'OPV 2', 'ओपीभी २', 70],
  ['pcv2', 'PCV 2', 'पीसीभी २', 70],
  ['rota2', 'Rota 2', 'रोटा २', 70],
  ['penta3', 'Pentavalent 3', 'पेन्टाभ्यालेन्ट ३', 98],
  ['opv3', 'OPV 3', 'ओपीभी ३', 98],
  ['fipv1', 'fIPV 1', 'fIPV १', 98],
  ['mr1', 'MR 1 (Measles-Rubella)', 'एमआर १ (दादुरा-रुबेला)', 274],
  ['pcv3', 'PCV 3', 'पीसीभी ३', 274],
  ['fipv2', 'fIPV 2', 'fIPV २', 274],
  ['je', 'JE (Japanese Encephalitis)', 'जेई (दिमागी ज्वरो)', 365],
  ['mr2', 'MR 2', 'एमआर २', 456],
  ['typhoid', 'Typhoid', 'टाइफाइड', 456],
];

function response(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

// "Today" in Nepal time (UTC+5:45)
function nepalDate(offsetDays = 0): string {
  const ms = Date.now() + (5 * 60 + 45) * 60 * 1000 + offsetDays * 86400000;
  return new Date(ms).toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  return new Date(d.getTime() + days * 86400000).toISOString().slice(0, 10);
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return response({ error: 'Method not allowed.' }, 405);
  const provided = request.headers.get('x-reminder-secret') ?? '';
  if (!cronSecret || provided !== cronSecret) return response({ error: 'Not authorized.' }, 403);
  if (!supabaseUrl || !serviceRoleKey || !vapidPublic || !vapidPrivate) {
    return response({ error: 'Server configuration is incomplete.' }, 500);
  }

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const today = nepalDate();
  const { data: children, error: childErr } = await admin.from('children').select('id, user_id, name, date_of_birth');
  if (childErr) return response({ error: childErr.message }, 500);
  const childIds = (children ?? []).map((c: any) => c.id);
  if (!childIds.length) return response({ sent: 0, note: 'no children' }, 200);

  const { data: vaccinations } = await admin.from('vaccinations').select('child_id, vaccine_name, scheduled_date, is_given, is_missed').in('child_id', childIds);
  const { data: subs } = await admin.from('web_push_subscriptions').select('id, user_id, endpoint, p256dh, auth').in('user_id', [...new Set((children ?? []).map((c: any) => c.user_id))]);

  const byChild = new Map<string, any>();
  for (const v of vaccinations ?? []) {
    const key = v.child_id;
    if (!byChild.has(key)) byChild.set(key, new Map());
    byChild.get(key).set(v.vaccine_name, v);
  }
  const subsByUser = new Map<string, any[]>();
  for (const s of subs ?? []) {
    if (!subsByUser.has(s.user_id)) subsByUser.set(s.user_id, []);
    subsByUser.get(s.user_id)!.push(s);
  }

  let sent = 0, failed = 0, removed = 0;
  const expired: string[] = [];

  for (const child of children ?? []) {
    const devices = subsByUser.get(child.user_id);
    if (!devices?.length) continue;
    const records = byChild.get(child.id) ?? new Map();

    for (const [id, name, nameNe, ageInDays] of SCHEDULE) {
      const record = records.get(id);
      if (record?.is_given) continue;
      const scheduled = record?.scheduled_date ?? addDays(child.date_of_birth, ageInDays);
      const daysUntil = Math.round((Date.parse(scheduled) - Date.parse(today)) / 86400000);

      let title = '', body = '', kind = '';
      if (daysUntil === 7) {
        kind = '7d';
        title = `💉 ७ दिनमा खोप — ${child.name} / Vaccine in 7 days`;
        body = `${nameNe} · ${name} — ${scheduled}`;
      } else if (daysUntil === 2) {
        kind = '2d';
        title = `💉 २ दिनमा खोप — ${child.name} / Vaccine in 2 days`;
        body = `${nameNe} · ${name} — ${scheduled}`;
      } else if (daysUntil === 0) {
        kind = 'day';
        title = `💉 आज खोप — ${child.name} / Vaccine today`;
        body = `${nameNe} · ${name} — ${scheduled}`;
      } else if (daysUntil < 0) {
        // Overdue cadence: day 1, 4, 7, then weekly — never daily spam.
        const overdue = -daysUntil;
        const CADENCE = [1, 4, 7, 14, 21, 28, 35, 42];
        const due = overdue <= 42 ? CADENCE.includes(overdue) : (overdue - 42) % 7 === 0;
        if (!due || overdue > 365) continue;
        kind = 'overdue';
        title = `💉 खोप बाँकी छ — ${child.name} / Vaccine overdue`;
        body = `${nameNe} · ${name} — ${scheduled}`;
      } else {
        continue;
      }

      for (const device of devices) {
        const nowIso = new Date().toISOString();
        try {
          await webpush.sendNotification(
            { endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } },
            JSON.stringify({ title, body, tag: `vaccine_${id}_${child.id}`, data: { type: 'vaccine', vaccineId: id, childId: child.id } }),
          );
          sent++;
          await admin.from('reminder_delivery_log').insert({
            user_id: child.user_id, child_id: child.id, vaccine_id: id, kind,
            subscription_id: device.id, status: 'sent', provider_status: 201,
          });
          await admin.from('web_push_subscriptions')
            .update({ last_success_at: nowIso, failure_count: 0 }).eq('id', device.id);
        } catch (err: any) {
          failed++;
          const status = err?.statusCode ?? null;
          await admin.from('reminder_delivery_log').insert({
            user_id: child.user_id, child_id: child.id, vaccine_id: id, kind,
            subscription_id: device.id, status: 'failed', provider_status: status,
            error: String(err?.body || err?.message || 'send failed').slice(0, 300),
          });
          const { data: current } = await admin.from('web_push_subscriptions')
            .select('failure_count').eq('id', device.id).maybeSingle();
          await admin.from('web_push_subscriptions')
            .update({ last_failure_at: nowIso, failure_count: (current?.failure_count ?? 0) + 1 }).eq('id', device.id);
          if (status === 404 || status === 410) expired.push(device.id);
        }
      }
    }
  }

  if (expired.length) {
    const { count } = await admin.from('web_push_subscriptions').delete().in('id', expired).select('id');
    removed = count ?? expired.length;
  }

  return response({ ok: true, date: today, sent, failed, removedExpired: removed }, 200);
});
