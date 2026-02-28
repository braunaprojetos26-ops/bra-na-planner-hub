
CREATE OR REPLACE FUNCTION public.delete_critical_activity(p_activity_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_title TEXT;
BEGIN
  SELECT title INTO v_title FROM critical_activities WHERE id = p_activity_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Activity not found';
  END IF;

  -- Delete contact_interactions referencing these tasks
  DELETE FROM contact_interactions ci
  WHERE ci.task_id IN (
    SELECT t.id FROM tasks t WHERE t.title LIKE '[Atividade Crítica] ' || v_title || '%'
  );

  -- Delete associated tasks
  DELETE FROM tasks t
  WHERE t.title LIKE '[Atividade Crítica] ' || v_title || '%';

  -- Delete assignments
  DELETE FROM critical_activity_assignments WHERE activity_id = p_activity_id;

  -- Delete the activity
  DELETE FROM critical_activities WHERE id = p_activity_id;
END;
$$;
