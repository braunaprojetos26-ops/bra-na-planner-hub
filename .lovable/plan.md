

## Metas de Agendamento de Analise

### Resumo

Adicionar o tipo de tarefa "Agendamento de Analise" ao sistema. Quando um lider cria essa tarefa para um planejador, ela aparece tanto em "Tarefas da Equipe" quanto na pagina "Tarefas" do planejador. A tarefa e automaticamente concluida quando o planejador marca uma venda (won) em uma oportunidade do funil "PROSPECÇÃO - PLANEJAMENTO" que esteja na etapa "Reuniao Agendada".

### Alteracoes Necessarias

#### 1. Banco de dados - Adicionar novo valor ao enum `task_type`

Adicionar `scheduling_analysis` ao enum `task_type` existente via migracao SQL:

```text
ALTER TYPE task_type ADD VALUE 'scheduling_analysis';
```

#### 2. Frontend - Atualizar tipo e labels (`src/types/tasks.ts`)

- Adicionar `'scheduling_analysis'` ao type `TaskType`
- Adicionar label `'Agendamento de Analise'` no mapa `TASK_TYPE_LABELS`

#### 3. Auto-completar tarefa ao marcar venda (`src/hooks/useOpportunities.ts`)

No hook `useMarkOpportunityWon`, apos marcar a oportunidade como "won":

- Verificar se a oportunidade pertence ao funil "PROSPECÇÃO - PLANEJAMENTO" (id conhecido: `11111111-1111-1111-1111-111111111111`)
- Verificar se o `from_stage_id` corresponde a etapa "Reuniao Agendada" (id: `fa3c2495-6fe4-43f0-84d0-913105bbdbb7`)
- Se sim, buscar tarefas do tipo `scheduling_analysis` pendentes/atrasadas onde `assigned_to` = owner do contato da oportunidade
- Marcar a primeira tarefa pendente encontrada como `completed` com `completed_at = now()`
- Invalidar queries de tarefas (`team-tasks`, `all-user-tasks`, `team-task-stats`)

#### 4. Visibilidade na pagina Tarefas do planejador

Ja funciona automaticamente. O hook `useAllUserTasks` busca tarefas com `or(created_by.eq.userId, assigned_to.eq.userId)`. Como o lider cria a tarefa com `assigned_to` = planejador, ela ja aparece na pagina de Tarefas do planejador.

#### 5. Visibilidade em Tarefas da Equipe

Ja funciona automaticamente. O hook `useTeamTasks` busca tarefas com `created_by = user.id` e `assigned_to IN teamMemberIds`, que e exatamente o caso.

### Detalhes Tecnicos

**Fluxo completo:**

```text
Lider cria tarefa "Agendamento de Analise"
  -> assigned_to = planejador
  -> task_type = scheduling_analysis
  -> scheduled_at = data limite
  |
  v
Tarefa aparece em:
  - Tarefas da Equipe (para o lider)
  - Tarefas (para o planejador)
  |
  v
Planejador marca "Venda" em oportunidade
  do funil PROSPECÇÃO - PLANEJAMENTO
  na etapa "Reuniao Agendada"
  |
  v
Sistema auto-completa a tarefa
  de agendamento_analise pendente
  do planejador
```

**Arquivos modificados:**
- Migracao SQL (novo enum value)
- `src/types/tasks.ts` (novo tipo + label)
- `src/hooks/useOpportunities.ts` (logica de auto-complete no `useMarkOpportunityWon`)

**Nenhuma alteracao de RLS necessaria** - as policies existentes ja cobrem o fluxo (lider cria, planejador visualiza via `assigned_to`).

