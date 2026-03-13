INSERT INTO storage.buckets (id, name, public) VALUES ('music-uploads', 'music-uploads', true);

CREATE POLICY "Users can upload their own music"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'music-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can read music uploads"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'music-uploads');

CREATE POLICY "Users can delete their own music"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'music-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);