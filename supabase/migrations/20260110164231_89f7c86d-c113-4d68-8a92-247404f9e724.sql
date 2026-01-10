-- =============================================
-- SISTEMA DE TREINAMENTOS - MIGRATION COMPLETA
-- =============================================

-- 1. Adicionar campo is_trainer na tabela profiles (role acumulável)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_trainer BOOLEAN DEFAULT false;

-- 2. Adicionar campo cohort_date para rastrear turmas de planejadores
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cohort_date DATE;

-- =============================================
-- TABELAS PRINCIPAIS
-- =============================================

-- 3. Cursos de Treinamento
CREATE TABLE public.training_courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  target_roles TEXT[] DEFAULT ARRAY['planejador']::TEXT[],
  is_active BOOLEAN DEFAULT true,
  order_position INTEGER DEFAULT 0,
  created_by UUID REFERENCES public.profiles(user_id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Módulos dentro de um curso
CREATE TABLE public.training_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.training_courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  order_position INTEGER DEFAULT 0,
  deadline_days INTEGER DEFAULT 30,
  has_practical_exam BOOLEAN DEFAULT false,
  passing_score INTEGER DEFAULT 70,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Aulas/Vídeos
CREATE TABLE public.training_lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES public.training_modules(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  youtube_video_id TEXT,
  duration_minutes INTEGER DEFAULT 0,
  order_position INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Materiais de apoio (PDFs, documentos)
CREATE TABLE public.training_lesson_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES public.training_lessons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  order_position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Provas objetivas (ligadas ao módulo)
CREATE TABLE public.training_exams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES public.training_modules(id) ON DELETE CASCADE,
  name TEXT DEFAULT 'Prova do Módulo',
  time_limit_minutes INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 8. Questões da prova
CREATE TABLE public.training_exam_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES public.training_exams(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'multiple_choice',
  options JSONB DEFAULT '[]'::jsonb,
  correct_answer TEXT NOT NULL,
  order_position INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 9. Progresso por aula (checkbox concluído)
CREATE TABLE public.training_lesson_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.training_lessons(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

-- 10. Tentativas de prova objetiva
CREATE TABLE public.training_exam_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES public.training_exams(id) ON DELETE CASCADE,
  answers JSONB DEFAULT '[]'::jsonb,
  score NUMERIC(5,2) DEFAULT 0,
  passed BOOLEAN DEFAULT false,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- 11. Notas práticas (dadas pelo treinador)
CREATE TABLE public.training_practical_grades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.training_modules(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES public.profiles(user_id),
  grade NUMERIC(4,2) NOT NULL,
  feedback_text TEXT,
  passed BOOLEAN DEFAULT false,
  graded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, module_id)
);

-- 12. Matrículas (controle de prazo)
CREATE TABLE public.training_course_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.training_courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deadline_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'in_progress',
  UNIQUE(user_id, course_id)
);

-- 13. Avaliações do curso pelo planejador
CREATE TABLE public.training_course_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.training_courses(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- 14. Certificados (estrutura pronta para futuro)
CREATE TABLE public.training_certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.training_courses(id) ON DELETE CASCADE,
  certificate_number TEXT NOT NULL UNIQUE,
  issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  template_used TEXT,
  pdf_path TEXT,
  UNIQUE(user_id, course_id)
);

-- =============================================
-- ÍNDICES
-- =============================================
CREATE INDEX idx_training_modules_course ON public.training_modules(course_id);
CREATE INDEX idx_training_lessons_module ON public.training_lessons(module_id);
CREATE INDEX idx_training_lesson_progress_user ON public.training_lesson_progress(user_id);
CREATE INDEX idx_training_exam_attempts_user ON public.training_exam_attempts(user_id);
CREATE INDEX idx_training_practical_grades_user ON public.training_practical_grades(user_id);
CREATE INDEX idx_training_course_enrollments_user ON public.training_course_enrollments(user_id);
CREATE INDEX idx_profiles_is_trainer ON public.profiles(is_trainer) WHERE is_trainer = true;
CREATE INDEX idx_profiles_cohort_date ON public.profiles(cohort_date);

-- =============================================
-- ENABLE RLS
-- =============================================
ALTER TABLE public.training_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_lesson_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_practical_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_course_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_certificates ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Função auxiliar para verificar se é treinador
CREATE OR REPLACE FUNCTION public.is_trainer(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND is_trainer = true
  )
$$;

-- TRAINING_COURSES
CREATE POLICY "Authenticated users can view active courses"
  ON public.training_courses FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = true);

CREATE POLICY "Trainers and superadmin can manage courses"
  ON public.training_courses FOR ALL
  USING (is_trainer(auth.uid()) OR has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (is_trainer(auth.uid()) OR has_role(auth.uid(), 'superadmin'::app_role));

-- TRAINING_MODULES
CREATE POLICY "Authenticated users can view active modules"
  ON public.training_modules FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = true);

CREATE POLICY "Trainers and superadmin can manage modules"
  ON public.training_modules FOR ALL
  USING (is_trainer(auth.uid()) OR has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (is_trainer(auth.uid()) OR has_role(auth.uid(), 'superadmin'::app_role));

-- TRAINING_LESSONS
CREATE POLICY "Authenticated users can view active lessons"
  ON public.training_lessons FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = true);

CREATE POLICY "Trainers and superadmin can manage lessons"
  ON public.training_lessons FOR ALL
  USING (is_trainer(auth.uid()) OR has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (is_trainer(auth.uid()) OR has_role(auth.uid(), 'superadmin'::app_role));

-- TRAINING_LESSON_MATERIALS
CREATE POLICY "Authenticated users can view materials"
  ON public.training_lesson_materials FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Trainers and superadmin can manage materials"
  ON public.training_lesson_materials FOR ALL
  USING (is_trainer(auth.uid()) OR has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (is_trainer(auth.uid()) OR has_role(auth.uid(), 'superadmin'::app_role));

-- TRAINING_EXAMS
CREATE POLICY "Authenticated users can view active exams"
  ON public.training_exams FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = true);

CREATE POLICY "Trainers and superadmin can manage exams"
  ON public.training_exams FOR ALL
  USING (is_trainer(auth.uid()) OR has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (is_trainer(auth.uid()) OR has_role(auth.uid(), 'superadmin'::app_role));

-- TRAINING_EXAM_QUESTIONS
CREATE POLICY "Authenticated users can view active questions"
  ON public.training_exam_questions FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = true);

CREATE POLICY "Trainers and superadmin can manage questions"
  ON public.training_exam_questions FOR ALL
  USING (is_trainer(auth.uid()) OR has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (is_trainer(auth.uid()) OR has_role(auth.uid(), 'superadmin'::app_role));

-- TRAINING_LESSON_PROGRESS
CREATE POLICY "Users can manage their own progress"
  ON public.training_lesson_progress FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Leaders can view subordinates progress"
  ON public.training_lesson_progress FOR SELECT
  USING (can_access_user(auth.uid(), user_id));

CREATE POLICY "Trainers can view all progress"
  ON public.training_lesson_progress FOR SELECT
  USING (is_trainer(auth.uid()) OR has_role(auth.uid(), 'superadmin'::app_role));

-- TRAINING_EXAM_ATTEMPTS
CREATE POLICY "Users can manage their own attempts"
  ON public.training_exam_attempts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Leaders can view subordinates attempts"
  ON public.training_exam_attempts FOR SELECT
  USING (can_access_user(auth.uid(), user_id));

CREATE POLICY "Trainers can view all attempts"
  ON public.training_exam_attempts FOR SELECT
  USING (is_trainer(auth.uid()) OR has_role(auth.uid(), 'superadmin'::app_role));

-- TRAINING_PRACTICAL_GRADES
CREATE POLICY "Users can view their own grades"
  ON public.training_practical_grades FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Leaders can view subordinates grades"
  ON public.training_practical_grades FOR SELECT
  USING (can_access_user(auth.uid(), user_id));

CREATE POLICY "Trainers can manage all grades"
  ON public.training_practical_grades FOR ALL
  USING (is_trainer(auth.uid()) OR has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (is_trainer(auth.uid()) OR has_role(auth.uid(), 'superadmin'::app_role));

-- TRAINING_COURSE_ENROLLMENTS
CREATE POLICY "Users can view their own enrollments"
  ON public.training_course_enrollments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can enroll themselves"
  ON public.training_course_enrollments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own enrollments"
  ON public.training_course_enrollments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Leaders can view subordinates enrollments"
  ON public.training_course_enrollments FOR SELECT
  USING (can_access_user(auth.uid(), user_id));

CREATE POLICY "Trainers can manage all enrollments"
  ON public.training_course_enrollments FOR ALL
  USING (is_trainer(auth.uid()) OR has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (is_trainer(auth.uid()) OR has_role(auth.uid(), 'superadmin'::app_role));

-- TRAINING_COURSE_REVIEWS
CREATE POLICY "Users can manage their own reviews"
  ON public.training_course_reviews FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Trainers can view all reviews"
  ON public.training_course_reviews FOR SELECT
  USING (is_trainer(auth.uid()) OR has_role(auth.uid(), 'superadmin'::app_role));

-- TRAINING_CERTIFICATES
CREATE POLICY "Users can view their own certificates"
  ON public.training_certificates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Trainers can manage certificates"
  ON public.training_certificates FOR ALL
  USING (is_trainer(auth.uid()) OR has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (is_trainer(auth.uid()) OR has_role(auth.uid(), 'superadmin'::app_role));

-- =============================================
-- TRIGGERS DE UPDATE
-- =============================================
CREATE TRIGGER update_training_courses_updated_at
  BEFORE UPDATE ON public.training_courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_training_modules_updated_at
  BEFORE UPDATE ON public.training_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_training_lessons_updated_at
  BEFORE UPDATE ON public.training_lessons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_training_exams_updated_at
  BEFORE UPDATE ON public.training_exams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- STORAGE BUCKET PARA MATERIAIS
-- =============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'training-materials',
  'training-materials',
  true,
  52428800,
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for training-materials bucket
CREATE POLICY "Authenticated users can view training materials"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'training-materials' AND auth.uid() IS NOT NULL);

CREATE POLICY "Trainers can upload training materials"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'training-materials' AND (is_trainer(auth.uid()) OR has_role(auth.uid(), 'superadmin'::app_role)));

CREATE POLICY "Trainers can update training materials"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'training-materials' AND (is_trainer(auth.uid()) OR has_role(auth.uid(), 'superadmin'::app_role)));

CREATE POLICY "Trainers can delete training materials"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'training-materials' AND (is_trainer(auth.uid()) OR has_role(auth.uid(), 'superadmin'::app_role)));

-- =============================================
-- FUNÇÃO PARA GERAR NÚMERO DE CERTIFICADO
-- =============================================
CREATE SEQUENCE IF NOT EXISTS public.training_certificate_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_certificate_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.certificate_number := 'CERT-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('public.training_certificate_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER generate_training_certificate_number
  BEFORE INSERT ON public.training_certificates
  FOR EACH ROW EXECUTE FUNCTION public.generate_certificate_number();

-- =============================================
-- TRIGGER PARA NOTIFICAÇÕES
-- =============================================

-- Notificar líder quando planejador conclui módulo
CREATE OR REPLACE FUNCTION public.notify_training_module_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  manager_id UUID;
  planner_name TEXT;
  module_name TEXT;
  course_name TEXT;
BEGIN
  -- Get planner's manager
  SELECT uh.manager_user_id INTO manager_id
  FROM public.user_hierarchy uh
  WHERE uh.user_id = NEW.user_id;
  
  -- Get planner name
  SELECT p.full_name INTO planner_name
  FROM public.profiles p
  WHERE p.user_id = NEW.user_id;
  
  -- Get module and course names
  SELECT m.name, c.name INTO module_name, course_name
  FROM public.training_modules m
  JOIN public.training_courses c ON c.id = m.course_id
  WHERE m.id = NEW.module_id;
  
  -- Notify manager if exists
  IF manager_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      manager_id,
      'Módulo de treinamento concluído',
      planner_name || ' concluiu o módulo "' || module_name || '" do curso "' || course_name || '"',
      'training',
      '/training'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_on_practical_grade
  AFTER INSERT ON public.training_practical_grades
  FOR EACH ROW EXECUTE FUNCTION public.notify_training_module_completed();

-- Notificar líder quando planejador reprova em prova
CREATE OR REPLACE FUNCTION public.notify_training_exam_failed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  manager_id UUID;
  planner_name TEXT;
  module_name TEXT;
  course_name TEXT;
BEGIN
  -- Only notify on failure
  IF NEW.passed = false AND NEW.completed_at IS NOT NULL THEN
    -- Get planner's manager
    SELECT uh.manager_user_id INTO manager_id
    FROM public.user_hierarchy uh
    WHERE uh.user_id = NEW.user_id;
    
    -- Get planner name
    SELECT p.full_name INTO planner_name
    FROM public.profiles p
    WHERE p.user_id = NEW.user_id;
    
    -- Get module and course names
    SELECT m.name, c.name INTO module_name, course_name
    FROM public.training_exams e
    JOIN public.training_modules m ON m.id = e.module_id
    JOIN public.training_courses c ON c.id = m.course_id
    WHERE e.id = NEW.exam_id;
    
    -- Notify manager if exists
    IF manager_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (
        manager_id,
        'Planejador reprovado em prova',
        planner_name || ' não atingiu a nota mínima na prova do módulo "' || module_name || '" (' || ROUND(NEW.score, 1) || '%)',
        'training',
        '/training'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_on_exam_attempt
  AFTER INSERT OR UPDATE ON public.training_exam_attempts
  FOR EACH ROW EXECUTE FUNCTION public.notify_training_exam_failed();

-- Enable realtime for progress tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.training_lesson_progress;
ALTER PUBLICATION supabase_realtime ADD TABLE public.training_exam_attempts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.training_practical_grades;