// src/lib/caregiverAccess.ts — Explicit, revocable shared-care access only.
import { supabase } from './supabase';
import { CaregiverRole, ChildMembership } from '../types';

const mapMembership = (row: any): ChildMembership => ({
  id: row.id,
  childId: row.child_id,
  userId: row.user_id,
  role: row.role,
  acceptedAt: row.accepted_at,
  revokedAt: row.revoked_at,
});

export async function createCaregiverCode(childId: string, role: CaregiverRole): Promise<{ code: string; expiresAt: string }> {
  const { data, error } = await supabase.rpc('create_child_invitation', { p_child_id: childId, p_role: role });
  if (error) throw error;
  if (!data?.code || !data?.expires_at) throw new Error('Could not create a caregiver code.');
  return { code: data.code, expiresAt: data.expires_at };
}

export async function redeemCaregiverCode(code: string): Promise<{ childId: string; role: CaregiverRole }> {
  const { data, error } = await supabase.rpc('redeem_child_invitation', { p_code: code.trim() });
  if (error) throw error;
  return { childId: data.child_id, role: data.role };
}

export async function listCaregivers(childId: string): Promise<ChildMembership[]> {
  const { data, error } = await supabase
    .from('child_memberships')
    .select('*')
    .eq('child_id', childId)
    .is('revoked_at', null)
    .order('accepted_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapMembership);
}

export async function revokeCaregiver(childId: string, caregiverUserId: string): Promise<void> {
  const { error } = await supabase.rpc('revoke_child_caregiver', { p_child_id: childId, p_user_id: caregiverUserId });
  if (error) throw error;
}
