
-- Update distribution function to also create real tasks for each user
CREATE OR REPLACE FUNCTION public.distribute_critical_activity(p_activity_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_positions jsonb;
  v_count integer;
  v_activity record;
  v_user record;
  v_task_type task_type := 'other';
BEGIN
  -- Get activity details
  SELECT * INTO v_activity
  FROM critical_activities WHERE id = p_activity_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Activity not found';
  END IF;

  -- Get target positions
  v_target_positions := v_activity.target_positions;

  -- For each matching active user, create assignment AND a task
  FOR v_user IN
    SELECT p.user_id
    FROM profiles p
    WHERE p.is_active = true
      AND (
        v_target_positions IS NULL
        OR v_target_positions = '[]'::jsonb
        OR p.position::text IN (SELECT jsonb_array_elements_text(v_target_positions))
      )
      AND NOT EXISTS (
        SELECT 1 FROM critical_activity_assignments caa
        WHERE caa.activity_id = p_activity_id AND caa.user_id = p.user_id
      )
  LOOP
    -- Create assignment record
    INSERT INTO critical_activity_assignments (activity_id, user_id)
    VALUES (p_activity_id, v_user.user_id);

    -- Create a real task for the user
    INSERT INTO tasks (
      created_by, assigned_to, title, description, task_type, scheduled_at, status
    ) VALUES (
      v_activity.created_by,
      v_user.user_id,
      '[Atividade Crítica] ' || v_activity.title,
      v_activity.description,
      v_task_type,
      v_activity.deadline,
      'pending'
    );
  END LOOP;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  -- v_count is from last statement; we need assignment count
  SELECT count(*) INTO v_count
  FROM critical_activity_assignments
  WHERE activity_id = p_activity_id;

  RETURN v_count;
END;
$$;
