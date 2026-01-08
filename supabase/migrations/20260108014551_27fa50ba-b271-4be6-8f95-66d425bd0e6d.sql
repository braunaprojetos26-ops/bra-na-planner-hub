-- Drop existing policies on projects
DROP POLICY IF EXISTS "Users can view own projects or projects they are members of" ON projects;
DROP POLICY IF EXISTS "Owners and editors can update projects" ON projects;
DROP POLICY IF EXISTS "Owners can delete projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can create projects" ON projects;

-- Drop existing policies on project_members
DROP POLICY IF EXISTS "Users can view members of projects they have access to" ON project_members;
DROP POLICY IF EXISTS "Project owners and admins can add members" ON project_members;
DROP POLICY IF EXISTS "Users can update their own membership or owners can update any" ON project_members;
DROP POLICY IF EXISTS "Project owners can delete members" ON project_members;

-- New policies for projects (no recursion)
CREATE POLICY "projects_select_policy" ON projects FOR SELECT USING (
  owner_id = auth.uid() 
  OR 
  id IN (
    SELECT project_id FROM project_members 
    WHERE user_id = auth.uid() AND status = 'accepted'
  )
);

CREATE POLICY "projects_insert_policy" ON projects FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "projects_update_policy" ON projects FOR UPDATE USING (
  owner_id = auth.uid() 
  OR 
  id IN (
    SELECT project_id FROM project_members 
    WHERE user_id = auth.uid() 
    AND status = 'accepted' 
    AND role IN ('editor', 'admin')
  )
);

CREATE POLICY "projects_delete_policy" ON projects FOR DELETE USING (
  owner_id = auth.uid()
);

-- New policies for project_members (no recursion)
CREATE POLICY "members_select_policy" ON project_members FOR SELECT USING (
  user_id = auth.uid()
  OR 
  project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
);

CREATE POLICY "members_insert_policy" ON project_members FOR INSERT 
WITH CHECK (
  project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
);

CREATE POLICY "members_update_policy" ON project_members FOR UPDATE USING (
  user_id = auth.uid()
  OR 
  project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
);

CREATE POLICY "members_delete_policy" ON project_members FOR DELETE USING (
  project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
);