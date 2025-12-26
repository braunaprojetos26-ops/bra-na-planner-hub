-- Create table to track renewal opportunities created (avoid duplicates)
CREATE TABLE public.renewal_opportunities_created (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_plan_id UUID NOT NULL REFERENCES public.client_plans(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_plan_id)
);

-- Enable RLS
ALTER TABLE public.renewal_opportunities_created ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view renewal tracking"
ON public.renewal_opportunities_created
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can insert renewal tracking"
ON public.renewal_opportunities_created
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Create notifications table for in-app notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can delete own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);

-- Insert the RENOVAÇÃO - PLANEJAMENTO funnel
INSERT INTO public.funnels (name, order_position, generates_contract, auto_create_next, is_active)
VALUES ('RENOVAÇÃO - PLANEJAMENTO', 10, true, false, true);

-- Insert stages for the renewal funnel
WITH new_funnel AS (
  SELECT id FROM public.funnels WHERE name = 'RENOVAÇÃO - PLANEJAMENTO' LIMIT 1
)
INSERT INTO public.funnel_stages (funnel_id, name, order_position, color)
SELECT 
  new_funnel.id,
  stage.name,
  stage.order_position,
  stage.color
FROM new_funnel, (VALUES
  ('Oportunidade de Renovação', 1, 'blue'),
  ('Material Feito', 2, 'cyan'),
  ('Reunião Feita', 3, 'teal'),
  ('Proposta Feita', 4, 'yellow'),
  ('Elaboração do Contrato', 5, 'orange'),
  ('Assinatura Contrato', 6, 'purple'),
  ('Pagamento', 7, 'pink'),
  ('Renovação Paga', 8, 'green')
) AS stage(name, order_position, color);