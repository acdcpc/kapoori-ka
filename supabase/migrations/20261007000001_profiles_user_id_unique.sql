-- The app upserts public.profiles with { onConflict: 'user_id' }, but user_id had
-- no unique constraint (only the id primary key), so every sign-in and sign-up
-- failed with:
--   42P10 there is no unique or exclusion constraint matching the ON CONFLICT specification
-- New accounts therefore never got a profile row — silent, because the client logs
-- the error and continues. Reproduced with a throwaway account before and after:
-- POST /rest/v1/profiles?on_conflict=user_id returned 42501/42P10-adjacent failure
-- pre-fix and 201 (then 200 on merge) post-fix.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class r ON r.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = r.relnamespace
    WHERE n.nspname = 'public' AND r.relname = 'profiles' AND c.contype = 'u'
      AND pg_get_constraintdef(c.oid) = 'UNIQUE (user_id)'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
  END IF;
END $$;
