
-- Table for configurable pre-qualification questions (admin)
CREATE TABLE public.pre_qualification_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  key TEXT NOT NULL UNIQUE,
  field_type TEXT NOT NULL DEFAULT 'textarea',
  options JSONB DEFAULT '{}',
  placeholder TEXT,
  is_required BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  order_position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table for pre-qualification responses from contacts
CREATE TABLE public.pre_qualification_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE SET NULL,
  token TEXT UNIQUE NOT NULL,
  responses JSONB DEFAULT '{}',
  submitted_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  viewed_by UUID REFERENCES public.profiles(user_id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pre_qualification_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_qualification_responses ENABLE ROW LEVEL SECURITY;

-- RLS for pre_qualification_questions
-- Public can read active questions (for the public form)
CREATE POLICY "Anyone can view active questions"
ON public.pre_qualification_questions
FOR SELECT
USING (is_active = true);

-- Superadmin can manage all questions
CREATE POLICY "Superadmin can manage questions"
ON public.pre_qualification_questions
FOR ALL
USING (has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

-- RLS for pre_qualification_responses
-- Public can read/update their own response via token (for the public form)
CREATE POLICY "Anyone can read response by token"
ON public.pre_qualification_responses
FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert response"
ON public.pre_qualification_responses
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update response by token"
ON public.pre_qualification_responses
FOR UPDATE
USING (true);

-- Authenticated users can view responses of accessible contacts
CREATE POLICY "Users can view responses of accessible contacts"
ON public.pre_qualification_responses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.contacts c
    WHERE c.id = pre_qualification_responses.contact_id
    AND (
      (c.owner_id IS NULL AND can_view_unassigned_contacts(auth.uid()))
      OR (c.owner_id IS NOT NULL AND can_access_user(auth.uid(), c.owner_id))
    )
  )
);

-- Superadmin can delete responses
CREATE POLICY "Superadmin can delete responses"
ON public.pre_qualification_responses
FOR DELETE
USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_pre_qualification_questions_updated_at
BEFORE UPDATE ON public.pre_qualification_questions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pre_qualification_responses_updated_at
BEFORE UPDATE ON public.pre_qualification_responses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to notify planner when form is submitted
CREATE OR REPLACE FUNCTION public.notify_pre_qualification_submitted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  contact_record RECORD;
  owner_id UUID;
BEGIN
  -- Only trigger when submitted_at changes from NULL to a value
  IF OLD.submitted_at IS NULL AND NEW.submitted_at IS NOT NULL THEN
    -- Get contact info and owner
    SELECT c.full_name, c.owner_id INTO contact_record
    FROM public.contacts c
    WHERE c.id = NEW.contact_id;
    
    owner_id := contact_record.owner_id;
    
    -- If contact has an owner, notify them
    IF owner_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (
        owner_id,
        'Formulário de pré-qualificação respondido',
        contact_record.full_name || ' respondeu o formulário de pré-qualificação.',
        'pre_qualification',
        '/contacts/' || NEW.contact_id::text || '/analise'
      );
    END IF;
    
    -- Add to contact history
    INSERT INTO public.contact_history (contact_id, changed_by, action, notes)
    VALUES (
      NEW.contact_id,
      COALESCE(owner_id, '00000000-0000-0000-0000-000000000000'::uuid),
      'pre_qualification_submitted',
      'Formulário de pré-qualificação respondido pelo contato'
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for notification
CREATE TRIGGER on_pre_qualification_submitted
AFTER UPDATE ON public.pre_qualification_responses
FOR EACH ROW
EXECUTE FUNCTION public.notify_pre_qualification_submitted();
