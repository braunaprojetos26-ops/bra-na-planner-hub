-- Add auto_create_next column to funnels table
ALTER TABLE public.funnels 
ADD COLUMN auto_create_next boolean NOT NULL DEFAULT true;

-- Set IMPLEMENTAÇÃO - SEGUROS to not auto-create next funnel
UPDATE public.funnels 
SET auto_create_next = false 
WHERE name = 'IMPLEMENTAÇÃO - SEGUROS';