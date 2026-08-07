-- Create payment-screenshots storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('payment-screenshots', 'payment-screenshots', false, 5242880, ARRAY['image/png', 'image/jpeg', 'image/jpg'])
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Authenticated users can upload their own payment screenshots
CREATE POLICY "Users can upload payment screenshots" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'payment-screenshots' AND auth.role() = 'authenticated'
  );

-- Storage RLS: Users can read their own screenshots
CREATE POLICY "Users can read own screenshots" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'payment-screenshots' AND auth.role() = 'authenticated'
  );
