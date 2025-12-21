-- Categorias de Produtos (Admin configura)
CREATE TABLE public.product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  order_position INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Produtos (Admin configura)
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  partner_name TEXT,
  base_value NUMERIC,
  pb_calculation_type TEXT NOT NULL DEFAULT 'percentage',
  pb_value NUMERIC NOT NULL DEFAULT 0,
  custom_fields JSONB NOT NULL DEFAULT '[]',
  has_validity BOOLEAN NOT NULL DEFAULT false,
  requires_payment_type BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  order_position INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Adicionar colunas à tabela funnels existente
ALTER TABLE public.funnels 
ADD COLUMN generates_contract BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN contract_prompt_text TEXT;

-- Produtos sugeridos por funil
CREATE TABLE public.funnel_suggested_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id UUID NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  is_default BOOLEAN NOT NULL DEFAULT false,
  order_position INTEGER NOT NULL DEFAULT 0,
  UNIQUE(funnel_id, product_id)
);

-- Contratos Reportados
CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE RESTRICT,
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  contract_value NUMERIC NOT NULL,
  payment_type TEXT,
  installments INTEGER,
  installment_value NUMERIC,
  custom_data JSONB NOT NULL DEFAULT '{}',
  calculated_pbs NUMERIC NOT NULL,
  start_date DATE,
  end_date DATE,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_suggested_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- RLS para product_categories
CREATE POLICY "Authenticated users can view active categories"
ON public.product_categories FOR SELECT
USING (auth.uid() IS NOT NULL AND is_active = true);

CREATE POLICY "Superadmin can manage categories"
ON public.product_categories FOR ALL
USING (has_role(auth.uid(), 'superadmin'))
WITH CHECK (has_role(auth.uid(), 'superadmin'));

-- RLS para products
CREATE POLICY "Authenticated users can view active products"
ON public.products FOR SELECT
USING (auth.uid() IS NOT NULL AND is_active = true);

CREATE POLICY "Superadmin can manage products"
ON public.products FOR ALL
USING (has_role(auth.uid(), 'superadmin'))
WITH CHECK (has_role(auth.uid(), 'superadmin'));

-- RLS para funnel_suggested_products
CREATE POLICY "Authenticated users can view funnel products"
ON public.funnel_suggested_products FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Superadmin can manage funnel products"
ON public.funnel_suggested_products FOR ALL
USING (has_role(auth.uid(), 'superadmin'))
WITH CHECK (has_role(auth.uid(), 'superadmin'));

-- RLS para contracts
CREATE POLICY "Users can view contracts of accessible contacts"
ON public.contracts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.contacts c
    WHERE c.id = contracts.contact_id
    AND (
      (c.owner_id IS NULL AND can_view_unassigned_contacts(auth.uid()))
      OR (c.owner_id IS NOT NULL AND can_access_user(auth.uid(), c.owner_id))
    )
  )
);

CREATE POLICY "Authenticated users can insert contracts"
ON public.contracts FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update contracts of accessible contacts"
ON public.contracts FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.contacts c
    WHERE c.id = contracts.contact_id
    AND (
      (c.owner_id IS NULL AND can_view_unassigned_contacts(auth.uid()))
      OR (c.owner_id IS NOT NULL AND can_access_user(auth.uid(), c.owner_id))
    )
  )
);

CREATE POLICY "Superadmin can delete contracts"
ON public.contracts FOR DELETE
USING (has_role(auth.uid(), 'superadmin'));

-- Triggers para updated_at
CREATE TRIGGER update_product_categories_updated_at
BEFORE UPDATE ON public.product_categories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at
BEFORE UPDATE ON public.contracts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();