
-- Create storage bucket for media uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for media bucket
CREATE POLICY "Authenticated users can upload media" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'media' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Public can view media" ON storage.objects
FOR SELECT USING (bucket_id = 'media');

CREATE POLICY "Users can update their own media" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'media' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own media" ON storage.objects
FOR DELETE USING (
  bucket_id = 'media' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);
