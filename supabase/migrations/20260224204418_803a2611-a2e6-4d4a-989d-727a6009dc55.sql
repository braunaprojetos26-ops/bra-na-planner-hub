
CREATE OR REPLACE FUNCTION public.generate_client_code()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.client_code := 'C' || LPAD(nextval('public.contact_client_code_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$function$;
