ALTER TABLE public.remarkable_notes
  ADD COLUMN IF NOT EXISTS doc_hash text,
  ADD COLUMN IF NOT EXISTS stale boolean NOT NULL DEFAULT false;

ALTER TABLE public.remarkable_connections
  ADD COLUMN IF NOT EXISTS root_hash text;

CREATE INDEX IF NOT EXISTS remarkable_notes_user_doc_idx
  ON public.remarkable_notes (user_id, doc_id);