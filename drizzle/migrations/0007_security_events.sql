CREATE TABLE public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  event_type text NOT NULL,
  success boolean NOT NULL DEFAULT true,
  identifier text NOT NULL DEFAULT '',
  target_user_id uuid,
  actor_user_id uuid,
  details text NOT NULL DEFAULT ''
);
GRANT SELECT ON public.security_events TO authenticated;
GRANT ALL ON public.security_events TO service_role;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read security events" ON public.security_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_security_events_created ON public.security_events (created_at DESC);