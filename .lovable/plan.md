
## Patrimonio Perene vs Consumptivo - Duas Linhas no Grafico

### Conceito

Hoje o sistema calcula apenas um cenario de aposentadoria ideal: consumir o patrimonio ate os 90 anos. A mudanca adiciona uma segunda linha tracejada no grafico representando o cenario de patrimonio perene (viver apenas dos rendimentos, sem consumir o principal).

O usuario vera ambas as linhas simultaneamente no grafico, podendo comparar visualmente quanto precisa acumular em cada modelo. As mensagens do painel de controle tambem mostrarao os dois cenarios.

### O que muda visualmente

**No grafico:**
- Linha laranja tracejada (ja existente): "Aposentadoria ideal (consumindo)" -- patrimonio zera aos 90 anos
- Nova linha roxa/violeta tracejada: "Aposentadoria ideal (perene)" -- patrimonio se mantem indefinidamente
- Ambas clicaveis na legenda para mostrar/ocultar individualmente

**No tooltip:**
- Mostrara os valores de ambas as linhas quando visiveis

**No painel de controle (resumo):**
- Mostrara as duas metas: "Para consumir ate 90 anos: R$ X/mes" e "Para manter perene: R$ Y/mes"
- Indicara qual cenario o aporte atual atinge (ou nenhum)

### Logica matematica

**Modelo consumptivo (atual):**
Capital necessario = rendaLiquida * ((1 - (1 + r)^-n) / r)
Onde n = meses de usufruto ate 90 anos. O patrimonio e projetado para zerar.

**Modelo perene (novo):**
Capital necessario = rendaLiquida / taxaMensalUsufruto
Isso significa que o rendimento mensal do patrimonio e suficiente para cobrir a renda desejada sem consumir o principal. O patrimonio nunca diminui.

---

### Detalhes Tecnicos

**Arquivo: `src/hooks/useFinancialProjection.ts`**

1. Adicionar novo campo no `ProjectionDataPoint`:
   - `aposentadoriaIdealPerene: number`

2. Adicionar novos campos no `FinancialProjectionResult`:
   - `capitalNecessarioPerene: number`
   - `aporteIdealMensalPerene: number`

3. Calcular o capital necessario perene:
   - `capitalNecessarioPerene = rendaLiquidaMensal / taxaMensalUsufruto`
   - Calcular `aporteIdealMensalPerene` usando a mesma funcao `calcularAporteNecessario` com esse novo capital alvo

4. Na fase de acumulo, calcular a linha ideal perene em paralelo (mesma logica da ideal consumptiva, mas usando `aporteIdealMensalPerene`)

5. Na fase de usufruto da linha perene: patrimonio rende juros e paga a renda, mas como o capital foi dimensionado para cobrir exatamente a renda, a linha fica estavel (sem decrescer)

**Arquivo: `src/components/meu-futuro/FinancialProjectionChart.tsx`**

1. Adicionar nova `Area` tracejada com cor violeta/roxa (#8b5cf6) para `aposentadoriaIdealPerene`
2. Adicionar gradiente para a nova linha
3. Atualizar o tooltip para mostrar o valor perene quando visivel
4. Adicionar item na legenda interativa (clicavel para mostrar/ocultar)
5. Incluir `aposentadoriaIdealPerene` no calculo do dominio Y

**Arquivo: `src/components/meu-futuro/FinancialControlPanel.tsx`**

1. Receber novos props: `capitalNecessarioPerene`, `aporteIdealMensalPerene`
2. Atualizar o card de resumo para mostrar ambos os cenarios:
   - "Consumindo ate 90 anos: precisa de R$ X (aporte de R$ Y/mes)"
   - "Patrimonio perene: precisa de R$ X (aporte de R$ Y/mes)"
   - Indicar visualmente qual(is) cenario(s) o aporte atual atinge

**Arquivo: `src/pages/MeuFuturo.tsx`**

1. Passar os novos campos do hook para o `FinancialControlPanel`

### Cores e legenda

| Linha | Cor | Estilo | Legenda |
|-------|-----|--------|---------|
| Planejamento Brauna | Verde (#10b981) | Solida com area | Sempre visivel |
| Principal investido | Azul (#3b82f6) | Solida com area | Toggle na legenda |
| Ideal (consumindo) | Laranja (#f97316) | Tracejada | Toggle na legenda |
| Ideal (perene) | Violeta (#8b5cf6) | Tracejada | Toggle na legenda |
