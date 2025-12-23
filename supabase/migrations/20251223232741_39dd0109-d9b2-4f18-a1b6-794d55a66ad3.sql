-- Create client_plans table (Planejamentos de Cliente)
CREATE TABLE public.client_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  contract_value NUMERIC NOT NULL,
  total_meetings INTEGER NOT NULL CHECK (total_meetings IN (4, 6, 9, 12)),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'closed')),
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create client_plan_meetings table (Reuniões do Planejamento)
CREATE TABLE public.client_plan_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.client_plans(id) ON DELETE CASCADE,
  meeting_number INTEGER NOT NULL,
  theme TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  meeting_id UUID REFERENCES public.meetings(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'completed', 'overdue')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_client_plans_contact_id ON public.client_plans(contact_id);
CREATE INDEX idx_client_plans_owner_id ON public.client_plans(owner_id);
CREATE INDEX idx_client_plans_status ON public.client_plans(status);
CREATE INDEX idx_client_plan_meetings_plan_id ON public.client_plan_meetings(plan_id);
CREATE INDEX idx_client_plan_meetings_status ON public.client_plan_meetings(status);

-- Enable RLS
ALTER TABLE public.client_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_plan_meetings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for client_plans
CREATE POLICY "Users can view plans of accessible contacts"
ON public.client_plans
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.contacts c
    WHERE c.id = client_plans.contact_id
    AND (
      (c.owner_id IS NULL AND can_view_unassigned_contacts(auth.uid()))
      OR (c.owner_id IS NOT NULL AND can_access_user(auth.uid(), c.owner_id))
    )
  )
);

CREATE POLICY "Authenticated users can insert plans"
ON public.client_plans
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update plans of accessible contacts"
ON public.client_plans
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.contacts c
    WHERE c.id = client_plans.contact_id
    AND (
      (c.owner_id IS NULL AND can_view_unassigned_contacts(auth.uid()))
      OR (c.owner_id IS NOT NULL AND can_access_user(auth.uid(), c.owner_id))
    )
  )
);

CREATE POLICY "Superadmin can delete plans"
ON public.client_plans
FOR DELETE
USING (has_role(auth.uid(), 'superadmin'::app_role));

-- RLS Policies for client_plan_meetings
CREATE POLICY "Users can view plan meetings of accessible plans"
ON public.client_plan_meetings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_plans cp
    JOIN public.contacts c ON c.id = cp.contact_id
    WHERE cp.id = client_plan_meetings.plan_id
    AND (
      (c.owner_id IS NULL AND can_view_unassigned_contacts(auth.uid()))
      OR (c.owner_id IS NOT NULL AND can_access_user(auth.uid(), c.owner_id))
    )
  )
);

CREATE POLICY "Authenticated users can insert plan meetings"
ON public.client_plan_meetings
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update plan meetings of accessible plans"
ON public.client_plan_meetings
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.client_plans cp
    JOIN public.contacts c ON c.id = cp.contact_id
    WHERE cp.id = client_plan_meetings.plan_id
    AND (
      (c.owner_id IS NULL AND can_view_unassigned_contacts(auth.uid()))
      OR (c.owner_id IS NOT NULL AND can_access_user(auth.uid(), c.owner_id))
    )
  )
);

CREATE POLICY "Superadmin can delete plan meetings"
ON public.client_plan_meetings
FOR DELETE
USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_client_plans_updated_at
BEFORE UPDATE ON public.client_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_plan_meetings_updated_at
BEFORE UPDATE ON public.client_plan_meetings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();