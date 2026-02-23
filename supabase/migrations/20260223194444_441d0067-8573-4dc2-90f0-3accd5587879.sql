
-- Drop overly permissive policy
DROP POLICY "Service can manage triggers" ON public.perpetual_activity_triggers;

-- More restrictive: only admins can insert/update/delete
CREATE POLICY "Admins can manage triggers" ON public.perpetual_activity_triggers
  FOR ALL USING (
    public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'gerente')
  ) WITH CHECK (
    public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'gerente')
  );
