-- Add new operation positions to enum (first migration)
ALTER TYPE public.user_position ADD VALUE IF NOT EXISTS 'operacoes_administrativo';
ALTER TYPE public.user_position ADD VALUE IF NOT EXISTS 'operacoes_investimentos';
ALTER TYPE public.user_position ADD VALUE IF NOT EXISTS 'operacoes_treinamentos';
ALTER TYPE public.user_position ADD VALUE IF NOT EXISTS 'operacoes_rh';