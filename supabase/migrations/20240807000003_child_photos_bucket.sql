-- Bug 1: Create child-photos bucket with RLS for profile photo uploads

-- Create bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('child-photos', 'child-photos', true, 2097152, ARRAY['image/png', 'image/jpeg', 'image/jpg'])
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own user-id folder
DROP POLICY IF EXISTS "Users can upload child photos" ON storage.objects;
CREATE POLICY "Users can upload child photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'child-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow anyone to read (public bucket for photo display)
DROP POLICY IF EXISTS "Anyone can read child photos" ON storage.objects;
CREATE POLICY "Anyone can read child photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'child-photos');

-- Allow authenticated users to update/delete their own photos
DROP POLICY IF EXISTS "Users can update own child photos" ON storage.objects;
CREATE POLICY "Users can update own child photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'child-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete own child photos" ON storage.objects;
CREATE POLICY "Users can delete own child photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'child-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
