-- Create projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT 'Sem título',
  content JSONB DEFAULT '[]'::jsonb,
  icon TEXT DEFAULT '📄',
  cover_url TEXT,
  owner_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create project_members table for sharing
CREATE TABLE public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('viewer', 'editor', 'admin')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  invited_by UUID,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(project_id, email)
);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Enable realtime for projects
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;

-- Projects RLS Policies
CREATE POLICY "Users can view own projects or projects they are members of"
ON public.projects FOR SELECT
USING (
  owner_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.project_members 
    WHERE project_id = projects.id 
    AND user_id = auth.uid() 
    AND status = 'accepted'
  )
);

CREATE POLICY "Authenticated users can create projects"
ON public.projects FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND owner_id = auth.uid());

CREATE POLICY "Owners and editors can update projects"
ON public.projects FOR UPDATE
USING (
  owner_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.project_members 
    WHERE project_id = projects.id 
    AND user_id = auth.uid() 
    AND status = 'accepted'
    AND role IN ('editor', 'admin')
  )
);

CREATE POLICY "Only owners can delete projects"
ON public.projects FOR DELETE
USING (owner_id = auth.uid());

-- Project Members RLS Policies
CREATE POLICY "Users can view members of projects they have access to"
ON public.project_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE id = project_id 
    AND (owner_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.project_members pm2
      WHERE pm2.project_id = projects.id
      AND pm2.user_id = auth.uid()
      AND pm2.status = 'accepted'
    ))
  ) OR
  user_id = auth.uid()
);

CREATE POLICY "Project owners and admins can add members"
ON public.project_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE id = project_id 
    AND (owner_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.project_members pm2
      WHERE pm2.project_id = projects.id
      AND pm2.user_id = auth.uid()
      AND pm2.status = 'accepted'
      AND pm2.role = 'admin'
    ))
  )
);

CREATE POLICY "Users can update their own membership or owners can update any"
ON public.project_members FOR UPDATE
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE id = project_id 
    AND owner_id = auth.uid()
  )
);

CREATE POLICY "Project owners can delete members"
ON public.project_members FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE id = project_id 
    AND owner_id = auth.uid()
  )
);

-- Trigger to update updated_at
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();