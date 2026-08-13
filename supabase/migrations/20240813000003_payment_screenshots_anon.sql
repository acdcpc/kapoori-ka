-- ============================================================================
-- Fix payment screenshot uploads (anonymous) — bucket stays PRIVATE.
--
-- payment.html submits with the ANON key, but the bucket's upload policy
-- required auth.role() = 'authenticated', so every screenshot upload was
-- silently blocked (403). Allow anonymous upload.
--
-- The bucket stays private; the admin panel generates time-limited signed URLs
-- (createSignedUrl) to view screenshots instead of exposing them publicly.
-- The existing "Users can read own screenshots" policy (authenticated SELECT)
-- already permits the admin to generate those signed URLs.
-- ============================================================================

DROP POLICY IF EXISTS "Anon can upload payment screenshots" ON storage.objects;
CREATE POLICY "Anon can upload payment screenshots" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'payment-screenshots' AND auth.role() = 'anon');
