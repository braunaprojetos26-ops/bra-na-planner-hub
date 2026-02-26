
-- Create contact_interactions table
CREATE TABLE public.contact_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id),
  user_id UUID NOT NULL,
  task_id UUID REFERENCES public.tasks(id),
  interaction_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  channel TEXT NOT NULL CHECK (channel IN ('ligacao','whatsapp','email','reuniao_presencial','reuniao_online')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contact_interactions ENABLE ROW LEVEL SECURITY;

-- Users can insert their own interactions
CREATE POLICY "Users can insert own interactions"
ON public.contact_interactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view interactions they created or for contacts they can access
CREATE POLICY "Users can view accessible interactions"
ON public.contact_interactions FOR SELECT
USING (
  user_id IN (SELECT public.get_accessible_user_ids(auth.uid()))
);

-- Index for performance
CREATE INDEX idx_contact_interactions_contact_id ON public.contact_interactions(contact_id);
CREATE INDEX idx_contact_interactions_user_id ON public.contact_interactions(user_id);
CREATE INDEX idx_contact_interactions_task_id ON public.contact_interactions(task_id);
