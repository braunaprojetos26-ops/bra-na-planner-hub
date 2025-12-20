-- Update handle_new_user function to validate email domain
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  allowed_domains TEXT[] := ARRAY['@braunaplanejamento.com.br', '@braunacapital.com.br', '@braunainvestimentos.com.br'];
  email_lower TEXT;
  domain_allowed BOOLEAN := false;
  domain TEXT;
BEGIN
  email_lower := lower(NEW.email);
  
  -- Check if email ends with any allowed domain
  FOREACH domain IN ARRAY allowed_domains LOOP
    IF email_lower LIKE '%' || domain THEN
      domain_allowed := true;
      EXIT;
    END IF;
  END LOOP;
  
  IF NOT domain_allowed THEN
    RAISE EXCEPTION 'Email domain not allowed. Only @braunaplanejamento.com.br, @braunacapital.com.br or @braunainvestimentos.com.br are permitted.';
  END IF;

  -- Create profile
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.email
  );
  
  -- Assign default role (planejador) - first user becomes superadmin
  IF (SELECT COUNT(*) FROM public.user_roles) = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'superadmin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'planejador');
  END IF;
  
  -- Create hierarchy entry (no manager initially)
  INSERT INTO public.user_hierarchy (user_id, manager_user_id) VALUES (NEW.id, NULL);
  
  RETURN NEW;
END;
$$;