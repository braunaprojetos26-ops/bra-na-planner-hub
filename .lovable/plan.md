
## Permitir valores negativos na linha de Planejamento Brauna

### Problema

Na linha 280 do hook `useFinancialProjection.ts`, o valor do patrimonio projetado e forcado a nunca ficar abaixo de zero:

```
patrimonioProjetado: Math.max(0, patrimonioProjetado)
```

Isso impede que o grafico mostre cenarios reais onde um sonho/objetivo causa um deficit temporario no patrimonio (ex: viagem de R$100.000 quando so tem R$50.000 acumulados).

O grafico ja tem suporte para exibir valores negativos (prop `showNegatives`), mas os dados nunca chegam negativos.

### Solucao

**Arquivo: `src/hooks/useFinancialProjection.ts`**

1. Remover o `Math.max(0, ...)` do campo `patrimonioProjetado` na linha 280, permitindo que valores negativos sejam armazenados nos dados:
   - De: `patrimonioProjetado: Math.max(0, patrimonioProjetado)`
   - Para: `patrimonioProjetado: patrimonioProjetado`

2. Manter o `Math.max(0, ...)` no `patrimonioInvestido` (linha 281), pois o principal investido nao faz sentido ser negativo.

**Arquivo: `src/pages/MeuFuturo.tsx`**

1. Alterar o valor padrao de `showNegatives` de `false` para `true`, para que o grafico mostre a escala negativa por padrao:
   - De: `const [showNegatives, setShowNegatives] = useState(false)`
   - Para: `const [showNegatives, setShowNegatives] = useState(true)`

O toggle "Mostrar negativos" continua disponivel para o usuario ocultar a parte negativa do eixo Y se preferir uma visualizacao mais limpa.

### Resultado esperado

No exemplo citado (viagem de R$100.000 com apenas R$50.000 acumulados), a linha verde mergulhara para -R$50.000 no mes da viagem e gradualmente voltara ao positivo conforme os aportes mensais continuam, refletindo a realidade financeira do planejamento.
