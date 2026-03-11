

## Plano: Unificar Importação do RD CRM

### Situacao Atual
Hoje existem 5 operacoes separadas na tela de configuracoes:
1. **Importar Contatos** (dialog, cria contatos a partir dos deals do usuario RD)
2. **Importar Negociacoes** (dialog, cria opportunities vinculadas a contatos existentes)
3. **Atualizar Fontes** (backfill source nos contatos ja importados)
4. **Atualizar Campanhas** (backfill campaign nos contatos ja importados)
5. **Importar Produtos** (cria contracts a partir de deals ganhos)

Cada uma roda em edge functions separadas com checkpoint/resume.

### Nova Dinamica
Selecionar usuario RD > Clicar **"Importar Contatos e Negociacoes"** > Um unico fluxo que:
1. Busca todos os deals do usuario
2. Para cada deal: extrai contato, fonte (deal_source), campanha (campaign)
3. Cria/atualiza o contato local com source e campaign ja preenchidos
4. Cria a opportunity (negociacao) vinculada ao contato
5. Para deals ganhos com produtos: cria contracts usando o mapeamento de produtos

O mapeamento de produtos (RDProductMappingsEditor) continua editavel na tela.

### Mudancas Necessarias

#### 1. Nova Edge Function: `process-rd-unified-import`
Substitui `process-rd-import`, `process-rd-backfill-sources`, `process-rd-backfill-campaigns` e `process-rd-backfill-products` em um unico worker com as seguintes fases:

- **Phase 1 - fetching_deals**: Busca todos os deal IDs do usuario RD (paginado)
- **Phase 2 - processing_deals**: Para cada deal:
  - Busca detalhes do deal (nome, valor, pipeline, stage, deal_source, campaign, win status)
  - Busca contatos vinculados ao deal
  - Busca full contact details (custom fields: CPF, RG, etc.)
  - **Cria contato** se nao existe (por phone/email), ou pula se ja existe. Ja preenche `source` e `campaign` no insert
  - Se contato ja existia, atualiza `source` e `campaign` se estavam vazios
  - **Cria opportunity** vinculada ao contato (mapeia pipeline/stage como ja faz hoje)
  - Se deal ganho (`win === "won"`): busca produtos do deal e cria contracts usando o mapeamento
  - Checkpoint/resume a cada ~120s (mesma arquitetura de hoje)

Reutiliza toda a logica existente de:
- Custom field extraction (CF_IDS do process-rd-import)
- Pipeline/stage matching (findBestMatch do process-rd-import)
- Product mapping (do process-rd-backfill-products)
- Phone normalization e dedup

#### 2. Acao `start_unified_import` no `rd-crm/index.ts`
Nova action que cria o job com `import_type: "unified"` e dispara o novo worker.

#### 3. UI: `RDCRMConnectionCard.tsx`
- Remove os botoes separados: "Importar Contatos", "Importar Negociacoes", "Atualizar Fontes", "Atualizar Campanhas", "Importar Produtos"
- Substitui por fluxo simplificado:
  - Dropdown de usuario RD (ja existe)
  - Checkbox "Criar usuario no sistema" (ja existe no dialog)
  - Botao unico: **"Importar Contatos e Negociacoes"**
  - Progress bar com status unificado
  - Resultados: contatos criados, negociacoes criadas, contratos criados, erros
- Mantem o `RDProductMappingsEditor` editavel

#### 4. UI: `RDCRMImportDialog.tsx`
- Adapta para o fluxo unificado (remove a distincao contacts/deals)
- Mostra progresso e resultados combinados

#### 5. Hook: `useRDCRM.ts`
- Adiciona `startUnifiedImport` mutation
- Remove mutations de backfill individuais (sources, campaigns, products) se desejado, ou apenas esconde da UI

### O Que NAO Muda
- Tabela `import_jobs` (mesma estrutura, novo `import_type`)
- `RDProductMappingsEditor` (continua editavel e funcional)
- Checkpoint/resume architecture
- Rate limiting (600ms entre requests)

