import { useState } from 'react';
import { format, parseISO, differenceInMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Target, Plus, ChevronDown, ChevronRight, Flag, CheckCircle2, Circle, CalendarIcon, Lock, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  useClientGoals,
  useGoalMilestones,
  useCreateMilestone,
  useUpdateMilestone,
  ClientGoal,
  GoalMilestone,
} from '@/hooks/useClientGoals';
import { MilestoneProofDialog } from './MilestoneProofDialog';
import { toast } from 'sonner';

interface ClientGoalsSectionProps {
  contactId: string;
}

const MILESTONE_TITLES = [
  'Reserva inicial constituída',
  'Primeiro aporte realizado',
  'Meta parcial atingida (25%)',
  'Meta parcial atingida (50%)',
  'Meta parcial atingida (75%)',
  'Contratação realizada',
  'Documentação concluída',
  'Aprovação de crédito',
  'Entrada paga',
  'Primeira parcela paga',
  'Pesquisa de mercado concluída',
  'Proposta aceita',
  'Renegociação concluída',
  'Investimento alocado',
  'Revisão de portfólio',
  'Outros',
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
  }).format(value);
}

/** Returns true if goal has >= 24 months until target_date from today */
function isLongTermGoal(goal: ClientGoal): boolean {
  if (!goal.target_date) return false;
  try {
    const target = parseISO(goal.target_date);
    const months = differenceInMonths(target, new Date());
    return months >= 24;
  } catch {
    return false;
  }
}

const GOAL_EVIDENCE_RULES = [
  { category: 'Adquirir Bem', examples: 'Comprar casa, apartamento, carro, moto, terreno, imóvel de veraneio, reformar imóvel', evidence: 'Contrato de compra, nota fiscal, comprovante de pagamento, registro do bem, foto do bem adquirido' },
  { category: 'Quitar Dívidas', examples: 'Quitar financiamento, quitar cartão de crédito, renegociar dívidas, limpar nome no Serasa', evidence: 'Comprovante de quitação, declaração de baixa de dívida, extrato de conta sem débitos, print de CPF sem restrições' },
  { category: 'Reserva de Emergência', examples: 'Criar ou completar reserva de emergência, alcançar valor definido de segurança financeira', evidence: 'Print de extrato de conta ou investimento com saldo atingido, planilha de metas cumpridas, evidência de constituição da reserva' },
  { category: 'Aumentar Patrimônio / Investimentos', examples: 'Ampliar carteira de investimentos, diversificar aplicações, atingir valor-alvo em conta', evidence: 'Print de extrato, relatório de corretora, histórico de aportes, gráfico de evolução de saldo' },
  { category: 'Aposentadoria / Independência Financeira', examples: 'Planejar aposentadoria, garantir renda passiva, atingir estabilidade financeira', evidence: 'Print de carteira consolidada, plano de renda mensal atingido, comprovante de adesão à previdência, planilha de metas cumpridas' },
  { category: 'Proteger Patrimônio', examples: 'Contratar seguro de vida, previdência privada, seguro residencial, plano sucessório', evidence: 'Apólice, comprovante de adesão, print de vigência, documentação do plano' },
  { category: 'Experiência Pessoal', examples: 'Viagem nacional ou internacional, intercâmbio, projeto pessoal, festa, participação em evento', evidence: 'Passagem, reserva de hospedagem, recibo de agência, comprovante de inscrição, foto ou print do evento' },
  { category: 'Desenvolvimento Pessoal', examples: 'Formação, pagar faculdade, curso de especialização, MBA, intercâmbio educacional', evidence: 'Comprovante de matrícula, pagamento de mensalidade, certificado, e-mail de confirmação' },
  { category: 'Empreendedorismo', examples: 'Abrir o próprio negócio, investir em franquia, sair do emprego para empreender', evidence: 'CNPJ aberto, comprovante de investimento inicial, contrato social, nota fiscal da primeira venda' },
  { category: 'Outros Sonhos Pessoais', examples: 'Adotar um pet, mudar de cidade, realizar sonho familiar, causas pessoais', evidence: 'Evidência que demonstre o atingimento (foto, print, e-mail, declaração do cliente etc.)' },
];

