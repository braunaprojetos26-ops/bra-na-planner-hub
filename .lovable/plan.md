
## Correcao do calculo de aportes escalonados

### Problema identificado

No hook `useFinancialProjection.ts`, as faixas de meses dos aportes escalonados sao construidas comecando do mes 0, porem o primeiro aporte so acontece no mes 1 (o mes 0 e o ponto de partida sem contribuicao). Isso gera dois erros:

1. A primeira faixa perde 1 mes de contribuicao (mes 0 esta na faixa mas e pulado)
2. O ultimo mes do periodo cai fora de todas as faixas e recebe um aporte extra via fallback

No exemplo do usuario, isso resulta em R$2.500 a mais do que o correto.

### Solucao

**Arquivo: `src/hooks/useFinancialProjection.ts`**

Alterar a construcao das faixas de meses para iniciar em 1 ao inves de 0:

```
// Antes (bug):
let cumMonths = 0;

// Depois (correto):
let cumMonths = 1;
```

Com essa mudanca, as faixas ficam corretamente alinhadas com os meses em que os aportes realmente acontecem (meses 1 a N), eliminando tanto a perda do primeiro mes quanto o aporte extra no final.

### Verificacao

Com o exemplo do usuario (1+2+5+10+9 = 27 anos = 324 meses):
- Faixa 1: meses 1-12 (12 aportes de R$500) = R$6.000
- Faixa 2: meses 13-36 (24 aportes de R$1.000) = R$24.000
- Faixa 3: meses 37-96 (60 aportes de R$2.000) = R$120.000
- Faixa 4: meses 97-216 (120 aportes de R$2.500) = R$300.000
- Faixa 5: meses 217-324 (108 aportes de R$3.000) = R$324.000
- Total = R$774.000 (correto)
