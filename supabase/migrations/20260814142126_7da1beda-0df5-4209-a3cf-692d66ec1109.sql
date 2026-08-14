CREATE TABLE public.hub_nodes (
  mesh_id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  host text NOT NULL,
  version text,
  agents jsonb NOT NULL DEFAULT '[]'::jsonb,
  repo_focus jsonb NOT NULL DEFAULT '[]'::jsonb,
  models jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_seen timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.hub_messages (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL,
  mesh_id uuid,
  channel text NOT NULL DEFAULT 'general',
  body text NOT NULL,
  by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.hub_model_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  target_mesh_id text NOT NULL,
  target_host text NOT NULL,
  model text NOT NULL,
  messages jsonb NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','done','error')),
  reply text,
  error text,
  timeout_ms int NOT NULL DEFAULT 120000,
  running_since timestamptz,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX hub_nodes_user_idx ON public.hub_nodes (user_id, last_seen DESC);
CREATE INDEX hub_messages_user_id_idx ON public.hub_messages (user_id, id);
CREATE INDEX hub_messages_user_channel_idx ON public.hub_messages (user_id, channel, id);
CREATE INDEX hub_model_jobs_target_idx ON public.hub_model_jobs (user_id, target_mesh_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hub_nodes TO authenticated;
GRANT ALL ON public.hub_nodes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hub_messages TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.hub_messages_id_seq TO authenticated;
GRANT ALL ON public.hub_messages TO service_role;
GRANT ALL ON SEQUENCE public.hub_messages_id_seq TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hub_model_jobs TO authenticated;
GRANT ALL ON public.hub_model_jobs TO service_role;

ALTER TABLE public.hub_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hub_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hub_model_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hub_nodes owner select" ON public.hub_nodes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "hub_nodes owner insert" ON public.hub_nodes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "hub_nodes owner update" ON public.hub_nodes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "hub_nodes owner delete" ON public.hub_nodes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "hub_messages owner select" ON public.hub_messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "hub_messages owner insert" ON public.hub_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "hub_messages owner update" ON public.hub_messages FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "hub_messages owner delete" ON public.hub_messages FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "hub_model_jobs owner select" ON public.hub_model_jobs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "hub_model_jobs owner insert" ON public.hub_model_jobs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "hub_model_jobs owner update" ON public.hub_model_jobs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "hub_model_jobs owner delete" ON public.hub_model_jobs FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.hub_nodes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hub_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hub_model_jobs;