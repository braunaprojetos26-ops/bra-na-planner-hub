-- Add first_payment_at column to contracts
ALTER TABLE public.contracts ADD COLUMN first_payment_at timestamptz DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.contracts.first_payment_at IS 'Date of the first payment in Vindi. Used as the real start date for planning contracts.';