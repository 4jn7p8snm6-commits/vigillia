ALTER TABLE public.detections ADD COLUMN latitude double precision, ADD COLUMN longitude double precision;
ALTER TABLE public.detections ADD CONSTRAINT detection_coordinates_valid CHECK ((latitude IS NULL AND longitude IS NULL) OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180));
ALTER TABLE public.monitor_settings ADD COLUMN latitude double precision, ADD COLUMN longitude double precision;
ALTER TABLE public.monitor_settings ADD CONSTRAINT monitor_coordinates_valid CHECK ((latitude IS NULL AND longitude IS NULL) OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180));
CREATE TABLE public.detection_map_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 kind text NOT NULL CHECK (kind IN ('wildfires', 'floods')),
 observed_at timestamptz NOT NULL,
 latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
 longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180)
);
GRANT SELECT ON public.detection_map_events TO anon, authenticated;
GRANT ALL ON public.detection_map_events TO service_role;
ALTER TABLE public.detection_map_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public approximate camera events" ON public.detection_map_events FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX detection_map_events_date_idx ON public.detection_map_events (observed_at DESC);
CREATE FUNCTION public.publish_detection_map_event() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF NEW.latitude IS NULL OR NEW.longitude IS NULL THEN RETURN NEW; END IF;
 IF NEW.fire THEN
 INSERT INTO public.detection_map_events(kind, observed_at, latitude, longitude) VALUES ('wildfires', NEW.created_at, round(NEW.latitude::numeric, 2), round(NEW.longitude::numeric, 2));
 END IF;
 IF NEW.flood THEN
 INSERT INTO public.detection_map_events(kind, observed_at, latitude, longitude) VALUES ('floods', NEW.created_at, round(NEW.latitude::numeric, 2), round(NEW.longitude::numeric, 2));
 END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.publish_detection_map_event() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER publish_detection_map_event AFTER INSERT ON public.detections FOR EACH ROW EXECUTE FUNCTION public.publish_detection_map_event();