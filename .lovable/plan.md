

## Plano: Dashboard de Métricas de Atividades Críticas

### Dados disponíveis para métricas
- `critical_activities`: título, urgency, rule_type, created_at, is_perpetual
- `critical_activity_assignments`: activity_id, user_id, status, completed_at, created_at
- `contact_interactions`: channel, user_id, task_id, interaction_date, created_at
- `tasks` (com título `[Atividade Crítica]`): assigned_to, contact_id, status, completed_at, created_at, scheduled_at
- `user_hierarchy`: user_id, manager_user_id (para agrupar por equipe)
- `profiles`: full_name, position

### Componentes a criar

**1. Página/Tab de Métricas** (`src/components/critical-activities/CriticalActivitiesMetrics.tsx`)
- Adicionar aba "Métricas" na página `CriticalActivities.tsx` usando Tabs (lista de atividades | métricas)
- Filtros globais: período (meses), tipo de atividade (rule_type/urgency), planejador, equipe

**2. Hook de dados** (`src/hooks/useCriticalActivityMetrics.ts`)
- Query que busca:
  - Tasks com prefixo `[Atividade Crítica]` + assignments + interactions
  - Profiles e hierarquia para agrupamento por equipe
- Processa métricas no client-side com os filtros aplicados

**3. Gráficos (usando recharts, já instalado)**

- **Atividades Criadas vs Atuadas por mês** (BarChart agrupado)
  - Barras: criadas (assignments.created_at) vs atuadas (interactions ou completed)
  - Filtro por rule_type

- **Tempo médio de atuação** (LineChart)
  - Diferença entre `created_at` da task/assignment e `interaction_date` da primeira interação
  - Linha por mês, com filtro de tipo e planejador/equipe

- **Ranking de planejadores que mais atuaram** (BarChart horizontal)
  - Contagem de `contact_interactions` por user_id
  
- **Ranking de planejadores com mais atividades em aberto** (BarChart horizontal)
  - Contagem de assignments com status != 'completed' por user_id

- **Ranking por equipe** (BarChart horizontal)
  - Agrupa planejadores por manager (hierarquia) e soma atuações/pendências

**4. Componentes de gráfico individuais**
- `MetricsActivityOverTime.tsx` — barras criadas vs atuadas
- `MetricsAvgResponseTime.tsx` — linha tempo médio
- `MetricsTopPlanners.tsx` — ranking atuação
- `MetricsOpenActivities.tsx` — ranking pendências
- `MetricsTeamPerformance.tsx` — ranking equipes

### Alterações em arquivos existentes
- `CriticalActivities.tsx`: adicionar Tabs para alternar entre "Atividades" e "Métricas"

### Etapas
1. Criar hook `useCriticalActivityMetrics` com queries e processamento de dados
2. Criar os 5 componentes de gráfico
3. Criar componente container `CriticalActivitiesMetrics` com filtros + grid de gráficos
4. Atualizar `CriticalActivities.tsx` com sistema de abas

