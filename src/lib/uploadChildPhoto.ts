// src/lib/uploadChildPhoto.ts
// Shared child-photo upload pipeline used by BOTH Add Child and Change Photo.
// Photos are stored in the PRIVATE `child-photos` bucket under
// `<auth.uid()>/<childId>/photo.jpg`; only the storage path is written to the
// child row, and display goes through the signed-URL layer (see ./childPhoto).
import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase';

export const CHILD_PHOTO_MAX_BYTES = 2 * 1024 * 1024; // 2 MB — matches bucket file_size_limit
export const CHILD_PHOTO_MAX_DIM = 512;               // longest edge after resize

const MIME_JPEG = 'image/jpeg';

export interface PhotoUploadError {
  code: string;
  en: string;
  ne: string;
}

/** Convert any thrown upload error to a localized message. */
export function photoErrorText(e: unknown, isNe: boolean): string {
  const err = e as PhotoUploadError | null;
  if (err && err.code && typeof err.en === 'string') return isNe ? err.ne : err.en;
  return isNe ? 'फोटो अपलोड गर्न सकिएन।' : 'Could not upload photo.';
}

function fail(code: string, en: string, ne: string): never {
  throw { code, en, ne } as PhotoUploadError;
}

async function fileSizeBytes(uri: string): Promise<number> {
  if (Platform.OS === 'web') {
    try {
      const r = await fetch(uri);
      const b = await r.blob();
      return b.size;
    } catch {
      return 0;
    }
  }
  const info = await FileSystem.getInfoAsync(uri);
  return (info as { size?: number } | null)?.size ?? 0;
}

/**
 * Normalize a picked image to JPEG (this also re-encodes iOS HEIC), enforce a
 * size ceiling, upload to the private bucket, then persist the storage path to
 * the child row. If the child-row update fails the uploaded object is removed
 * so no orphan remains. Returns the storage path.
 */
export async function uploadChildPhoto(opts: {
  uri: string;
  childId: string;
}): Promise<string> {
  const { uri, childId } = opts;
  if (!uri) fail('no_uri', 'No image selected.', 'फोटो छानिएको छैन।');

  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) fail('no_auth', 'Please sign in first.', 'कृपया पहिले लगइन गर्नुहोस्।');

  // 1) Normalize to JPEG (converts HEIC/PNG/WebP to JPEG).
  let normalizedUri: string;
  try {
    const manip = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: CHILD_PHOTO_MAX_DIM, height: CHILD_PHOTO_MAX_DIM } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
    );
    normalizedUri = manip.uri;
  } catch {
    fail('convert_failed',
      'Could not process this image. Choose a JPEG or PNG photo.',
      'यो फोटो प्रशोधन गर्न सकिएन। JPEG वा PNG फोटो छान्नुहोस्।');
  }

  // 2) Size ceiling (a 512px JPEG is normally well under 2 MB).
  const bytes = await fileSizeBytes(normalizedUri);
  if (bytes > CHILD_PHOTO_MAX_BYTES) {
    fail('too_large', 'Photo is too large (max 2 MB).', 'फोटो धेरै ठूलो छ (अधिकतम २ MB)।');
  }

  const storagePath = `${uid}/${childId}/photo.jpg`;

  // 3) Upload with the correct content type and non-public cache behavior.
  if (Platform.OS === 'web') {
    const blob = await fetch(normalizedUri).then((r) => r.blob());
    const { error } = await supabase.storage
      .from('child-photos')
      .upload(storagePath, blob, { upsert: true, contentType: MIME_JPEG });
    if (error) fail('upload_failed', error.message, 'फोटो अपलोड गर्न सकिएन।');
  } else {
    const token = session.access_token;
    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/child-photos/${storagePath}`;
    const result = await FileSystem.uploadAsync(uploadUrl, normalizedUri, {
      httpMethod: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
        'x-upsert': 'true',
        'Content-Type': MIME_JPEG,
      },
    });
    if (result.status < 200 || result.status >= 300) {
      fail('upload_failed', result.body || 'Upload failed.', 'फोटो अपलोड गर्न सकिएन।');
    }
  }

  // 4) Persist the path; delete the object if the child-row update fails.
  const { error: updateErr } = await supabase
    .from('children')
    .update({ photo_uri: storagePath })
    .eq('id', childId);
  if (updateErr) {
    await supabase.storage.from('child-photos').remove([storagePath]).catch(() => {});
    fail('save_failed', updateErr.message, 'फोटो सेभ गर्न सकिएन।');
  }

  return storagePath;
}
