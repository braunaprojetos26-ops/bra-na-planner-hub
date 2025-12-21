-- Create meeting_minutes table for storing generated meeting minutes
CREATE TABLE public.meeting_minutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE SET NULL,
  meeting_type TEXT NOT NULL,
  meeting_date TIMESTAMPTZ NOT NULL,
  content TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meeting_minutes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies based on contact access
CREATE POLICY "Users can view minutes of accessible contacts"
ON public.meeting_minutes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.contacts c
    WHERE c.id = meeting_minutes.contact_id
    AND (
      (c.owner_id IS NULL AND can_view_unassigned_contacts(auth.uid()))
      OR (c.owner_id IS NOT NULL AND can_access_user(auth.uid(), c.owner_id))
    )
  )
);

CREATE POLICY "Authenticated users can insert minutes"
ON public.meeting_minutes
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update minutes of accessible contacts"
ON public.meeting_minutes
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.contacts c
    WHERE c.id = meeting_minutes.contact_id
    AND (
      (c.owner_id IS NULL AND can_view_unassigned_contacts(auth.uid()))
      OR (c.owner_id IS NOT NULL AND can_access_user(auth.uid(), c.owner_id))
    )
  )
);

CREATE POLICY "Users can delete their own minutes"
ON public.meeting_minutes
FOR DELETE
USING (created_by = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER update_meeting_minutes_updated_at
BEFORE UPDATE ON public.meeting_minutes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_meeting_minutes_contact_id ON public.meeting_minutes(contact_id);
CREATE INDEX idx_meeting_minutes_meeting_date ON public.meeting_minutes(meeting_date DESC);