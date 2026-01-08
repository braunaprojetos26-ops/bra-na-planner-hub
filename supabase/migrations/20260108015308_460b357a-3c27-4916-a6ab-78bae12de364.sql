-- Add verification column to projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS verification text;

-- Create project_pages table (sub-pages within a project)
CREATE TABLE public.project_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Nova página',
  icon text DEFAULT '📄',
  status text DEFAULT 'not_started',
  priority text DEFAULT 'low',
  due_date date,
  content jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES public.profiles(user_id)
);

-- Create project_page_assignees table
CREATE TABLE public.project_page_assignees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES public.project_pages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(page_id, user_id)
);

-- Enable RLS
ALTER TABLE public.project_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_page_assignees ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user can access project page
CREATE OR REPLACE FUNCTION public.can_access_project_page(_page_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_pages pp
    JOIN public.projects p ON p.id = pp.project_id
    WHERE pp.id = _page_id
      AND (
        p.owner_id = _user_id
        OR public.is_project_accepted_member(p.id, _user_id)
      )
  )
$$;

-- RLS policies for project_pages
CREATE POLICY "pages_select_policy"
ON public.project_pages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_id
      AND (p.owner_id = auth.uid() OR public.is_project_accepted_member(p.id, auth.uid()))
  )
);

CREATE POLICY "pages_insert_policy"
ON public.project_pages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_id
      AND (p.owner_id = auth.uid() OR public.is_project_editor_or_admin(p.id, auth.uid()))
  )
);

CREATE POLICY "pages_update_policy"
ON public.project_pages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_id
      AND (p.owner_id = auth.uid() OR public.is_project_editor_or_admin(p.id, auth.uid()))
  )
);

CREATE POLICY "pages_delete_policy"
ON public.project_pages
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_id
      AND (p.owner_id = auth.uid() OR public.is_project_editor_or_admin(p.id, auth.uid()))
  )
);

-- RLS policies for project_page_assignees
CREATE POLICY "assignees_select_policy"
ON public.project_page_assignees
FOR SELECT
USING (
  public.can_access_project_page(page_id, auth.uid())
);

CREATE POLICY "assignees_insert_policy"
ON public.project_page_assignees
FOR INSERT
WITH CHECK (
  public.can_access_project_page(page_id, auth.uid())
);

CREATE POLICY "assignees_delete_policy"
ON public.project_page_assignees
FOR DELETE
USING (
  public.can_access_project_page(page_id, auth.uid())
);

-- Trigger to update updated_at
CREATE TRIGGER update_project_pages_updated_at
BEFORE UPDATE ON public.project_pages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();