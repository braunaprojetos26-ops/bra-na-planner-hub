-- Add instagram_handle column to planner_profiles
ALTER TABLE public.planner_profiles 
ADD COLUMN IF NOT EXISTS instagram_handle text NULL;