

## Tela de Gestao de Investimentos e Chamados Dinamicos

### Resumo

Criar um modulo completo de investimentos com: (1) tela exclusiva "Gestao de Investimentos" para o Guido e super admins, (2) chamados de investimento com campos dinamicos por tipo de acao, (3) SLA e prioridade configuravel por tipo de chamado, (4) secao de investimentos no perfil do cliente, e (5) historico unificado.

---

### 1. Novas Tabelas no Banco de Dados

**`investment_ticket_types`** - Tipos de acao configuravel com SLA e prioridade

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | PK |
| name | text | Nome do tipo (Aporte, Resgate, etc.) |
| slug | text | Identificador unico |
| fields_schema | jsonb | Campos dinamicos obrigatorios |
| default_priority | text | Prioridade padrao |
| sla_minutes | integer | SLA em minutos |
| is_active | boolean | Ativo/inativo |
| order_position | integer | Ordem de exibicao |

Dados iniciais (6 tipos):
- **Aporte**: campos = valor, conta destino, observacoes
- **Resgate**: campos = valor, conta origem, motivo, urgencia
- **Transferencia**: campos = valor, conta origem, conta destino
- **PDF de Carteira**: campos = periodo, tipo de relatorio
- **Duvida sobre Investimentos**: campos = assunto, descricao detalhada
- **Agendamento de Reuniao**: campos = data sugerida, pauta

**Alteracao em `tickets`** - Novos campos

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| ticket_type_id | uuid (nullable) | FK para investment_ticket_types |
| dynamic_fields | jsonb | Dados dos campos dinamicos preenchidos |
| sla_deadline | timestamptz (nullable) | Prazo calculado automaticamente |

**`client_investment_data`** - Dados de investimentos do cliente (estrutura para integracao futura)

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | PK |
| contact_id | uuid | FK para contacts |
| data_type | text | Tipo: 'portfolio', 'allocation', 'contribution' |
| data | jsonb | Dados flexiveis |
| reference_date | date | Data de referencia |
| updated_by | uuid | Quem atualizou |
| created_at / updated_at | timestamptz | Timestamps |

RLS: Leitura por usuarios que acessam o contato (mesma logica de contacts). Escrita por superadmin e operacoes_investimentos.

---

### 2. Tela "Gestao de Investimentos" (`/investments`)

Acessivel apenas para usuarios com posicao `operacoes_investimentos` e superadmins.

**Layout em abas:**

- **Fila de Chamados**: Tabela com chamados de investimento ordenados por SLA (mais urgente primeiro). Colunas: cliente, tipo de acao, prioridade, SLA restante (com indicador visual vermelho/amarelo/verde), status, data de criacao. Clicar abre o TicketDetailModal existente.

- **Clientes**: Lista de todos os contatos com dados de investimento cadastrados. Permite buscar e acessar perfil de investimento de cada cliente para futuro cadastro de carteira/alocacao.

- **Configuracoes**: Gerenciar tipos de chamado, SLA e prioridade padrao de cada tipo. Somente superadmin pode editar.

---

### 3. Chamados de Investimento com Campos Dinamicos

Quando o planejador seleciona departamento "Investimentos" no modal de novo chamado:

1. Aparece um seletor de "Tipo de Acao" (Aporte, Resgate, etc.)
2. Ao selecionar, campos obrigatorios especificos aparecem dinamicamente
3. A prioridade e preenchida automaticamente pelo tipo (editavel)
4. O SLA e calculado automaticamente: `created_at + sla_minutes`
5. Os dados dos campos ficam em `dynamic_fields` (jsonb)

---

### 4. Secao de Investimentos no Perfil do Cliente

Na pagina `/clients/:planId` (ClientDetail), adicionar uma nova secao "Investimentos" com:

- **Resumo da Carteira**: Placeholder com mensagem "Integracao em breve" e dados basicos da tabela `client_investment_data`
- **Historico de Chamados**: Lista dos chamados de investimento daquele contato, com tipo, status, data e resumo

---

### 5. Menu Lateral

Adicionar item "Gestao de Investimentos" no sidebar, visivel apenas para:
- Usuarios com `position = 'operacoes_investimentos'`
- Usuarios com `role = 'superadmin'`

---

### Detalhes Tecnicos

**Arquivos novos:**

1. **`src/pages/InvestmentManagement.tsx`** - Pagina principal com 3 abas (Fila, Clientes, Config)
2. **`src/hooks/useInvestmentTicketTypes.ts`** - CRUD de tipos de chamado de investimento
3. **`src/hooks/useClientInvestments.ts`** - Dados de investimento do cliente
4. **`src/components/investments/InvestmentQueue.tsx`** - Tabela de fila com SLA visual
5. **`src/components/investments/InvestmentClientsTab.tsx`** - Aba de clientes com investimentos
6. **`src/components/investments/InvestmentConfigTab.tsx`** - Config de tipos/SLA
7. **`src/components/investments/InvestmentTicketFields.tsx`** - Campos dinamicos no modal
8. **`src/components/clients/ClientInvestmentsSection.tsx`** - Secao no perfil do cliente

**Arquivos modificados:**

1. **`src/components/tickets/NewTicketModal.tsx`** - Adicionar seletor de tipo e campos dinamicos quando dept=investimentos
2. **`src/components/layout/AppSidebar.tsx`** - Adicionar item condicional "Gestao de Investimentos"
3. **`src/App.tsx`** - Adicionar rota `/investments`
4. **`src/pages/ClientDetail.tsx`** - Incluir ClientInvestmentsSection
5. **`src/types/tickets.ts`** - Adicionar campos de tipo e SLA ao Ticket
6. **`src/components/tickets/TicketDetailModal.tsx`** - Exibir campos dinamicos e SLA

**Migracao SQL:**
- Criar tabelas `investment_ticket_types` e `client_investment_data`
- Alterar `tickets` com colunas novas
- Inserir 6 tipos iniciais
- RLS para todas as tabelas

