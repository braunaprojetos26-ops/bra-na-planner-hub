-- Create contract_cancellations table to store cancellation details
CREATE TABLE public.contract_cancellations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  cancelled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_by UUID NOT NULL REFERENCES public.profiles(user_id),
  reason_id UUID REFERENCES public.lost_reasons(id),
  reason_details TEXT,
  contract_month INTEGER,
  last_completed_meeting INTEGER,
  total_meetings_planned INTEGER,
  contract_value NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contract_cancellations ENABLE ROW LEVEL SECURITY;

-- RLS policies for contract_cancellations
CREATE POLICY "Users can view cancellations of accessible users"
ON public.contract_cancellations
FOR SELECT
USING (
  cancelled_by IN (SELECT public.get_accessible_user_ids(auth.uid()))
);

CREATE POLICY "Users can create cancellations"
ON public.contract_cancellations
FOR INSERT
WITH CHECK (
  cancelled_by = auth.uid()
);

CREATE POLICY "Superadmin can delete cancellations"
ON public.contract_cancellations
FOR DELETE
USING (
  public.has_role(auth.uid(), 'superadmin')
);

-- Add specific cancellation reasons to lost_reasons table
INSERT INTO public.lost_reasons (name, is_active) VALUES
  ('Insatisfação com o serviço', true),
  ('Mudança de situação financeira', true),
  ('Não viu valor no planejamento', true),
  ('Migração para outro profissional', true),
  ('Falta de tempo para reuniões', true),
  ('Expectativas não atendidas', true),
  ('Problemas de comunicação', true),
  ('Custo-benefício inadequado', true)
ON CONFLICT DO NOTHING;

-- Create index for performance
CREATE INDEX idx_contract_cancellations_contract_id ON public.contract_cancellations(contract_id);
CREATE INDEX idx_contract_cancellations_cancelled_at ON public.contract_cancellations(cancelled_at);
CREATE INDEX idx_contract_cancellations_cancelled_by ON public.contract_cancellations(cancelled_by);

-- Enable realtime for contract_cancellations
ALTER PUBLICATION supabase_realtime ADD TABLE public.contract_cancellations;