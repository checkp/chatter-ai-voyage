CREATE TABLE public.remarkable_connections (
  user_id uuid PRIMARY KEY,
  device_id text NOT NULL,
  device_token text NOT NULL,
  user_token text,
  user_token_expires_at timestamptz,
  connected_at timestamptz NOT NULL DEFAULT now(),
  last_sync_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON public.remarkable_connections FROM anon, authenticated;
GRANT ALL ON public.remarkable_connections TO service_role;
ALTER TABLE public.remarkable_connections ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_remarkable_connections_updated_at
BEFORE UPDATE ON public.remarkable_connections
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.remarkable_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  doc_id text NOT NULL,
  name text NOT NULL DEFAULT 'Untitled',
  parent_id text,
  doc_type text NOT NULL DEFAULT 'DocumentType',
  path text,
  modified_at timestamptz,
  pdf_path text,
  pdf_size integer,
  extracted_text text,
  extracted_at timestamptz,
  extract_model text,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, doc_id)
);

CREATE INDEX idx_remarkable_notes_user ON public.remarkable_notes (user_id, parent_id);

GRANT SELECT, UPDATE, DELETE ON public.remarkable_notes TO authenticated;
GRANT ALL ON public.remarkable_notes TO service_role;
ALTER TABLE public.remarkable_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own remarkable notes"
  ON public.remarkable_notes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own remarkable notes"
  ON public.remarkable_notes FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own remarkable notes"
  ON public.remarkable_notes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_remarkable_notes_updated_at
BEFORE UPDATE ON public.remarkable_notes
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();