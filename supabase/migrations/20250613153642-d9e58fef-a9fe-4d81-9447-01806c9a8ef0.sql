
-- First, let's check if we have any token packages and add some if needed
INSERT INTO public.token_packages (name, tokens, price_cents, bonus_percentage, is_active, sort_order)
VALUES 
  ('Starter Pack', 1000, 999, 0, true, 1),
  ('Popular Pack', 5000, 4499, 10, true, 2),
  ('Pro Pack', 15000, 12999, 15, true, 3),
  ('Ultimate Pack', 50000, 39999, 20, true, 4)
ON CONFLICT DO NOTHING;

-- Enable RLS on token_packages table
ALTER TABLE public.token_packages ENABLE ROW LEVEL SECURITY;

-- Create policy to allow everyone to read token packages (they are public)
CREATE POLICY "Anyone can view active token packages" 
  ON public.token_packages 
  FOR SELECT 
  USING (is_active = true);
