-- Remover o constraint antigo
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_department_check;

-- Criar o novo constraint com todos os departamentos
ALTER TABLE tickets ADD CONSTRAINT tickets_department_check 
CHECK (department = ANY (ARRAY[
  'investimentos'::text, 
  'administrativo'::text, 
  'treinamentos'::text, 
  'recursos_humanos'::text,
  'marketing'::text,
  'aquisicao_bens'::text,
  'patrimonial'::text
]));