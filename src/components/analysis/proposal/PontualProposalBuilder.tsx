import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
  Loader2, Eye, Save, TrendingUp, ArrowLeft, Check,
  CreditCard, Plane, Award, PieChart, Home, ArrowRightLeft,
  Shield, Sunset, Car, BarChart3, Landmark, GraduationCap,
  Receipt, FileText, AlertCircle
} from 'lucide-react';
import { useContact } from '@/hooks/useContacts';
import { useContactDataCollection } from '@/hooks/useContactDataCollection';
import { useContactDiagnostic } from '@/hooks/useContactDiagnostic';
import { useProposalMutations, useContactProposals } from '@/hooks/useProposals';
import { useMyFeedbacks } from '@/hooks/usePlannerFeedbacks';
import { useMyCases } from '@/hooks/usePlannerCases';
import { formatCurrency, parseCurrencyInput, formatCurrencyInput } from '@/lib/proposalPricing';
import { 
  PONTUAL_TOPICS, 
  calculatePontualPricing, 
  getTotalMeetingsFromTopics,
  validateTopicSelection,
  type SelectedTopic 
} from '@/lib/pontualTopics';
import { PontualProposalPresentation } from './PontualProposalPresentation';
import { cn } from '@/lib/utils';
import type { Proposal } from '@/hooks/useProposals';
import type { Json } from '@/integrations/supabase/types';

// Icon mapping
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  CreditCard,
  Plane,
  Award,
  PieChart,
  Home,
  ArrowRightLeft,
  Shield,
  Sunset,
  Car,
  BarChart3,
  Landmark,
  GraduationCap,
  Receipt,
  FileText,
};

interface PontualProposalBuilderProps {
  contactId: string;
  opportunityId?: string | null;
  onBack: () => void;
}

