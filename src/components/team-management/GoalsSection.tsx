import { useState } from 'react';
import { Plus, Star, Target, Rocket, Check, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  usePlannerGoals,
  useCreatePlannerGoal,
  useUpdatePlannerGoal,
  useDeletePlannerGoal,
  GoalType,
  PlannerGoal,
} from '@/hooks/usePlannerGoals';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface GoalsSectionProps {
  userId: string;
}

const goalTypeConfig: Record<GoalType, { label: string; icon: React.ElementType; color: string }> = {
  sonho_grande: { label: 'Sonho Grande', icon: Star, color: 'text-yellow-500' },
  objetivo_curto_prazo: { label: 'Objetivo Curto Prazo', icon: Target, color: 'text-blue-500' },
  objetivo_longo_prazo: { label: 'Objetivo Longo Prazo', icon: Rocket, color: 'text-purple-500' },
};

export function GoalsSection({ userId }: GoalsSectionProps) {
  const { data: goals, isLoading } = usePlannerGoals(userId);
  const createMutation = useCreatePlannerGoal();
  const updateMutation = useUpdatePlannerGoal();
  const deleteMutation = useDeletePlannerGoal();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    goalType: 'objetivo_curto_prazo' as GoalType,
    targetDate: '',
  });

  const handleCreate = async () => {
    await createMutation.mutateAsync({
      userId,
      title: newGoal.title,
      description: newGoal.description || undefined,
      goalType: newGoal.goalType,
      targetDate: newGoal.targetDate || undefined,
    });
    setNewGoal({ title: '', description: '', goalType: 'objetivo_curto_prazo', targetDate: '' });
    setIsDialogOpen(false);
  };

  const handleAchieve = async (goal: PlannerGoal) => {
    await updateMutation.mutateAsync({
      id: goal.id,
      userId: goal.userId,
      status: 'achieved',
    });
  };

  const handleCancel = async (goal: PlannerGoal) => {
    await updateMutation.mutateAsync({
      id: goal.id,
      userId: goal.userId,
      status: 'cancelled',
    });
  };

  const groupedGoals: Record<GoalType, PlannerGoal[]> = {
    sonho_grande: [],
    objetivo_curto_prazo: [],
    objetivo_longo_prazo: [],
  };
  
  goals?.forEach(goal => {
    groupedGoals[goal.goalType].push(goal);
  });

  if (isLoading) {
    return <div className="text-muted-foreground">Carregando...</div>;
  }

  const renderGoalCard = (goal: PlannerGoal) => {
    const config = goalTypeConfig[goal.goalType];
    const Icon = config.icon;
    
    return (
      <Card key={goal.id} className={goal.status !== 'active' ? 'opacity-60' : ''}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Icon className={`h-5 w-5 mt-0.5 ${config.color}`} />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-medium">{goal.title}</h4>
                {goal.status === 'achieved' && (
                  <Badge variant="default" className="bg-green-500">Alcançado</Badge>
                )}
                {goal.status === 'cancelled' && (
                  <Badge variant="secondary">Cancelado</Badge>
                )}
              </div>
              {goal.description && (
                <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>
              )}
              {goal.targetDate && (
                <p className="text-xs text-muted-foreground mt-2">
                  Meta: {format(new Date(goal.targetDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              )}
            </div>
            
            {goal.status === 'active' && (
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-green-600 hover:text-green-700"
                  onClick={() => handleAchieve(goal)}
                  title="Marcar como alcançado"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => handleCancel(goal)}
                  title="Cancelar"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Sonhos e Objetivos</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Objetivo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Sonho ou Objetivo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={newGoal.goalType}
                  onValueChange={(value) => setNewGoal({ ...newGoal, goalType: value as GoalType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(goalTypeConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  value={newGoal.title}
                  onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                  placeholder="Ex: Conquistar certificação CFP"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Descrição (opcional)</Label>
                <Textarea
                  value={newGoal.description}
                  onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                  placeholder="Detalhes sobre este objetivo..."
                />
              </div>
              
              <div className="space-y-2">
                <Label>Data meta (opcional)</Label>
                <Input
                  type="date"
                  value={newGoal.targetDate}
                  onChange={(e) => setNewGoal({ ...newGoal, targetDate: e.target.value })}
                />
              </div>
              
              <Button
                className="w-full"
                onClick={handleCreate}
                disabled={!newGoal.title || createMutation.isPending}
              >
                {createMutation.isPending ? 'Criando...' : 'Criar Objetivo'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Sonhos Grandes */}
      {groupedGoals.sonho_grande && groupedGoals.sonho_grande.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500" />
            Sonhos Grandes
          </h4>
          <div className="grid gap-3">
            {groupedGoals.sonho_grande.map(renderGoalCard)}
          </div>
        </div>
      )}

      {/* Objetivos Curto Prazo */}
      {groupedGoals.objetivo_curto_prazo && groupedGoals.objetivo_curto_prazo.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-blue-500" />
            Objetivos de Curto Prazo
          </h4>
          <div className="grid gap-3">
            {groupedGoals.objetivo_curto_prazo.map(renderGoalCard)}
          </div>
        </div>
      )}

      {/* Objetivos Longo Prazo */}
      {groupedGoals.objetivo_longo_prazo && groupedGoals.objetivo_longo_prazo.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Rocket className="h-4 w-4 text-purple-500" />
            Objetivos de Longo Prazo
          </h4>
          <div className="grid gap-3">
            {groupedGoals.objetivo_longo_prazo.map(renderGoalCard)}
          </div>
        </div>
      )}

      {!goals?.length && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Nenhum sonho ou objetivo cadastrado ainda.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
