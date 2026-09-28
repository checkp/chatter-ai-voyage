ALTER POLICY "Admins can manage model pricing" ON public.model_pricing TO authenticated;
ALTER POLICY "Admins can manage packages" ON public.token_packages TO authenticated;