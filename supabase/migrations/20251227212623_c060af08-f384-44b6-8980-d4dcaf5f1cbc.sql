-- Add missing address fields to contacts for ClickSign contract
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS state text;

-- Add integration tracking columns to contracts
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS clicksign_document_key text,
ADD COLUMN IF NOT EXISTS clicksign_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS vindi_customer_id text,
ADD COLUMN IF NOT EXISTS vindi_bill_id text,
ADD COLUMN IF NOT EXISTS vindi_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS meeting_count integer,
ADD COLUMN IF NOT EXISTS plan_type text;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_contracts_clicksign_document_key ON public.contracts(clicksign_document_key);
CREATE INDEX IF NOT EXISTS idx_contracts_vindi_customer_id ON public.contracts(vindi_customer_id);