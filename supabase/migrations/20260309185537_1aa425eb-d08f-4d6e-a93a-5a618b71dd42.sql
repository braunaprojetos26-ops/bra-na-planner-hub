
-- =============================================
-- FIX 1: client_investment_data - restrict SELECT
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can read client investment data" ON public.client_investment_data;
DROP POLICY IF EXISTS "Users can read client investment data" ON public.client_investment_data;

CREATE POLICY "Users can read investment data for accessible contacts"
ON public.client_investment_data
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.contacts c
    WHERE c.id = client_investment_data.contact_id
    AND (
      c.owner_id = auth.uid()
      OR public.can_access_user(auth.uid(), c.owner_id)
      OR (c.owner_id IS NULL AND public.can_view_unassigned_contacts(auth.uid()))
    )
  )
);

-- =============================================
-- FIX 2: goal_milestones - restrict SELECT, UPDATE, DELETE
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can read goal milestones" ON public.goal_milestones;
DROP POLICY IF EXISTS "Users can read goal milestones" ON public.goal_milestones;
DROP POLICY IF EXISTS "Authenticated users can update goal milestones" ON public.goal_milestones;
DROP POLICY IF EXISTS "Users can update goal milestones" ON public.goal_milestones;
DROP POLICY IF EXISTS "Authenticated users can delete goal milestones" ON public.goal_milestones;
DROP POLICY IF EXISTS "Users can delete goal milestones" ON public.goal_milestones;

CREATE POLICY "Users can read milestones for accessible contacts"
ON public.goal_milestones
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.contacts c
    WHERE c.id = goal_milestones.contact_id
    AND (
      c.owner_id = auth.uid()
      OR public.can_access_user(auth.uid(), c.owner_id)
      OR (c.owner_id IS NULL AND public.can_view_unassigned_contacts(auth.uid()))
    )
  )
);

CREATE POLICY "Users can update milestones for accessible contacts"
ON public.goal_milestones
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.contacts c
    WHERE c.id = goal_milestones.contact_id
    AND (
      c.owner_id = auth.uid()
      OR public.can_access_user(auth.uid(), c.owner_id)
      OR (c.owner_id IS NULL AND public.can_view_unassigned_contacts(auth.uid()))
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.contacts c
    WHERE c.id = goal_milestones.contact_id
    AND (
      c.owner_id = auth.uid()
      OR public.can_access_user(auth.uid(), c.owner_id)
      OR (c.owner_id IS NULL AND public.can_view_unassigned_contacts(auth.uid()))
    )
  )
);

CREATE POLICY "Users can delete milestones for accessible contacts"
ON public.goal_milestones
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.contacts c
    WHERE c.id = goal_milestones.contact_id
    AND (
      c.owner_id = auth.uid()
      OR public.can_access_user(auth.uid(), c.owner_id)
      OR (c.owner_id IS NULL AND public.can_view_unassigned_contacts(auth.uid()))
    )
  )
);
