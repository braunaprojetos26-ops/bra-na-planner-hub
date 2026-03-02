
-- Simplify outlook_connections for client_credentials flow
-- No longer need per-user access_token/refresh_token
ALTER TABLE public.outlook_connections 
  ALTER COLUMN access_token DROP NOT NULL,
  ALTER COLUMN refresh_token DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS microsoft_email TEXT;

-- Set default microsoft_email from profiles
UPDATE public.outlook_connections oc
SET microsoft_email = p.email
FROM public.profiles p
WHERE p.user_id = oc.user_id AND oc.microsoft_email IS NULL;

-- Clear old tokens as they won't be used anymore
UPDATE public.outlook_connections 
SET access_token = NULL, refresh_token = NULL;
