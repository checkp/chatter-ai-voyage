-- Hide sensitive tables from the anonymous (pre-signin) GraphQL/PostgREST surface.
REVOKE SELECT ON public.roboheard_api_keys FROM anon;
REVOKE SELECT ON public.user_capability_defaults FROM anon;
REVOKE SELECT ON public.user_mcp_settings FROM anon;

-- Prevent authenticated users from directly mutating their token balance.
-- Edge functions use service_role and are unaffected.
REVOKE INSERT, UPDATE, DELETE ON public.user_tokens FROM authenticated;