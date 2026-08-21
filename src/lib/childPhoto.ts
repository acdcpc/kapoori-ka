import { supabase } from './supabase';

// In-memory cache of minted signed URLs (keyed by storage path).
// Never persisted (no AsyncStorage / service-worker) so signed URLs expire.
const cache = new Map<string, { url: string; exp: number }>();
const TTL_MS = 55 * 60 * 1000; // signed for 60 min; refresh slightly early

/** Drop a cached signed URL (e.g. after an <Image> load failure). */
export function invalidateChildPhotoUrl(ref: string): void {
  cache.delete(ref);
}

/**
 * Resolve a child photo reference to a displayable URL.
 *
 * - Full http(s) URLs (legacy or already-signed) pass through unchanged.
 * - Local URIs (file:/blob:/data:) from the add-child preview flow pass through.
 * - A bare storage path (e.g. `{uid}/{childId}/photo.jpg`) is minted a
 *   short-lived signed URL from the private `child-photos` bucket.
 *
 * Child photos are never served from a public URL.
 */
export async function getChildPhotoUrl(ref: string | null | undefined): Promise<string | null> {
  if (!ref) return null;
  if (/^(https?:\/\/|file:\/\/|blob:|data:)/i.test(ref)) return ref;

  const cached = cache.get(ref);
  if (cached && cached.exp > Date.now()) return cached.url;

  try {
    const { data, error } = await supabase.storage
      .from('child-photos')
      .createSignedUrl(ref, 60 * 60);
    if (error || !data?.signedUrl) return null;
    cache.set(ref, { url: data.signedUrl, exp: Date.now() + TTL_MS });
    return data.signedUrl;
  } catch {
    return null;
  }
}
