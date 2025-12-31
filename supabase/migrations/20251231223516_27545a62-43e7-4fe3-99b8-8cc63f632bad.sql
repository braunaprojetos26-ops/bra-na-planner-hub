-- Alterar o default de is_active para false
ALTER TABLE public.profiles 
ALTER COLUMN is_active SET DEFAULT false;

-- Atualizar o trigger handle_new_user para criar com is_active=false e notificar superadmins
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  allowed_domains TEXT[] := ARRAY['@braunaplanejamento.com.br', '@braunacapital.com.br', '@braunainvestimentos.com.br'];
  email_lower TEXT;
  domain_allowed BOOLEAN := false;
  domain TEXT;
  admin_user RECORD;
  is_first_user BOOLEAN;
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

  -- Check if this is the first user
  is_first_user := (SELECT COUNT(*) FROM public.user_roles) = 0;

  -- Create profile - first user is auto-approved, others pending
  INSERT INTO public.profiles (user_id, full_name, email, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.email,
    is_first_user  -- true for first user, false for others
  );
  
  -- Assign role
  IF is_first_user THEN
    -- First user becomes superadmin and is auto-approved
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'superadmin');
  ELSE
    -- All other users start as planejador and need approval
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'planejador');
    
    -- Notify all superadmins about new user pending approval
    FOR admin_user IN 
      SELECT ur.user_id FROM public.user_roles ur 
      WHERE ur.role = 'superadmin'
    LOOP
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (
        admin_user.user_id,
        'Novo usuário aguardando aprovação',
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email) || ' solicitou acesso ao sistema.',
        'user_approval',
        '/admin/settings?tab=users'
      );
    END LOOP;
  END IF;
  
  -- Create hierarchy entry (no manager initially)
  INSERT INTO public.user_hierarchy (user_id, manager_user_id) VALUES (NEW.id, NULL);
  
  RETURN NEW;
END;
$$;