// src/lib/offlineSync.ts — Whitelisted local mutations, replayed only by their owner after sign-in.
import { OfflineMutation } from '../types';
import { loadOfflineQueue, saveOfflineQueue } from './featureStorage';
import { supabase } from './supabase';

const uuid = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const ALLOWED_MUTATIONS = new Set<OfflineMutation['operation']>([
  'create_feeding_record',
  'create_clinic_visit',
  'update_privacy_preferences',
  'record_export_audit',
]);

export function createOfflineMutation(operation: OfflineMutation['operation'], payload: Record<string, unknown>, ownerId: string): OfflineMutation {
  if (!ALLOWED_MUTATIONS.has(operation)) throw new Error('Unsupported offline operation');
  if (!ownerId.trim()) throw new Error('An authenticated account is required to queue an offline record');
  return { id: uuid(), ownerId, createdAt: new Date().toISOString(), operation, payload, attempts: 0 };
}

async function replay(mutation: OfflineMutation, ownerId: string): Promise<void> {
  if (!ALLOWED_MUTATIONS.has(mutation.operation) || mutation.ownerId !== ownerId) throw new Error('Offline record does not belong to this account');
  if (mutation.operation === 'create_feeding_record') {
    if (mutation.payload.recorded_by !== ownerId) throw new Error('Feeding record ownership mismatch');
    const { error } = await supabase.from('feeding_records').insert(mutation.payload);
    if (error) throw error;
    return;
  }
  if (mutation.operation === 'create_clinic_visit') {
    if (mutation.payload.recorded_by !== ownerId) throw new Error('Clinic visit ownership mismatch');
    const { error } = await supabase.from('clinic_visits').insert(mutation.payload);
    if (error) throw error;
    return;
  }
  if (mutation.operation === 'update_privacy_preferences') {
    if (mutation.payload.user_id !== ownerId) throw new Error('Privacy preference ownership mismatch');
    const { error } = await supabase.from('user_privacy_preferences').upsert(mutation.payload);
    if (error) throw error;
    return;
  }
  if (mutation.operation === 'record_export_audit') {
    if (mutation.payload.actor_id !== ownerId) throw new Error('Export audit ownership mismatch');
    const { error } = await supabase.from('record_export_audit').insert(mutation.payload);
    if (error) throw error;
  }
}

export async function flushOfflineQueue(ownerId: string): Promise<{ synced: number; remaining: number }> {
  if (!ownerId.trim()) throw new Error('Sign in before syncing offline records');
  const queue = await loadOfflineQueue();
  const remaining: OfflineMutation[] = [];
  let synced = 0;
  for (const mutation of queue) {
    if (mutation.ownerId !== ownerId) {
      remaining.push(mutation);
      continue;
    }
    try {
      await replay(mutation, ownerId);
      synced += 1;
    } catch (error: any) {
      remaining.push({ ...mutation, attempts: mutation.attempts + 1, lastError: String(error?.message || 'Sync failed') });
    }
  }
  await saveOfflineQueue(remaining);
  return { synced, remaining: remaining.length };
}
