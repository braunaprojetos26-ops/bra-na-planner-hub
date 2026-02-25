-- Trigger: when a task with '[Atividade Crítica]' prefix is completed,
-- update the corresponding critical_activity_assignments record
CREATE OR REPLACE FUNCTION public.sync_critical_activity_assignment_status()
RETURNS TRIGGER AS $$
DECLARE
  v_activity_id UUID;
BEGIN
  -- Only process tasks with the critical activity prefix
  IF NEW.title NOT LIKE '[Atividade Crítica]%' THEN
    RETURN NEW;
  END IF;

  -- Only process when status changes to completed
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    -- Find the assignment for this user
    UPDATE critical_activity_assignments
    SET status = 'completed', completed_at = COALESCE(NEW.completed_at, now())
    WHERE user_id = NEW.assigned_to
      AND status != 'completed'
      AND activity_id IN (
        SELECT ca.id FROM critical_activities ca WHERE ca.is_active = true
      );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_sync_critical_assignment_on_task_complete
AFTER UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.sync_critical_activity_assignment_status();