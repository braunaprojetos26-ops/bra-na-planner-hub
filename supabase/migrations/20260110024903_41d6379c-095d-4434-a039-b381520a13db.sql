-- Add assigned_to column to tasks table
ALTER TABLE public.tasks 
ADD COLUMN assigned_to uuid REFERENCES profiles(user_id);

-- Create index for better query performance
CREATE INDEX idx_tasks_assigned_to ON public.tasks(assigned_to);

-- Update RLS policies to allow users to see tasks assigned to them
-- First, drop existing policies
DROP POLICY IF EXISTS "Users can view tasks they created" ON public.tasks;
DROP POLICY IF EXISTS "Users can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON public.tasks;

-- Create new comprehensive policies

-- Users can view tasks they created OR tasks assigned to them
CREATE POLICY "Users can view own and assigned tasks" 
ON public.tasks 
FOR SELECT 
USING (
  auth.uid() = created_by 
  OR auth.uid() = assigned_to
);

-- Users can create tasks (for themselves or for subordinates they manage)
CREATE POLICY "Users can create tasks" 
ON public.tasks 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

-- Users can update tasks they created
CREATE POLICY "Users can update tasks they created" 
ON public.tasks 
FOR UPDATE 
USING (auth.uid() = created_by);

-- Users can also update tasks assigned to them (e.g., mark as complete)
CREATE POLICY "Users can update tasks assigned to them" 
ON public.tasks 
FOR UPDATE 
USING (auth.uid() = assigned_to);

-- Users can delete tasks they created
CREATE POLICY "Users can delete tasks they created" 
ON public.tasks 
FOR DELETE 
USING (auth.uid() = created_by);