
-- Table to track async import jobs from RD CRM
CREATE TABLE public.import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL,
  rd_user_id TEXT NOT NULL,
  import_type TEXT NOT NULL DEFAULT 'contacts', -- 'contacts' or 'deals'
  owner_user_id UUID,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | fetching_deals | fetching_contacts | importing | done | error
  deals_found INT DEFAULT 0,
  contacts_found INT DEFAULT 0,
  contacts_imported INT DEFAULT 0,
  contacts_skipped INT DEFAULT 0,
  contacts_errors INT DEFAULT 0,
  error_details JSONB DEFAULT '[]'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view their own jobs
CREATE POLICY "Users can view their own import jobs"
ON public.import_jobs FOR SELECT
USING (auth.uid() = created_by);

-- Authenticated users can create jobs
CREATE POLICY "Users can create import jobs"
ON public.import_jobs FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Service role can update jobs (the worker edge function uses service role)
CREATE POLICY "Service role can update import jobs"
ON public.import_jobs FOR UPDATE
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_import_jobs_updated_at
BEFORE UPDATE ON public.import_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
