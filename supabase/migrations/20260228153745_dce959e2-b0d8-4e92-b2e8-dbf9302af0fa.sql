
CREATE OR REPLACE FUNCTION public.delete_critical_activity(p_activity_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_title TEXT;
BEGIN
  -- Get the activity title for matching tasks
  SELECT title INTO v_title FROM critical_activities WHERE id = p_activity_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Activity not found';
  END IF;

  -- Delete associated tasks matching by title pattern (covers both direct and rule-based tasks)
  DELETE FROM tasks t
  WHERE t.title LIKE '[Atividade Crítica] ' || v_title || '%';

  -- Delete assignments
  DELETE FROM critical_activity_assignments WHERE activity_id = p_activity_id;

  -- Delete the activity
  DELETE FROM critical_activities WHERE id = p_activity_id;
END;
$$;
