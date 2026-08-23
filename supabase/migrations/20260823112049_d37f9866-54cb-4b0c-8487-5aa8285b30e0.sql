CREATE TABLE public.hub_knowledge (
  user_id uuid NOT NULL,
  kind text NOT NULL,
  item_id text NOT NULL,
  origin_mesh_id uuid NOT NULL,
  updated_at bigint NOT NULL,
  row jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, kind, item_id)
);

CREATE INDEX hub_knowledge_user_updated_idx ON public.hub_knowledge (user_id, updated_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hub_knowledge TO authenticated;
GRANT ALL ON public.hub_knowledge TO service_role;

ALTER TABLE public.hub_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hub_knowledge_select_own" ON public.hub_knowledge
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "hub_knowledge_insert_own" ON public.hub_knowledge
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "hub_knowledge_update_own" ON public.hub_knowledge
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "hub_knowledge_delete_own" ON public.hub_knowledge
  FOR DELETE TO authenticated USING (user_id = auth.uid());