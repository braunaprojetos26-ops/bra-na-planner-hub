-- Add topics column to leadership_meeting_templates
ALTER TABLE public.leadership_meeting_templates 
ADD COLUMN topics jsonb DEFAULT '[]'::jsonb;

-- Add topic_responses column to one_on_one_meetings
ALTER TABLE public.one_on_one_meetings 
ADD COLUMN topic_responses jsonb DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.leadership_meeting_templates.topics IS 'Array of structured topics: [{id, title, description, order_position}]';
COMMENT ON COLUMN public.one_on_one_meetings.topic_responses IS 'Object mapping topic_id to {completed: boolean, notes: string}';