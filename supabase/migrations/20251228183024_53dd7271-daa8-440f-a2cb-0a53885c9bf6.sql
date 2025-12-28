-- Adicionar novos valores ao enum user_position
ALTER TYPE public.user_position ADD VALUE IF NOT EXISTS 'operacoes_marketing';
ALTER TYPE public.user_position ADD VALUE IF NOT EXISTS 'operacoes_aquisicao_bens';
ALTER TYPE public.user_position ADD VALUE IF NOT EXISTS 'operacoes_patrimonial';