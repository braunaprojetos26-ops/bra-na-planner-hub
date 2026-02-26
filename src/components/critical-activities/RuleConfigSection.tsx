import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const RULE_OPTIONS = [
  { value: 'inadimplente', label: 'Cliente Inadimplente', description: 'Quando o contrato do cliente tem pagamento atrasado (Vindi)' },
  { value: 'health_score_critico', label: 'Health Score Crítico', description: 'Quando o Health Score do cliente cai abaixo do limite definido' },
  { value: 'contrato_vencendo', label: 'Contrato Vencendo', description: 'Quando o contrato de Planejamento está próximo do vencimento' },
  { value: 'client_characteristic', label: 'Características do Cliente', description: 'Filtre por produto, estado civil, gênero ou objetivos do cliente' },
];

const PRODUCT_CATEGORIES = [
  { id: 'a444e93c-dc57-41a0-aa2b-abc92fdbc9b4', name: 'Seguro de Vida' },
  { id: 'd770d864-4679-4a6d-9620-6844db224dc3', name: 'Planejamento Financeiro' },
  { id: '458b5cef-a83f-4f69-88ff-72d4c31dae9a', name: 'Investimentos' },
  { id: '3526e51b-fb5c-4d58-80a5-186236848f18', name: 'Consórcio' },
  { id: 'ecc6f72a-afc1-474b-bbf9-70c9bb48a9c5', name: 'Home Equity' },
  { id: 'ee058763-3934-4943-9dae-3b3caa333e96', name: 'Plano de Saúde' },
  { id: 'ba829bc6-8db2-4740-ace2-7121fac662e7', name: 'Seguros (Corretora)' },
  { id: '3e5cc8a2-a58b-4239-b98e-37ffb86b5f1e', name: 'Financiamento Imobiliário' },
  { id: 'c1170228-8b93-4e76-89be-8497ae377838', name: 'Financiamento Auto' },
  { id: '720ef188-5144-4b33-bc8c-31c10c6c385e', name: 'Crédito com Colateral XP' },
  { id: '1995225c-a7b8-419c-970f-5249318bc668', name: 'Carta Contemplada Auto' },
  { id: 'f9935793-619d-4c3c-a57f-80288eed696e', name: 'Carta Contemplada Imobiliário' },
];

const FILTER_TYPE_OPTIONS = [
  { value: 'product', label: 'Produto (categoria)' },
  { value: 'marital_status', label: 'Estado Civil' },
  { value: 'gender', label: 'Gênero' },
  { value: 'goal_type', label: 'Objetivo/Sonho cadastrado' },
];

const MARITAL_STATUS_OPTIONS = [
  { value: 'solteiro', label: 'Solteiro(a)' },
  { value: 'casado', label: 'Casado(a)' },
  { value: 'divorciado', label: 'Divorciado(a)' },
  { value: 'viuvo', label: 'Viúvo(a)' },
  { value: 'uniao_estavel', label: 'União Estável' },
];

const GENDER_OPTIONS = [
  { value: 'masculino', label: 'Masculino' },
  { value: 'feminino', label: 'Feminino' },
];

const GOAL_TYPE_OPTIONS = [
  { value: 'aposentadoria', label: 'Aposentadoria' },
  { value: 'compra_imovel', label: 'Compra de Imóvel' },
  { value: 'educacao_filhos', label: 'Educação dos Filhos' },
  { value: 'viagem', label: 'Viagem' },
  { value: 'reserva_emergencia', label: 'Reserva de Emergência' },
  { value: 'independencia_financeira', label: 'Independência Financeira' },
  { value: 'compra_veiculo', label: 'Compra de Veículo' },
  { value: 'outros', label: 'Outros' },
];

interface RuleConfigSectionProps {
  ruleType: string;
  setRuleType: (v: string) => void;
  healthThreshold: string;
  setHealthThreshold: (v: string) => void;
  daysBefore: string;
  setDaysBefore: (v: string) => void;
  // Client characteristic
  filterType: string;
  setFilterType: (v: string) => void;
  filterOperator: string;
  setFilterOperator: (v: string) => void;
  filterValue: string;
  setFilterValue: (v: string) => void;
}

export function RuleConfigSection({
  ruleType, setRuleType,
  healthThreshold, setHealthThreshold,
  daysBefore, setDaysBefore,
  filterType, setFilterType,
  filterOperator, setFilterOperator,
  filterValue, setFilterValue,
}: RuleConfigSectionProps) {
  return (
    <div className="space-y-3">
      <div>
        <Label>Regra</Label>
        <Select value={ruleType} onValueChange={setRuleType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RULE_OPTIONS.map(r => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1">
          {RULE_OPTIONS.find(r => r.value === ruleType)?.description}
        </p>
      </div>

      {ruleType === 'health_score_critico' && (
        <div>
          <Label htmlFor="threshold">Limite do Health Score</Label>
          <Input id="threshold" type="number" value={healthThreshold} onChange={e => setHealthThreshold(e.target.value)} min="0" max="100" />
          <p className="text-xs text-muted-foreground mt-1">Tarefas serão criadas quando o score for menor que este valor</p>
        </div>
      )}

      {ruleType === 'contrato_vencendo' && (
        <div>
          <Label htmlFor="daysBefore">Dias antes do vencimento</Label>
          <Input id="daysBefore" type="number" value={daysBefore} onChange={e => setDaysBefore(e.target.value)} min="1" max="180" />
          <p className="text-xs text-muted-foreground mt-1">Quantos dias antes do vencimento a tarefa deve ser criada</p>
        </div>
      )}

      {ruleType === 'client_characteristic' && (
        <div className="space-y-3">
          <div>
            <Label>Tipo de filtro</Label>
            <Select value={filterType} onValueChange={(v) => { setFilterType(v); setFilterValue(''); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FILTER_TYPE_OPTIONS.map(f => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filterType === 'product' && (
            <>
              <div>
                <Label>Condição</Label>
                <Select value={filterOperator} onValueChange={setFilterOperator}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="has">Possui</SelectItem>
                    <SelectItem value="not_has">Não possui</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Categoria de produto</Label>
                <Select value={filterValue} onValueChange={setFilterValue}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {PRODUCT_CATEGORIES.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {filterType === 'marital_status' && (
            <div>
              <Label>Estado civil</Label>
              <Select value={filterValue} onValueChange={setFilterValue}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {MARITAL_STATUS_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {filterType === 'gender' && (
            <div>
              <Label>Gênero</Label>
              <Select value={filterValue} onValueChange={setFilterValue}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {GENDER_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {filterType === 'goal_type' && (
            <div>
              <Label>Tipo de objetivo</Label>
              <Select value={filterValue} onValueChange={setFilterValue}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {GOAL_TYPE_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
