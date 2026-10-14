CREATE TABLE public.monitor_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  camera_url text,
  location text,
  enabled boolean NOT NULL DEFAULT false,
  threshold real NOT NULL DEFAULT 0.5,
  cron_token uuid NOT NULL DEFAULT gen_random_uuid(),
  last_run_at timestamptz,
  last_status text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.monitor_settings TO service_role;
ALTER TABLE public.monitor_settings ENABLE ROW LEVEL SECURITY;
INSERT INTO public.monitor_settings (id) VALUES (1);

CREATE TABLE public.detections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'appareil',
  location text,
  fire boolean NOT NULL DEFAULT false,
  flood boolean NOT NULL DEFAULT false,
  fire_conf real NOT NULL DEFAULT 0,
  flood_conf real NOT NULL DEFAULT 0,
  severity text,
  summary text,
  image_path text
);
GRANT ALL ON public.detections TO service_role;
ALTER TABLE public.detections ENABLE ROW LEVEL SECURITY;
CREATE INDEX detections_created_idx ON public.detections (created_at DESC);

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;