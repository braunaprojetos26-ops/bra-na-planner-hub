
## Ajustes na tela "Meu Futuro"

### Problema 1: Idade de aposentadoria limitada (50-80)
Atualmente o slider e o campo editavel de idade de aposentadoria estao limitados entre 50 e 80 anos. O valor default e 65.

**Solucao:** Alterar os limites para 18-90 e o default para 60.

### Problema 2: Campo de idade atual dificil de usar
O input `type="number"` no modal de configuracoes tem setas pequenas que dificultam a interacao. 

**Solucao:** Substituir por um input de texto simples com validacao manual, removendo as setas nativas do `type="number"` e tornando o campo mais amigavel.

---

### Detalhes Tecnicos

**Arquivo: `src/pages/MeuFuturo.tsx`**
- Alterar `DEFAULT_CONFIG.idadeAposentadoria` de `65` para `60`

**Arquivo: `src/components/meu-futuro/FinancialControlPanel.tsx`**
- Slider de idade de aposentadoria: mudar `min={50} max={80}` para `min={18} max={90}`
- EditableValue de idade: mudar `min={50} max={80}` para `min={18} max={90}`
- Labels do slider: mudar "50 anos" / "80 anos" para "18 anos" / "90 anos"

**Arquivo: `src/components/meu-futuro/RateSettingsModal.tsx`**
- Trocar o `type="number"` do campo de idade atual para `type="text"` com `inputMode="numeric"`
- Adicionar filtragem para aceitar apenas digitos
- Manter a validacao de min/max (18-90) no blur/submit
- Adicionar CSS para remover as setas nativas caso o browser ainda renderize
