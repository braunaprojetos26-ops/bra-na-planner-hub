-- Add selected_topics column to proposals table for Planejamento Pontual
ALTER TABLE public.proposals 
ADD COLUMN selected_topics jsonb DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.proposals.selected_topics IS 'Array of selected topics for Pontual proposals: [{topic: string, meetings: number}]';