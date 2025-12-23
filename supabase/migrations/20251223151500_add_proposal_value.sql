-- Add proposal_value column to opportunities table
ALTER TABLE public.opportunities ADD COLUMN proposal_value NUMERIC;

-- Update opportunity_history to accommodate entries with proposal values if necessary
-- For now, we will store the value in the opportunities table itself.
