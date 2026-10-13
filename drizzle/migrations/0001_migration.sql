ALTER TABLE public.alert_events ADD COLUMN failed_count int NOT NULL DEFAULT 0;
ALTER TABLE public.alert_events ADD COLUMN is_test boolean NOT NULL DEFAULT false;
ALTER TABLE public.alert_events ADD COLUMN title text;