export function ClientGoalsSection({ contactId }: ClientGoalsSectionProps) {
  const { data: goals = [], isLoading: goalsLoading } = useClientGoals(contactId);
  const { data: milestones = [], isLoading: milestonesLoading } = useGoalMilestones(contactId);
  const createMilestone = useCreateMilestone();
  const updateMilestone = useUpdateMilestone();

  const [expandedGoals, setExpandedGoals] = useState<Set<number>>(new Set());
  const [addModalGoal, setAddModalGoal] = useState<ClientGoal | null>(null);
  const [proofMilestone, setProofMilestone] = useState<GoalMilestone | null>(null);
  const [completingGoal, setCompletingGoal] = useState<ClientGoal | null>(null);
  const [showRules, setShowRules] = useState(false);

  // New milestone form state
  const [newTitle, setNewTitle] = useState('');
  const [newCustomTitle, setNewCustomTitle] = useState('');
  const [newTargetValue, setNewTargetValue] = useState('');
  const [newTargetDate, setNewTargetDate] = useState('');

  const toggleGoal = (index: number) => {
    setExpandedGoals(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const openAddModal = (goal: ClientGoal) => {
    setAddModalGoal(goal);
    setNewTitle('');
    setNewCustomTitle('');
    setNewTargetValue('');
    setNewTargetDate('');
  };

  const handleSaveMilestone = () => {
    if (!addModalGoal) return;
    const title = newTitle === 'Outros' ? newCustomTitle : newTitle;
    if (!title || !newTargetDate) {
      toast.error('Preencha o título e a data do marco');
      return;
    }

    createMilestone.mutate({
      contact_id: contactId,
      goal_index: addModalGoal.index,
      goal_name: addModalGoal.goal_type || addModalGoal.name,
      title,
      target_value: newTargetValue ? parseFloat(newTargetValue.replace(/\./g, '').replace(',', '.')) : null,
      target_date: newTargetDate,
      notes: null,
    }, {
      onSuccess: () => {
        toast.success('Marco cadastrado!');
        setAddModalGoal(null);
        setExpandedGoals(prev => new Set(prev).add(addModalGoal.index));
      },
      onError: () => toast.error('Erro ao cadastrar marco'),
    });
  };

  const handleToggleStatus = (milestone: GoalMilestone) => {
    if (milestone.status === 'completed') {
      updateMilestone.mutate({
        id: milestone.id,
        contactId,
        status: 'pending',
        completed_at: null,
      });
    } else {
      setProofMilestone(milestone);
    }
  };

  const handleCompleteShortTermGoal = (goal: ClientGoal) => {
    // Find or create a milestone for this short-term goal
    const existing = milestones.find(m => m.goal_index === goal.index);
    if (existing) {
      if (existing.status === 'completed') {
        updateMilestone.mutate({
          id: existing.id,
          contactId,
          status: 'pending',
          completed_at: null,
        });
      } else {
        setProofMilestone(existing);
      }
    } else {
      // Create a milestone first, then open proof dialog
      setCompletingGoal(goal);
      createMilestone.mutate({
        contact_id: contactId,
        goal_index: goal.index,
        goal_name: goal.goal_type || goal.name,
        title: goal.name || goal.goal_type || 'Conclusão do objetivo',
        target_value: goal.target_value_brl || null,
        target_date: goal.target_date || new Date().toISOString().split('T')[0],
        notes: null,
      }, {
        onSuccess: (data) => {
          setCompletingGoal(null);
          setProofMilestone(data as unknown as GoalMilestone);
        },
        onError: () => {
          setCompletingGoal(null);
          toast.error('Erro ao registrar conclusão');
        },
      });
    }
  };

  const isLoading = goalsLoading || milestonesLoading;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="h-20 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  if (goals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-5 w-5" />
            Objetivos do Cliente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            Nenhum objetivo cadastrado na coleta de dados
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-5 w-5" />
            Objetivos do Cliente
            <Badge variant="secondary" className="ml-1">{goals.length}</Badge>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={() => setShowRules(true)} className="ml-auto p-1 rounded-md hover:bg-muted transition-colors">
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Regras e evidências aceitas</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {goals.map((goal) => {
            const goalMilestones = milestones.filter(m => m.goal_index === goal.index);
            const completedCount = goalMilestones.filter(m => m.status === 'completed').length;
            const totalMilestones = goalMilestones.length;
            const progressPercent = totalMilestones > 0 ? Math.round((completedCount / totalMilestones) * 100) : 0;
            const isExpanded = expandedGoals.has(goal.index);
            const longTerm = isLongTermGoal(goal);

            return (
              <Collapsible key={goal.index} open={isExpanded} onOpenChange={() => toggleGoal(goal.index)}>
                <div className="border rounded-lg overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs shrink-0">
                            {goal.goal_type || 'Sem tipo'}
                          </Badge>
                          <span className="font-medium text-sm truncate">
                            {goal.name || goal.goal_type}
                          </span>
                          {!longTerm && (
                            <Badge variant="secondary" className="text-[10px]">
                              Curto prazo
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {goal.target_value_brl > 0 && (
                            <span>{formatCurrency(goal.target_value_brl)}</span>
                          )}
                          {goal.target_date && (
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3" />
                              {format(parseISO(goal.target_date), "MMM/yyyy", { locale: ptBR })}
                            </span>
                          )}
                          {longTerm && totalMilestones > 0 && (
                            <span className="flex items-center gap-1">
                              <Flag className="h-3 w-3" />
                              {completedCount}/{totalMilestones} marcos
                            </span>
                          )}
                        </div>
                      </div>
                      {longTerm && totalMilestones > 0 && (
                        <div className="w-16 shrink-0">
                          <Progress value={progressPercent} className="h-1.5" />
                        </div>
                      )}
                    </button>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="border-t px-4 py-3 space-y-2 bg-muted/20">
                      {!longTerm ? (
                        (() => {
                          const goalMilestone = milestones.find(m => m.goal_index === goal.index);
                          const isCompleted = goalMilestone?.status === 'completed';
                          return (
                            <div className="space-y-3 py-3">
                              <div className="flex items-center gap-2 justify-center text-muted-foreground">
                                <Lock className="h-4 w-4" />
                                <p className="text-xs text-center">
                                  Sonhos com prazo inferior a 24 meses são contabilizados como realização única, sem marcos intermediários.
                                </p>
                              </div>
                              {isCompleted ? (
                                <div className="flex items-center justify-between p-3 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                                  <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                    <div>
                                      <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Objetivo concluído</p>
                                      {goalMilestone?.completed_at && (
                                        <p className="text-xs text-muted-foreground">
                                          em {format(parseISO(goalMilestone.completed_at), "dd/MM/yyyy")}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs"
                                    onClick={() => handleCompleteShortTermGoal(goal)}
                                  >
                                    Desfazer
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full"
                                  disabled={completingGoal?.index === goal.index}
                                  onClick={() => handleCompleteShortTermGoal(goal)}
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                  {completingGoal?.index === goal.index ? 'Registrando...' : 'Marcar como Concluído'}
                                </Button>
                              )}
                            </div>
                          );
                        })()
                      ) : (
                        <>
                          {goalMilestones.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-2">
                              Nenhum marco cadastrado
                            </p>
                          ) : (
                            goalMilestones.map((milestone) => (
                              <div
                                key={milestone.id}
                                className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 group"
                              >
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={() => handleToggleStatus(milestone)}
                                        className="shrink-0"
                                      >
                                        {milestone.status === 'completed' ? (
                                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                        ) : (
                                          <Circle className="h-5 w-5 text-muted-foreground" />
                                        )}
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {milestone.status === 'completed' ? 'Desfazer conclusão' : 'Concluir com comprovação'}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <div className="flex-1 min-w-0">
                                  <p className={cn(
                                    "text-sm font-medium",
                                    milestone.status === 'completed' && "line-through text-muted-foreground"
                                  )}>
                                    {milestone.title}
                                  </p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>{format(parseISO(milestone.target_date), "dd/MM/yyyy")}</span>
                                    {milestone.target_value && (
                                      <span>• {formatCurrency(Number(milestone.target_value))}</span>
                                    )}
                                    {milestone.status === 'completed' && milestone.completed_at && (
                                      <Badge variant="secondary" className="text-[10px] h-4">
                                        Concluído em {format(parseISO(milestone.completed_at), "dd/MM/yy")}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-1"
                            onClick={() => openAddModal(goal)}
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Adicionar Marco
                          </Button>
                        </>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </CardContent>
      </Card>

      {/* Add Milestone Modal */}
      <Dialog open={!!addModalGoal} onOpenChange={(open) => !open && setAddModalGoal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Marco Intermediário</DialogTitle>
            <DialogDescription>
              {addModalGoal && (
                <span>Objetivo: <strong>{addModalGoal.goal_type || addModalGoal.name}</strong></span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Título do marco</Label>
              <Select value={newTitle} onValueChange={setNewTitle}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {MILESTONE_TITLES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {newTitle === 'Outros' && (
                <Input
                  placeholder="Descreva o marco..."
                  value={newCustomTitle}
                  onChange={(e) => setNewCustomTitle(e.target.value)}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label>Valor alvo (opcional)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                <Input
                  className="pl-10"
                  placeholder="0,00"
                  value={newTargetValue}
                  onChange={(e) => {
                    const numbers = e.target.value.replace(/\D/g, '');
                    const amount = parseFloat(numbers) / 100;
                    if (isNaN(amount) || numbers === '') {
                      setNewTargetValue('');
                    } else {
                      setNewTargetValue(amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
                    }
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Data alvo</Label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="date"
                  className="pl-10"
                  value={newTargetDate}
                  onChange={(e) => setNewTargetDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddModalGoal(null)}>Cancelar</Button>
            <Button
              onClick={handleSaveMilestone}
              disabled={(!newTitle || (newTitle === 'Outros' && !newCustomTitle)) || !newTargetDate || createMilestone.isPending}
            >
              {createMilestone.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Proof Dialog */}
      {proofMilestone && (
        <MilestoneProofDialog
          open={!!proofMilestone}
          onOpenChange={(open) => !open && setProofMilestone(null)}
          milestone={proofMilestone}
          contactId={contactId}
        />
      )}
      {/* Rules Dialog */}
      <Dialog open={showRules} onOpenChange={setShowRules}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Regras de Objetivos e Evidências</DialogTitle>
            <DialogDescription>
              Tipos de objetivos e as evidências aceitas para comprovação de conclusão.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <div className="rounded-md border text-sm">
              <div className="grid grid-cols-[140px_1fr_1fr] gap-0 border-b bg-muted/50 font-medium">
                <div className="p-2 border-r">Categoria</div>
                <div className="p-2 border-r">Exemplos</div>
                <div className="p-2">Evidências Aceitas</div>
              </div>
              {GOAL_EVIDENCE_RULES.map((rule) => (
                <div key={rule.category} className="grid grid-cols-[140px_1fr_1fr] gap-0 border-b last:border-b-0">
                  <div className="p-2 border-r font-medium text-xs">{rule.category}</div>
                  <div className="p-2 border-r text-xs text-muted-foreground">{rule.examples}</div>
                  <div className="p-2 text-xs text-muted-foreground">{rule.evidence}</div>
                </div>
              ))}
            </div>
            <div className="rounded-md bg-muted/50 p-3 space-y-1.5 text-xs text-muted-foreground">
              <p className="font-medium text-foreground text-sm">Regras gerais</p>
              <p>• Sonhos com prazo inferior a 24 meses são contabilizados como realização única, sem marcos intermediários.</p>
              <p>• Sonhos com prazo igual ou superior a 24 meses permitem o cadastro de marcos intermediários.</p>
              <p>• Toda conclusão (marco ou realização) exige o envio de comprovação: texto, imagem ou arquivo.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
