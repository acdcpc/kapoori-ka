// src/data/broadcasts.ts — inbox for admin broadcasts and the replies users send back.
//
// Every function tolerates the tables being absent (Postgres 42P01). The client
// ships ahead of the migration, and an inbox that crashes the Home screen on an
// older database would be far worse than an inbox that reads as empty.
import { supabase } from '../lib/supabase';

export type Broadcast = {
  id: string;
  title: string;
  title_ne: string | null;
  body: string;
  body_ne: string | null;
  audience: 'all' | 'premium' | 'free';
  allow_replies: boolean;
  created_at: string;
};

export type BroadcastReply = {
  id: string;
  broadcast_id: string;
  user_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

const MISSING_TABLE = '42P01';

function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === MISSING_TABLE || /relation .* does not exist/i.test(error.message ?? '');
}

export async function listBroadcasts(): Promise<Broadcast[]> {
  const { data, error } = await supabase
    .from('broadcasts')
    .select('id, title, title_ne, body, body_ne, audience, allow_replies, created_at')
    .is('archived_at', null)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
  return (data ?? []) as Broadcast[];
}

export async function listReadBroadcastIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('broadcast_reads')
    .select('broadcast_id')
    .eq('user_id', userId);

  if (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
  return (data ?? []).map((row: { broadcast_id: string }) => row.broadcast_id);
}

export async function markBroadcastRead(broadcastId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('broadcast_reads')
    .upsert({ broadcast_id: broadcastId, user_id: userId }, { onConflict: 'broadcast_id,user_id' });

  if (error && !isMissingTable(error)) throw error;
}

export async function getBroadcast(broadcastId: string): Promise<Broadcast | null> {
  const { data, error } = await supabase
    .from('broadcasts')
    .select('id, title, title_ne, body, body_ne, audience, allow_replies, created_at')
    .eq('id', broadcastId)
    .maybeSingle();

  if (error) {
    if (isMissingTable(error)) return null;
    throw error;
  }
  return (data as Broadcast) ?? null;
}

export async function listMyReplies(broadcastId: string, userId: string): Promise<BroadcastReply[]> {
  const { data, error } = await supabase
    .from('broadcast_replies')
    .select('id, broadcast_id, user_id, body, created_at, read_at')
    .eq('broadcast_id', broadcastId)
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
  return (data ?? []) as BroadcastReply[];
}

export async function sendBroadcastReply(
  broadcastId: string,
  userId: string,
  body: string,
): Promise<BroadcastReply> {
  const trimmed = body.trim();
  if (!trimmed) throw new Error('Reply cannot be empty.');
  if (trimmed.length > 2000) throw new Error('Reply is too long.');

  const { data, error } = await supabase
    .from('broadcast_replies')
    .insert({ broadcast_id: broadcastId, user_id: userId, body: trimmed })
    .select('id, broadcast_id, user_id, body, created_at, read_at')
    .single();

  if (error) throw error;
  return data as BroadcastReply;
}

/** Unread count for the settings badge. Silent: a bad count must never break Home. */
export async function countUnreadBroadcasts(userId: string): Promise<number> {
  try {
    const [broadcasts, readIds] = await Promise.all([listBroadcasts(), listReadBroadcastIds(userId)]);
    const read = new Set(readIds);
    return broadcasts.filter((b) => !read.has(b.id)).length;
  } catch {
    return 0;
  }
}
