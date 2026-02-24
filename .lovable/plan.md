
## Importacao em Massa de Negociacoes para o Kanban

### Resumo

Criar uma funcionalidade de importacao em massa de negociacoes (oportunidades) via planilha Excel/CSV, seguindo o mesmo padrao visual e tecnico ja existente na importacao de contatos (`ImportContactsModal`). As negociacoes serao vinculadas a contatos existentes atraves do telefone como identificador.

---

### Fluxo do Usuario

1. Na tela Pipeline (Negociacoes), clicar no botao "Importar Negociacoes"
2. Baixar o modelo de planilha com as colunas necessarias
3. Preencher a planilha com os dados das negociacoes
4. Fazer upload do arquivo (drag-and-drop ou selecao)
5. Revisar os dados parseados com indicacao de erros
6. Confirmar a importacao
7. Ver o resultado (sucesso/erros)

### Colunas da Planilha Modelo

| Coluna | Obrigatoria | Descricao |
|--------|-------------|-----------|
| Telefone do Contato | Sim | Usado para vincular ao contato existente |
| Funil | Sim | Nome do funil (ex: "PROSPECCAO - PLANEJAMENTO") |
| Etapa | Sim | Nome da etapa dentro do funil (ex: "Lead Recebido") |
| Qualificacao | Nao | Numero de 1 a 5 |
| Temperatura | Nao | Frio, Morno ou Quente |
| Valor da Proposta | Nao | Valor numerico |
| Anotacoes | Nao | Texto livre |

### Validacoes na Importacao

- Telefone do contato deve corresponder a um contato existente no sistema
- Nome do funil deve corresponder a um funil ativo
- Nome da etapa deve existir dentro do funil selecionado
- Se o contato nao for encontrado, a linha e marcada com erro
- Se funil/etapa nao forem encontrados, a linha e marcada com erro
- Linhas com erro nao sao importadas, apenas as validas

---

### Detalhes Tecnicos

**Novos arquivos:**

1. `src/components/opportunities/ImportOpportunitiesModal.tsx`
   - Modal com 3 etapas: upload, preview, resultado (mesmo padrao do `ImportContactsModal`)
   - Parsing da planilha com XLSX
   - Matching de contato por telefone (busca no banco)
   - Matching de funil por nome
   - Matching de etapa por nome dentro do funil
   - Preview com tabela mostrando status de cada linha
   - Botao de download do modelo

2. `src/hooks/useImportOpportunities.ts`
   - Hook de mutacao que recebe array de oportunidades parseadas
   - Para cada oportunidade valida: insere na tabela `opportunities` e cria entrada no `opportunity_history`
   - Retorna contagem de sucesso/erros

**Arquivo modificado:**

3. `src/pages/Pipeline.tsx`
   - Adicionar botao "Importar" ao lado do botao "Nova Negociacao" no header
   - Importar e renderizar o `ImportOpportunitiesModal`
   - State para controlar abertura do modal

**Logica de matching (no modal):**

- Ao processar o arquivo, buscar todos os contatos do usuario e todos os funis/etapas ativos
- Fazer match local (em memoria) sem chamadas extras ao banco por linha
- Telefone normalizado (so digitos) para comparacao

**Insert de cada oportunidade:**

```typescript
{
  contact_id: matchedContact.id,
  current_funnel_id: matchedFunnel.id,
  current_stage_id: matchedStage.id,
  qualification: parsedQualification,
  temperature: parsedTemperature,
  notes: parsedNotes,
  proposal_value: parsedProposalValue,
  created_by: user.id,
}
```

Apos cada insert, registrar no `opportunity_history` com action `'created'` e notes `'Importado via planilha'`.
