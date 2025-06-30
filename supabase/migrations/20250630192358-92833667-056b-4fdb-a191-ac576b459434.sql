
-- Add has_seen_conductor_onboarding column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN has_seen_conductor_onboarding BOOLEAN DEFAULT FALSE;
