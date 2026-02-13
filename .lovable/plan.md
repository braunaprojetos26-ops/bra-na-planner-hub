
## Aportes Escalonados no "Meu Futuro"

### O que muda para o usuario

Ao lado do slider de "Investimento mensal", aparecera um pequeno icone (escada/degraus). Ao clicar, abre um modal onde o usuario pode definir faixas de aporte por periodo de anos, como na planilha Excel. Exemplo:

- Primeiros 2 anos: R$ 200/mes
- Proximos 3 anos: R$ 500/mes
- Proximos 4 anos: R$ 1.000/mes

Quando o escalonamento estiver ativo, o slider de investimento mensal ficara desabilitado (pois o valor varia por periodo) e mostrara um badge indicando "Escalonado" com o icone. O usuario pode desativar o escalonamento a qualquer momento, voltando ao aporte fixo.

### Como funciona o modal

- Tabela editavel com duas colunas: "Anos" (duracao do periodo) e "Aporte Mensal" (valor em R$)
- Botao "Adicionar faixa" para incluir novas linhas
- Botao de excluir em cada linha
- Resumo na parte inferior mostrando o total de anos configurados
- Validacao: a soma dos anos nao pode ultrapassar o periodo ate a aposentadoria

### Como o calculo muda

Em vez de um unico `aporteMensal` fixo, o hook `useFinancialProjection` recebera um array opcional de faixas (`contributionSteps`). Na fase de acumulo, o sistema verificara em qual faixa o mes atual se encontra e usara o aporte correspondente.

---

### Detalhes Tecnicos

**Novo tipo em `src/types/dreams.ts` (ou novo arquivo de tipos):**

```text
ContributionStep {
  id: string
  durationYears: number
  monthlyAmount: number
}
```

**Arquivo: `src/hooks/useFinancialProjection.ts`**
- Adicionar campo opcional `contributionSteps?: ContributionStep[]` em `FinancialProjectionParams`
- Na fase de acumulo (linha 195-200), ao inves de usar `aporteMensal` fixo, calcular o aporte do mes atual com base no array de steps:
  - Converter steps em ranges de meses (ex: step 1 = meses 0-23, step 2 = meses 24-59, etc.)
  - Se `contributionSteps` existir e tiver itens, usar o valor da faixa correspondente; senao, usar `aporteMensal`
- Ajustar tambem o calculo de `patrimonioInvestido` para refletir os aportes variaveis
- O calculo de `aporteIdealMensal` continua usando o valor medio/fixo como referencia

**Novo componente: `src/components/meu-futuro/ContributionStepsModal.tsx`**
- Modal com tabela editavel (Anos | Aporte Mensal)
- Cada linha tem: input numerico para anos, input de moeda para valor, botao excluir
- Botao "Adicionar faixa" no rodape da tabela
- Resumo: "Total: X anos de Y disponiveis"
- Botoes Cancelar e Confirmar

**Arquivo: `src/components/meu-futuro/FinancialControlPanel.tsx`**
- Adicionar props: `contributionSteps`, `onContributionStepsChange`, `onOpenStepsModal`
- Ao lado do label "Investimento mensal", adicionar icone clicavel (Layers ou BarChart3 do lucide)
- Quando `contributionSteps.length > 0`: desabilitar slider, mostrar badge "Escalonado" com resumo compacto
- Quando vazio: comportamento atual com slider normal

**Arquivo: `src/pages/MeuFuturo.tsx`**
- Novo estado: `contributionSteps: ContributionStep[]`
- Novo estado: `stepsModalOpen: boolean`
- Passar `contributionSteps` para o hook `useFinancialProjection`
- Passar props necessarias para `FinancialControlPanel`
- Renderizar `ContributionStepsModal`
