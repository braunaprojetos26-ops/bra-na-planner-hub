-- Add display_name column to planner_profiles table
ALTER TABLE public.planner_profiles 
ADD COLUMN IF NOT EXISTS display_name TEXT;