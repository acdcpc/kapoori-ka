-- Create child-photos storage bucket with RLS
-- Uses the storage schema directly — requires storage extension to be enabled

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE name = 'child-photos') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('child-photos', 'child-photos', true, 2097152, ARRAY['image/png', 'image/jpeg', 'image/jpg']::text[]);
    RAISE NOTICE 'Created child-photos bucket';
  ELSE
    RAISE NOTICE 'child-photos bucket already exists';
  END IF;
END $$;

-- RLS: users upload to their own folder [uid]/...
DROP POLICY IF EXISTS "Users can upload child photos" ON storage.objects;
CREATE POLICY "Users can upload child photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'child-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Anyone can read child photos" ON storage.objects;
CREATE POLICY "Anyone can read child photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'child-photos');
