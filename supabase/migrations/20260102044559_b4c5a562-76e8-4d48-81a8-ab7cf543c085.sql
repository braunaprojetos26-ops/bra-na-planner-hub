-- Adicionar novos campos à tabela planner_goals para suportar sistema híbrido

-- Categoria do objetivo: 'numeric' para metas de negócio, 'development' para capacitação
ALTER TABLE planner_goals ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'development';

-- Tipo específico para objetivos numéricos (planejamento, pa_seguros, pbs, captacao_investimentos)
ALTER TABLE planner_goals ADD COLUMN IF NOT EXISTS metric_type TEXT;

-- Valor alvo (meta numérica)
ALTER TABLE planner_goals ADD COLUMN IF NOT EXISTS target_value NUMERIC;

-- Valor atual (progresso)
ALTER TABLE planner_goals ADD COLUMN IF NOT EXISTS current_value NUMERIC DEFAULT 0;

-- Referência do período (ex: '2026-01' para mês, '2026-Q1' para trimestre)
ALTER TABLE planner_goals ADD COLUMN IF NOT EXISTS period_reference TEXT;

-- Tipo de período (mensal, trimestral, semestral, anual)
ALTER TABLE planner_goals ADD COLUMN IF NOT EXISTS period_type TEXT;

-- Adicionar constraint para validar category
ALTER TABLE planner_goals ADD CONSTRAINT check_category 
  CHECK (category IN ('numeric', 'development'));

-- Adicionar constraint para validar metric_type quando category é 'numeric'
ALTER TABLE planner_goals ADD CONSTRAINT check_metric_type 
  CHECK (category = 'development' OR metric_type IN ('planejamento', 'pa_seguros', 'pbs', 'captacao_investimentos'));

-- Adicionar constraint para validar period_type
ALTER TABLE planner_goals ADD CONSTRAINT check_period_type 
  CHECK (period_type IS NULL OR period_type IN ('mensal', 'trimestral', 'semestral', 'anual'));