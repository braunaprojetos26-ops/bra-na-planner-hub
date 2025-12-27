-- Create tickets table
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  department TEXT NOT NULL CHECK (department IN ('investimentos', 'administrativo', 'treinamentos', 'recursos_humanos')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_by UUID NOT NULL,
  assigned_to UUID,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create ticket messages table
CREATE TABLE public.ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- Function to check if user is operations staff for a department (using text comparison)
CREATE OR REPLACE FUNCTION public.is_operations_staff(_user_id UUID, _department TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = _user_id
    AND (
      (_department = 'administrativo' AND p.position::text = 'operacoes_administrativo') OR
      (_department = 'investimentos' AND p.position::text = 'operacoes_investimentos') OR
      (_department = 'treinamentos' AND p.position::text = 'operacoes_treinamentos') OR
      (_department = 'recursos_humanos' AND p.position::text = 'operacoes_rh')
    )
  )
$$;

-- Function to check if user is any operations staff
CREATE OR REPLACE FUNCTION public.is_any_operations_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = _user_id
    AND p.position::text IN ('operacoes_administrativo', 'operacoes_investimentos', 'operacoes_treinamentos', 'operacoes_rh')
  )
$$;

-- Tickets RLS policies
CREATE POLICY "Users can view own tickets"
ON public.tickets FOR SELECT
USING (auth.uid() = created_by);

CREATE POLICY "Operations can view department tickets"
ON public.tickets FOR SELECT
USING (is_operations_staff(auth.uid(), department));

CREATE POLICY "Superadmin can view all tickets"
ON public.tickets FOR SELECT
USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Authenticated users can create tickets"
ON public.tickets FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = created_by);

CREATE POLICY "Operations can update department tickets"
ON public.tickets FOR UPDATE
USING (is_operations_staff(auth.uid(), department) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Superadmin can delete tickets"
ON public.tickets FOR DELETE
USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Ticket messages RLS policies
CREATE POLICY "Users can view messages of accessible tickets"
ON public.ticket_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_messages.ticket_id
    AND (t.created_by = auth.uid() OR is_operations_staff(auth.uid(), t.department) OR has_role(auth.uid(), 'superadmin'::app_role))
  )
);

CREATE POLICY "Users can add messages to accessible tickets"
ON public.ticket_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_messages.ticket_id
    AND (t.created_by = auth.uid() OR is_operations_staff(auth.uid(), t.department) OR has_role(auth.uid(), 'superadmin'::app_role))
  )
  AND auth.uid() = created_by
);

-- Trigger to update updated_at on tickets
CREATE TRIGGER update_tickets_updated_at
BEFORE UPDATE ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to notify ticket owner on new messages
CREATE OR REPLACE FUNCTION public.notify_ticket_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ticket_record RECORD;
BEGIN
  SELECT * INTO ticket_record FROM public.tickets WHERE id = NEW.ticket_id;
  
  IF NEW.created_by != ticket_record.created_by AND NOT NEW.is_internal THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      ticket_record.created_by,
      'Chamado atualizado',
      'Nova resposta no chamado: ' || ticket_record.title,
      'ticket_update',
      '/tickets?id=' || ticket_record.id::text
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_on_ticket_message
AFTER INSERT ON public.ticket_messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_ticket_update();

-- Function to notify on ticket status change
CREATE OR REPLACE FUNCTION public.notify_ticket_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  status_label TEXT;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    CASE NEW.status
      WHEN 'in_progress' THEN status_label := 'Em andamento';
      WHEN 'resolved' THEN status_label := 'Resolvido';
      WHEN 'closed' THEN status_label := 'Fechado';
      ELSE status_label := NEW.status;
    END CASE;
    
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      NEW.created_by,
      'Status do chamado alterado',
      'Seu chamado "' || NEW.title || '" está: ' || status_label,
      'ticket_update',
      '/tickets?id=' || NEW.id::text
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_on_ticket_status_change
AFTER UPDATE ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.notify_ticket_status_change();