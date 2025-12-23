# Guia Técnico para IA (Antigravity & Lovable)

Este documento serve como a "Fonte da Verdade" arquitetural para garantir que ambas as IAs operem sob as mesmas premissas técnicas e de negócio.

## 🏗️ Arquitetura de Software

### Core Stack
- **Frontend**: Vite + React (TypeScript)
- **UI**: Shadcn UI + Lucide React + Tailwind CSS
- **Estado/Dados**: TanStack Query (v5) + React Hook Form + Zod
- **Backend**: Supabase (PostgreSQL + Auth + Storage)

### Autenticação e Autorização (`src/contexts/AuthContext.tsx`)
O sistema utiliza um modelo de RBAC (Role-Based Access Control) baseado em duas tabelas Supabase:
1.  **`public.profiles`**: Informações básicas do usuário.
2.  **`public.user_roles`**: Associa o `user_id` a uma `role`.
    - **Roles disponíveis**: `planejador`, `lider`, `supervisor`, `gerente`, `superadmin`.

### Modelo de Dados Principal (`src/integrations/supabase/types.ts`)
- **`contacts`**: Entidade central (clientes/prospects).
- **`opportunities`**: Representa um negócio em um funil. Vinculada a um `contact`.
- **`funnels` / `funnel_stages`**: Estrutura dinâmica dos processos de vendas.
- **`contracts`**: O desfecho de uma oportunidade ganha, vinculado a um `product`.
- **`meetings`**: Gestão de agenda vinculada a contatos e oportunidades.

## 📏 Regras de Execução IA-a-IA

1.  **Preservação de Lógica de Negócio**: Antes de refatorar qualquer Context ou Hook global, verifique se a lógica existente não é uma restrição de negócio do Supabase (ex: deadlocks em listeners de auth).
2.  **Documentação Extensiva**: Sempre utilize JSDoc em novas funções complexas.
3.  **Sincronização via GitHub**: Use o `AI_CHANGELOG.md` na raiz para descrever o "porquê" de mudanças estruturais ou novas dependências.
