-- Criar sequence para geração de client_code (começando do próximo disponível: 7)
CREATE SEQUENCE IF NOT EXISTS public.contact_client_code_seq START WITH 7;

-- Atualizar a função para usar a sequence (thread-safe)
CREATE OR REPLACE FUNCTION public.generate_client_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- Usa NEXTVAL que é thread-safe e garante unicidade
  NEW.client_code := 'C' || LPAD(nextval('public.contact_client_code_seq')::TEXT, 2, '0');
  RETURN NEW;
END;
$function$;