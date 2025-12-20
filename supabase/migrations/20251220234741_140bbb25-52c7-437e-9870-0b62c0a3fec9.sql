-- Create table for assistant knowledge base
CREATE TABLE public.assistant_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('processo', 'faq', 'linguagem', 'regra')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(user_id)
);

-- Enable RLS
ALTER TABLE public.assistant_knowledge ENABLE ROW LEVEL SECURITY;

-- Superadmins can manage all knowledge
CREATE POLICY "Superadmin can manage knowledge"
  ON public.assistant_knowledge
  FOR ALL
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

-- All authenticated users can read active knowledge
CREATE POLICY "Authenticated users can read active knowledge"
  ON public.assistant_knowledge
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = true);

-- Create trigger for updated_at
CREATE TRIGGER update_assistant_knowledge_updated_at
  BEFORE UPDATE ON public.assistant_knowledge
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();