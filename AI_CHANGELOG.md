# AI Changelog - Braúna Planner Hub

Este arquivo registra as alterações feitas pela IA Antigravity para garantir a sincronização e compreensão mútua com a IA Lovable.

## [2025-12-23] - Inicialização do Ambiente
- **Ação**: Clonagem do repositório e criação da branch de desenvolvimento.
- **Branch**: `dev-antigravity`
- **Contexto**: O projeto utiliza Vite, React, Tailwind CSS e Supabase. Foi detectada a presença do `lovable-tagger`, indicando integração prévia com Lovable.
- **Mudanças**:
    - Criação deste arquivo `AI_CHANGELOG.md` para rastreamento de progresso IA-a-IA.
    - Criação do `AI_GUIDE.md` com o mapeamento arquitetural e regras de negócio para sincronização entre IAs.
- **Execução Local**: Dependências instaladas e servidor iniciado em `http://localhost:8080/`.
- **Validação de Proposta**: Implementada obrigatoriedade de valor da proposta ao mover negociações para a etapa "Proposta Feita".
    - Adicionada coluna `proposal_value` na tabela `opportunities`.
    - Criado componente `ProposalValueModal` para captura de dados.
    - Interceptador de drop adicionado em `Pipeline.tsx`.
    - Hooks e tipos atualizados para suportar o novo campo.
