import { useState, useEffect, useMemo } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Loader2, Eye, Save, TrendingUp } from 'lucide-react';
import { useContact } from '@/hooks/useContacts';
import { useContactDataCollection } from '@/hooks/useContactDataCollection';
import { useContactDiagnostic } from '@/hooks/useContactDiagnostic';
import { useProposalMutations, useContactProposals } from '@/hooks/useProposals';
import { useMyFeedbacks } from '@/hooks/usePlannerFeedbacks';
import { useMyCases } from '@/hooks/usePlannerCases';
import { 
  calculateProposalPricing, 
  formatCurrency, 
  parseCurrencyInput,
  formatCurrencyInput,
} from '@/lib/proposalPricing';
import { ProposalPresentation } from './ProposalPresentation';
import type { Proposal } from '@/hooks/useProposals';

interface ProposalBuilderProps {
  contactId: string;
  opportunityId?: string | null;
}

export function ProposalBuilder({ contactId, opportunityId }: ProposalBuilderProps) {
  const { data: contact } = useContact(contactId);
  const { data: dataCollection } = useContactDataCollection(contactId);
  const { data: diagnostic } = useContactDiagnostic(contactId, true);
  const { data: proposals } = useContactProposals(contactId);
  const { data: myFeedbacks } = useMyFeedbacks();
  const { data: myCases } = useMyCases();
  const { createProposal, updateProposal } = useProposalMutations();

  // Form state
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [complexity, setComplexity] = useState('3');
  const [meetings, setMeetings] = useState<'4' | '6' | '9' | '12'>('6');
  const [monthsOfIncome, setMonthsOfIncome] = useState('1');
  const [installments, setInstallments] = useState('12');
  const [discountApplied, setDiscountApplied] = useState(false);
  const [showFeedbacks, setShowFeedbacks] = useState(false);
  const [showCases, setShowCases] = useState(false);
  
  // UI state
  const [showPresentation, setShowPresentation] = useState(false);
  const [currentProposal, setCurrentProposal] = useState<Proposal | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Pre-fill data from data collection
  useEffect(() => {
    if (dataCollection?.data_collection) {
      const data = dataCollection.data_collection as Record<string, unknown>;
      const cashFlow = data.cash_flow as Record<string, unknown> | undefined;
      
      if (cashFlow?.income) {
        const income = Number(cashFlow.income);
        if (!isNaN(income) && income > 0) {
          setMonthlyIncome(formatCurrencyInput(income));
        }
      }
    }
  }, [dataCollection]);

  // Load existing draft proposal if any
  useEffect(() => {
    if (proposals && proposals.length > 0) {
      const draftProposal = proposals.find(p => p.status === 'draft');
      if (draftProposal) {
        setCurrentProposal(draftProposal);
        setMonthlyIncome(formatCurrencyInput(draftProposal.monthly_income));
        setComplexity(String(draftProposal.complexity));
        setMeetings(String(draftProposal.meetings) as '4' | '6' | '9' | '12');
        setMonthsOfIncome(String(draftProposal.months_of_income));
        setInstallments(String(draftProposal.installments));
        setDiscountApplied(draftProposal.discount_applied);
        setShowFeedbacks(draftProposal.show_feedbacks);
        setShowCases(draftProposal.show_cases);
      }
    }
  }, [proposals]);

  // Calculate pricing in real-time
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

  const handleSave = async (openPresentation = false) => {
    if (!pricing) return;

    setIsSaving(true);
    const incomeValue = parseCurrencyInput(monthlyIncome);

    const proposalData = {
      contact_id: contactId,
      opportunity_id: opportunityId,
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
      diagnostic_score: diagnostic?.overall_score || null,
      diagnostic_scores: diagnostic?.category_scores || {},
      show_feedbacks: showFeedbacks,
      show_cases: showCases,
    };

    try {
      if (currentProposal) {
        const updated = await updateProposal.mutateAsync({
          id: currentProposal.id,
          ...proposalData,
        });
        setCurrentProposal(updated);
      } else {
        const created = await createProposal.mutateAsync(proposalData);
        setCurrentProposal(created);
      }

      if (openPresentation) {
        setShowPresentation(true);
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (showPresentation && currentProposal) {
    return (
      <ProposalPresentation
        proposal={currentProposal}
        contact={contact}
        diagnostic={diagnostic}
        onBack={() => setShowPresentation(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Diagnostic Score Badge */}
      {diagnostic && (
        <Card className="border-accent/30 bg-accent/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Diagnóstico IA do Cliente</p>
                  <p className="text-2xl font-bold">{diagnostic.overall_score.toFixed(1)}/10</p>
                </div>
              </div>
              <Badge variant="outline" className="text-accent border-accent">
                Saúde Financeira
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Configurar Proposta
            {contact && (
              <Badge variant="secondary">{contact.full_name}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          {/* Display Options */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3">Opções de Exibição na Proposta</p>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="showFeedbacks"
                  checked={showFeedbacks}
                  onCheckedChange={(checked) => setShowFeedbacks(checked === true)}
                  disabled={!myFeedbacks || myFeedbacks.length === 0}
                />
                <Label htmlFor="showFeedbacks" className="font-normal cursor-pointer">
                  Incluir Feedbacks ({myFeedbacks?.length || 0} cadastrados)
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="showCases"
                  checked={showCases}
                  onCheckedChange={(checked) => setShowCases(checked === true)}
                  disabled={!myCases || myCases.length === 0}
                />
                <Label htmlFor="showCases" className="font-normal cursor-pointer">
                  Incluir Cases ({myCases?.length || 0} cadastrados)
                </Label>
              </div>
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

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => handleSave(false)}
          disabled={!pricing || isSaving}
        >
          {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          <Save className="w-4 h-4 mr-2" />
          Salvar Rascunho
        </Button>
        <Button
          onClick={() => handleSave(true)}
          disabled={!pricing || isSaving}
        >
          {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          <Eye className="w-4 h-4 mr-2" />
          Apresentar Proposta
        </Button>
      </div>
    </div>
  );
}
