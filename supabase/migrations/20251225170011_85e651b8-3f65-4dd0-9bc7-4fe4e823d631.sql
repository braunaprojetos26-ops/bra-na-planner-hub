-- =====================================================
-- DATA COLLECTION DYNAMIC FORM SYSTEM
-- =====================================================

-- 1. Create data_collection_schemas table
CREATE TABLE public.data_collection_schemas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Coleta de Dados',
  version TEXT NOT NULL DEFAULT '1.0.0',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(user_id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Create data_collection_sections table
CREATE TABLE public.data_collection_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schema_id UUID NOT NULL REFERENCES public.data_collection_schemas(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'FileText',
  order_position INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(schema_id, key)
);

-- 3. Create data_collection_fields table
CREATE TABLE public.data_collection_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES public.data_collection_sections(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  field_type TEXT NOT NULL,
  options JSONB DEFAULT '{}',
  validation JSONB DEFAULT '{}',
  data_path TEXT NOT NULL,
  placeholder TEXT,
  default_value JSONB,
  conditional_on JSONB,
  order_position INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(section_id, key)
);

-- 4. Create contact_data_collections table
CREATE TABLE public.contact_data_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  schema_id UUID NOT NULL REFERENCES public.data_collection_schemas(id),
  collected_by UUID NOT NULL REFERENCES public.profiles(user_id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed')),
  data_collection JSONB NOT NULL DEFAULT '{}',
  collected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(contact_id)
);

-- 5. Create system_settings table
CREATE TABLE public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Triggers
CREATE TRIGGER update_data_collection_schemas_updated_at
  BEFORE UPDATE ON public.data_collection_schemas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_data_collection_sections_updated_at
  BEFORE UPDATE ON public.data_collection_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_data_collection_fields_updated_at
  BEFORE UPDATE ON public.data_collection_fields
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contact_data_collections_updated_at
  BEFORE UPDATE ON public.contact_data_collections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.data_collection_schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_collection_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_collection_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_data_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view schemas"
  ON public.data_collection_schemas FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Superadmin can manage schemas"
  ON public.data_collection_schemas FOR ALL
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Authenticated users can view sections"
  ON public.data_collection_sections FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Superadmin can manage sections"
  ON public.data_collection_sections FOR ALL
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Authenticated users can view fields"
  ON public.data_collection_fields FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Superadmin can manage fields"
  ON public.data_collection_fields FOR ALL
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Users can view data collections of accessible contacts"
  ON public.contact_data_collections FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = contact_data_collections.contact_id AND ((c.owner_id IS NULL AND public.can_view_unassigned_contacts(auth.uid())) OR (c.owner_id IS NOT NULL AND public.can_access_user(auth.uid(), c.owner_id)))));
CREATE POLICY "Authenticated users can insert data collections"
  ON public.contact_data_collections FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update data collections of accessible contacts"
  ON public.contact_data_collections FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = contact_data_collections.contact_id AND ((c.owner_id IS NULL AND public.can_view_unassigned_contacts(auth.uid())) OR (c.owner_id IS NOT NULL AND public.can_access_user(auth.uid(), c.owner_id)))));
CREATE POLICY "Superadmin can delete data collections"
  ON public.contact_data_collections FOR DELETE USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Authenticated users can view system settings"
  ON public.system_settings FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Superadmin can manage system settings"
  ON public.system_settings FOR ALL
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

-- Seed default schema
INSERT INTO public.data_collection_schemas (id, name, version, is_active)
VALUES ('a0000000-0000-0000-0000-000000000001', 'Coleta de Dados Padrão', '1.0.0', true);

-- Seed sections
INSERT INTO public.data_collection_sections (schema_id, key, title, description, icon, order_position) VALUES
('a0000000-0000-0000-0000-000000000001', 'profile', 'Perfil', 'Informações pessoais e profissionais', 'User', 0),
('a0000000-0000-0000-0000-000000000001', 'goals', 'Objetivos', 'Metas e objetivos financeiros', 'Target', 1),
('a0000000-0000-0000-0000-000000000001', 'retirement', 'Aposentadoria', 'Planejamento para aposentadoria', 'Sunset', 2),
('a0000000-0000-0000-0000-000000000001', 'banking', 'Bancos e Cartões', 'Relacionamento bancário', 'CreditCard', 3),
('a0000000-0000-0000-0000-000000000001', 'investments', 'Investimentos', 'Investimentos atuais', 'TrendingUp', 4),
('a0000000-0000-0000-0000-000000000001', 'assets', 'Patrimônio', 'Bens imóveis e veículos', 'Home', 5),
('a0000000-0000-0000-0000-000000000001', 'debts', 'Dívidas', 'Endividamento atual', 'AlertCircle', 6),
('a0000000-0000-0000-0000-000000000001', 'protection', 'Proteção', 'Seguros e proteções', 'Shield', 7),
('a0000000-0000-0000-0000-000000000001', 'tax', 'Imposto de Renda', 'Declaração de IR', 'FileText', 8),
('a0000000-0000-0000-0000-000000000001', 'cash_flow', 'Fluxo de Caixa', 'Receitas e despesas', 'DollarSign', 9),
('a0000000-0000-0000-0000-000000000001', 'notes', 'Observações', 'Notas e contexto', 'MessageSquare', 10);

-- Seed system settings
INSERT INTO public.system_settings (key, value, description) VALUES
('AI_ADMIN_RULES_PLANNING', '{"prompt": "Defina aqui as regras para a IA sugerir planejamentos."}', 'Regras da IA de planejamento'),
('AI_SYSTEM_PROMPT', '{"prompt": "Você é uma IA de apoio ao Planejador Financeiro."}', 'System prompt da IA');