-- Create table for prospection list
CREATE TABLE public.contact_prospection_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(contact_id, owner_id)
);

-- Enable RLS
ALTER TABLE public.contact_prospection_list ENABLE ROW LEVEL SECURITY;

-- Users can view their own prospection list
CREATE POLICY "Users can view own prospection list"
ON public.contact_prospection_list
FOR SELECT
USING (owner_id = auth.uid());

-- Users can insert into their own prospection list
CREATE POLICY "Users can insert into own prospection list"
ON public.contact_prospection_list
FOR INSERT
WITH CHECK (owner_id = auth.uid());

-- Users can delete from their own prospection list
CREATE POLICY "Users can delete from own prospection list"
ON public.contact_prospection_list
FOR DELETE
USING (owner_id = auth.uid());

-- Add index for faster queries
CREATE INDEX idx_prospection_list_owner ON public.contact_prospection_list(owner_id);
CREATE INDEX idx_prospection_list_contact ON public.contact_prospection_list(contact_id);