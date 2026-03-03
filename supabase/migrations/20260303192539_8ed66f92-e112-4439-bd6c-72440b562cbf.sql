
-- Create storage bucket for milestone proofs
INSERT INTO storage.buckets (id, name, public) VALUES ('milestone-proofs', 'milestone-proofs', true);

-- Storage policies
CREATE POLICY "Authenticated users can upload milestone proofs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'milestone-proofs');

CREATE POLICY "Anyone can view milestone proofs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'milestone-proofs');
