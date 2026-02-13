
## Correcao do bug de travamento dos botoes na secao Meus Sonhos

### Problema

O `DropdownMenu` do Radix UI e modal por padrao -- ele cria uma camada invisivel (overlay) que captura todos os cliques. Quando o usuario clica em "Editar", o handler `onEdit(dream)` e chamado, o que abre o `Dialog` (modal de edicao). Porem, o overlay do `DropdownMenu` permanece ativo por um instante, conflitando com o `Dialog` e travando toda a pagina.

### Solucao

Adicionar `modal={false}` ao componente `DropdownMenu` dentro do `DreamCard`. Isso evita que o dropdown crie um overlay modal, eliminando o conflito com o Dialog que abre em seguida.

### Detalhes tecnicos

**Arquivo: `src/components/meu-futuro/DreamCard.tsx`**

Alteracao na linha 93:
- De: `<DropdownMenu>`
- Para: `<DropdownMenu modal={false}>`

Essa unica alteracao resolve o problema porque:
1. Remove o overlay invisivel que bloqueia cliques
2. Permite que o Dialog abra normalmente sem conflito
3. O dropdown continua fechando ao clicar em um item ou fora dele
