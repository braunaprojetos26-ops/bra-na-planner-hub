-- Add new columns to contacts table for expanded form

-- Basic fields (initial form)
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS profession text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.contacts(id);
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS qualification integer;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS temperature text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS notes text;

-- Expanded fields (Ver Mais section)
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS source_detail text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS rg text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS rg_issuer text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS rg_issue_date date;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS cpf text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS birth_date date;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS marital_status text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS zip_code text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS address_number text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS address_complement text;

-- Add constraints for qualification (1-5) and temperature (cold/warm/hot)
ALTER TABLE public.contacts ADD CONSTRAINT contacts_qualification_check CHECK (qualification IS NULL OR (qualification >= 1 AND qualification <= 5));
ALTER TABLE public.contacts ADD CONSTRAINT contacts_temperature_check CHECK (temperature IS NULL OR temperature IN ('cold', 'warm', 'hot'));