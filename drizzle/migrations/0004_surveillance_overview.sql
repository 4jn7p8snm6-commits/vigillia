ALTER TABLE public.detections ADD COLUMN false_alert boolean DEFAULT NULL;
ALTER TABLE public.monitor_settings ADD COLUMN zone_radius_m integer NOT NULL DEFAULT 100 CHECK (zone_radius_m BETWEEN 10 AND 10000), ADD COLUMN camera_checked_at timestamptz, ADD COLUMN camera_ok boolean;
CREATE TABLE public.system_health (id integer PRIMARY KEY CHECK (id = 1), ai_checked_at timestamptz, ai_ok boolean);
GRANT ALL ON public.system_health TO service_role;
ALTER TABLE public.system_health ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.surveillance_overview() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
SELECT jsonb_build_object(
 'synced_at', now(),
 'stats', (SELECT jsonb_build_object('total', count(*), 'fires', count(*) FILTER (WHERE fire), 'floods', count(*) FILTER (WHERE flood), 'false_alerts', count(*) FILTER (WHERE false_alert = true), 'unreviewed', count(*) FILTER (WHERE false_alert IS NULL)) FROM public.detections),
 'trend', COALESCE((SELECT jsonb_agg(t ORDER BY t.day) FROM (SELECT created_at::date AS day, count(*) AS total, count(*) FILTER (WHERE fire) AS fires, count(*) FILTER (WHERE flood) AS floods FROM public.detections WHERE created_at >= now() - interval '30 days' GROUP BY created_at::date) t), '[]'::jsonb),
 'camera', (SELECT jsonb_build_object('configured', camera_url IS NOT NULL AND camera_url <> '', 'enabled', enabled, 'latitude', round(latitude::numeric, 2), 'longitude', round(longitude::numeric, 2), 'radius', zone_radius_m, 'checked_at', camera_checked_at, 'ok', camera_ok, 'last_run_at', last_run_at) FROM public.monitor_settings WHERE id = 1),
 'ai', COALESCE((SELECT jsonb_build_object('checked_at', ai_checked_at, 'ok', ai_ok) FROM public.system_health WHERE id = 1), jsonb_build_object('checked_at', NULL, 'ok', NULL))
);
$$;
REVOKE ALL ON FUNCTION public.surveillance_overview() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.surveillance_overview() TO anon, authenticated, service_role;