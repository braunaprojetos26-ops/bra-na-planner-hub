-- Enum para status do contato
CREATE TYPE public.contact_status AS ENUM ('active', 'lost', 'won');

-- Tabela de funis
CREATE TABLE public.funnels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  order_position INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de etapas do funil
CREATE TABLE public.funnel_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id UUID NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_position INTEGER NOT NULL,
  sla_hours INTEGER,
  color TEXT NOT NULL DEFAULT 'gray',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de motivos de perda
CREATE TABLE public.lost_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de contatos
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT,
  income NUMERIC,
  source TEXT,
  campaign TEXT,
  is_dirty_base BOOLEAN NOT NULL DEFAULT false,
  status public.contact_status NOT NULL DEFAULT 'active',
  current_funnel_id UUID NOT NULL REFERENCES public.funnels(id),
  current_stage_id UUID NOT NULL REFERENCES public.funnel_stages(id),
  stage_entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  lost_at TIMESTAMPTZ,
  lost_from_stage_id UUID REFERENCES public.funnel_stages(id),
  lost_reason_id UUID REFERENCES public.lost_reasons(id),
  converted_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES public.profiles(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de histórico de contatos
CREATE TABLE public.contact_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  from_stage_id UUID REFERENCES public.funnel_stages(id),
  to_stage_id UUID REFERENCES public.funnel_stages(id),
  changed_by UUID NOT NULL REFERENCES public.profiles(user_id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_contacts_owner ON public.contacts(owner_id);
CREATE INDEX idx_contacts_status ON public.contacts(status);
CREATE INDEX idx_contacts_funnel ON public.contacts(current_funnel_id);
CREATE INDEX idx_contacts_stage ON public.contacts(current_stage_id);
CREATE INDEX idx_contact_history_contact ON public.contact_history(contact_id);
CREATE INDEX idx_funnel_stages_funnel ON public.funnel_stages(funnel_id);

-- Triggers para updated_at
CREATE TRIGGER update_funnels_updated_at BEFORE UPDATE ON public.funnels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_funnel_stages_updated_at BEFORE UPDATE ON public.funnel_stages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lost_reasons_updated_at BEFORE UPDATE ON public.lost_reasons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Função para verificar se pode ver contatos não atribuídos
CREATE OR REPLACE FUNCTION public.can_view_unassigned_contacts(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('lider', 'supervisor', 'gerente', 'superadmin')
  )
$$;

-- Enable RLS
ALTER TABLE public.funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lost_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_history ENABLE ROW LEVEL SECURITY;

-- RLS para funnels (todos autenticados podem ver)
CREATE POLICY "Authenticated users can view funnels"
  ON public.funnels FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Superadmin can manage funnels"
  ON public.funnels FOR ALL
  USING (has_role(auth.uid(), 'superadmin'))
  WITH CHECK (has_role(auth.uid(), 'superadmin'));

-- RLS para funnel_stages (todos autenticados podem ver)
CREATE POLICY "Authenticated users can view funnel stages"
  ON public.funnel_stages FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Superadmin can manage funnel stages"
  ON public.funnel_stages FOR ALL
  USING (has_role(auth.uid(), 'superadmin'))
  WITH CHECK (has_role(auth.uid(), 'superadmin'));

-- RLS para lost_reasons
CREATE POLICY "Authenticated users can view lost reasons"
  ON public.lost_reasons FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Superadmin can manage lost reasons"
  ON public.lost_reasons FOR ALL
  USING (has_role(auth.uid(), 'superadmin'))
  WITH CHECK (has_role(auth.uid(), 'superadmin'));

-- RLS para contacts
CREATE POLICY "Users can view accessible contacts"
  ON public.contacts FOR SELECT
  USING (
    owner_id IS NULL AND can_view_unassigned_contacts(auth.uid())
    OR owner_id IS NOT NULL AND can_access_user(auth.uid(), owner_id)
  );

CREATE POLICY "Authenticated users can insert contacts"
  ON public.contacts FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update accessible contacts"
  ON public.contacts FOR UPDATE
  USING (
    owner_id IS NULL AND can_view_unassigned_contacts(auth.uid())
    OR owner_id IS NOT NULL AND can_access_user(auth.uid(), owner_id)
  );

CREATE POLICY "Superadmin can delete contacts"
  ON public.contacts FOR DELETE
  USING (has_role(auth.uid(), 'superadmin'));

-- RLS para contact_history
CREATE POLICY "Users can view history of accessible contacts"
  ON public.contact_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.id = contact_id
        AND (
          c.owner_id IS NULL AND can_view_unassigned_contacts(auth.uid())
          OR c.owner_id IS NOT NULL AND can_access_user(auth.uid(), c.owner_id)
        )
    )
  );

CREATE POLICY "Authenticated users can insert contact history"
  ON public.contact_history FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Seed: Funil 1 - PROSPECÇÃO - PLANEJAMENTO
INSERT INTO public.funnels (id, name, order_position) VALUES
  ('11111111-1111-1111-1111-111111111111', 'PROSPECÇÃO - PLANEJAMENTO', 1);

INSERT INTO public.funnel_stages (funnel_id, name, order_position, color, sla_hours) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Lead Frio', 1, 'slate', NULL),
  ('11111111-1111-1111-1111-111111111111', 'Fazer Contato', 2, 'blue', 24),
  ('11111111-1111-1111-1111-111111111111', 'Contato Realizado', 3, 'cyan', NULL),
  ('11111111-1111-1111-1111-111111111111', 'Qualificado', 4, 'green', NULL),
  ('11111111-1111-1111-1111-111111111111', 'Despertar Dor', 5, 'yellow', NULL),
  ('11111111-1111-1111-1111-111111111111', 'Agendar Reunião', 6, 'orange', 48),
  ('11111111-1111-1111-1111-111111111111', 'Reunião Confirmada', 7, 'purple', NULL);

-- Seed: Funil 2 - VENDA - PLANEJAMENTO
INSERT INTO public.funnels (id, name, order_position) VALUES
  ('22222222-2222-2222-2222-222222222222', 'VENDA - PLANEJAMENTO', 2);

INSERT INTO public.funnel_stages (funnel_id, name, order_position, color) VALUES
  ('22222222-2222-2222-2222-222222222222', 'Diagnóstico', 1, 'blue'),
  ('22222222-2222-2222-2222-222222222222', 'Alinhamento Comercial', 2, 'cyan'),
  ('22222222-2222-2222-2222-222222222222', 'Apresentação Comercial', 3, 'green'),
  ('22222222-2222-2222-2222-222222222222', 'Onboarding', 4, 'purple');

-- Seed: Motivo de perda inicial
INSERT INTO public.lost_reasons (name) VALUES ('Fechou com o concorrente');