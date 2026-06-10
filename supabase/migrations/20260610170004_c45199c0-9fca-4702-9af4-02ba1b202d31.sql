
-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Shared updated_at trigger function (reused)
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 1) user_memory: one markdown doc per user
CREATE TABLE public.user_memory (
  user_id UUID PRIMARY KEY,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_memory TO authenticated;
GRANT ALL ON public.user_memory TO service_role;

ALTER TABLE public.user_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own memory"
  ON public.user_memory FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own memory"
  ON public.user_memory FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own memory"
  ON public.user_memory FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own memory"
  ON public.user_memory FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER user_memory_set_updated_at
  BEFORE UPDATE ON public.user_memory
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 2) message_embeddings: per-message vector
CREATE TABLE public.message_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  conversation_id UUID NOT NULL,
  message_id UUID NOT NULL UNIQUE,
  content TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_embeddings TO authenticated;
GRANT ALL ON public.message_embeddings TO service_role;

ALTER TABLE public.message_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own embeddings"
  ON public.message_embeddings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own embeddings"
  ON public.message_embeddings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own embeddings"
  ON public.message_embeddings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own embeddings"
  ON public.message_embeddings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX message_embeddings_user_idx ON public.message_embeddings (user_id);
CREATE INDEX message_embeddings_conv_idx ON public.message_embeddings (conversation_id);
CREATE INDEX message_embeddings_hnsw_idx
  ON public.message_embeddings USING hnsw (embedding vector_cosine_ops);

-- 3) Similarity search function
CREATE OR REPLACE FUNCTION public.match_user_context(
  p_user_id UUID,
  p_query_embedding vector(1536),
  p_match_count INT DEFAULT 6,
  p_exclude_conversation UUID DEFAULT NULL
)
RETURNS TABLE (
  message_id UUID,
  conversation_id UUID,
  content TEXT,
  similarity FLOAT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    me.message_id,
    me.conversation_id,
    me.content,
    1 - (me.embedding <=> p_query_embedding) AS similarity,
    me.created_at
  FROM public.message_embeddings me
  WHERE me.user_id = p_user_id
    AND (p_exclude_conversation IS NULL OR me.conversation_id <> p_exclude_conversation)
  ORDER BY me.embedding <=> p_query_embedding
  LIMIT p_match_count;
$$;

-- 4) Per-conversation toggle
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS shared_context_enabled BOOLEAN NOT NULL DEFAULT true;
