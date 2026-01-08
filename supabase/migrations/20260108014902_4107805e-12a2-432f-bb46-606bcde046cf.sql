-- Fix infinite recursion between projects <-> project_members RLS by using SECURITY DEFINER helpers

-- 1) Helper functions (bypass RLS safely)
create or replace function public.is_project_owner(_project_id uuid, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects p
    where p.id = _project_id
      and p.owner_id = _user_id
  )
$$;

create or replace function public.is_project_accepted_member(_project_id uuid, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_members pm
    where pm.project_id = _project_id
      and pm.user_id = _user_id
      and pm.status = 'accepted'
  )
$$;

create or replace function public.is_project_editor_or_admin(_project_id uuid, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_members pm
    where pm.project_id = _project_id
      and pm.user_id = _user_id
      and pm.status = 'accepted'
      and pm.role in ('editor','admin')
  )
$$;

-- 2) Drop any existing policies (including legacy ones)
-- projects
drop policy if exists "projects_select_policy" on public.projects;
drop policy if exists "projects_insert_policy" on public.projects;
drop policy if exists "projects_update_policy" on public.projects;
drop policy if exists "projects_delete_policy" on public.projects;
drop policy if exists "Only owners can delete projects" on public.projects;
drop policy if exists "Users can view own projects or projects they are members of" on public.projects;
drop policy if exists "Owners and editors can update projects" on public.projects;
drop policy if exists "Owners can delete projects" on public.projects;
drop policy if exists "Authenticated users can create projects" on public.projects;

-- project_members
drop policy if exists "members_select_policy" on public.project_members;
drop policy if exists "members_insert_policy" on public.project_members;
drop policy if exists "members_update_policy" on public.project_members;
drop policy if exists "members_delete_policy" on public.project_members;
drop policy if exists "Users can view members of projects they have access to" on public.project_members;
drop policy if exists "Project owners and admins can add members" on public.project_members;
drop policy if exists "Users can update their own membership or owners can update any" on public.project_members;
drop policy if exists "Project owners can delete members" on public.project_members;

-- 3) Recreate policies WITHOUT cross-table SELECTs in the policy expressions
-- projects
create policy "projects_select_policy"
on public.projects
for select
using (
  owner_id = auth.uid()
  or public.is_project_accepted_member(id, auth.uid())
);

create policy "projects_insert_policy"
on public.projects
for insert
with check (
  auth.uid() is not null
  and owner_id = auth.uid()
);

create policy "projects_update_policy"
on public.projects
for update
using (
  owner_id = auth.uid()
  or public.is_project_editor_or_admin(id, auth.uid())
);

create policy "projects_delete_policy"
on public.projects
for delete
using (
  owner_id = auth.uid()
);

-- project_members
create policy "members_select_policy"
on public.project_members
for select
using (
  user_id = auth.uid()
  or public.is_project_owner(project_id, auth.uid())
);

create policy "members_insert_policy"
on public.project_members
for insert
with check (
  public.is_project_owner(project_id, auth.uid())
);

create policy "members_update_policy"
on public.project_members
for update
using (
  user_id = auth.uid()
  or public.is_project_owner(project_id, auth.uid())
);

create policy "members_delete_policy"
on public.project_members
for delete
using (
  public.is_project_owner(project_id, auth.uid())
);
