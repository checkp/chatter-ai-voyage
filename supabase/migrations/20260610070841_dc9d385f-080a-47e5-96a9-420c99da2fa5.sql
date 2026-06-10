CREATE TABLE public.image_model_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL,
  model_id TEXT NOT NULL,
  size TEXT NOT NULL DEFAULT 'default',
  usd_per_image NUMERIC(10,6) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (platform, model_id, size)
);

GRANT SELECT ON public.image_model_pricing TO authenticated;
GRANT ALL ON public.image_model_pricing TO service_role;

ALTER TABLE public.image_model_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "image_model_pricing_read_authenticated"
  ON public.image_model_pricing FOR SELECT
  TO authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.update_image_model_pricing_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_image_model_pricing_updated_at
  BEFORE UPDATE ON public.image_model_pricing
  FOR EACH ROW EXECUTE FUNCTION public.update_image_model_pricing_updated_at();

INSERT INTO public.image_model_pricing (platform, model_id, size, usd_per_image, notes) VALUES
  ('openai', 'dall-e-3', '1024x1024', 0.040, 'DALL-E 3 standard'),
  ('openai', 'dall-e-3', '1024x1792', 0.080, 'DALL-E 3 HD/tall'),
  ('openai', 'dall-e-3', '1792x1024', 0.080, 'DALL-E 3 HD/wide'),
  ('openai', 'gpt-image-1', 'default', 0.040, 'GPT Image 1'),
  ('google', 'gemini-2.5-flash-image', 'default', 0.020, 'Gemini 2.5 Flash Image'),
  ('google', 'gemini-image', 'default', 0.020, 'Gemini image (legacy alias)'),
  ('google', 'gemini-pro-image', 'default', 0.040, 'Gemini Pro Image'),
  ('google', 'imagen-3', 'default', 0.040, 'Imagen 3'),
  ('xai', 'grok-aurora', 'default', 0.030, 'xAI Grok Aurora'),
  ('xai', 'grok-image', 'default', 0.030, 'Grok image alias'),
  ('alibaba', 'qwen-image', 'default', 0.020, 'Qwen image via DashScope'),
  ('pollinations', 'pollinations-flux', 'default', 0.000, 'Free Pollinations Flux'),
  ('pollinations', 'pollinations', 'default', 0.000, 'Free Pollinations')
ON CONFLICT (platform, model_id, size) DO UPDATE
  SET usd_per_image = EXCLUDED.usd_per_image,
      notes = EXCLUDED.notes,
      updated_at = now();