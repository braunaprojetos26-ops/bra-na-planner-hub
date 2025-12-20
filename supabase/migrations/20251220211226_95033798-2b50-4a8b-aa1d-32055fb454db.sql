-- Adicionar coluna client_code na tabela contacts
ALTER TABLE public.contacts ADD COLUMN client_code TEXT UNIQUE;

-- Criar função para gerar código sequencial
CREATE OR REPLACE FUNCTION public.generate_client_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  next_number INT;
BEGIN
  -- Pega o próximo número baseado no maior existente
  SELECT COALESCE(MAX(CAST(SUBSTRING(client_code FROM 2) AS INT)), 0) + 1
  INTO next_number
  FROM public.contacts
  WHERE client_code IS NOT NULL AND client_code ~ '^C[0-9]+$';
  
  -- Gera código com 2 dígitos mínimos (C01, C02... C99, C100...)
  NEW.client_code := 'C' || LPAD(next_number::TEXT, 2, '0');
  RETURN NEW;
END;
$$;

-- Criar trigger para novos contatos
CREATE TRIGGER set_client_code
BEFORE INSERT ON public.contacts
FOR EACH ROW
WHEN (NEW.client_code IS NULL)
EXECUTE FUNCTION public.generate_client_code();

-- Atualizar contatos existentes com códigos sequenciais baseados na ordem de criação
WITH numbered_contacts AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as rn
  FROM public.contacts
  WHERE client_code IS NULL
)
UPDATE public.contacts c
SET client_code = 'C' || LPAD(nc.rn::TEXT, 2, '0')
FROM numbered_contacts nc
WHERE c.id = nc.id;