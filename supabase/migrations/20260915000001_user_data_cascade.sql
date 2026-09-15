-- Account deletion completeness: personal health data must not outlive its owner.
-- Found during device verification: 10 orphaned child rows from deleted test
-- accounts, because these tables had no FK to auth.users at all.
-- 1) clear existing orphans, 2) add cascading owner FKs.

DELETE FROM public.children WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM public.profiles WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM public.subscriptions WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM public.vaccinations WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM public.growth_records WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM public.milestones WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM public.autism_screenings WHERE user_id NOT IN (SELECT id FROM auth.users);

ALTER TABLE public.children
  ADD CONSTRAINT children_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.vaccinations
  ADD CONSTRAINT vaccinations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.growth_records
  ADD CONSTRAINT growth_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.milestones
  ADD CONSTRAINT milestones_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.autism_screenings
  ADD CONSTRAINT autism_screenings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
