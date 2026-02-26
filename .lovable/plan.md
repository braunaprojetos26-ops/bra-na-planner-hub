

## Diagnóstico

Os 3 contratos de renovação do Abraão foram criados corretamente com produto "Planejamento Financeiro Completo", mas **nenhum client_plan foi criado**. Isso significa que o passo "Configurar Plano de Cliente" no modal de vitória foi **pulado** (o usuário clicou "Pular").

### Situação atual:
| Contato | Contrato Renovação | Client Plan | Status |
|---------|-------------------|-------------|--------|
| Washington Igor | ✅ R$3.000 | ❌ Nenhum | Não é cliente ativo |
| João Vitor | ✅ R$3.900 | ⚠️ Tem plan antigo (contrato R$3.480) | É cliente ativo pelo plan antigo |
| Jonathan Lima | ✅ R$4.000 | ⚠️ Tem plan antigo (contrato R$3.600) | É cliente ativo pelo plan antigo |

### Problemas identificados:

1. **Washington não tem nenhum client_plan** — ele não aparece como cliente ativo
2. **João Vitor e Jonathan** têm plans ativos vinculados aos contratos antigos, mas os novos contratos de renovação não têm plans vinculados
3. O sistema permite pular a criação do client_plan, o que causa essa inconsistência

## Plano de Correção

### 1. Correção imediata via banco de dados
Criar client_plans para os 3 contratos de renovação:
- Washington: criar client_plan novo vinculado ao contrato `6d87b0fe` (R$3.000)
- João Vitor: criar client_plan novo vinculado ao contrato `1144bfa6` (R$3.900) — o plan antigo pode ser mantido como histórico ou fechado
- Jonathan: criar client_plan novo vinculado ao contrato `b2537976` (R$4.000) — idem

Cada plan terá 12 reuniões padrão distribuídas ao longo de 12 meses a partir de hoje. Os plans antigos do João Vitor e Jonathan serão atualizados para status `closed` (já que foram renovados).

### 2. Prevenção futura: tornar criação do client_plan obrigatória
No `WonWithContractModal`, quando um contrato de "Planejamento" é detectado, **remover a opção "Pular"** e tornar a configuração do client_plan obrigatória. Se o contrato é de planejamento financeiro, o client_plan é essencial para que o cliente apareça na carteira.

### Detalhes técnicos

**Migração SQL:** Inserir 3 registros em `client_plans` e suas respectivas `client_plan_meetings` (12 reuniões cada), fechar os plans antigos do João Vitor e Jonathan.

**Código:** No `WonWithContractModal.tsx`, na etapa `client_plan`, esconder o botão "Pular" quando o contrato é de planejamento — forçando o usuário a configurar o plano.

