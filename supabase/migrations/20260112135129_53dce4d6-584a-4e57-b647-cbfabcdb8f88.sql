-- ============================================================
-- FIX: pre_qualification_responses RLS policies
-- Remove ALL existing policies and replace with secure ones
-- ============================================================

-- Step 1: Drop ALL existing policies on pre_qualification_responses
DROP POLICY IF EXISTS "Anyone can read response by token" ON pre_qualification_responses;
DROP POLICY IF EXISTS "Anyone can insert response" ON pre_qualification_responses;
DROP POLICY IF EXISTS "Anyone can update response by token" ON pre_qualification_responses;
DROP POLICY IF EXISTS "Users can view responses of accessible contacts" ON pre_qualification_responses;
DROP POLICY IF EXISTS "Users can update responses of accessible contacts" ON pre_qualification_responses;
DROP POLICY IF EXISTS "Authenticated users can create responses" ON pre_qualification_responses;
DROP POLICY IF EXISTS "Superadmin can delete responses" ON pre_qualification_responses;

-- Step 2: Create secure policies for authenticated users only

-- Authenticated users can create responses when scheduling meetings
CREATE POLICY "Authenticated users can create responses"
ON pre_qualification_responses FOR INSERT
TO authenticated
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
);

-- Authenticated users can view responses of accessible contacts
CREATE POLICY "Users can view responses of accessible contacts"
ON pre_qualification_responses FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM contacts c
    WHERE c.id = pre_qualification_responses.contact_id
    AND (
      (c.owner_id IS NULL AND can_view_unassigned_contacts(auth.uid()))
      OR (c.owner_id IS NOT NULL AND can_access_user(auth.uid(), c.owner_id))
    )
  )
);

-- Authenticated users can update responses they have access to (for marking as viewed)
CREATE POLICY "Users can update responses of accessible contacts"
ON pre_qualification_responses FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM contacts c
    WHERE c.id = pre_qualification_responses.contact_id
    AND (
      (c.owner_id IS NULL AND can_view_unassigned_contacts(auth.uid()))
      OR (c.owner_id IS NOT NULL AND can_access_user(auth.uid(), c.owner_id))
    )
  )
);

-- Superadmin can delete responses
CREATE POLICY "Superadmin can delete responses"
ON pre_qualification_responses FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'superadmin'::app_role));