-- Tabela para respostas NPS importadas
CREATE TABLE public.nps_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  nps_value INTEGER NOT NULL CHECK (nps_value >= 0 AND nps_value <= 10),
  response_date DATE NOT NULL,
  imported_by UUID REFERENCES public.profiles(user_id),
  import_batch_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para log de importações NPS
CREATE TABLE public.nps_imports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  imported_by UUID NOT NULL REFERENCES public.profiles(user_id),
  file_name TEXT NOT NULL,
  total_records INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para snapshots diários de health score
CREATE TABLE public.health_score_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES public.profiles(user_id),
  snapshot_date DATE NOT NULL,
  total_score INTEGER NOT NULL DEFAULT 0,
  -- Scores por pilar
  nps_score INTEGER DEFAULT 0,
  referrals_score INTEGER DEFAULT 0,
  payment_score INTEGER DEFAULT 0,
  cross_sell_score INTEGER DEFAULT 0,
  meetings_score INTEGER DEFAULT 0,
  -- Categoria: otimo, estavel, atencao, critico
  category TEXT NOT NULL,
  -- Metadados para análise
  nps_value INTEGER,
  has_referrals BOOLEAN DEFAULT false,
  payment_days_late INTEGER DEFAULT 0,
  extra_products_count INTEGER DEFAULT 0,
  days_since_last_meeting INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Constraint para garantir um snapshot por cliente por dia
  UNIQUE(contact_id, snapshot_date)
);

-- Enable RLS
ALTER TABLE public.nps_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nps_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_score_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies para nps_responses
CREATE POLICY "Users can view NPS of accessible contacts"
ON public.nps_responses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM contacts c
    WHERE c.id = nps_responses.contact_id
    AND (
      (c.owner_id IS NULL AND can_view_unassigned_contacts(auth.uid()))
      OR (c.owner_id IS NOT NULL AND can_access_user(auth.uid(), c.owner_id))
    )
  )
);

CREATE POLICY "Leaders can insert NPS responses"
ON public.nps_responses FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'lider'::app_role) OR 
  has_role(auth.uid(), 'supervisor'::app_role) OR 
  has_role(auth.uid(), 'gerente'::app_role) OR 
  has_role(auth.uid(), 'superadmin'::app_role)
);

CREATE POLICY "Superadmin can delete NPS responses"
ON public.nps_responses FOR DELETE
USING (has_role(auth.uid(), 'superadmin'::app_role));

-- RLS Policies para nps_imports
CREATE POLICY "Users can view their own imports"
ON public.nps_imports FOR SELECT
USING (
  imported_by = auth.uid() OR
  has_role(auth.uid(), 'superadmin'::app_role)
);

CREATE POLICY "Leaders can insert NPS imports"
ON public.nps_imports FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'lider'::app_role) OR 
  has_role(auth.uid(), 'supervisor'::app_role) OR 
  has_role(auth.uid(), 'gerente'::app_role) OR 
  has_role(auth.uid(), 'superadmin'::app_role)
);

-- RLS Policies para health_score_snapshots
CREATE POLICY "Users can view snapshots of accessible contacts"
ON public.health_score_snapshots FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM contacts c
    WHERE c.id = health_score_snapshots.contact_id
    AND (
      (c.owner_id IS NULL AND can_view_unassigned_contacts(auth.uid()))
      OR (c.owner_id IS NOT NULL AND can_access_user(auth.uid(), c.owner_id))
    )
  )
);

CREATE POLICY "System can insert snapshots"
ON public.health_score_snapshots FOR INSERT
WITH CHECK (true);

CREATE POLICY "Superadmin can delete snapshots"
ON public.health_score_snapshots FOR DELETE
USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Índices para performance
CREATE INDEX idx_nps_responses_contact_id ON public.nps_responses(contact_id);
CREATE INDEX idx_nps_responses_response_date ON public.nps_responses(response_date DESC);
CREATE INDEX idx_health_score_snapshots_contact_date ON public.health_score_snapshots(contact_id, snapshot_date DESC);
CREATE INDEX idx_health_score_snapshots_owner_date ON public.health_score_snapshots(owner_id, snapshot_date DESC);
CREATE INDEX idx_health_score_snapshots_category ON public.health_score_snapshots(category);