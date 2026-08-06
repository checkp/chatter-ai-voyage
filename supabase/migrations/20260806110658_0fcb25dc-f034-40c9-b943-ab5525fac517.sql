CREATE POLICY "Users read own remarkable files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'remarkable-notes' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users upload own remarkable files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'remarkable-notes' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users update own remarkable files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'remarkable-notes' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users delete own remarkable files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'remarkable-notes' AND (storage.foldername(name))[1] = auth.uid()::text);