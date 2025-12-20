-- Criar tabela de reuniões
CREATE TABLE public.meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
  scheduled_by UUID NOT NULL REFERENCES public.profiles(user_id),
  meeting_type TEXT NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  participants TEXT[] DEFAULT '{}',
  allows_companion BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view meetings of accessible contacts"
ON public.meetings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM contacts c
    WHERE c.id = meetings.contact_id
    AND (
      (c.owner_id IS NULL AND can_view_unassigned_contacts(auth.uid()))
      OR (c.owner_id IS NOT NULL AND can_access_user(auth.uid(), c.owner_id))
    )
  )
);

CREATE POLICY "Authenticated users can insert meetings"
ON public.meetings
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update meetings of accessible contacts"
ON public.meetings
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM contacts c
    WHERE c.id = meetings.contact_id
    AND (
      (c.owner_id IS NULL AND can_view_unassigned_contacts(auth.uid()))
      OR (c.owner_id IS NOT NULL AND can_access_user(auth.uid(), c.owner_id))
    )
  )
);

CREATE POLICY "Users can delete meetings they scheduled"
ON public.meetings
FOR DELETE
USING (scheduled_by = auth.uid());

-- Trigger para updated_at
CREATE TRIGGER update_meetings_updated_at
BEFORE UPDATE ON public.meetings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();