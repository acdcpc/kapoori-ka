-- RLS policies for child-photos bucket (bucket must be created in Supabase Dashboard first)
-- Run this after creating the child-photos bucket manually via Storage UI

-- Allow authenticated users to upload to their own user-id folder: [uid]/child-id/photo.jpg
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can upload child photos' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Users can upload child photos"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'child-photos'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;

-- Allow public read access (bucket is public for photo display)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read child photos' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Anyone can read child photos"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'child-photos');
  END IF;
END $$;

-- Allow users to update/delete their own photos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own child photos' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Users can update own child photos"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'child-photos'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own child photos' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Users can delete own child photos"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'child-photos'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;
