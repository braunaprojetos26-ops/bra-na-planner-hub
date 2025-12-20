-- Add columns for tracking reschedules
ALTER TABLE public.meetings 
ADD COLUMN parent_meeting_id UUID REFERENCES public.meetings(id),
ADD COLUMN reschedule_count INTEGER NOT NULL DEFAULT 0;

-- Create index for efficient queries on parent_meeting_id
CREATE INDEX idx_meetings_parent_meeting_id ON public.meetings(parent_meeting_id);

-- Add comment explaining the columns
COMMENT ON COLUMN public.meetings.parent_meeting_id IS 'Reference to the original meeting that was rescheduled';
COMMENT ON COLUMN public.meetings.reschedule_count IS 'Number of times this meeting chain has been rescheduled';