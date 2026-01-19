-- Create function to sync meeting status to linked client_plan_meetings
CREATE OR REPLACE FUNCTION public.sync_plan_meeting_status()
RETURNS TRIGGER AS $$
BEGIN
  -- When a meeting is marked as completed, update linked client_plan_meetings
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    UPDATE public.client_plan_meetings
    SET 
      status = 'completed',
      completed_at = NOW(),
      updated_at = NOW()
    WHERE meeting_id = NEW.id;
  END IF;
  
  -- When a meeting is unmarked from completed (e.g., cancelled or rescheduled), revert plan meeting
  IF OLD.status = 'completed' AND NEW.status != 'completed' THEN
    UPDATE public.client_plan_meetings
    SET 
      status = 'pending',
      completed_at = NULL,
      updated_at = NOW()
    WHERE meeting_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on meetings table
CREATE TRIGGER trigger_sync_plan_meeting_status
AFTER UPDATE OF status ON public.meetings
FOR EACH ROW
EXECUTE FUNCTION public.sync_plan_meeting_status();

-- Fix existing inconsistent data: sync meetings already completed but not reflected in client_plan_meetings
UPDATE public.client_plan_meetings cpm
SET 
  status = 'completed',
  completed_at = NOW(),
  updated_at = NOW()
FROM public.meetings m
WHERE cpm.meeting_id = m.id
  AND m.status = 'completed'
  AND cpm.status != 'completed';