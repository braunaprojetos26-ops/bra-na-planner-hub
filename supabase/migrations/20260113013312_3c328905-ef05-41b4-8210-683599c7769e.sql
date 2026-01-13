-- Fix 1: Remove public read policy on app_config and require authentication
DROP POLICY IF EXISTS "Allow public read access" ON public.app_config;

CREATE POLICY "Authenticated users can view config"
  ON public.app_config FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Fix 2: Remove overly permissive RLS policies on pre_qualification_responses
-- Drop the permissive policies that allow anyone to read/insert/update
DROP POLICY IF EXISTS "Anyone can read response by token" ON public.pre_qualification_responses;
DROP POLICY IF EXISTS "Anyone can insert response" ON public.pre_qualification_responses;
DROP POLICY IF EXISTS "Anyone can update response by token" ON public.pre_qualification_responses;

-- Add proper authenticated user policies (only if they don't already exist)
DO $$ 
BEGIN
  -- Check if the SELECT policy already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'pre_qualification_responses' 
    AND policyname = 'Users can view responses of accessible contacts'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can view responses of accessible contacts"
      ON public.pre_qualification_responses FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM contacts c
          WHERE c.id = pre_qualification_responses.contact_id
          AND (
            (c.owner_id IS NULL AND can_view_unassigned_contacts(auth.uid()))
            OR (c.owner_id IS NOT NULL AND can_access_user(auth.uid(), c.owner_id))
          )
        )
      )';
  END IF;

  -- Check if the INSERT policy already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'pre_qualification_responses' 
    AND policyname = 'Authenticated users can create responses'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated users can create responses"
      ON public.pre_qualification_responses FOR INSERT
      WITH CHECK (
        auth.uid() IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM contacts c
          WHERE c.id = pre_qualification_responses.contact_id
          AND (
            (c.owner_id IS NULL AND can_view_unassigned_contacts(auth.uid()))
            OR (c.owner_id IS NOT NULL AND can_access_user(auth.uid(), c.owner_id))
          )
        )
      )';
  END IF;

  -- Check if the UPDATE policy already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'pre_qualification_responses' 
    AND policyname = 'Authenticated users can update responses'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated users can update responses"
      ON public.pre_qualification_responses FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM contacts c
          WHERE c.id = pre_qualification_responses.contact_id
          AND (
            (c.owner_id IS NULL AND can_view_unassigned_contacts(auth.uid()))
            OR (c.owner_id IS NOT NULL AND can_access_user(auth.uid(), c.owner_id))
          )
        )
      )';
  END IF;
END $$;