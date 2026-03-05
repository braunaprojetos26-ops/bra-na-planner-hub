

## Plano: Seletores Pesquisáveis no Fluxo de Caixa + Migração de Dados Existentes

### Situação Atual

Os campos de receita (`income`), despesas fixas (`fixed_expenses`) e gastos variáveis (`variable_expenses`) no Fluxo de Caixa usam **inputs de texto livre** para o nome do item. O `itemSchema` define `name: string/text` + `value_monthly_brl: currency`, o que resulta em um layout "simples" (input de texto + campo monetário).

Dados existentes já preenchidos incluem nomes como "Aluguel", "Plano de Saúde", "Supermercado", "Medicina", etc.

### Mudanças Propostas

#### 1. Criar tabela `cash_flow_categories` no banco

Nova tabela para armazenar categorias de receita e despesa, gerenciáveis via configurações:

```
cash_flow_categories
- id (uuid, PK)
- name (text) — ex: "Aluguel", "Plano de Saúde"
- type (enum: 'income' | 'fixed_expense' | 'variable_expense')
- is_active (boolean, default true)
- order_position (integer)
- created_at, updated_at
```

Pré-popular com ~60-80 categorias baseadas nos dados existentes e categorias comuns de planejamento financeiro (moradia, transporte, alimentação, saúde, educação, lazer, seguros, etc.).

#### 2. Atualizar `itemSchema` dos campos no banco

Alterar o `itemSchema` dos 3 campos de lista (income, fixed_expenses, variable_expenses) de `name: text/string` para `name: searchable_select`, e adicionar nas `options` as referências às categorias (ex: `nameSourceTable: 'cash_flow_categories'`).

#### 3. Atualizar `DynamicField.tsx` — Renderização de listas

No bloco de lista simples (`isSimpleList`), quando o tipo do campo `name` for `searchable_select`:
- Renderizar um `SearchableSelect` com as categorias carregadas do banco, filtradas pelo tipo (income/fixed/variable)
- Incluir opção "Outros" com fallback para input de texto livre
- Manter o campo `value_monthly_brl` como `CurrencyInput` ao lado

#### 4. Hook `useCashFlowCategories`

Novo hook que busca as categorias da tabela `cash_flow_categories`, agrupadas por tipo, com cache via React Query.

#### 5. Migração de dados existentes

Script SQL (via insert tool) que:
- Lê todos os `name` distintos já usados em `cash_flow.income`, `cash_flow.fixed_expenses` e `cash_flow.variable_expenses`
- Para cada nome encontrado, verifica se já existe uma categoria correspondente
- Se não existir, cria automaticamente na tabela `cash_flow_categories` com o tipo correto
- Os dados dos clientes **não precisam ser alterados** — o campo `name` continua guardando o texto, e o seletor simplesmente reconhece valores que existem na lista

#### 6. Tela de Configurações (futuramente editável)

Adicionar uma seção na área de administração para gerenciar categorias de receita/despesa (adicionar, renomear, desativar). Isso será uma listagem simples com CRUD na tabela `cash_flow_categories`.

### Categorias Pré-populadas (exemplos)

**Receitas**: Salário Líquido, Pró-labore, Aluguéis, Dividendos, Pensão, PLR/Bônus, Freelance/Autônomo, Aposentadoria/INSS, Vale-Alimentação, Outros

**Despesas Fixas**: Aluguel, Condomínio, IPTU, Financiamento Imobiliário, Financiamento Veículo, Plano de Saúde, Seguro de Vida, Seguro Carro, Escola/Faculdade, Energia Elétrica, Água, Gás, Internet, Telefone, Streaming, Academia, Empregada/Diarista, Pensão Alimentícia, Dízimo/Contribuição Religiosa, Clube, Outros

**Despesas Variáveis**: Supermercado, Alimentação Fora, Combustível, Transporte, Farmácia, Vestuário, Lazer, Viagens, Presentes, Manutenção Casa, Manutenção Carro, Cuidados Pessoais, Outros

### Arquivos

- **Criar**: migração SQL (tabela + seed), `src/hooks/useCashFlowCategories.ts`
- **Modificar**: `src/components/analysis/data-collection/DynamicField.tsx` (renderização de lista simples), atualizar `data_collection_fields` options no banco
- **Modificar**: campos do banco via insert tool (atualizar itemSchema)

### Compatibilidade

Os dados existentes dos clientes continuam funcionando porque o valor armazenado em `name` é o próprio texto da categoria. O `SearchableSelect` mostra como selecionado qualquer valor que corresponda a uma opção na lista. Valores que não correspondem aparecem como "Outros" com o texto preservado.

