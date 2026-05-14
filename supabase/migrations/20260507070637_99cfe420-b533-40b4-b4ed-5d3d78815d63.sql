CREATE TABLE public.health_records (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  voc_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  symptoms text,
  ai_analysis text,
  risk_level text NOT NULL CHECK (risk_level IN ('Low','Medium','High')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.health_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own health records"
ON public.health_records FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own health records"
ON public.health_records FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own health records"
ON public.health_records FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX idx_health_records_user_created ON public.health_records(user_id, created_at DESC);