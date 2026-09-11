-- Server-side (Edge Function) reads: service_role needs table-level GRANTs in
-- addition to bypassing RLS. Found via the vaccine-reminder cron run
-- ("permission denied for table children").
GRANT SELECT ON public.children TO service_role;
GRANT SELECT ON public.vaccinations TO service_role;
GRANT SELECT ON public.growth_records TO service_role;
GRANT SELECT ON public.milestones TO service_role;
GRANT SELECT ON public.clinic_visits TO service_role;
GRANT SELECT ON public.feeding_records TO service_role;
GRANT SELECT ON public.autism_screenings TO service_role;
GRANT SELECT ON public.subscriptions TO service_role;
GRANT SELECT ON public.profiles TO service_role;
GRANT SELECT ON public.activation_codes TO service_role;
GRANT SELECT ON public.web_push_subscriptions TO service_role;
