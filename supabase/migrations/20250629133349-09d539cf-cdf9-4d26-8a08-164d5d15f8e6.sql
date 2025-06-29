
-- Drop all dependent triggers and functions with CASCADE
DROP TRIGGER IF EXISTS on_user_created_initialize_tokens ON public.profiles CASCADE;
DROP TRIGGER IF EXISTS on_user_tokens_created ON auth.users CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP TRIGGER IF EXISTS initialize_user_tokens_trigger ON auth.users CASCADE;

-- Drop existing functions with CASCADE to handle dependencies
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.initialize_user_tokens() CASCADE;

-- Create a single, comprehensive function to handle new user setup
CREATE OR REPLACE FUNCTION public.handle_new_user_setup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert into profiles table (only if not exists)
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Insert into user_tokens table (only if not exists)
  INSERT INTO public.user_tokens (user_id, balance)
  VALUES (NEW.id, 300)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Create a single trigger for new user setup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_setup();
