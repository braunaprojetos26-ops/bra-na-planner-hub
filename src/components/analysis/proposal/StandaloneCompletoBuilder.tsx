import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Eye } from 'lucide-react';
import { 
  calculateProposalPricing, 
  formatCurrency, 
  parseCurrencyInput,
  formatCurrencyInput,
} from '@/lib/proposalPricing';
import type { Proposal } from '@/hooks/useProposals';

interface StandaloneCompletoBuilderProps {
  onPresent: (proposal: Proposal, clientName: string) => void;
}

export function StandaloneCompletoBuilder({ onPresent }: StandaloneCompletoBuilderProps) {
  const [clientName, setClientName] = useState('');
  const [plannerName, setPlannerName] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [complexity, setComplexity] = useState('3');
  const [meetings, setMeetings] = useState<'4' | '6' | '9' | '12'>('6');
  const [monthsOfIncome, setMonthsOfIncome] = useState('1');
  const [installments, setInstallments] = useState('12');
  const [discountApplied, setDiscountApplied] = useState(false);

  const pricing = useMemo(() => {
    const incomeValue = parseCurrencyInput(monthlyIncome);
    if (incomeValue <= 0) return null;

    return calculateProposalPricing({
      monthlyIncome: incomeValue,
      monthsOfIncome: parseFloat(monthsOfIncome) || 1,
      complexity: parseInt(complexity),
      meetings: parseInt(meetings) as 4 | 6 | 9 | 12,
      discountApplied,
    }, parseInt(installments));
  }, [monthlyIncome, monthsOfIncome, complexity, meetings, discountApplied, installments]);

  const handleMonthlyIncomeChange = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers === '') {
      setMonthlyIncome('');
      return;
    }
    const numValue = parseFloat(numbers) / 100;
    setMonthlyIncome(formatCurrencyInput(numValue));
  };

  const handlePresent = () => {
    if (!pricing || !clientName.trim()) return;
    const incomeValue = parseCurrencyInput(monthlyIncome);

    // Build a Proposal-like object in memory (no DB)
    const fakeProposal: Proposal = {
      id: 'standalone',
      contact_id: '',
      opportunity_id: null,
      created_by: '',
      proposal_type: 'planejamento_completo',
      complexity: parseInt(complexity),
      meetings: parseInt(meetings),
      months_of_income: parseFloat(monthsOfIncome),
      installments: parseInt(installments),
      discount_applied: discountApplied,
      monthly_income: incomeValue,
      base_value: pricing.baseValue,
      final_value: pricing.finalValue,
      installment_value: pricing.installmentValue,
      diagnostic_score: null,
      diagnostic_scores: {},
      show_feedbacks: false,
      show_cases: false,
      selected_topics: null as any,
      status: 'draft',
      presented_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Store planner name for presentation
    (fakeProposal as any).__plannerName = plannerName.trim() || undefined;

    onPresent(fakeProposal, clientName.trim());
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configurar Proposta — Planejamento Completo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clientName">Nome do Cliente *</Label>
              <Input
                id="clientName"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Nome completo do cliente"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="plannerName">Seu Nome (Planejador)</Label>
              <Input
                id="plannerName"
                value={plannerName}
                onChange={(e) => setPlannerName(e.target.value)}
                placeholder="Nome que aparecerá na proposta"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthlyIncome">Renda Mensal do Cliente *</Label>
              <Input
                id="monthlyIncome"
                value={monthlyIncome}
                onChange={(e) => handleMonthlyIncomeChange(e.target.value)}
                placeholder="R$ 0,00"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthsOfIncome">Meses de Renda</Label>
              <Select value={monthsOfIncome} onValueChange={setMonthsOfIncome}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 15 }, (_, i) => i + 1).map((val) => (
                    <SelectItem key={val} value={String(val)}>
                      {val} {val === 1 ? 'mês' : 'meses'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="complexity">Complexidade</Label>
              <Select value={complexity} onValueChange={setComplexity}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((val) => (
                    <SelectItem key={val} value={String(val)}>
                      Nível {val}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="meetings">Número de Reuniões</Label>
              <Select value={meetings} onValueChange={(v) => setMeetings(v as '4' | '6' | '9' | '12')}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[4, 6, 9, 12].map((val) => (
                    <SelectItem key={val} value={String(val)}>
                      {val} reuniões
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="installments">Parcelamento</Label>
              <Select value={installments} onValueChange={setInstallments}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((val) => (
                    <SelectItem key={val} value={String(val)}>
                      {val}x
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 pt-6">
              <Checkbox
                id="discount"
                checked={discountApplied}
                onCheckedChange={(checked) => setDiscountApplied(checked === true)}
              />
              <Label htmlFor="discount" className="font-normal cursor-pointer">
                Aplicar 10% de desconto
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Table */}
      {pricing && (
        <Card>
          <CardHeader>
            <CardTitle>Simulação de Parcelamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parcelas</TableHead>
                    <TableHead>Valor da Parcela</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pricing.installmentTable.map((row) => (
                    <TableRow 
                      key={row.installments}
                      className={row.installments === parseInt(installments) ? 'bg-accent/10' : ''}
                    >
                      <TableCell className="font-medium">{row.installments}x</TableCell>
                      <TableCell>{formatCurrency(row.installmentValue)}</TableCell>
                      <TableCell>{formatCurrency(row.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 p-4 bg-muted rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Valor selecionado:</span>
                <span className="text-xl font-bold">
                  {installments}x de {formatCurrency(pricing.installmentValue)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Button */}
      <div className="flex justify-end">
        <Button
          onClick={handlePresent}
          disabled={!pricing || !clientName.trim()}
          size="lg"
        >
          <Eye className="w-4 h-4 mr-2" />
          Apresentar Proposta
        </Button>
      </div>
    </div>
  );
}
