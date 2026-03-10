
-- 1. goal_milestones: Drop redundant permissive policies
DROP POLICY IF EXISTS "Authenticated users can view milestones" ON public.goal_milestones;
DROP POLICY IF EXISTS "Authenticated users can update milestones" ON public.goal_milestones;
DROP POLICY IF EXISTS "Authenticated users can delete milestones" ON public.goal_milestones;

-- 2. import_jobs: Restrict UPDATE to job creator
DROP POLICY IF EXISTS "Service role can update import jobs" ON public.import_jobs;
CREATE POLICY "Users can update own import jobs" ON public.import_jobs
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

-- 3. whatsapp_messages: Restrict INSERT to authenticated users with contact access
DROP POLICY IF EXISTS "System can insert messages" ON public.whatsapp_messages;
CREATE POLICY "Authenticated users can insert messages for accessible contacts"
  ON public.whatsapp_messages FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.contacts c
    WHERE c.id = contact_id
    AND (c.owner_id = auth.uid() OR public.can_access_user(auth.uid(), c.owner_id)
         OR (c.owner_id IS NULL AND public.can_view_unassigned_contacts(auth.uid())))
  ));
