-- Create storage bucket for wiki files
INSERT INTO storage.buckets (id, name, public) VALUES ('wiki-files', 'wiki-files', true);

-- Create storage policies for wiki-files bucket
CREATE POLICY "Authenticated users can view wiki files"
ON storage.objects FOR SELECT
USING (bucket_id = 'wiki-files' AND auth.uid() IS NOT NULL);

CREATE POLICY "Superadmin can upload wiki files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'wiki-files' AND has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Superadmin can update wiki files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'wiki-files' AND has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Superadmin can delete wiki files"
ON storage.objects FOR DELETE
USING (bucket_id = 'wiki-files' AND has_role(auth.uid(), 'superadmin'::app_role));

-- Create wiki_categories table
CREATE TABLE public.wiki_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'Folder',
  order_position INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on wiki_categories
ALTER TABLE public.wiki_categories ENABLE ROW LEVEL SECURITY;

-- RLS policies for wiki_categories
CREATE POLICY "Authenticated users can view active categories"
ON public.wiki_categories FOR SELECT
USING (auth.uid() IS NOT NULL AND is_active = true);

CREATE POLICY "Superadmin can manage categories"
ON public.wiki_categories FOR ALL
USING (has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

-- Create wiki_items table
CREATE TABLE public.wiki_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.wiki_categories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  item_type TEXT NOT NULL CHECK (item_type IN ('folder', 'file', 'link')),
  href TEXT,
  parent_id UUID REFERENCES public.wiki_items(id) ON DELETE CASCADE,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  file_path TEXT,
  file_name TEXT,
  file_type TEXT,
  file_size INTEGER,
  uploaded_by UUID,
  order_position INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on wiki_items
ALTER TABLE public.wiki_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for wiki_items
CREATE POLICY "Authenticated users can view active items"
ON public.wiki_items FOR SELECT
USING (auth.uid() IS NOT NULL AND is_active = true);

CREATE POLICY "Superadmin can manage items"
ON public.wiki_items FOR ALL
USING (has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

-- Create indexes for better performance
CREATE INDEX idx_wiki_items_category_id ON public.wiki_items(category_id);
CREATE INDEX idx_wiki_items_parent_id ON public.wiki_items(parent_id);
CREATE INDEX idx_wiki_items_keywords ON public.wiki_items USING GIN(keywords);
CREATE INDEX idx_wiki_categories_slug ON public.wiki_categories(slug);

-- Create triggers for updated_at
CREATE TRIGGER update_wiki_categories_updated_at
BEFORE UPDATE ON public.wiki_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wiki_items_updated_at
BEFORE UPDATE ON public.wiki_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial categories based on current hardcoded structure
INSERT INTO public.wiki_categories (name, slug, description, icon, order_position) VALUES
('Time', 'time', 'Recursos e informações da equipe', 'Users', 1),
('Políticas', 'politicas', 'Políticas e normas da empresa', 'FileText', 2);

-- Insert initial folder structure for "Time" category
INSERT INTO public.wiki_items (category_id, title, description, icon, item_type, order_position)
SELECT 
  c.id,
  items.title,
  items.description,
  items.icon,
  'folder',
  items.order_position
FROM public.wiki_categories c,
(VALUES 
  ('Arquivos', 'Arquivos e documentos do time', 'FolderOpen', 1),
  ('Últimas notícias', 'Novidades e comunicados', 'Newspaper', 2),
  ('Links Rápidos', 'Links úteis e frequentes', 'Link', 3),
  ('Missão, Visão, Valores', 'Identidade da empresa', 'Target', 4),
  ('Campanhas Ativas', 'Campanhas em andamento', 'Megaphone', 5),
  ('Palestras', 'Material de palestras e treinamentos', 'Presentation', 6),
  ('Processos - Braúna', 'Documentação de processos internos', 'Cog', 7)
) AS items(title, description, icon, order_position)
WHERE c.slug = 'time';

-- Insert sub-folders for "Processos - Braúna"
INSERT INTO public.wiki_items (category_id, parent_id, title, description, icon, item_type, order_position)
SELECT 
  c.id,
  p.id,
  items.title,
  items.description,
  items.icon,
  'folder',
  items.order_position
FROM public.wiki_categories c
JOIN public.wiki_items p ON p.category_id = c.id AND p.title = 'Processos - Braúna'
CROSS JOIN (VALUES 
  ('Processos Gerais', 'Processos gerais da empresa', 'Brain', 1),
  ('Processos Liderança', 'Processos específicos para liderança', 'Users', 2)
) AS items(title, description, icon, order_position)
WHERE c.slug = 'time';

-- Insert initial folder structure for "Políticas" category
INSERT INTO public.wiki_items (category_id, title, description, icon, item_type, order_position)
SELECT 
  c.id,
  items.title,
  items.description,
  items.icon,
  'folder',
  items.order_position
FROM public.wiki_categories c,
(VALUES 
  ('Eventos internos', 'Eventos e confraternizações', 'CalendarDays', 1),
  ('Política de benefícios', 'Benefícios e vantagens', 'Gift', 2)
) AS items(title, description, icon, order_position)
WHERE c.slug = 'politicas';