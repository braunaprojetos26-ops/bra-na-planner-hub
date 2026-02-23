
## Objetivos Financeiros - Seletor de Tipo + Gerenciamento no Admin

### Resumo

Duas frentes de trabalho:

1. **Coleta de dados (formulario)**: Adicionar campo `goal_type` (seletor) na lista de objetivos, com opcoes predefinidas, manter campo de texto livre para detalhes, e garantir data exata no `target_date`.

2. **Admin / Configuracoes**: Permitir que o admin gerencie as opcoes do seletor de tipos de objetivo (adicionar/remover opcoes) diretamente no construtor de formularios.

---

### Mudancas no Banco de Dados

**UPDATE no campo `goals_list`** (tabela `data_collection_fields`):

Atualizar o registro existente para:
- Adicionar `goal_type: "select"` no `itemSchema`
- Adicionar `goalTypeOptions` no campo `options` com as opcoes predefinidas:
  - Reserva de Emergencia, Compra de Imovel, Compra de Automovel, Renda Passiva, Independencia Financeira, Faculdade / Educacao, Viagem, Casamento, Aposentadoria, Quitar Dividas, Abrir Negocio, Reforma da Casa, Troca de Carro, Protecao Familiar (Seguros), Educacao dos Filhos, Intercambio, Outros

Isso sera feito via ferramenta de insercao/update (nao migracao, pois e update de dados).

---

### Mudancas no DynamicField.tsx

1. Adicionar `goal_type` no `fieldLabels` como "Tipo de Objetivo"
2. Atualizar `fieldOrderByType.goals_list` para `['goal_type', 'name', 'target_value_brl', 'target_date', 'priority', 'how']`
3. No `renderListField`, quando o campo for `select` e existir `goalTypeOptions` no field.options, usar essas opcoes (alem do ja existente `typeOptions`)
4. Renomear label de `name` para "Detalhes / Observacoes" somente quando o campo pertence a `goals_list` (detectar pelo contexto)

---

### Mudancas no AdminDataCollectionBuilder.tsx

Quando o admin edita um campo do tipo `list` que possui `goalTypeOptions` (ou qualquer campo de lista com sub-campos select), adicionar uma secao no modal de edicao de campo para:

1. Exibir a lista atual de opcoes do seletor de tipos de objetivo
2. Permitir adicionar novas opcoes (input + botao "Adicionar")
3. Permitir remover opcoes existentes
4. Salvar as opcoes atualizadas no campo `options.goalTypeOptions` do registro

Isso garante que o admin pode gerenciar os tipos de objetivo sem precisar mexer no banco diretamente.

---

### Detalhes Tecnicos

**Arquivos modificados:**

1. `src/components/analysis/data-collection/DynamicField.tsx`
   - Adicionar `goal_type: 'Tipo de Objetivo'` em `fieldLabels`
   - Atualizar label de `name` para exibir "Detalhes / Observacoes" quando em lista de objetivos
   - Atualizar `fieldOrderByType.goals_list` para incluir `goal_type` como primeiro campo
   - No `renderListField` para tipo `select`: verificar `field.options?.goalTypeOptions` alem de `typeOptions`

2. `src/pages/AdminDataCollectionBuilder.tsx`
   - Expandir o estado `fieldForm` para incluir `goalTypeOptions` (array de strings)
   - No modal de edicao de campo, quando `field_type === 'list'`, mostrar secao para gerenciar opcoes do seletor de objetivos (goalTypeOptions)
   - Ao carregar campo para edicao, popular `goalTypeOptions` a partir de `field.options.goalTypeOptions`
   - Ao salvar, incluir `goalTypeOptions` dentro de `options`

**Operacao de dados (UPDATE, nao migracao):**
- Atualizar o registro `goals_list` em `data_collection_fields` para incluir `goal_type` no `itemSchema` e as opcoes iniciais em `goalTypeOptions`
