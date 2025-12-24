-- Create table to map funnels to product categories
CREATE TABLE public.funnel_product_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funnel_id UUID NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.product_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(funnel_id, category_id)
);

-- Enable RLS
ALTER TABLE public.funnel_product_categories ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view
CREATE POLICY "Authenticated users can view funnel categories"
ON public.funnel_product_categories
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Superadmin can manage
CREATE POLICY "Superadmin can manage funnel categories"
ON public.funnel_product_categories
FOR ALL
USING (has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

-- Populate the relationships based on funnel names and category names
-- VENDA - PLANEJAMENTO, PROSPECÇÃO - PLANEJAMENTO, MONTAGEM - PLANEJAMENTO → Planejamento Financeiro
INSERT INTO public.funnel_product_categories (funnel_id, category_id)
SELECT f.id, c.id
FROM public.funnels f, public.product_categories c
WHERE f.name ILIKE '%PLANEJAMENTO%' AND c.name ILIKE '%Planejamento%';

-- IMPLEMENTAÇÃO - SEGUROS → Seguros
INSERT INTO public.funnel_product_categories (funnel_id, category_id)
SELECT f.id, c.id
FROM public.funnels f, public.product_categories c
WHERE f.name ILIKE '%SEGUROS%' AND c.name ILIKE '%Seguro%';

-- IMPLEMENTAÇÃO - CRÉDITO → All credit-related categories
INSERT INTO public.funnel_product_categories (funnel_id, category_id)
SELECT f.id, c.id
FROM public.funnels f, public.product_categories c
WHERE f.name ILIKE '%CRÉDITO%' 
  AND (c.name ILIKE '%Consórcio%' 
    OR c.name ILIKE '%Home Equity%' 
    OR c.name ILIKE '%Financiamento%' 
    OR c.name ILIKE '%Carta%'
    OR c.name ILIKE '%Crédito%');