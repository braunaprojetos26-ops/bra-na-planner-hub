-- Criar enum para posições/cargos comerciais
CREATE TYPE public.user_position AS ENUM (
  'planejador_financeiro',
  'planejador_prime', 
  'planejador_exclusive',
  'lider_comercial',
  'especialista',
  'especialista_private',
  'coordenador_comercial',
  'coordenador_executivo',
  'gerente_comercial'
);

-- Adicionar coluna de posição na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN position public.user_position;