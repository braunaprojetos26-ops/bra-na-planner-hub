
-- Fix: Only mark critical_activity_assignment as completed when ALL tasks 
-- for that user + activity are completed (not just one)
CREATE OR REPLACE FUNCTION public.sync_critical_activity_assignment_status()
RETURNS TRIGGER AS $$
DECLARE
  v_activity_title TEXT;
  v_activity_id UUID;
  v_pending_count INTEGER;
BEGIN
  -- Only process tasks with the critical activity prefix
  IF NEW.title NOT LIKE '[Atividade Crítica]%' THEN
    RETURN NEW;
  END IF;

  -- Only process when status changes to completed
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    -- For each active critical activity this user is assigned to
    FOR v_activity_id, v_activity_title IN
      SELECT ca.id, ca.title
      FROM critical_activities ca
      JOIN critical_activity_assignments caa ON caa.activity_id = ca.id
      WHERE ca.is_active = true
        AND caa.user_id = NEW.assigned_to
        AND caa.status != 'completed'
        AND NEW.title LIKE '[Atividade Crítica] ' || ca.title || ' - %'
    LOOP
      -- Count remaining non-completed tasks for this user + activity
      SELECT count(*) INTO v_pending_count
      FROM tasks t
      WHERE t.title LIKE '[Atividade Crítica] ' || v_activity_title || ' - %'
        AND t.assigned_to = NEW.assigned_to
        AND t.status != 'completed'
        AND t.id != NEW.id;  -- Exclude the task being completed right now

      -- Only mark assignment as completed if ALL tasks are done
      IF v_pending_count = 0 THEN
        UPDATE critical_activity_assignments
        SET status = 'completed', completed_at = COALESCE(NEW.completed_at, now())
        WHERE activity_id = v_activity_id
          AND user_id = NEW.assigned_to
          AND status != 'completed';
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
