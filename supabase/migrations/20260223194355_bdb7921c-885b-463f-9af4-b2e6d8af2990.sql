
-- Add perpetual activity support
ALTER TABLE public.critical_activities
ADD COLUMN is_perpetual boolean NOT NULL DEFAULT false,
ADD COLUMN rule_type text NULL,
ADD COLUMN rule_config jsonb NULL DEFAULT '{}',
ADD COLUMN recurrence_interval text NULL,
ADD COLUMN last_run_at timestamptz NULL;

-- Add comment for rule_type values
COMMENT ON COLUMN public.critical_activities.rule_type IS 'Rule types: inadimplente, health_score_critico, contrato_vencendo, manual_recurrence';
COMMENT ON COLUMN public.critical_activities.recurrence_interval IS 'For manual recurrence: daily, weekly, monthly';

-- Table to track which user+client combinations already had tasks generated (avoid duplicates)
CREATE TABLE public.perpetual_activity_triggers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id uuid NOT NULL REFERENCES public.critical_activities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  task_id uuid NULL REFERENCES public.tasks(id) ON DELETE SET NULL,
  triggered_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz NULL,
  UNIQUE(activity_id, user_id, contact_id)
);

ALTER TABLE public.perpetual_activity_triggers ENABLE ROW LEVEL SECURITY;

-- Superadmin/gerente can see all triggers
CREATE POLICY "Admins can view all triggers" ON public.perpetual_activity_triggers
  FOR SELECT USING (
    public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'gerente')
  );

-- Users can see their own triggers
CREATE POLICY "Users can view own triggers" ON public.perpetual_activity_triggers
  FOR SELECT USING (auth.uid() = user_id);

-- Only system (service role) inserts triggers, but allow via security definer functions
CREATE POLICY "Service can manage triggers" ON public.perpetual_activity_triggers
  FOR ALL USING (true) WITH CHECK (true);

-- Index for efficient lookups
CREATE INDEX idx_perpetual_triggers_activity ON public.perpetual_activity_triggers(activity_id);
CREATE INDEX idx_perpetual_triggers_user_contact ON public.perpetual_activity_triggers(user_id, contact_id);