export function PontualProposalBuilder({ contactId, opportunityId, onBack }: PontualProposalBuilderProps) {
  const { data: contact } = useContact(contactId);
  const { data: dataCollection } = useContactDataCollection(contactId);
  const { data: diagnostic } = useContactDiagnostic(contactId, true);
  const { data: proposals } = useContactProposals(contactId);
  const { data: myFeedbacks } = useMyFeedbacks();
  const { data: myCases } = useMyCases();
  const { createProposal, updateProposal } = useProposalMutations();

  // Form state
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<SelectedTopic[]>([]);
  const [installments, setInstallments] = useState('1');
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

  // Load existing draft pontual proposal if any
  useEffect(() => {
    if (proposals && proposals.length > 0) {
      const draftProposal = proposals.find(
        p => p.status === 'draft' && p.proposal_type === 'planejamento_pontual'
      );
      if (draftProposal) {
        setCurrentProposal(draftProposal);
        setMonthlyIncome(formatCurrencyInput(draftProposal.monthly_income));
        setInstallments(String(draftProposal.installments));
        setShowFeedbacks(draftProposal.show_feedbacks);
        setShowCases(draftProposal.show_cases);
        
        // Parse selected_topics from proposal
        if (draftProposal.selected_topics) {
          const topics = draftProposal.selected_topics as unknown as SelectedTopic[];
          if (Array.isArray(topics)) {
            setSelectedTopics(topics);
          }
        }
      }
    }
  }, [proposals]);

  // Calculate derived values
  const totalMeetings = useMemo(() => getTotalMeetingsFromTopics(selectedTopics), [selectedTopics]);
  const validation = useMemo(() => validateTopicSelection(selectedTopics), [selectedTopics]);
  
  const pricing = useMemo(() => {
    const incomeValue = parseCurrencyInput(monthlyIncome);
    if (incomeValue <= 0 || totalMeetings === 0) return null;
    return calculatePontualPricing(incomeValue, totalMeetings, parseInt(installments));
  }, [monthlyIncome, totalMeetings, installments]);

  const handleMonthlyIncomeChange = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers === '') {
      setMonthlyIncome('');
      return;
    }
    const numValue = parseFloat(numbers) / 100;
    setMonthlyIncome(formatCurrencyInput(numValue));
  };

  const toggleTopic = (topicName: string) => {
    const existingIndex = selectedTopics.findIndex(t => t.topic === topicName);
    
    if (existingIndex >= 0) {
      // Remove topic
      setSelectedTopics(prev => prev.filter(t => t.topic !== topicName));
    } else {
      // Add topic with 1 meeting (if under limits)
      if (selectedTopics.length >= 3) return;
      if (totalMeetings >= 3) return;
      
      setSelectedTopics(prev => [...prev, { topic: topicName, meetings: 1 }]);
    }
  };

  const updateTopicMeetings = (topicName: string, meetings: number) => {
    const otherMeetings = selectedTopics
      .filter(t => t.topic !== topicName)
      .reduce((sum, t) => sum + t.meetings, 0);
    
    // Ensure total doesn't exceed 3
    const maxAllowed = 3 - otherMeetings;
    const actualMeetings = Math.min(meetings, maxAllowed);
    
    setSelectedTopics(prev =>
      prev.map(t => t.topic === topicName ? { ...t, meetings: actualMeetings } : t)
    );
  };

  const handleSave = async (openPresentation = false) => {
    if (!pricing || !validation.valid) return;

    setIsSaving(true);
    const incomeValue = parseCurrencyInput(monthlyIncome);

    const proposalData = {
      contact_id: contactId,
      opportunity_id: opportunityId,
      proposal_type: 'planejamento_pontual',
      complexity: 1, // Not used for pontual
      meetings: totalMeetings,
      months_of_income: 1, // Not used for pontual
      installments: parseInt(installments),
      discount_applied: false,
      monthly_income: incomeValue,
      base_value: pricing.totalValue,
      final_value: pricing.totalValue,
      installment_value: pricing.totalValue / parseInt(installments),
      diagnostic_score: diagnostic?.overall_score || null,
      diagnostic_scores: diagnostic?.category_scores || {},
      show_feedbacks: showFeedbacks,
      show_cases: showCases,
      selected_topics: selectedTopics as unknown as Json,
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
      <PontualProposalPresentation
        proposal={currentProposal}
        contact={contact}
        diagnostic={diagnostic}
        selectedTopics={selectedTopics}
        onBack={() => setShowPresentation(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar para seleção
      </Button>

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

      {/* Income Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Planejamento Pontual
            {contact && <Badge variant="secondary">{contact.full_name}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
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
                {pricing.meetingValue === 500 && (
                  <span className="text-xs ml-1">(mínimo)</span>
                )}
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
                      <IconComponent className={cn(
                        'w-5 h-5',
                        isSelected ? 'text-primary' : 'text-muted-foreground'
                      )} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn(
                          'font-medium truncate',
                          isSelected && 'text-primary'
                        )}>
                          {topic.name}
                        </p>
                        {isSelected && (
                          <Check className="w-4 h-4 text-primary shrink-0" />
                        )}
                      </div>
                      
                      {isSelected && selectedTopic && (
                        <div 
                          className="mt-2" 
                          onClick={(e) => e.stopPropagation()}
                        >
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
                                const disabled = n > (3 - otherMeetings);
                                return (
                                  <SelectItem 
                                    key={n} 
                                    value={String(n)} 
                                    disabled={disabled}
                                  >
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

      {/* Selected Topics Summary */}
      {selectedTopics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resumo da Proposta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {selectedTopics.map((selected) => {
                const topic = PONTUAL_TOPICS.find(t => t.name === selected.topic);
                if (!topic) return null;
                
                return (
                  <div key={selected.topic} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span className="font-medium">{selected.topic}</span>
                    <Badge variant="secondary">{selected.meetings} reunião{selected.meetings > 1 ? 'ões' : ''}</Badge>
                  </div>
                );
              })}
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

      {/* Installments and Payment */}
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
              <p className="text-xs text-muted-foreground mt-2">
                * Não disponível pagamento via assinatura/recorrência
              </p>
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

      {/* Display Options */}
      <Card>
        <CardContent className="pt-6">
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
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => handleSave(false)}
          disabled={!pricing || !validation.valid || isSaving}
        >
          {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          <Save className="w-4 h-4 mr-2" />
          Salvar Rascunho
        </Button>
        <Button
          onClick={() => handleSave(true)}
          disabled={!pricing || !validation.valid || isSaving}
        >
          {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          <Eye className="w-4 h-4 mr-2" />
          Apresentar Proposta
        </Button>
      </div>
    </div>
  );
}
