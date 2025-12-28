-- =====================================================
-- GESTÃO DE EQUIPE - Tabelas para liderança e 1:1
-- =====================================================

-- Tabela: Modelos de Reunião 1:1 (Admin gerencia)
CREATE TABLE public.leadership_meeting_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  order_position INTEGER DEFAULT 0,
  template_content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(user_id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para leadership_meeting_templates
ALTER TABLE public.leadership_meeting_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active templates"
ON public.leadership_meeting_templates
FOR SELECT
USING (auth.uid() IS NOT NULL AND is_active = true);

CREATE POLICY "Superadmin can manage templates"
ON public.leadership_meeting_templates
FOR ALL
USING (has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_leadership_meeting_templates_updated_at
BEFORE UPDATE ON public.leadership_meeting_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================

-- Tabela: Base de Conhecimento de Liderança (Admin gerencia)
CREATE TABLE public.leadership_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('livro', 'artigo', 'conceito', 'metodologia')),
  source TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(user_id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para leadership_knowledge_base
ALTER TABLE public.leadership_knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active knowledge"
ON public.leadership_knowledge_base
FOR SELECT
USING (auth.uid() IS NOT NULL AND is_active = true);

CREATE POLICY "Superadmin can manage knowledge"
ON public.leadership_knowledge_base
FOR ALL
USING (has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_leadership_knowledge_base_updated_at
BEFORE UPDATE ON public.leadership_knowledge_base
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================

-- Tabela: Sonhos e Objetivos do Planejador
CREATE TABLE public.planner_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(user_id),
  title TEXT NOT NULL,
  description TEXT,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('sonho_grande', 'objetivo_curto_prazo', 'objetivo_longo_prazo')),
  target_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'achieved', 'cancelled')),
  created_by UUID NOT NULL REFERENCES public.profiles(user_id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para planner_goals
ALTER TABLE public.planner_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leaders can view goals of subordinates"
ON public.planner_goals
FOR SELECT
USING (can_access_user(auth.uid(), user_id));

CREATE POLICY "Leaders can insert goals for subordinates"
ON public.planner_goals
FOR INSERT
WITH CHECK (can_access_user(auth.uid(), user_id));

CREATE POLICY "Leaders can update goals of subordinates"
ON public.planner_goals
FOR UPDATE
USING (can_access_user(auth.uid(), user_id));

CREATE POLICY "Superadmin can delete goals"
ON public.planner_goals
FOR DELETE
USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_planner_goals_updated_at
BEFORE UPDATE ON public.planner_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================

-- Tabela: Reuniões 1:1
CREATE TABLE public.one_on_one_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planner_id UUID NOT NULL REFERENCES public.profiles(user_id),
  leader_id UUID NOT NULL REFERENCES public.profiles(user_id),
  template_id UUID REFERENCES public.leadership_meeting_templates(id),
  scheduled_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'completed', 'cancelled')),
  notes TEXT,
  ai_preparation TEXT,
  leader_inputs JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para one_on_one_meetings
ALTER TABLE public.one_on_one_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leaders can view their meetings"
ON public.one_on_one_meetings
FOR SELECT
USING (leader_id = auth.uid() OR can_access_user(auth.uid(), leader_id));

CREATE POLICY "Leaders can insert meetings for subordinates"
ON public.one_on_one_meetings
FOR INSERT
WITH CHECK (leader_id = auth.uid() AND can_access_user(auth.uid(), planner_id));

CREATE POLICY "Leaders can update their meetings"
ON public.one_on_one_meetings
FOR UPDATE
USING (leader_id = auth.uid());

CREATE POLICY "Superadmin can delete meetings"
ON public.one_on_one_meetings
FOR DELETE
USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_one_on_one_meetings_updated_at
BEFORE UPDATE ON public.one_on_one_meetings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================

-- Tabela: Perfil Comportamental (CAPE/Sólides)
CREATE TABLE public.planner_behavioral_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) UNIQUE,
  -- Perfis DISC (percentuais 0-100)
  executor_score NUMERIC,
  comunicador_score NUMERIC,
  planejador_score NUMERIC,
  analista_score NUMERIC,
  -- Indicadores
  energy_level TEXT,
  external_demand TEXT,
  self_confidence TEXT,
  self_esteem TEXT,
  flexibility TEXT,
  auto_motivation TEXT,
  -- Descrições textuais extraídas do PDF
  leadership_style TEXT,
  communication_style TEXT,
  work_environment TEXT,
  decision_making TEXT,
  motivational_factors TEXT,
  distancing_factors TEXT,
  strengths TEXT,
  areas_to_develop TEXT,
  -- Metadados
  profile_date DATE,
  raw_report_url TEXT,
  extracted_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(user_id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para planner_behavioral_profiles
ALTER TABLE public.planner_behavioral_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leaders can view profiles of subordinates"
ON public.planner_behavioral_profiles
FOR SELECT
USING (can_access_user(auth.uid(), user_id));

CREATE POLICY "Leaders can insert profiles for subordinates"
ON public.planner_behavioral_profiles
FOR INSERT
WITH CHECK (can_access_user(auth.uid(), user_id));

CREATE POLICY "Leaders can update profiles of subordinates"
ON public.planner_behavioral_profiles
FOR UPDATE
USING (can_access_user(auth.uid(), user_id));

CREATE POLICY "Superadmin can delete profiles"
ON public.planner_behavioral_profiles
FOR DELETE
USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_planner_behavioral_profiles_updated_at
BEFORE UPDATE ON public.planner_behavioral_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================

-- Storage bucket para PDFs de perfil comportamental
INSERT INTO storage.buckets (id, name, public)
VALUES ('behavioral-profiles', 'behavioral-profiles', true);

-- RLS para storage: líderes podem fazer upload para subordinados
CREATE POLICY "Leaders can upload behavioral profiles"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'behavioral-profiles' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can view behavioral profiles"
ON storage.objects
FOR SELECT
USING (bucket_id = 'behavioral-profiles' AND auth.uid() IS NOT NULL);

CREATE POLICY "Leaders can update behavioral profiles"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'behavioral-profiles' AND auth.uid() IS NOT NULL);

CREATE POLICY "Leaders can delete behavioral profiles"
ON storage.objects
FOR DELETE
USING (bucket_id = 'behavioral-profiles' AND auth.uid() IS NOT NULL);