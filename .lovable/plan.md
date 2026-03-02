

## Plano: Vincular Relacionamento ao Ciclo de Reuniões do Cliente

### Contexto
O modal `RegisterInteractionModal` registra interações com clientes. Quando o canal selecionado for "reunião presencial" ou "reunião online", queremos mostrar uma seção opcional para vincular essa interação a uma das reuniões pendentes do ciclo do cliente (tabela `client_plan_meetings`), marcando-a como concluída.

### Estrutura de Dados Existente
- `client_plans` → plano do cliente com `contact_id` e `total_meetings`
- `client_plan_meetings` → reuniões individuais do ciclo com `meeting_number`, `status`, `scheduled_date`
- O modal já recebe `contactId`, que pode ser usado para buscar o plano ativo e suas reuniões pendentes

### Alterações

**1. Atualizar `RegisterInteractionModal.tsx`**
- Quando `channel` for `reuniao_presencial` ou `reuniao_online`:
  - Buscar o plano ativo do contato (`client_plans` com `status = 'active'`)
  - Buscar as reuniões pendentes desse plano (`client_plan_meetings` com `status != 'completed'`)
  - Exibir um toggle/checkbox: "Deseja vincular esse relacionamento ao ciclo de reuniões do cliente?"
  - Se ativado, mostrar um Select com as reuniões pendentes (ex: "Reunião 3 - 15/04/2026")
- No submit, se uma reunião do ciclo foi selecionada:
  - Marcar essa `client_plan_meeting` como `completed` (status + completed_at)
  - Salvar o `plan_meeting_id` na interação para rastreabilidade

**2. Migração de Banco de Dados**
- Adicionar coluna `plan_meeting_id` (uuid, nullable, FK para `client_plan_meetings`) na tabela `contact_interactions` para registrar o vínculo

**3. Invalidação de Cache**
- Após o submit com vínculo, invalidar queries `plan-meetings`, `client-plan`, `clients` e `client-metrics` para refletir a conclusão da reunião no ciclo

### Fluxo do Usuário
1. Usuário abre "Registrar Relacionamento" em uma tarefa crítica
2. Seleciona canal "Reunião Presencial" ou "Reunião Online"
3. Aparece seção: "Deseja vincular ao ciclo de reuniões?"
4. Se sim, seleciona qual reunião do ciclo (ex: "Reunião 5 - Pendente")
5. Ao salvar, a interação é registrada E a reunião do ciclo é marcada como concluída

