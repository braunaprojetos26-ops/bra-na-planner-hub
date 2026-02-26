

## Plano: Atividades Críticas baseadas em regra (pontual + novos tipos de regra por características do cliente)

### Mudança 1: Permitir regras em atividades pontuais

Atualmente, a opção "Baseada em regra" só aparece quando o modo é "Perpétua". A mudança é:

- No modal de criação, adicionar uma terceira opção de modo: **Pontual simples** | **Pontual com regra** | **Perpétua**
- Pontual com regra: executa a regra **uma única vez** no momento da criação e distribui as tarefas para os planejadores cujos clientes atendem a condição
- Perpétua: continua funcionando como hoje (avaliada diariamente pelo cron)

Na edge function `useCriticalActivities.ts`, ao criar uma atividade pontual com regra: chamar uma nova action na edge function `rd-crm` ou criar uma RPC que avalia a regra e distribui imediatamente.

### Mudança 2: Novo tipo de regra — Características do Cliente

Adicionar novo `rule_type = 'client_characteristic'` com `rule_config` contendo os filtros:

```text
rule_config: {
  filter_type: 'product' | 'marital_status' | 'goal_type' | 'gender' | ...,
  operator: 'has' | 'not_has' | 'equals',
  value: string  // ex: category_id, "casado", goal type name
}
```

**Filtros disponíveis:**

| Filtro | Descrição | Dados usados |
|--------|-----------|-------------|
| Possui produto (categoria) | Clientes com contrato ativo em categoria X | `contracts` + `products` |
| Não possui produto (categoria) | Clientes SEM contrato ativo em categoria X | Inverso acima |
| Estado civil | Casado, solteiro, etc. | `contacts.marital_status` |
| Gênero | Masculino, feminino | `contacts.gender` |
| Objetivo/Sonho cadastrado | Clientes com objetivo do tipo X na coleta | `contact_data_collections.data_collection` |

### Detalhes técnicos

**1. `NewActivityModal.tsx`** — Reestruturar o formulário:
- Modo: Pontual / Perpétua (manter 2 tabs)
- Novo toggle: "Distribuir por regra" (checkbox, disponível tanto para pontual quanto perpétua)
- Quando "Distribuir por regra" ativo, mostrar o seletor de regras (incluindo as 3 existentes + nova `client_characteristic`)
- Para `client_characteristic`, mostrar sub-seletor: tipo de filtro → operador → valor

**2. `evaluate-perpetual-activities/index.ts`** — Adicionar handler `handleClientCharacteristic`:
- Busca clientes que atendem a condição
- Para cada cliente, pega o `owner_id` e cria tarefa para o responsável
- Reutiliza a lógica de `perpetual_activity_triggers` para evitar duplicatas

**3. `useCriticalActivities.ts`** — No `createActivity`:
- Se pontual + regra: após criar a atividade, invocar a edge function para avaliar a regra uma vez e distribuir
- Se pontual sem regra: manter fluxo atual (distribui por cargo)

**4. Nova função na edge function** — `evaluate-single-activity`:
- Recebe `activity_id`, avalia a regra, distribui tarefas e retorna contagem
- Reutiliza os handlers de `evaluate-perpetual-activities`

### Etapas de implementação

1. Atualizar `NewActivityModal.tsx` com toggle "Distribuir por regra" e UI de configuração de `client_characteristic`
2. Criar handler `handleClientCharacteristic` na edge function `evaluate-perpetual-activities`
3. Criar nova edge function `evaluate-single-activity` para execução pontual de regras
4. Atualizar `useCriticalActivities.ts` para chamar a edge function quando atividade pontual tem regra
5. Atualizar `ActivityCard.tsx` para exibir badge de regra em atividades pontuais também

