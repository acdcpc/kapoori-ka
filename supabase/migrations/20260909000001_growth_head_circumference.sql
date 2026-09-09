-- Head circumference measurement (WHO HC-for-age, 0-60 months)
ALTER TABLE public.growth_records
  ADD COLUMN IF NOT EXISTS head_circumference numeric;

COMMENT ON COLUMN public.growth_records.head_circumference IS 'Head circumference in cm, measured with a non-stretchable tape at the widest point above the eyebrows and ears';
