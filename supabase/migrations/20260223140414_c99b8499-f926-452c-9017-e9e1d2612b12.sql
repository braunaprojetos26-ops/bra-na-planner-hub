
-- Create critical_activities table
CREATE TABLE public.critical_activities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by uuid NOT NULL,
  title text NOT NULL,
  description text,
  urgency text NOT NULL DEFAULT 'medium',
  target_positions jsonb,
  deadline timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create critical_activity_assignments table
CREATE TABLE public.critical_activity_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id uuid NOT NULL REFERENCES public.critical_activities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_caa_activity_id ON public.critical_activity_assignments(activity_id);
CREATE INDEX idx_caa_user_id ON public.critical_activity_assignments(user_id);
CREATE INDEX idx_ca_is_active ON public.critical_activities(is_active);

-- Enable RLS
ALTER TABLE public.critical_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.critical_activity_assignments ENABLE ROW LEVEL SECURITY;

-- RLS for critical_activities
CREATE POLICY "Authenticated users can view active activities"
  ON public.critical_activities FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Superadmin and gerente can insert activities"
  ON public.critical_activities FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role));

CREATE POLICY "Superadmin and gerente can update activities"
  ON public.critical_activities FOR UPDATE
  USING (has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role));

CREATE POLICY "Superadmin can delete activities"
  ON public.critical_activities FOR DELETE
  USING (has_role(auth.uid(), 'superadmin'::app_role));

-- RLS for critical_activity_assignments
CREATE POLICY "Users can view their own assignments"
  ON public.critical_activity_assignments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Superadmin and gerente can view all assignments"
  ON public.critical_activity_assignments FOR SELECT
  USING (has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role));

CREATE POLICY "Users can update their own assignments"
  ON public.critical_activity_assignments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert assignments"
  ON public.critical_activity_assignments FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role));

CREATE POLICY "Superadmin can delete assignments"
  ON public.critical_activity_assignments FOR DELETE
  USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Distribution function
CREATE OR REPLACE FUNCTION public.distribute_critical_activity(p_activity_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_positions jsonb;
  v_count integer;
BEGIN
  -- Get target positions from the activity
  SELECT target_positions INTO v_target_positions
  FROM critical_activities WHERE id = p_activity_id;

  -- Insert assignments for matching active users
  INSERT INTO critical_activity_assignments (activity_id, user_id)
  SELECT p_activity_id, p.user_id
  FROM profiles p
  WHERE p.is_active = true
    AND (
      v_target_positions IS NULL
      OR v_target_positions = '[]'::jsonb
      OR p.position::text IN (SELECT jsonb_array_elements_text(v_target_positions))
    )
    AND NOT EXISTS (
      SELECT 1 FROM critical_activity_assignments caa
      WHERE caa.activity_id = p_activity_id AND caa.user_id = p.user_id
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Trigger for updated_at
CREATE TRIGGER update_critical_activities_updated_at
  BEFORE UPDATE ON public.critical_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
