
-- Create storage bucket for planner feedback media
INSERT INTO storage.buckets (id, name, public)
VALUES ('planner-feedback-media', 'planner-feedback-media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Users can upload feedback media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'planner-feedback-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to update their own files
CREATE POLICY "Users can update own feedback media"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'planner-feedback-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete own feedback media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'planner-feedback-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow public read access
CREATE POLICY "Public read access for feedback media"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'planner-feedback-media');
