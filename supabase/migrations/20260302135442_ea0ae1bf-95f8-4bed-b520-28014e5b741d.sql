-- Add plan_meeting_id to contact_interactions for linking to client meeting cycle
ALTER TABLE public.contact_interactions
ADD COLUMN plan_meeting_id UUID REFERENCES public.client_plan_meetings(id);

-- Index for lookups
CREATE INDEX idx_contact_interactions_plan_meeting_id ON public.contact_interactions(plan_meeting_id) WHERE plan_meeting_id IS NOT NULL;