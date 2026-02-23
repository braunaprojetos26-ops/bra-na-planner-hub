

## Padronizacao de Campos Abertos para Seletores

### Resumo

Revisar todos os campos de texto aberto no formulario de coleta de dados e converter os que contem informacoes relevantes para analise em seletores padronizados, mantendo campos de texto apenas para observacoes/detalhes.

---

### Campos Identificados para Conversao

#### 1. Investimentos - "Quanto voce considera que entende de investimentos?"
- **Campo atual**: `quanto_voc_considera_que_entende_de_investimentos` / tipo `text`
- **Converter para**: `select`
- **Opcoes**: Nenhum conhecimento, Pouco conhecimento, Conhecimento medio, Bom conhecimento, Muito conhecimento, Especialista, Outros

#### 2. Bancos e Cartoes - "Qual o limite dos seus cartoes?"
- **Campo atual**: `qual_o_limite_dos_seus_cartes` / tipo `text`
- **Converter para**: `select`
- **Opcoes**: Ate R$ 1.000, R$ 1.000 a R$ 5.000, R$ 5.000 a R$ 10.000, R$ 10.000 a R$ 20.000, R$ 20.000 a R$ 50.000, R$ 50.000 a R$ 100.000, Acima de R$ 100.000, Nao sei informar

#### 3. Bancos e Cartoes - "Quais cartoes de credito mais utiliza?"
- **Campo atual**: `credit_cards` / tipo `text`
- **Converter para**: `multi_select`
- **Opcoes**: Nubank, Itau, Bradesco, Santander, C6 Bank, Inter, BTG, XP, Banco do Brasil, Caixa, American Express, Digio, Pan, Neon, Will Bank, PicPay, Mercado Pago, Outro

#### 4. Dividas - Reestruturar a lista de dividas
- **Campo atual**: `debts_list` com schema: name(text), cause(text), outstanding_brl(currency), installment_monthly_brl(currency), interest_type(select)
- **Adicionar novos campos ao itemSchema**:
  - `debt_type` (select) - Tipo de Divida: Cartao de Credito, Emprestimo Pessoal, Emprestimo Consignado, Financiamento Imobiliario, Financiamento de Veiculo, Cheque Especial, Credito Rotativo, Divida com Familiar/Amigo, Divida Tributaria/Impostos, Emprestimo Empresarial, Crediario/Loja, Outros
  - `interest_rate` (number) - Taxa de juros (% ao mes)
  - `term_months` (number) - Prazo restante (meses)
- **Renomear**: `name` para "Detalhes / Observacoes", `cause` para seletor de causa
- `cause` converter para select: Descontrole financeiro, Emergencia medica, Perda de emprego, Investimento que deu errado, Emprestimo para terceiros, Divorcio, Aquisicao planejada, Outros
- **Nova ordem**: debt_type, name, cause, outstanding_brl, interest_rate, installment_monthly_brl, interest_type, term_months

---

### Detalhes Tecnicos

**Operacoes no banco de dados (UPDATE via insert tool, nao migracao):**

1. UPDATE campo `quanto_voc_considera_que_entende_de_investimentos`:
   - field_type: `text` -> `select`
   - options: `{"items": ["Nenhum conhecimento", "Pouco conhecimento", "Conhecimento médio", "Bom conhecimento", "Muito conhecimento", "Especialista", "Outros"]}`

2. UPDATE campo `qual_o_limite_dos_seus_cartes`:
   - field_type: `text` -> `select`
   - options: `{"items": ["Até R$ 1.000", "R$ 1.000 a R$ 5.000", ...]}`

3. UPDATE campo `credit_cards`:
   - field_type: `text` -> `multi_select`
   - options: `{"items": ["Nubank", "Itaú", ...]}`

4. UPDATE campo `debts_list`:
   - Adicionar `debt_type: "select"`, `interest_rate: "number"`, `term_months: "number"` ao itemSchema
   - Adicionar `debtTypeOptions` e `debtCauseOptions` ao campo options
   - Converter `cause` de `text` para `select` no itemSchema

**Arquivo modificado: `src/components/analysis/data-collection/DynamicField.tsx`**

- Adicionar labels: `debt_type: 'Tipo de Divida'`, `interest_rate: 'Taxa de Juros (% a.m.)'`, `term_months: 'Prazo Restante (meses)'`
- Atualizar `fieldOrderByType.debts_list` para incluir novos campos na ordem correta
- No `renderListField`, quando campo for `select` dentro de lista, verificar `debtTypeOptions` e `debtCauseOptions` (alem dos ja existentes `goalTypeOptions` e `interestTypeOptions`)
- Renomear label de `name` em debts_list para "Detalhes / Observacoes"
- Renomear label de `cause` para "Causa da Divida"

**Arquivo modificado: `src/pages/AdminDataCollectionBuilder.tsx`**

- Garantir que o admin builder suporte as novas opcoes de seletor (debtTypeOptions, debtCauseOptions) da mesma forma que ja suporta goalTypeOptions

---

### Campos que permanecem como texto (correto)

- `small_talk` (textarea) - Campo descritivo
- `retirement_notes` (textarea) - Observacoes
- `holdings_notes` (textarea) - Observacoes
- `protection_notes` (textarea) - Observacoes
- `tax_notes` (textarea) - Observacoes
- `planner_summary` (textarea) - Resumo do planejador
- `additional_context` (textarea) - Contexto adicional
- `name` em listas de patrimonio (text) - Descricao do bem (cada item e unico)
- `how` em objetivos (text) - Campo descritivo de estrategia

