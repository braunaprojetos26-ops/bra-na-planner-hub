
-- 1. Create investment_ticket_types table
CREATE TABLE public.investment_ticket_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  fields_schema JSONB NOT NULL DEFAULT '[]'::jsonb,
  default_priority TEXT NOT NULL DEFAULT 'normal',
  sla_minutes INTEGER NOT NULL DEFAULT 60,
  is_active BOOLEAN NOT NULL DEFAULT true,
  order_position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.investment_ticket_types ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read
CREATE POLICY "Authenticated users can read investment ticket types"
ON public.investment_ticket_types FOR SELECT TO authenticated
USING (true);

-- Only superadmins can manage
CREATE POLICY "Superadmins can manage investment ticket types"
ON public.investment_ticket_types FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'))
WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

-- Trigger for updated_at
CREATE TRIGGER update_investment_ticket_types_updated_at
BEFORE UPDATE ON public.investment_ticket_types
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Add columns to tickets table
ALTER TABLE public.tickets
  ADD COLUMN ticket_type_id UUID REFERENCES public.investment_ticket_types(id),
  ADD COLUMN dynamic_fields JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN sla_deadline TIMESTAMPTZ;

-- 3. Create client_investment_data table
CREATE TABLE public.client_investment_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  data_type TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  reference_date DATE NOT NULL DEFAULT CURRENT_DATE,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_investment_data ENABLE ROW LEVEL SECURITY;

-- Read: authenticated users (same as contacts access pattern)
CREATE POLICY "Authenticated users can read client investment data"
ON public.client_investment_data FOR SELECT TO authenticated
USING (true);

-- Write: superadmin or operacoes_investimentos
CREATE POLICY "Investment staff and superadmins can manage client investment data"
ON public.client_investment_data FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'superadmin')
  OR public.is_operations_staff(auth.uid(), 'investimentos')
)
WITH CHECK (
  public.has_role(auth.uid(), 'superadmin')
  OR public.is_operations_staff(auth.uid(), 'investimentos')
);

CREATE TRIGGER update_client_investment_data_updated_at
BEFORE UPDATE ON public.client_investment_data
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Insert initial 6 investment ticket types
INSERT INTO public.investment_ticket_types (name, slug, fields_schema, default_priority, sla_minutes, order_position) VALUES
(
  'Aporte', 'aporte',
  '[{"key":"valor","label":"Valor","type":"currency","required":true},{"key":"conta_destino","label":"Conta Destino","type":"text","required":true},{"key":"observacoes","label":"Observações","type":"textarea","required":false}]'::jsonb,
  'normal', 120, 1
),
(
  'Resgate', 'resgate',
  '[{"key":"valor","label":"Valor","type":"currency","required":true},{"key":"conta_origem","label":"Conta Origem","type":"text","required":true},{"key":"motivo","label":"Motivo","type":"text","required":true},{"key":"urgencia","label":"Urgência","type":"select","required":true,"options":["Normal","Urgente","Muito Urgente"]}]'::jsonb,
  'high', 60, 2
),
(
  'Transferência', 'transferencia',
  '[{"key":"valor","label":"Valor","type":"currency","required":true},{"key":"conta_origem","label":"Conta Origem","type":"text","required":true},{"key":"conta_destino","label":"Conta Destino","type":"text","required":true}]'::jsonb,
  'normal', 120, 3
),
(
  'PDF de Carteira', 'pdf_carteira',
  '[{"key":"periodo","label":"Período","type":"text","required":true},{"key":"tipo_relatorio","label":"Tipo de Relatório","type":"select","required":true,"options":["Mensal","Trimestral","Anual","Personalizado"]}]'::jsonb,
  'low', 480, 4
),
(
  'Dúvida sobre Investimentos', 'duvida_investimentos',
  '[{"key":"assunto","label":"Assunto","type":"text","required":true},{"key":"descricao_detalhada","label":"Descrição Detalhada","type":"textarea","required":true}]'::jsonb,
  'normal', 240, 5
),
(
  'Agendamento de Reunião', 'agendamento_reuniao',
  '[{"key":"data_sugerida","label":"Data Sugerida","type":"date","required":true},{"key":"pauta","label":"Pauta","type":"textarea","required":true}]'::jsonb,
  'normal', 480, 6
);
