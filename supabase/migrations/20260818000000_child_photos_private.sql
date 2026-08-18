-- P0 remediation: the `child-photos` bucket was created public with an
-- unrestricted "Anyone can read child photos" policy, exposing children's
-- photographs to anonymous users. This forward-only migration makes the bucket
-- private, scopes reads to the owning authenticated user, and rewrites any
-- stored public URLs back to storage paths so the client can mint short-lived
-- signed URLs going forward.

-- 1) Make the bucket private.
UPDATE storage.buckets
SET public = false
WHERE id = 'child-photos';

-- 2) Remove the unrestricted read policy.
DROP POLICY IF EXISTS "Anyone can read child photos" ON storage.objects;

-- 3) Owner-scoped read (bucket is private; signed URLs are minted client-side).
DROP POLICY IF EXISTS "Users can read own child photos" ON storage.objects;
CREATE POLICY "Users can read own child photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'child-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 4) Data migration: convert stored public URLs back to storage paths.
UPDATE children
SET photo_uri = substring(photo_uri from '/object/public/child-photos/(.*)$')
WHERE photo_uri LIKE '%/object/public/child-photos/%';
