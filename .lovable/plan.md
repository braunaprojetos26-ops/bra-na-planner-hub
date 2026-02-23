

## Atividades Criticas - Sistema de Tarefas em Massa

### Resumo

Criar um modulo "Atividades Criticas" que permite superadministradores e gerentes criarem atividades/tarefas em massa para todos os usuarios (ou filtrados por cargo). Cada atividade tem prazo maximo, nivel de urgencia e acompanhamento de progresso (quantos receberam, finalizaram, % de conclusao).

---

### 1. Nova Tabela: `critical_activities`

Armazena a atividade critica criada pelo admin/gerente.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | PK |
| created_by | uuid | Quem criou |
| title | text | Titulo da atividade |
| description | text | Descricao detalhada |
| urgency | text | Nivel: 'low', 'medium', 'high', 'critical' |
| target_positions | jsonb | Array de cargos selecionados, ou null = todos |
| deadline | timestamptz | Data/hora maxima para conclusao |
| is_active | boolean | Se a atividade esta ativa |
| created_at | timestamptz | Data de criacao |
| updated_at | timestamptz | Data de atualizacao |

RLS: Leitura para todos autenticados (precisam ver atividades atribuidas a eles). Escrita apenas para superadmin e gerente.

### 2. Nova Tabela: `critical_activity_assignments`

Registra cada usuario que recebeu a atividade e seu status individual.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | PK |
| activity_id | uuid | FK para critical_activities |
| user_id | uuid | Usuario atribuido |
| status | text | 'pending', 'completed' |
| completed_at | timestamptz | Quando finalizou |
| created_at | timestamptz | Quando foi atribuido |

RLS: Usuarios veem suas proprias atribuicoes. Superadmin/gerente veem todas. Usuarios podem atualizar (marcar como concluido) suas proprias.

---

### 3. Nova Pagina: `/critical-activities`

Visivel no menu lateral para **todos os usuarios** (todos podem receber atividades criticas).

**Visao do usuario comum (planejador):**
- Lista de atividades criticas atribuidas a ele
- Status de cada uma (pendente/concluida)
- Indicador visual de urgencia e prazo restante
- Botao para marcar como concluida

**Visao do superadmin/gerente:**
- Tudo acima + aba de gerenciamento
- Botao "Nova Atividade Critica" com formulario:
  - Titulo, descricao
  - Nivel de urgencia (Baixa, Media, Alta, Critica)
  - Data maxima (deadline)
  - Seletor multi-cargo (checkboxes com todos os cargos do sistema, ou "Todos")
- Lista de todas atividades criadas com metricas resumidas
- Ao clicar em uma atividade, abre detalhe com:
  - Total de usuarios que receberam
  - Quantos ja finalizaram
  - Quantos faltam
  - Percentual de conclusao (barra de progresso)
  - Lista nominal dos usuarios com status individual

---

### 4. Logica de Distribuicao

Ao criar uma atividade critica:
1. O sistema busca todos os usuarios ativos (`profiles.is_active = true`) cujo cargo (`position`) esta na lista de `target_positions` (ou todos se nenhum cargo for selecionado)
2. Cria um registro em `critical_activity_assignments` para cada usuario encontrado
3. Isso e feito via database function (trigger ou funcao chamada pelo frontend) para garantir atomicidade

---

### 5. Menu Lateral

Adicionar item "Atividades Criticas" na secao "Principal" do sidebar, visivel para todos os usuarios, com icone AlertTriangle ou Zap.

---

### Detalhes Tecnicos

**Arquivos novos:**

1. `src/pages/CriticalActivities.tsx` - Pagina principal com duas visoes (usuario vs admin)
2. `src/hooks/useCriticalActivities.ts` - Hook com queries e mutations (criar atividade, listar, marcar como concluida, buscar detalhes com contagens)
3. `src/components/critical-activities/NewActivityModal.tsx` - Modal de criacao com seletor de cargos
4. `src/components/critical-activities/ActivityDetailModal.tsx` - Modal com progresso e lista de usuarios
5. `src/components/critical-activities/ActivityCard.tsx` - Card de atividade com urgencia visual e prazo

**Arquivos modificados:**

1. `src/components/layout/AppSidebar.tsx` - Novo item no menu
2. `src/App.tsx` - Nova rota `/critical-activities`

**Migracao SQL:**
- Criar tabelas `critical_activities` e `critical_activity_assignments`
- Criar funcao `distribute_critical_activity(activity_id uuid)` que popula os assignments com base nos cargos selecionados
- RLS para ambas tabelas

