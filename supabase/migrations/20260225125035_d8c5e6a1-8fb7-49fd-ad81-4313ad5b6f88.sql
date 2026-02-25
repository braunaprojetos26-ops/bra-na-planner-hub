ALTER TABLE public.critical_activity_assignments 
ADD CONSTRAINT critical_activity_assignments_activity_user_unique 
UNIQUE (activity_id, user_id);