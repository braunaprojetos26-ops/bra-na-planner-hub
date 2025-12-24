-- Adicionar contract_id em client_plans para vincular ao contrato de origem
ALTER TABLE public.client_plans ADD COLUMN contract_id UUID REFERENCES public.contracts(id);

-- Adicionar contact_id em tasks para permitir tarefas vinculadas diretamente ao contato
ALTER TABLE public.tasks ADD COLUMN contact_id UUID REFERENCES public.contacts(id);

-- Tornar opportunity_id opcional em tasks (para tarefas de clientes de planejamento)
ALTER TABLE public.tasks ALTER COLUMN opportunity_id DROP NOT NULL;

-- Criar índice para performance
CREATE INDEX idx_tasks_contact_id ON public.tasks(contact_id);
CREATE INDEX idx_client_plans_contract_id ON public.client_plans(contract_id);

-- Atualizar RLS de tasks para considerar contact_id
DROP POLICY IF EXISTS "Users can view tasks of accessible opportunities" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks of accessible opportunities" ON public.tasks;

CREATE POLICY "Users can view tasks of accessible opportunities or contacts" 
ON public.tasks 
FOR SELECT 
USING (
  -- Via opportunity
  (opportunity_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM opportunities o
    JOIN contacts c ON c.id = o.contact_id
    WHERE o.id = tasks.opportunity_id 
    AND ((c.owner_id IS NULL AND can_view_unassigned_contacts(auth.uid())) 
         OR (c.owner_id IS NOT NULL AND can_access_user(auth.uid(), c.owner_id)))
  ))
  OR
  -- Via contact_id direto
  (contact_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM contacts c
    WHERE c.id = tasks.contact_id
    AND ((c.owner_id IS NULL AND can_view_unassigned_contacts(auth.uid())) 
         OR (c.owner_id IS NOT NULL AND can_access_user(auth.uid(), c.owner_id)))
  ))
);

CREATE POLICY "Users can update tasks of accessible opportunities or contacts" 
ON public.tasks 
FOR UPDATE 
USING (
  -- Via opportunity
  (opportunity_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM opportunities o
    JOIN contacts c ON c.id = o.contact_id
    WHERE o.id = tasks.opportunity_id 
    AND ((c.owner_id IS NULL AND can_view_unassigned_contacts(auth.uid())) 
         OR (c.owner_id IS NOT NULL AND can_access_user(auth.uid(), c.owner_id)))
  ))
  OR
  -- Via contact_id direto
  (contact_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM contacts c
    WHERE c.id = tasks.contact_id
    AND ((c.owner_id IS NULL AND can_view_unassigned_contacts(auth.uid())) 
         OR (c.owner_id IS NOT NULL AND can_access_user(auth.uid(), c.owner_id)))
  ))
);