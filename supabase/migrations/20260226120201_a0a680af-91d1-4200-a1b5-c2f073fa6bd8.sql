-- Allow admin roles to read notifications of other users (for impersonation mode)
CREATE POLICY "Leaders can view subordinate notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
  OR public.has_role(auth.uid(), 'gerente'::public.app_role)
  OR public.has_role(auth.uid(), 'supervisor'::public.app_role)
  OR public.has_role(auth.uid(), 'lider'::public.app_role)
);

-- Drop the old restrictive policy
DROP POLICY "Users can view own notifications" ON public.notifications;