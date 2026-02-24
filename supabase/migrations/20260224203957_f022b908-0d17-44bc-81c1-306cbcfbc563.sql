
-- Reset sequence to safe value (well ahead of existing codes)
SELECT setval('public.contact_client_code_seq', GREATEST(
  (SELECT MAX(NULLIF(regexp_replace(client_code, '[^0-9]', '', 'g'), '')::bigint) FROM contacts WHERE client_code IS NOT NULL),
  612
) + 1);

-- Update trigger to use 4-digit padding to avoid future issues
CREATE OR REPLACE FUNCTION public.generate_client_code()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.client_code := 'C' || LPAD(nextval('public.contact_client_code_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$function$;
