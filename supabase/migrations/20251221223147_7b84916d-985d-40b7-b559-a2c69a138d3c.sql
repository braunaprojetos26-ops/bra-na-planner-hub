-- Add new columns for flexible PB formula system
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS pb_formula TEXT,
ADD COLUMN IF NOT EXISTS pb_variables JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS pb_constants JSONB DEFAULT '{}'::jsonb;

-- Add comment to explain the columns
COMMENT ON COLUMN public.products.pb_formula IS 'Mathematical formula for calculating PBs using variables and constants';
COMMENT ON COLUMN public.products.pb_variables IS 'Array of variable keys that the planner fills in the contract modal';
COMMENT ON COLUMN public.products.pb_constants IS 'Object with constant values configured by admin (e.g., {"comissao_pct": 0.6})';