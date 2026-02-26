

## Plano: Registrar Relacionamento em Atividades Críticas

### Contexto do problema
Tarefas de atividade crítica baseadas em regra agrupam múltiplos clientes em uma única task por planejador (ex: "Clientes: João, Maria, Pedro"). Isso impossibilita vincular um `contact_id` único. Para resolver, precisamos de duas abordagens:

1. **Tasks com cliente único** (inadimplência, health score, renovação): já criam uma task por cliente - basta preencher o `contact_id` na task
2. **Tasks com múltiplos clientes** (client_characteristic): atualmente agrupam - precisamos criar uma task **por cliente** em vez de por owner

### Mudanças

**1. Criar tabela `contact_interactions`**
Nova tabela para registrar os relacionamentos/comunicações com clientes:
- `id`, `contact_id` (FK contacts), `user_id` (quem registrou), `task_id` (FK tasks, opcional)
- `interaction_date` (data do contato), `channel` (enum: ligacao, whatsapp, email, reuniao_presencial, reuniao_online)
- `notes` (anotações), `created_at`
- RLS: usuário pode inserir/ver suas próprias interações + hierarquia

**2. Preencher `contact_id` nas tasks de atividade crítica**
- Edge functions `evaluate-perpetual-activities` e `evaluate-single-activity`: adicionar `contact_id` em todos os `INSERT INTO tasks`
- Para `client_characteristic`: mudar de agrupar por owner para criar **uma task por cliente** (igual às demais regras), incluindo o nome do cliente no título
- `distribute_critical_activity` (SQL function): sem mudança (não é baseada em regra/cliente)

**3. Componente `RegisterInteractionModal`**
Modal com:
- Data da interação (date picker, default hoje)
- Canal utilizado (select: Ligação, WhatsApp, E-mail, Reunião Presencial, Reunião Online)
- Anotações (textarea)
- Ao salvar: insere em `contact_interactions` E em `contact_history` (action: 'interaction_registered')

**4. Atualizar `TasksListPage.tsx` - menu de ações**
No dropdown de ações, para tasks que tenham `contact_id` preenchido:
- Adicionar opção **"Registrar Relacionamento"** com ícone
- Ao clicar, abre o `RegisterInteractionModal` passando `contact_id` e `task_id`
- Manter "Marcar como concluída" e "Excluir" existentes

**5. Exibir interações no histórico do contato**
As interações já vão aparecer no histórico do contato via `contact_history`. Adicionar ícone/formatação adequada para a action `interaction_registered`.

### Detalhes técnicos

**Tabela `contact_interactions`:**
```sql
CREATE TABLE contact_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id),
  user_id UUID NOT NULL REFERENCES profiles(user_id),
  task_id UUID REFERENCES tasks(id),
  interaction_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  channel TEXT NOT NULL CHECK (channel IN ('ligacao','whatsapp','email','reuniao_presencial','reuniao_online')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Modificação nas edge functions:**
- Inadimplência/Health Score/Renovação: adicionar `contact_id: contract.contact_id` (ou `score.contact_id`) no insert da task
- Client Characteristic: criar uma task por par owner+contact em vez de agrupar

### Etapas de implementação
1. Criar tabela `contact_interactions` com RLS
2. Atualizar edge functions para preencher `contact_id` nas tasks e criar uma task por cliente
3. Criar componente `RegisterInteractionModal`
4. Atualizar `TasksListPage.tsx` com a opção "Registrar Relacionamento"
5. Inserir registro em `contact_history` ao salvar interação

