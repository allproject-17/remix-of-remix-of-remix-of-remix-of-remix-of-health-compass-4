
ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS static_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dynamic_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS raw_sensor_data jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS age integer;
