

## Plano: Sistema de Dupla Visualização — Central do Planejador + Montagem de Planejamento

### Conceito

Criar um mecanismo de **troca de visualização** no sistema, permitindo alternar entre:
1. **Central do Planejador** (CRM atual — tudo que já existe)
2. **Montagem de Planejamento** (novo módulo de construção de planejamento financeiro)

Cada visualização terá seu próprio sidebar, header contextual e rotas. Ambas compartilham autenticação, dados e infraestrutura.

### Arquitetura

```text
┌─────────────────────────────────────────────┐
│  AppViewContext (view: 'crm' | 'planning')  │
├─────────────┬───────────────────────────────┤
│  view=crm   │  view=planning                │
│  AppSidebar │  PlanningSidebar              │
│  AppHeader  │  PlanningHeader               │
│  /contacts  │  /planning/:clientId/futuro   │
│  /pipeline  │  /planning/:clientId/...      │
│  /clients   │                               │
│  ...        │                               │
└─────────────┴───────────────────────────────┘
```

### Implementação

#### 1. Contexto de Visualização (`AppViewContext`)
- Novo contexto com estado `view: 'crm' | 'planning'` e função `switchView()`
- Persistido em `localStorage` para manter a escolha entre recarregamentos
- Envolver `App.tsx` com este provider

#### 2. Switcher de Visualização
- Componente compacto no **header** (ou sidebar header) com ícone/botão que alterna entre as duas visões
- Visual claro: nome do módulo ativo + ícone de troca
- Posicionamento: no header, ao lado do SidebarTrigger, ou no topo do sidebar

#### 3. Layout de Planejamento (`PlanningLayout`)
- Novo layout similar ao `AppLayout`, mas usando `PlanningSidebar` em vez de `AppSidebar`
- Reutiliza `AppHeader` com indicação visual do modo ativo + switcher

#### 4. Sidebar de Planejamento (`PlanningSidebar`)
- Menu lateral exclusivo com itens como:
  - **Seleção de Cliente** (dropdown/busca no topo — filtra apenas clientes ativos com contrato de planejamento pago)
  - **Meu Futuro** (tela já existente, rota `/planning/:clientId/futuro`)
  - Futuramente: Reserva de Emergência, Aposentadoria, Investimentos, Objetivos, etc.
- Header do sidebar com logo + "Montagem de Planejamento" + botão de voltar à Central

#### 5. Rotas de Planejamento
- Prefixo `/planning` para todas as rotas do novo módulo
- Estrutura: `/planning` (seleção de cliente), `/planning/:clientId/futuro` (Meu Futuro adaptado)
- Componente wrapper `PlanningPage` similar ao `ProtectedPage` mas usando `PlanningLayout`

#### 6. Seleção de Cliente no Módulo de Planejamento
- O sidebar terá um seletor de cliente no topo
- Filtra apenas clientes com `client_plans` ativos e contrato de planejamento com pagamento confirmado
- Ao selecionar, os dados da coleta (`data_collection`) são carregados como base para o planejamento
- O clientId fica na URL e disponível via contexto/params

#### 7. Migração da tela Meu Futuro
- A rota `/meu-futuro` será mantida (compatibilidade) mas redirecionará para `/planning`
- No módulo de planejamento, o componente receberá `clientId` como parâmetro e carregará dados do cliente (idade, patrimônio, sonhos da coleta de dados) como valores iniciais

### Arquivos a criar
- `src/contexts/AppViewContext.tsx` — contexto de visualização
- `src/components/layout/PlanningLayout.tsx` — layout do módulo
- `src/components/layout/PlanningSidebar.tsx` — sidebar do módulo
- `src/components/layout/ViewSwitcher.tsx` — componente de troca de visão

### Arquivos a modificar
- `src/App.tsx` — adicionar provider + rotas `/planning/*`
- `src/components/layout/AppHeader.tsx` — adicionar ViewSwitcher
- `src/components/layout/AppLayout.tsx` — adicionar provider
- `src/pages/MeuFuturo.tsx` — adaptar para receber clientId

### Observações
- Nenhuma mudança de banco de dados é necessária neste momento — os dados de clientes e coleta já existem
- As próximas telas do módulo de planejamento (reserva de emergência, aposentadoria, etc.) serão adicionadas incrementalmente depois dessa estrutura base estar pronta

