// src/lib/demoData.ts — labelled sample data for demos and support calls.
// Never mixed with real data: the demo child's name is prefixed with "DEMO —"
// and removal deletes exactly that child plus its own records.
import dayjs from 'dayjs';
import { supabase } from './supabase';

const DEMO_PREFIX = 'DEMO — ';

export const isDemoChildName = (name: string | null | undefined): boolean =>
  typeof name === 'string' && name.startsWith(DEMO_PREFIX);

export async function hasDemoData(userId: string): Promise<boolean> {
  const { data } = await supabase.from('children').select('id').eq('user_id', userId).like('name', `${DEMO_PREFIX}%`).limit(1);
  return Boolean(data?.length);
}

/** Inserts a clearly-labelled demo child with realistic sample records. */
export async function insertDemoData(userId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const dob = dayjs().subtract(18, 'month').format('YYYY-MM-DD');
    const { data: child, error: childErr } = await supabase
      .from('children')
      .insert({
        user_id: userId,
        name: `${DEMO_PREFIX}Sita (sample)`,
        name_nepali: 'नमुना — सीता',
        date_of_birth: dob,
        sex: 'female',
        birth_weight: 3.1,
        birth_length: 49.5,
      })
      .select('id')
      .single();
    if (childErr || !child?.id) return { ok: false, error: childErr?.message || 'Could not create the demo child.' };

    const childId = child.id;
    const at = (months: number) => dayjs(dob).add(months, 'month').format('YYYY-MM-DD');

    await supabase.from('growth_records').insert([
      { child_id: childId, user_id: userId, date: at(0), weight: 3.1, height: 49.5, head_circumference: 34.2, notes: 'Sample data (demo)', recorded_at: dayjs().toISOString() },
      { child_id: childId, user_id: userId, date: at(3), weight: 5.9, height: 59.8, head_circumference: 39.4, notes: 'Sample data (demo)', recorded_at: dayjs().toISOString() },
      { child_id: childId, user_id: userId, date: at(6), weight: 7.4, height: 65.9, head_circumference: 42.0, notes: 'Sample data (demo)', recorded_at: dayjs().toISOString() },
      { child_id: childId, user_id: userId, date: at(12), weight: 9.1, height: 74.0, head_circumference: 44.6, notes: 'Sample data (demo)', recorded_at: dayjs().toISOString() },
      { child_id: childId, user_id: userId, date: at(18), weight: 10.4, height: 80.5, head_circumference: 46.2, notes: 'Sample data (demo)', recorded_at: dayjs().toISOString() },
    ]);

    await supabase.from('vaccinations').insert([
      { child_id: childId, user_id: userId, vaccine_name: 'bcg', is_given: true, given_date: at(0), scheduled_date: at(0) },
      { child_id: childId, user_id: userId, vaccine_name: 'penta1', is_given: true, given_date: at(2), scheduled_date: at(1.4) },
      { child_id: childId, user_id: userId, vaccine_name: 'penta2', is_given: false, scheduled_date: at(2.3) },
    ]);

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Could not create demo data.' };
  }
}

/** Removes every demo child and its records. Returns the number of children removed. */
export async function removeDemoData(userId: string): Promise<number> {
  const { data: kids } = await supabase.from('children').select('id').eq('user_id', userId).like('name', `${DEMO_PREFIX}%`);
  if (!kids?.length) return 0;
  const ids = kids.map((k: any) => k.id);
  await supabase.from('growth_records').delete().in('child_id', ids);
  await supabase.from('vaccinations').delete().in('child_id', ids);
  await supabase.from('children').delete().in('id', ids);
  return ids.length;
}
