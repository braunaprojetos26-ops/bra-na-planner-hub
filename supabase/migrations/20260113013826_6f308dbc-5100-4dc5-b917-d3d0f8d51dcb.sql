-- Fix pre_qualification_questions public exposure
-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Anyone can view active questions" ON public.pre_qualification_questions;

-- Create a policy requiring authentication
CREATE POLICY "Authenticated users can view active questions"
  ON public.pre_qualification_questions FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = true);