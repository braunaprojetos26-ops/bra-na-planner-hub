import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { 
  Eye, Check, ArrowLeft,
  CreditCard, Plane, Award, PieChart, Home, ArrowRightLeft,
  Shield, Sunset, Car, BarChart3, Landmark, GraduationCap,
  Receipt, FileText, AlertCircle
} from 'lucide-react';
import { formatCurrency, parseCurrencyInput, formatCurrencyInput } from '@/lib/proposalPricing';
import { 
  PONTUAL_TOPICS, 
  calculatePontualPricing, 
  getTotalMeetingsFromTopics,
  validateTopicSelection,
  type SelectedTopic 
} from '@/lib/pontualTopics';
import { cn } from '@/lib/utils';
import type { Proposal } from '@/hooks/useProposals';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  CreditCard, Plane, Award, PieChart, Home, ArrowRightLeft,
  Shield, Sunset, Car, BarChart3, Landmark, GraduationCap,
  Receipt, FileText,
};

interface StandalonePontualBuilderProps {
  onPresent: (proposal: Proposal, clientName: string, selectedTopics: SelectedTopic[]) => void;
  onBack: () => void;
}

export function StandalonePontualBuilder({ onPresent, onBack }: StandalonePontualBuilderProps) {
  const [clientName, setClientName] = useState('');
  const [plannerName, setPlannerName] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<SelectedTopic[]>([]);
  const [installments, setInstallments] = useState('1');

  const totalMeetings = useMemo(() => getTotalMeetingsFromTopics(selectedTopics), [selectedTopics]);
  const validation = useMemo(() => validateTopicSelection(selectedTopics), [selectedTopics]);
  
  const pricing = useMemo(() => {
    const incomeValue = parseCurrencyInput(monthlyIncome);
    if (incomeValue <= 0 || totalMeetings === 0) return null;
    return calculatePontualPricing(incomeValue, totalMeetings, parseInt(installments));
  }, [monthlyIncome, totalMeetings, installments]);

  const handleMonthlyIncomeChange = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers === '') { setMonthlyIncome(''); return; }
    const numValue = parseFloat(numbers) / 100;
    setMonthlyIncome(formatCurrencyInput(numValue));
  };

  const toggleTopic = (topicName: string) => {
    const existingIndex = selectedTopics.findIndex(t => t.topic === topicName);
    if (existingIndex >= 0) {
      setSelectedTopics(prev => prev.filter(t => t.topic !== topicName));
    } else {
      if (selectedTopics.length >= 3 || totalMeetings >= 3) return;
      setSelectedTopics(prev => [...prev, { topic: topicName, meetings: 1 }]);
    }
  };

  const updateTopicMeetings = (topicName: string, meetings: number) => {
    const otherMeetings = selectedTopics
      .filter(t => t.topic !== topicName)
      .reduce((sum, t) => sum + t.meetings, 0);
    const actualMeetings = Math.min(meetings, 3 - otherMeetings);
    setSelectedTopics(prev =>
      prev.map(t => t.topic === topicName ? { ...t, meetings: actualMeetings } : t)
    );
  };

  const handlePresent = () => {
    if (!pricing || !validation.valid || !clientName.trim()) return;
    const incomeValue = parseCurrencyInput(monthlyIncome);

    const fakeProposal: Proposal = {
      id: 'standalone',
      contact_id: '',
      opportunity_id: null,
      created_by: '',
      proposal_type: 'planejamento_pontual',
      complexity: 1,
      meetings: totalMeetings,
      months_of_income: 1,
      installments: parseInt(installments),
      discount_applied: false,
      monthly_income: incomeValue,
      base_value: pricing.totalValue,
      final_value: pricing.totalValue,
      installment_value: pricing.totalValue / parseInt(installments),
      diagnostic_score: null,
      diagnostic_scores: {},
      show_feedbacks: false,
      show_cases: false,
      selected_topics: selectedTopics as any,
      status: 'draft',
      presented_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    (fakeProposal as any).__plannerName = plannerName.trim() || undefined;

    onPresent(fakeProposal, clientName.trim(), selectedTopics);
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar para seleção
      </Button>

      {/* Client & Planner Info */}
      <Card>
        <CardHeader>
          <CardTitle>Planejamento Pontual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
          </div>
          <div className="max-w-sm">
            <Label htmlFor="monthlyIncome">Renda Mensal do Cliente *</Label>
            <Input
              id="monthlyIncome"
              value={monthlyIncome}
              onChange={(e) => handleMonthlyIncomeChange(e.target.value)}
              placeholder="R$ 0,00"
              className="h-11 mt-2"
            />
            {pricing && (
              <p className="text-sm text-muted-foreground mt-2">
                Valor por reunião: <span className="font-medium text-foreground">{formatCurrency(pricing.meetingValue)}</span>
                {pricing.meetingValue === 500 && <span className="text-xs ml-1">(mínimo)</span>}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Topic Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Selecione os Tópicos</span>
            <div className="flex items-center gap-4 text-sm font-normal">
              <Badge variant={selectedTopics.length <= 3 ? 'outline' : 'destructive'}>
                {selectedTopics.length}/3 tópicos
              </Badge>
              <Badge variant={totalMeetings <= 3 ? 'outline' : 'destructive'}>
                {totalMeetings}/3 reuniões
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {PONTUAL_TOPICS.map((topic) => {
              const IconComponent = ICON_MAP[topic.icon] || FileText;
              const isSelected = selectedTopics.some(t => t.topic === topic.name);
              const selectedTopic = selectedTopics.find(t => t.topic === topic.name);
              const canSelect = isSelected || (selectedTopics.length < 3 && totalMeetings < 3);
              
              return (
                <div
                  key={topic.key}
                  className={cn(
                    'relative rounded-lg border p-4 transition-all duration-200',
                    isSelected 
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20' 
                      : canSelect 
                        ? 'border-border hover:border-primary/50 cursor-pointer' 
                        : 'border-border opacity-50 cursor-not-allowed'
                  )}
                  onClick={() => canSelect && toggleTopic(topic.name)}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                      isSelected ? 'bg-primary/20' : 'bg-muted'
                    )}>
                      <IconComponent className={cn('w-5 h-5', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn('font-medium truncate', isSelected && 'text-primary')}>{topic.name}</p>
                        {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                      </div>
                      {isSelected && selectedTopic && (
                        <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                          <Label className="text-xs">Reuniões para este tópico</Label>
                          <Select 
                            value={String(selectedTopic.meetings)} 
                            onValueChange={(v) => updateTopicMeetings(topic.name, parseInt(v))}
                          >
                            <SelectTrigger className="h-9 mt-1 w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[1, 2, 3].map((n) => {
                                const otherMeetings = selectedTopics
                                  .filter(t => t.topic !== topic.name)
                                  .reduce((sum, t) => sum + t.meetings, 0);
                                return (
                                  <SelectItem key={n} value={String(n)} disabled={n > (3 - otherMeetings)}>
                                    {n} reunião{n > 1 ? 'ões' : ''}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {!validation.valid && validation.error && (
            <div className="mt-4 flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="w-4 h-4" />
              {validation.error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      {selectedTopics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resumo da Proposta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {selectedTopics.map((selected) => (
                <div key={selected.topic} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span className="font-medium">{selected.topic}</span>
                  <Badge variant="secondary">{selected.meetings} reunião{selected.meetings > 1 ? 'ões' : ''}</Badge>
                </div>
              ))}
            </div>
            {pricing && (
              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Valor por reunião:</span>
                  <span>{formatCurrency(pricing.meetingValue)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total de reuniões:</span>
                  <span>{totalMeetings}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Valor Total:</span>
                  <span className="text-primary">{formatCurrency(pricing.totalValue)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment */}
      {pricing && (
        <Card>
          <CardHeader>
            <CardTitle>Forma de Pagamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">PIX</span>
                <span className="text-muted-foreground">– pagamento à vista</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Cartão de Crédito</span>
                <span className="text-muted-foreground">– fatura avulsa (1 a 6x)</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="installments">Parcelamento</Label>
              <Select value={installments} onValueChange={setInstallments}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pricing.installmentTable.map((row) => (
                    <SelectItem key={row.installments} value={String(row.installments)}>
                      {row.installments}x de {formatCurrency(row.installmentValue)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
          </CardContent>
        </Card>
      )}

      {/* Action Button */}
      <div className="flex justify-end">
        <Button
          onClick={handlePresent}
          disabled={!pricing || !validation.valid || !clientName.trim()}
          size="lg"
        >
          <Eye className="w-4 h-4 mr-2" />
          Apresentar Proposta
        </Button>
      </div>
    </div>
  );
}
