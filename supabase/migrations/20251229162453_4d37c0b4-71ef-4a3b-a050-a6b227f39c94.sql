-- Create proposals table
CREATE TABLE public.proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
  created_by UUID NOT NULL,
  
  -- Type and configuration
  proposal_type TEXT NOT NULL DEFAULT 'planejamento_completo',
  
  -- Planner parameters
  complexity INTEGER NOT NULL DEFAULT 3,
  meetings INTEGER NOT NULL,
  months_of_income NUMERIC NOT NULL,
  installments INTEGER NOT NULL,
  discount_applied BOOLEAN NOT NULL DEFAULT false,
  
  -- Calculated values
  monthly_income NUMERIC NOT NULL,
  base_value NUMERIC NOT NULL,
  final_value NUMERIC NOT NULL,
  installment_value NUMERIC NOT NULL,
  
  -- Diagnostic
  diagnostic_score NUMERIC,
  diagnostic_scores JSONB DEFAULT '{}',
  
  -- Display options
  show_feedbacks BOOLEAN NOT NULL DEFAULT false,
  show_cases BOOLEAN NOT NULL DEFAULT false,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft',
  presented_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create planner_feedbacks table
CREATE TABLE public.planner_feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planner_id UUID NOT NULL,
  
  client_name TEXT NOT NULL,
  feedback_text TEXT,
  media_type TEXT,
  media_url TEXT,
  
  is_active BOOLEAN NOT NULL DEFAULT true,
  order_position INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create planner_cases table
CREATE TABLE public.planner_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planner_id UUID NOT NULL,
  
  title TEXT NOT NULL,
  description TEXT,
  initial_value NUMERIC,
  final_value NUMERIC,
  advantage NUMERIC,
  
  is_active BOOLEAN NOT NULL DEFAULT true,
  order_position INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_cases ENABLE ROW LEVEL SECURITY;

-- RLS Policies for proposals
CREATE POLICY "Users can view proposals of accessible contacts"
ON public.proposals FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.contacts c
    WHERE c.id = proposals.contact_id
    AND (
      (c.owner_id IS NULL AND can_view_unassigned_contacts(auth.uid()))
      OR (c.owner_id IS NOT NULL AND can_access_user(auth.uid(), c.owner_id))
    )
  )
);

CREATE POLICY "Authenticated users can insert proposals"
ON public.proposals FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update proposals they created"
ON public.proposals FOR UPDATE
USING (created_by = auth.uid());

CREATE POLICY "Users can delete proposals they created"
ON public.proposals FOR DELETE
USING (created_by = auth.uid());

-- RLS Policies for planner_feedbacks
CREATE POLICY "Users can view own feedbacks"
ON public.planner_feedbacks FOR SELECT
USING (planner_id = auth.uid());

CREATE POLICY "Leaders can view subordinate feedbacks"
ON public.planner_feedbacks FOR SELECT
USING (can_access_user(auth.uid(), planner_id));

CREATE POLICY "Users can insert own feedbacks"
ON public.planner_feedbacks FOR INSERT
WITH CHECK (planner_id = auth.uid());

CREATE POLICY "Users can update own feedbacks"
ON public.planner_feedbacks FOR UPDATE
USING (planner_id = auth.uid());

CREATE POLICY "Users can delete own feedbacks"
ON public.planner_feedbacks FOR DELETE
USING (planner_id = auth.uid());

-- RLS Policies for planner_cases
CREATE POLICY "Users can view own cases"
ON public.planner_cases FOR SELECT
USING (planner_id = auth.uid());

CREATE POLICY "Leaders can view subordinate cases"
ON public.planner_cases FOR SELECT
USING (can_access_user(auth.uid(), planner_id));

CREATE POLICY "Users can insert own cases"
ON public.planner_cases FOR INSERT
WITH CHECK (planner_id = auth.uid());

CREATE POLICY "Users can update own cases"
ON public.planner_cases FOR UPDATE
USING (planner_id = auth.uid());

CREATE POLICY "Users can delete own cases"
ON public.planner_cases FOR DELETE
USING (planner_id = auth.uid());

-- Triggers for updated_at
CREATE TRIGGER update_proposals_updated_at
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_planner_feedbacks_updated_at
  BEFORE UPDATE ON public.planner_feedbacks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_planner_cases_updated_at
  BEFORE UPDATE ON public.planner_cases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();