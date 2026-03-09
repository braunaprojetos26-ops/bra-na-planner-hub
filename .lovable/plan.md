

## Plano: Página Standalone de Proposta em `/proposta`

### Objetivo
Criar uma rota pública `/proposta` que replica o passo 5 da análise (seleção de tipo → configuração → apresentação), independente do sistema. Inclui funcionalidade de salvar em PDF via `window.print()` (já existente nos componentes de apresentação).

### Arquivos a criar/modificar

**1. `src/pages/StandaloneProposal.tsx`** (novo)
- Página com fluxo em 3 etapas via estado local:
  1. `ProposalTypeSelector` — escolhe completo ou pontual
  2. Builder standalone (completo ou pontual) — formulário com inputs manuais para nome do cliente e renda, sem dependência de contactId/DB
  3. Apresentação — renderiza `ProposalPresentation` ou `PontualProposalPresentation` com dados em memória
- Sem autenticação, sem salvar no banco
- Layout limpo, sem sidebar do sistema

**2. `src/components/analysis/proposal/StandaloneCompletoBuilder.tsx`** (novo)
- Versão do `ProposalBuilder` sem hooks de contato/DB
- Campos: nome do cliente (input texto), renda mensal, complexidade, reuniões, meses de renda, parcelamento, desconto, mostrar feedbacks/cases
- Feedbacks e cases não estarão disponíveis (sem auth), checkboxes desabilitados
- Calcula pricing localmente com `calculateProposalPricing`
- Botão "Apresentar" monta objeto Proposal-like em memória e passa para callback

**3. `src/components/analysis/proposal/StandalonePontualBuilder.tsx`** (novo)
- Versão do `PontualProposalBuilder` sem hooks de contato/DB
- Campos: nome do cliente, renda, seleção de tópicos, parcelamento
- Calcula pricing com `calculatePontualPricing`
- Mesma lógica de apresentação em memória

**4. `src/App.tsx`** (modificar)
- Adicionar rota pública: `<Route path="/proposta" element={<StandaloneProposal />} />`

### PDF
Os componentes `ProposalPresentation` e `PontualProposalPresentation` já possuem botão "Gerar PDF" que chama `window.print()` com estilos `@media print` configurados. Essa funcionalidade será preservada integralmente na versão standalone.

### O que NÃO muda
- Componentes existentes de proposta dentro da análise permanecem inalterados
- Sem migração de banco de dados
- Componentes de apresentação (`ProposalPresentation`, `PontualProposalPresentation`) reutilizados sem modificação — já recebem tudo via props

