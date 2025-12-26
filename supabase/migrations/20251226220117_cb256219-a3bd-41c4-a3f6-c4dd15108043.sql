-- Create diagnostic categories table
CREATE TABLE public.diagnostic_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'Activity',
  weight NUMERIC NOT NULL DEFAULT 1,
  order_position INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create diagnostic rules table
CREATE TABLE public.diagnostic_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.diagnostic_categories(id) ON DELETE CASCADE,
  evaluation_prompt TEXT NOT NULL,
  data_paths JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contact diagnostics table
CREATE TABLE public.contact_diagnostics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  overall_score NUMERIC NOT NULL,
  category_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  schema_version TEXT NOT NULL DEFAULT '1.0.0',
  generated_by UUID NOT NULL REFERENCES public.profiles(user_id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_contact_diagnostics_contact_id ON public.contact_diagnostics(contact_id);
CREATE INDEX idx_contact_diagnostics_created_at ON public.contact_diagnostics(created_at DESC);

-- Enable RLS
ALTER TABLE public.diagnostic_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostic_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_diagnostics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for diagnostic_categories
CREATE POLICY "Authenticated users can view active categories" 
ON public.diagnostic_categories 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND is_active = true);

CREATE POLICY "Superadmin can manage categories" 
ON public.diagnostic_categories 
FOR ALL 
USING (has_role(auth.uid(), 'superadmin'))
WITH CHECK (has_role(auth.uid(), 'superadmin'));

-- RLS Policies for diagnostic_rules
CREATE POLICY "Authenticated users can view active rules" 
ON public.diagnostic_rules 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND is_active = true);

CREATE POLICY "Superadmin can manage rules" 
ON public.diagnostic_rules 
FOR ALL 
USING (has_role(auth.uid(), 'superadmin'))
WITH CHECK (has_role(auth.uid(), 'superadmin'));

-- RLS Policies for contact_diagnostics
CREATE POLICY "Authenticated users can insert diagnostics" 
ON public.contact_diagnostics 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view diagnostics of accessible contacts" 
ON public.contact_diagnostics 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM contacts c
    WHERE c.id = contact_diagnostics.contact_id
    AND (
      (c.owner_id IS NULL AND can_view_unassigned_contacts(auth.uid()))
      OR (c.owner_id IS NOT NULL AND can_access_user(auth.uid(), c.owner_id))
    )
  )
);

-- Add triggers for updated_at
CREATE TRIGGER update_diagnostic_categories_updated_at
BEFORE UPDATE ON public.diagnostic_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_diagnostic_rules_updated_at
BEFORE UPDATE ON public.diagnostic_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default diagnostic categories
INSERT INTO public.diagnostic_categories (key, name, description, icon, weight, order_position) VALUES
('reserva_emergencia', 'Reserva de Emergência', 'Avalia se o cliente possui reserva adequada para cobrir custos', 'Shield', 1.5, 1),
('gestao_gastos', 'Gestão de Gastos', 'Analisa a relação entre receitas e despesas', 'Wallet', 1.2, 2),
('protecao_patrimonial', 'Proteção Patrimonial', 'Verifica seguros e proteções existentes', 'Lock', 1.0, 3),
('investimentos', 'Investimentos', 'Avalia diversificação e adequação dos investimentos', 'TrendingUp', 1.3, 4),
('milhas_beneficios', 'Milhas e Benefícios', 'Identifica oportunidades com cartões e milhas', 'Plane', 0.8, 5),
('planejamento_aposentadoria', 'Aposentadoria', 'Analisa preparação para aposentadoria', 'Clock', 1.1, 6);

-- Insert default diagnostic rules
INSERT INTO public.diagnostic_rules (category_id, evaluation_prompt, data_paths) VALUES
(
  (SELECT id FROM diagnostic_categories WHERE key = 'reserva_emergencia'),
  'Avalie a reserva de emergência do cliente. Compare o valor da reserva financeira com os custos mensais totais (fixos + variáveis). Uma reserva ideal seria de 6 a 12 meses de custos. Nota 10 = reserva >= 12 meses de custos. Nota 0 = sem reserva ou reserva < 1 mês.',
  '["orcamento.custos_fixos_mensais", "orcamento.custos_variaveis_mensais", "patrimonio.reserva_financeira"]'::jsonb
),
(
  (SELECT id FROM diagnostic_categories WHERE key = 'gestao_gastos'),
  'Avalie a gestão de gastos do cliente. Analise a relação entre receita mensal e custos totais. Considere se há sobra mensal e qual o percentual. Nota 10 = gastos bem controlados com boa margem de poupança. Nota 0 = gastos maiores que receitas.',
  '["orcamento.receita_mensal", "orcamento.custos_fixos_mensais", "orcamento.custos_variaveis_mensais"]'::jsonb
),
(
  (SELECT id FROM diagnostic_categories WHERE key = 'protecao_patrimonial'),
  'Avalie a proteção patrimonial do cliente. Verifique se possui seguros adequados (vida, residencial, veículos). Nota 10 = proteção completa e adequada. Nota 0 = sem nenhuma proteção.',
  '["protecao.possui_seguro_vida", "protecao.possui_seguro_residencial", "protecao.possui_seguro_automovel", "protecao.dependentes"]'::jsonb
),
(
  (SELECT id FROM diagnostic_categories WHERE key = 'investimentos'),
  'Avalie os investimentos do cliente. Analise diversificação, adequação ao perfil de risco e proporção do patrimônio investido. Nota 10 = carteira bem diversificada e adequada. Nota 0 = sem investimentos ou totalmente concentrado.',
  '["investimentos.total_investido", "investimentos.tipos_investimento", "perfil.perfil_investidor"]'::jsonb
),
(
  (SELECT id FROM diagnostic_categories WHERE key = 'milhas_beneficios'),
  'Avalie o aproveitamento de benefícios de cartões e milhas. Considere o gasto mensal em cartão de crédito e se o cliente utiliza programas de milhas. Nota 10 = aproveita bem os benefícios. Nota 0 = gasta muito no cartão sem aproveitar benefícios.',
  '["orcamento.gasto_cartao_credito", "beneficios.usa_programas_milhas", "beneficios.conhece_milhas"]'::jsonb
),
(
  (SELECT id FROM diagnostic_categories WHERE key = 'planejamento_aposentadoria'),
  'Avalie o planejamento para aposentadoria. Considere idade, tempo até aposentadoria, contribuições para previdência e reservas de longo prazo. Nota 10 = bem planejado. Nota 0 = sem nenhum planejamento.',
  '["previdencia.contribui_inss", "previdencia.possui_previdencia_privada", "previdencia.idade_aposentadoria_desejada", "perfil.idade"]'::jsonb
);