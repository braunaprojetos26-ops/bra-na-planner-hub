

## Importacao Seletiva do RD CRM por Usuario

### Resumo

Transformar a importacao atual (tudo de uma vez) em um fluxo seletivo onde voce:
1. Ve a lista de usuarios do RD CRM
2. Seleciona um usuario
3. Importa apenas os contatos e/ou negociacoes desse usuario
4. Opcionalmente cria uma conta no sistema para ele, ja vinculando como responsavel (owner) dos dados importados

---

### Fluxo do Usuario

1. Na tela de configuracoes, ao clicar "Importar Contatos" ou "Importar Negociacoes", abre um dialog/modal
2. O modal lista os usuarios do RD CRM (nome + e-mail)
3. Voce seleciona um usuario
4. Um checkbox "Criar usuario no sistema" aparece (marcado por padrao)
   - Se marcado, o sistema cria a conta com o e-mail do RD e senha padrao `Brauna@2025` (o usuario devera trocar no primeiro acesso)
   - Se o usuario ja existir no sistema (mesmo e-mail), ele sera usado como owner sem criar duplicata
5. Ao confirmar, importa apenas os contatos/negociacoes vinculados aquele usuario do RD CRM
6. Todos os contatos importados ficam com `owner_id` apontando para o usuario criado/encontrado

---

### Detalhes Tecnicos

**1. Edge Function `rd-crm` - Novas actions:**

- `list_users`: Chama `GET /users` na API do RD CRM para listar os usuarios ativos. Retorna id, nome e e-mail de cada um.

- `import_contacts` (modificado): Recebe um parametro opcional `rd_user_id` para filtrar contatos daquele usuario. Recebe tambem `owner_user_id` para definir o owner dos contatos importados.

- `import_deals` (modificado): Mesma logica - recebe `rd_user_id` para filtrar negociacoes e `owner_user_id` para as oportunidades criadas.

- `create_system_user`: Recebe `email` e `full_name`. Usa `supabase.auth.admin.createUser()` com a service role key para criar o usuario com senha padrao `Brauna@2025` e `email_confirm: true` (ja confirmado). Retorna o `user_id` criado. O trigger `handle_new_user` ja existente cuida de criar o perfil e atribuir a role `planejador`. Se o e-mail ja existir, busca o usuario existente e retorna o id dele.

**2. Frontend - Novo componente `RDCRMImportDialog`:**

- Modal que abre ao clicar nos botoes de importacao
- Ao abrir, busca a lista de usuarios do RD CRM (`list_users`)
- Exibe lista com radio buttons para selecionar um usuario
- Checkbox "Criar usuario no sistema e definir como responsavel"
- Botao "Importar" que:
  1. Se checkbox marcado e usuario nao existe: chama `create_system_user`
  2. Chama `import_contacts` ou `import_deals` com `rd_user_id` e `owner_user_id`
- Exibe resultado da importacao (importados, ignorados, erros)

**3. Hook `useRDCRM` atualizado:**

- Nova query `listUsers` para buscar usuarios do RD CRM
- Mutations de importacao passam a receber `rd_user_id` e `owner_user_id`
- Nova mutation `createSystemUser`

**4. Componente `RDCRMConnectionCard` atualizado:**

- Os botoes "Importar Contatos" e "Importar Negociacoes" abrem o novo dialog em vez do AlertDialog simples atual

---

### Sobre a senha padrao e primeiro acesso

- A conta sera criada com senha `Brauna@2025` e e-mail ja confirmado
- O usuario recebe uma notificacao ou instrucao para trocar a senha no primeiro login
- Nao sera implementado um fluxo de "force password change" automatico neste momento, mas pode ser adicionado futuramente

---

### Arquivos que serao criados/modificados

| Arquivo | Acao |
|---|---|
| `supabase/functions/rd-crm/index.ts` | Adicionar actions `list_users` e `create_system_user`; modificar `import_contacts` e `import_deals` para aceitar filtro por usuario e owner |
| `src/components/settings/RDCRMImportDialog.tsx` | Novo componente - modal de selecao de usuario e importacao |
| `src/hooks/useRDCRM.ts` | Adicionar `listUsers`, `createSystemUser`, e parametros nas mutations |
| `src/components/settings/RDCRMConnectionCard.tsx` | Substituir AlertDialogs pelos novos dialogs de importacao |

