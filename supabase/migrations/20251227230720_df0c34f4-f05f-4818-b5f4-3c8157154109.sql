-- Add vindi_subscription_id to contracts table for subscription-based billing
ALTER TABLE public.contracts 
ADD COLUMN vindi_subscription_id text NULL;

-- Add billing_type column to distinguish between subscription and one-time billing
ALTER TABLE public.contracts 
ADD COLUMN billing_type text NULL DEFAULT 'fatura_avulsa';

-- Add billing_date column for the billing/charge date
ALTER TABLE public.contracts 
ADD COLUMN billing_date date NULL;

-- Add payment_method_code column to store the exact Vindi payment method
ALTER TABLE public.contracts 
ADD COLUMN payment_method_code text NULL;