import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Target, Plus, ChevronDown, ChevronRight, Flag, CheckCircle2, Circle, CalendarIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import {
  useClientGoals,
  useGoalMilestones,
  useCreateMilestone,
  useUpdateMilestone,
  
  ClientGoal,
  GoalMilestone,
} from '@/hooks/useClientGoals';
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

const MILESTONE_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendente' },
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'completed', label: 'Concluído' },
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
  }).format(value);
}

export function ClientGoalsSection({ contactId }: ClientGoalsSectionProps) {
  const { data: goals = [], isLoading: goalsLoading } = useClientGoals(contactId);
  const { data: milestones = [], isLoading: milestonesLoading } = useGoalMilestones(contactId);
  const createMilestone = useCreateMilestone();
  const updateMilestone = useUpdateMilestone();
  

  const [expandedGoals, setExpandedGoals] = useState<Set<number>>(new Set());
  const [addModalGoal, setAddModalGoal] = useState<ClientGoal | null>(null);

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
        // Auto-expand the goal
        setExpandedGoals(prev => new Set(prev).add(addModalGoal.index));
      },
      onError: () => toast.error('Erro ao cadastrar marco'),
    });
  };

  const handleToggleStatus = (milestone: GoalMilestone) => {
    const nextStatus = milestone.status === 'completed' ? 'pending' : 'completed';
    updateMilestone.mutate({
      id: milestone.id,
      contactId,
      status: nextStatus,
      completed_at: nextStatus === 'completed' ? new Date().toISOString() : null,
    });
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
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {goals.map((goal) => {
            const goalMilestones = milestones.filter(m => m.goal_index === goal.index);
            const completedCount = goalMilestones.filter(m => m.status === 'completed').length;
            const totalMilestones = goalMilestones.length;
            const progressPercent = totalMilestones > 0 ? Math.round((completedCount / totalMilestones) * 100) : 0;
            const isExpanded = expandedGoals.has(goal.index);

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
                          {totalMilestones > 0 && (
                            <span className="flex items-center gap-1">
                              <Flag className="h-3 w-3" />
                              {completedCount}/{totalMilestones} marcos
                            </span>
                          )}
                        </div>
                      </div>
                      {totalMilestones > 0 && (
                        <div className="w-16 shrink-0">
                          <Progress value={progressPercent} className="h-1.5" />
                        </div>
                      )}
                    </button>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="border-t px-4 py-3 space-y-2 bg-muted/20">
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
    </>
  );
}
