CREATE TABLE public.rd_product_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rd_product_name TEXT NOT NULL UNIQUE,
  local_product_id UUID NOT NULL REFERENCES public.products(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rd_product_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin manages rd_product_mappings"
ON public.rd_product_mappings FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'))
WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Authenticated can view rd_product_mappings"
ON public.rd_product_mappings FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);