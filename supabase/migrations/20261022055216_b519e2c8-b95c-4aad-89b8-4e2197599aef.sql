REVOKE SELECT ON public.automation_state FROM anon, authenticated;
REVOKE SELECT ON public.model_update_reports FROM anon, authenticated;

DROP POLICY IF EXISTS "Signed-in users can read automation state" ON public.automation_state;
DROP POLICY IF EXISTS "Signed-in users can read model update reports" ON public.model_update_reports;