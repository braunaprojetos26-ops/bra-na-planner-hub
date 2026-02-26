

## Plano: Puxar fonte das negociações do RD CRM para os contatos

### Contexto

Confirmado: a API do RD CRM retorna `deal_source` como um objeto `{ _id, name }` dentro de cada deal. Atualmente, quando importamos contatos via RD CRM, a fonte é fixada como `"rd_crm"` — a informação real de fonte fica apenas na negociação.

### Abordagem

Criar uma nova action na edge function `rd-crm` chamada `backfill_sources` que:

1. **Busca todas as negociações** do RD CRM (paginadas)
2. **Para cada deal**, extrai o `deal_source.name` e identifica o contato vinculado
3. **Encontra o contato correspondente** no sistema local (por telefone, email ou nome)
4. **Atualiza o campo `source`** do contato com o nome da fonte da negociação (se o contato ainda estiver com `source = 'rd_crm'` ou `NULL`)

### Detalhes técnicos

**Edge function `process-rd-import/index.ts`** — Duas mudanças:

1. **Na importação de contatos (fase 3)**: Antes de inserir, buscar a negociação mais recente do contato no RD para extrair `deal_source.name` e usar como `source` no insert, ao invés do hardcoded `"rd_crm"`.

2. **Nova action `backfill_sources` na `rd-crm/index.ts`**: Para os contatos já importados que ficaram com `source = 'rd_crm'`, percorrer os deals do RD, encontrar o contato local vinculado e atualizar o `source` com o nome real da fonte.

**Fluxo do backfill:**
```text
Para cada deal no RD CRM:
  ├── Extrair deal_source.name (ex: "Instagram", "Indicação")
  ├── Buscar contatos vinculados ao deal (API /deals/{id}/contacts)
  ├── Encontrar contato local por phone/email
  └── UPDATE contacts SET source = deal_source.name WHERE id = local_id AND source IN ('rd_crm', NULL)
```

**Campo `source_detail`**: Será preservado com o RD CRM ID para rastreabilidade.

### Etapas de implementação

1. Modificar `process-rd-import` para extrair `deal_source.name` durante importação de contatos
2. Adicionar action `backfill_sources` na edge function `rd-crm` que dispara um job assíncrono para atualizar contatos existentes
3. Criar o processamento assíncrono do backfill (reutilizando a lógica de checkpoint/resume existente)
4. Adicionar botão na UI de integração RD CRM para disparar o backfill de fontes

