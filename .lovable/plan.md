

# Plano: Importar Produtos das Negociações do RD CRM

## Contexto

As negociações no RD CRM possuem produtos vinculados (aba "Produtos e Serviços") com nome e valor. O objetivo é criar um backfill que extraia esses produtos de negociações com status "won" e crie contratos locais vinculados ao contato correspondente.

**Dados do exemplo (ALVERI ROQUE PATRÍCIO):**
- RD CRM: "Planejamento Financeiro" (R$ 3.780) / "Seg. Vida – MAG – Vida Toda" (R$ 1.718) / "Home Equity" (R$ 86.000)
- Local (já importado via planilha): Planejamento Financeiro Completo (R$ 3.780) / Vida Toda (R$ 1.274 e R$ 1.718) / Home Equity (R$ 86.000)

## Abordagem

### 1. Mapa de nomes RD → Produto local (tabela de configuração)

Criar uma tabela `rd_product_mappings` para mapear nomes de produtos do RD CRM para IDs de produtos locais. Exemplos:

| rd_product_name | local_product_id |
|---|---|
| Planejamento Financeiro | → Planejamento Financeiro Completo |
| Seg. Vida – MAG – Vida Toda | → Vida Toda |
| Home Equity | → Home Equity |

O superadmin configura esses mapeamentos antes de rodar a importação. Isso resolve o problema de nomes diferentes.

### 2. Proteção contra duplicatas

Antes de criar um contrato, verificar se já existe um contrato ativo para o mesmo `contact_id` + `product_id` com valor igual (margem de ±1%). Se existir, pular.

### 3. Edge Function: `process-rd-backfill-products`

Seguindo o padrão checkpoint/resume existente:

1. **Fase 1**: Buscar IDs de todas as negociações (com filtro de usuário RD opcional), filtrar somente deals com `win` status
2. **Fase 2**: Para cada deal, chamar `GET /deals/{deal_id}/deal_products` para obter a lista de produtos
3. **Fase 3**: Para cada produto no deal:
   - Buscar o mapeamento de nome na tabela `rd_product_mappings`
   - Encontrar o contato local via telefone/email (padrão existente)
   - Verificar duplicata (contact_id + product_id + valor similar)
   - Se não duplicado, criar contrato com status `active`, `contract_value` = price do RD, `owner_id` do contato local

### 4. Ação no `rd-crm/index.ts`

Nova action `start_backfill_products` que cria o job e dispara o worker.

### 5. UI na tela de configuração

- Seção de mapeamento de produtos (simples: lista editável com nome RD → select de produto local)
- Botão "Importar Produtos dos Clientes" no card RD CRM, com filtro de usuário e progress polling (igual aos outros backfills)

### 6. Hook `useRDCRM`

Adicionar `startBackfillProducts` e `isStartingBackfillProducts`.

## Migração SQL

```sql
CREATE TABLE public.rd_product_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rd_product_name TEXT NOT NULL UNIQUE,
  local_product_id UUID NOT NULL REFERENCES public.products(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rd_product_mappings ENABLE ROW LEVEL SECURITY;

-- Somente superadmin gerencia
CREATE POLICY "Superadmin manages rd_product_mappings"
ON public.rd_product_mappings FOR ALL
USING (has_role(auth.uid(), 'superadmin'))
WITH CHECK (has_role(auth.uid(), 'superadmin'));

-- Authenticated pode ler (usado pelo edge function via service role de qualquer forma)
CREATE POLICY "Authenticated can view rd_product_mappings"
ON public.rd_product_mappings FOR SELECT
USING (auth.uid() IS NOT NULL);
```

## Arquivos a criar/editar

| Arquivo | Ação |
|---|---|
| Migração SQL | Criar tabela `rd_product_mappings` |
| `supabase/functions/process-rd-backfill-products/index.ts` | Novo worker |
| `supabase/functions/rd-crm/index.ts` | Nova action `start_backfill_products` |
| `src/hooks/useRDCRM.ts` | Adicionar backfill products |
| `src/components/settings/RDProductMappingsEditor.tsx` | Novo: UI de mapeamento |
| `src/components/settings/RDCRMConnectionCard.tsx` | Botão de importar produtos |

## Fluxo do usuário

1. Superadmin vai em Configurações → RD CRM
2. Configura mapeamentos de nomes de produtos (seção nova)
3. Seleciona usuário RD (opcional)
4. Clica "Importar Produtos dos Clientes"
5. Sistema busca deals won → busca produtos de cada deal → mapeia para produto local → cria contrato se não duplicado
6. Progresso em tempo real com contadores

