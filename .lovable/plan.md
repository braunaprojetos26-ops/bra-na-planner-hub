
## Reestruturar Resultado de Equipe em 3 Sub-abas

### Resumo

Dividir a secao de metricas da pagina Equipe em 3 sub-abas: **Resultados de Producao**, **Resultados de Esforcos** e **Resultados de Qualidade**, cada uma com metricas especificas.

---

### Aba 1: Resultados de Producao

Cards de metricas com foco em PBs (primeiro) e depois faturamento:

**PBs (destaque principal):**
- PB Geral + PB Geral por Cabeca
- PB Planejamento + PB Planejamento por Cabeca
- PB Seguros + PB Seguros por Cabeca
- PB Credito + PB Credito por Cabeca
- PB Outros + PB Outros por Cabeca

**Faturamento:**
- Faturamento Total
- Vendas Planejamento (qtd + valor)
- Vendas Seguros (qtd + valor)
- Vendas Credito (qtd + valor)
- Vendas Outros (qtd + valor)

Categorias de produto mapeadas:
- **Planejamento**: "Planejamento Financeiro"
- **Seguros**: "Seguro de Vida", "Seguros (Corretora de Seguros)", "Plano de Saude"
- **Credito**: "Home Equity", "Financiamento Imobiliario", "Financiamento Auto", "Carta Contemplada Auto", "Carta Contemplada Imobiliario", "Credito com Colateral XP", "Consorcio"
- **Outros**: "Investimentos" e qualquer outra categoria nao mapeada

"Por cabeca" = valor total dividido pelo numero de membros da equipe filtrada.

---

### Aba 2: Resultados de Esforcos

Dados vindos da lista de prospecao e dos funis:

**Lista de Prospecao (contact_history):**
- Contatos adicionados a lista (`added_to_prospection`)
- Contatos convertidos para negociacao (`prospection_negotiation_started`)
- Contatos perdidos (`prospection_no_contact`)
- Taxa de conversao

**Analises Agendadas:**
- Contar oportunidades marcadas como "won" no funil PROSPECAO - PLANEJAMENTO (id: `11111111-...`) estando na etapa "Reuniao Agendada" (id: `fa3c2495-...`). Fonte: tabela `opportunities` com `status = 'won'` e `current_stage_id` ou historico de `contact_history` com `stage_change`.

**Analises Feitas:**
- Contar oportunidades que chegaram na etapa "Analise Feita" (id: `2f1f297e-...`) no funil VENDA - PLANEJAMENTO. Fonte: `contact_history` com `action = 'stage_change'` e `to_stage_id = '2f1f297e-...'`.

---

### Aba 3: Resultados de Qualidade

Manter os placeholders existentes (NPS, Inadimplencia, Fat Perdido, Churn) que ja estao na tela, prontos para integracao futura.

---

### Detalhes Tecnicos

**Arquivos modificados:**

1. **`src/hooks/useTeamAnalytics.ts`**
   - Expandir `TeamMetrics` com novos campos: `pbCredit`, `pbOthers`, `creditSales`, `creditValue`, `othersSales`, `othersValue`, `totalRevenue`, `memberCount`
   - Adicionar interface `TeamEffortMetrics` com campos de prospecao e analises
   - Processar contratos separando por 4 categorias (planejamento, seguros, credito, outros)
   - Calcular PB por cabeca dividindo pelo total de membros

2. **`src/hooks/useTeamEfforts.ts`** (novo)
   - Hook dedicado para buscar dados de esforcos
   - Query em `contact_history` para eventos de prospecao filtrados por `changed_by IN targetUserIds` e periodo
   - Query em `contact_history` para `stage_change` com `to_stage_id` correspondente a "Analise Feita" no periodo
   - Query em `opportunities` para contar wins do funil PROSPECAO na etapa "Reuniao Agendada" no periodo

3. **`src/components/team/TeamMetricsCards.tsx`**
   - Substituir layout atual por `Tabs` com 3 abas
   - Aba "Producao": cards de PB (com destaque) + faturamento
   - Aba "Esforcos": cards de prospecao + analises
   - Aba "Qualidade": placeholders existentes (NPS, inadimplencia, etc.)

4. **`src/pages/Team.tsx`**
   - Importar e usar `useTeamEfforts` passando os mesmos filtros
   - Passar dados de esforcos para `TeamMetricsCards`

**Dados necessarios para esforcos (queries):**

```text
-- Prospecao: contact_history filtrado por changed_by IN teamIds e periodo
-- Analises agendadas: opportunities won no funil 11111111-... com from_stage = fa3c2495-...
-- Analises feitas: contact_history stage_change com to_stage_id = 2f1f297e-... no periodo
```

Nenhuma alteracao de banco de dados necessaria - todos os dados ja existem nas tabelas atuais.
