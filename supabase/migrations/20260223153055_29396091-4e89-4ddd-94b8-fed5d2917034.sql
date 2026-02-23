
-- Table for goal milestones (marcos intermediários de objetivos)
CREATE TABLE public.goal_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  goal_index INTEGER NOT NULL, -- index of the goal in the goals_list array
  goal_name TEXT NOT NULL, -- denormalized for display
  title TEXT NOT NULL,
  target_value NUMERIC,
  target_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.goal_milestones ENABLE ROW LEVEL SECURITY;

-- Policies - any authenticated user can manage milestones
CREATE POLICY "Authenticated users can view milestones"
  ON public.goal_milestones FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert milestones"
  ON public.goal_milestones FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update milestones"
  ON public.goal_milestones FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete milestones"
  ON public.goal_milestones FOR DELETE
  TO authenticated
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_goal_milestones_updated_at
  BEFORE UPDATE ON public.goal_milestones
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast lookups
CREATE INDEX idx_goal_milestones_contact_id ON public.goal_milestones(contact_id);
