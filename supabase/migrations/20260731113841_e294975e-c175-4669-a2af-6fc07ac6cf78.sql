-- Remove pointless anon read access (no policy grants anon reads on these)
REVOKE SELECT ON public.image_model_pricing FROM anon;
REVOKE SELECT ON public.model_pricing FROM anon;
REVOKE SELECT ON public.token_packages FROM anon;

-- Internal, service-role-only tables should not be visible to signed-in users
REVOKE ALL ON public.demo_daily_usage FROM authenticated, anon;
REVOKE ALL ON public.demo_rate_limits FROM authenticated, anon;

GRANT ALL ON public.demo_daily_usage TO service_role;
GRANT ALL ON public.demo_rate_limits TO service_role;