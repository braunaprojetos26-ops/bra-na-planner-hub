-- Normalize existing meeting themes to valid options

-- Fix case differences
UPDATE client_plan_meetings 
SET theme = 'Aquisição de Bens' 
WHERE LOWER(theme) = 'aquisição de bens';

-- Convert placeholder themes (Reunião X) to Acompanhamento as a temporary default
UPDATE client_plan_meetings 
SET theme = 'Acompanhamento' 
WHERE theme ~ '^Reunião \d+$';

-- Map common custom themes to valid options
UPDATE client_plan_meetings 
SET theme = 'Acompanhamento' 
WHERE theme IN ('Milhas e cartão de crédito', 'Milhas');

UPDATE client_plan_meetings 
SET theme = 'Investimentos' 
WHERE LOWER(theme) LIKE '%invest%';

UPDATE client_plan_meetings 
SET theme = 'Gestão de Riscos' 
WHERE LOWER(theme) LIKE '%seguro%' OR LOWER(theme) LIKE '%risco%';

UPDATE client_plan_meetings 
SET theme = 'Planejamento Macro' 
WHERE LOWER(theme) LIKE '%planejamento%' AND theme NOT IN (SELECT UNNEST(ARRAY['Montagem de Planejamento', 'Planejamento Macro']));

-- Any remaining non-standard themes get set to Acompanhamento
UPDATE client_plan_meetings 
SET theme = 'Acompanhamento' 
WHERE theme NOT IN (
  'Análise',
  'Gestão de Riscos',
  'Planejamento Macro',
  'Acompanhamento',
  'Independência Financeira',
  'Investimentos',
  'Renovação',
  'Fechamento',
  'Aquisição de Bens',
  'Montagem de Planejamento'
);