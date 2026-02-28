
CREATE OR REPLACE FUNCTION public.delete_critical_activity(p_activity_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Delete associated tasks (those with the [Atividade Crítica] prefix linked to this activity's assignments)
  DELETE FROM tasks t
  WHERE t.title LIKE '[Atividade Crítica]%'
    AND t.assigned_to IN (
      SELECT caa.user_id FROM critical_activity_assignments caa WHERE caa.activity_id = p_activity_id
    )
    AND t.created_by = (SELECT created_by FROM critical_activities WHERE id = p_activity_id)
    AND t.description IS NOT DISTINCT FROM (SELECT description FROM critical_activities WHERE id = p_activity_id);

  -- Delete assignments
  DELETE FROM critical_activity_assignments WHERE activity_id = p_activity_id;

  -- Delete the activity
  DELETE FROM critical_activities WHERE id = p_activity_id;
END;
$$;
