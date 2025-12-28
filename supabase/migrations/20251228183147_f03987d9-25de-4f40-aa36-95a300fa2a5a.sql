-- Atualizar função is_operations_staff para incluir novos departamentos
CREATE OR REPLACE FUNCTION public.is_operations_staff(_user_id uuid, _department text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = _user_id
    AND (
      (_department = 'administrativo' AND p.position::text = 'operacoes_administrativo') OR
      (_department = 'investimentos' AND p.position::text = 'operacoes_investimentos') OR
      (_department = 'treinamentos' AND p.position::text = 'operacoes_treinamentos') OR
      (_department = 'recursos_humanos' AND p.position::text = 'operacoes_rh') OR
      (_department = 'marketing' AND p.position::text = 'operacoes_marketing') OR
      (_department = 'aquisicao_bens' AND p.position::text = 'operacoes_aquisicao_bens') OR
      (_department = 'patrimonial' AND p.position::text = 'operacoes_patrimonial')
    )
  )
$function$;

-- Atualizar função is_any_operations_staff para incluir novos cargos
CREATE OR REPLACE FUNCTION public.is_any_operations_staff(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = _user_id
    AND p.position::text IN (
      'operacoes_administrativo', 
      'operacoes_investimentos', 
      'operacoes_treinamentos', 
      'operacoes_rh',
      'operacoes_marketing',
      'operacoes_aquisicao_bens',
      'operacoes_patrimonial'
    )
  )
$function$;