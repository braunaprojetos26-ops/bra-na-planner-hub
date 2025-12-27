-- Add contact_id column to tickets table
ALTER TABLE public.tickets 
ADD COLUMN contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL;