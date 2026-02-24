

## Plano: Marcar 33 negociações como vendidas + criar contratos + corrigir importador

### Contexto

Existem 33 oportunidades ativas no estágio "Planejamento Pago" do funil "VENDA - PLANEJAMENTO", todas do Abraão Lima Velozo. Cada uma já possui o valor do contrato em `proposal_value`. Todas já possuem oportunidades correspondentes no funil "MONTAGEM - PLANEJAMENTO" (importadas do RD), então não podemos duplicá-las.

### O que será feito

**1. Edge function `bulk-mark-won`**

Função que processa as 33 oportunidades em lote:

Para cada oportunidade:
- Cria um contrato vinculado ao produto "Planejamento Financeiro Completo" usando o `proposal_value` como `contract_value`
- PBs calculados pela fórmula do produto: `contract_value / 100`
- Payment type: `mensal` (padrão)
- Status do contrato: `active`
- Marca a oportunidade como `won` (status = 'won', converted_at = now)
- Registra no `opportunity_history` com action 'won'
- **Não cria** nova oportunidade em MONTAGEM (já existem)

Parâmetros de entrada: funnel_id, stage_id (para filtrar quais oportunidades processar)

**2. Correção no importador RD (`process-rd-import`)**

Linha 676 atual:
```
if (rdStatus === "won") oppStatus = "converted";  // BUG: "converted" não é status válido
```

Corrigido para:
```
if (rdStatus === "won") oppStatus = "won";
```

Também adiciona `converted_at` quando o deal é won.

### Detalhes técnicos

```text
Dados confirmados:
- Produto: Planejamento Financeiro Completo (4b900185-...)
- PB fórmula: {valor_total}/100
- Funil VENDA: VENDA - PLANEJAMENTO
- Estágio: Planejamento Pago
- Owner: Abraão (b16ff462-...)
- 33 oportunidades, todas com proposal_value preenchido
- Todas já têm oportunidade espelho em MONTAGEM - PLANEJAMENTO
```

### Execução

1. Criar e fazer deploy da edge function `bulk-mark-won`
2. Corrigir o mapeamento de status no `process-rd-import`
3. Executar a função para processar as 33 oportunidades
4. Confirmar os resultados via consulta ao banco

