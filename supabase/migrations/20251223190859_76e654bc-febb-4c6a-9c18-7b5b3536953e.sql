-- Add proposal_value column to opportunities table
ALTER TABLE public.opportunities 
ADD COLUMN proposal_value numeric NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.opportunities.proposal_value IS 'Valor da proposta financeira - obrigatório para etapas a partir de Proposta Feita no funil VENDA - PLANEJAMENTO';