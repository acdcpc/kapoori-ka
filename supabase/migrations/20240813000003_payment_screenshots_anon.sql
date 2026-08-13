-- ============================================================================
-- Fix payment screenshot uploads.
--
-- payment.html submits with the ANON key (no login), but the bucket's upload
-- policy required auth.role() = 'authenticated', so every screenshot upload was
-- silently blocked (403) and the payment was created with screenshot_url = null.
--
-- Also make the bucket public so the admin panel can render screenshots via a
-- plain <img> tag — public URLs don't carry the Supabase auth header, so a
-- private bucket would 401 in the browser.
-- ============================================================================

-- 1. Make the bucket public (admin panel loads screenshots via <img>)
UPDATE storage.buckets SET public = true WHERE id = 'payment-screenshots';

-- 2. Allow anonymous upload from the public payment page
DROP POLICY IF EXISTS "Anon can upload payment screenshots" ON storage.objects;
CREATE POLICY "Anon can upload payment screenshots" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'payment-screenshots' AND auth.role() = 'anon');

-- 3. Allow anyone to read (public bucket)
DROP POLICY IF EXISTS "Anyone can read payment screenshots" ON storage.objects;
CREATE POLICY "Anyone can read payment screenshots" ON storage.objects
  FOR SELECT USING (bucket_id = 'payment-screenshots');
