-- Create enum for task types
CREATE TYPE public.task_type AS ENUM (
  'call',          -- Ligação
  'email',         -- E-mail
  'meeting',       -- Reunião
  'follow_up',     -- Follow-up
  'proposal',      -- Envio de proposta
  'document',      -- Envio de documento
  'whatsapp',      -- Mensagem WhatsApp
  'other'          -- Outro
);

-- Create enum for task status
CREATE TYPE public.task_status AS ENUM (
  'pending',       -- Pendente
  'completed',     -- Concluída
  'overdue'        -- Atrasada
);

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  task_type public.task_type NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status public.task_status NOT NULL DEFAULT 'pending',
  completed_at TIMESTAMP WITH TIME ZONE,
  reminder_sent_at TIMESTAMP WITH TIME ZONE,
  daily_reminder_sent_at DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can insert tasks"
ON public.tasks
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view tasks of accessible opportunities"
ON public.tasks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM opportunities o
    JOIN contacts c ON c.id = o.contact_id
    WHERE o.id = tasks.opportunity_id
    AND (
      (c.owner_id IS NULL AND can_view_unassigned_contacts(auth.uid()))
      OR (c.owner_id IS NOT NULL AND can_access_user(auth.uid(), c.owner_id))
    )
  )
);

CREATE POLICY "Users can update tasks of accessible opportunities"
ON public.tasks
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM opportunities o
    JOIN contacts c ON c.id = o.contact_id
    WHERE o.id = tasks.opportunity_id
    AND (
      (c.owner_id IS NULL AND can_view_unassigned_contacts(auth.uid()))
      OR (c.owner_id IS NOT NULL AND can_access_user(auth.uid(), c.owner_id))
    )
  )
);

CREATE POLICY "Users can delete their own tasks"
ON public.tasks
FOR DELETE
USING (created_by = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_tasks_opportunity_id ON public.tasks(opportunity_id);
CREATE INDEX idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX idx_tasks_scheduled_at ON public.tasks(scheduled_at);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_pending_reminders ON public.tasks(scheduled_at, status) WHERE status = 'pending';