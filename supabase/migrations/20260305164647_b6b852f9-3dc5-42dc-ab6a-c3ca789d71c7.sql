
-- Create cash_flow_category_type enum
CREATE TYPE public.cash_flow_category_type AS ENUM ('income', 'fixed_expense', 'variable_expense');

-- Create cash_flow_categories table
CREATE TABLE public.cash_flow_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type cash_flow_category_type NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  order_position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint on name+type
ALTER TABLE public.cash_flow_categories ADD CONSTRAINT cash_flow_categories_name_type_unique UNIQUE (name, type);

-- Enable RLS
ALTER TABLE public.cash_flow_categories ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read
CREATE POLICY "Authenticated users can read cash flow categories"
  ON public.cash_flow_categories FOR SELECT TO authenticated USING (true);

-- Only superadmins can manage
CREATE POLICY "Superadmins can manage cash flow categories"
  ON public.cash_flow_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));
