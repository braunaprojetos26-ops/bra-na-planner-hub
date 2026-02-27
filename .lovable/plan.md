

## Análise do Problema

A **Coleta de Dados** hoje só é acessível dentro do fluxo de Análise (`/contacts/:contactId/analise`, etapa 2). Para clientes importados que já têm plano ativo, não faz sentido passar pelo fluxo de vendas inteiro só para preencher a coleta.

## Solução Proposta

**Adicionar uma seção "Coleta de Dados" diretamente na página de detalhes do cliente** (`ClientDetail.tsx`).

O componente `DataCollectionForm` já é independente — recebe apenas `contactId` e funciona sozinho. Basta reutilizá-lo dentro de um card colapsável ou uma seção na página do cliente.

### Como ficaria

- Na página de detalhes do cliente (`/clients/:planId`), adicionar um **card expansível** com o título "Coleta de Dados"
- Dentro dele, renderizar o `DataCollectionForm` existente (mesmo componente usado na Análise)
- Mostrar um indicador de status (Rascunho / Concluída / Não iniciada) no header do card
- O card começa **colapsado** para não poluir a página, e o planejador expande quando quiser preencher

### Passos de implementação

1. **Importar `DataCollectionForm`** no `ClientDetail.tsx`
2. **Adicionar um `Collapsible` card** entre as seções existentes (após Health Score, antes de Goals)
3. **Buscar o status** da coleta usando `useContactDataCollection(contactId)` para mostrar badge de status no header
4. Renderizar o formulário completo quando expandido — funciona exatamente como na Análise, com auto-save, progresso, seções, painel de observações

### Vantagens

- **Zero duplicação** — reutiliza 100% do componente existente
- **Mesmos dados** — grava na mesma tabela `contact_data_collections`, então se o cliente depois for para o fluxo de Análise, os dados já estarão lá
- **Familiar** — mesma interface que o planejador já conhece

