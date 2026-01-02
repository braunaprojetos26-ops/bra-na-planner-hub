import { useState } from 'react';
import { Target, Plus, Star, Rocket, Flag, Calendar, X, Trash2, Check } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import {
  usePlannerGoals,
  useCreatePlannerGoal,
  useUpdatePlannerGoal,
  useDeletePlannerGoal,
  PlannerGoal,
  GoalType,
} from '@/hooks/usePlannerGoals';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const goalTypeConfig: Record<GoalType, { label: string; icon: React.ElementType; color: string }> = {
  sonho_grande: { label: 'Sonho Grande', icon: Star, color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  objetivo_curto_prazo: { label: 'Curto Prazo', icon: Flag, color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  objetivo_longo_prazo: { label: 'Longo Prazo', icon: Rocket, color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
};

export function MyGoalsDrawer() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showNewGoalDialog, setShowNewGoalDialog] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    goalType: 'objetivo_curto_prazo' as GoalType,
    targetDate: '',
  });

  const { data: goals, isLoading } = usePlannerGoals(user?.id || '');
  const createGoal = useCreatePlannerGoal();
  const updateGoal = useUpdatePlannerGoal();
  const deleteGoal = useDeletePlannerGoal();

  const activeGoals = goals?.filter((g) => g.status === 'active') || [];

  const handleCreateGoal = async () => {
    if (!newGoal.title.trim() || !user?.id) return;

    try {
      await createGoal.mutateAsync({
        userId: user.id,
        title: newGoal.title,
        description: newGoal.description || undefined,
        goalType: newGoal.goalType,
        targetDate: newGoal.targetDate || undefined,
      });

      toast.success('Meta criada com sucesso!');
      setNewGoal({ title: '', description: '', goalType: 'objetivo_curto_prazo', targetDate: '' });
      setShowNewGoalDialog(false);
    } catch {
      toast.error('Erro ao criar meta');
    }
  };

  const handleMarkAchieved = async (goal: PlannerGoal) => {
    try {
      await updateGoal.mutateAsync({ id: goal.id, userId: goal.userId, status: 'achieved' });
      toast.success('Parabéns! Meta alcançada!');
    } catch {
      toast.error('Erro ao atualizar meta');
    }
  };

  const handleDeleteGoal = async (goal: PlannerGoal) => {
    try {
      await deleteGoal.mutateAsync({ id: goal.id, userId: goal.userId });
      toast.success('Meta removida');
    } catch {
      toast.error('Erro ao remover meta');
    }
  };

  const renderGoalCard = (goal: PlannerGoal) => {
    const config = goalTypeConfig[goal.goalType];
    const Icon = config?.icon || Flag;

    return (
      <div
        key={goal.id}
        className="p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`p-1.5 rounded-md ${config?.color || 'bg-muted'}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{goal.title}</p>
              {goal.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {goal.description}
                </p>
              )}
              {goal.targetDate && (
                <div className="flex items-center gap-1 mt-1.5">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(goal.targetDate), "dd 'de' MMM, yyyy", { locale: ptBR })}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
              onClick={() => handleMarkAchieved(goal)}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={() => handleDeleteGoal(goal)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Target className="h-4 w-4" />
            Minhas Metas
            {activeGoals.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {activeGoals.length}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Minhas Metas
            </SheetTitle>
            <SheetDescription>
              Acompanhe seus sonhos e objetivos pessoais
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            <Button
              onClick={() => setShowNewGoalDialog(true)}
              className="w-full gap-2"
              variant="outline"
            >
              <Plus className="h-4 w-4" />
              Nova Meta
            </Button>

            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">
                Carregando...
              </div>
            ) : activeGoals.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Você ainda não tem metas cadastradas</p>
                <p className="text-xs mt-1">Comece definindo seus objetivos!</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                {activeGoals.map(renderGoalCard)}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={showNewGoalDialog} onOpenChange={setShowNewGoalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Meta</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="goal-title">Título *</Label>
              <Input
                id="goal-title"
                placeholder="Ex: Conquistar CFP"
                value={newGoal.title}
                onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="goal-type">Tipo</Label>
              <Select
                value={newGoal.goalType}
                onValueChange={(value: GoalType) => setNewGoal({ ...newGoal, goalType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(goalTypeConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <config.icon className="h-4 w-4" />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="goal-description">Descrição</Label>
              <Textarea
                id="goal-description"
                placeholder="Descreva sua meta..."
                value={newGoal.description}
                onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="goal-date">Data Alvo</Label>
              <Input
                id="goal-date"
                type="date"
                value={newGoal.targetDate}
                onChange={(e) => setNewGoal({ ...newGoal, targetDate: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewGoalDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateGoal} disabled={!newGoal.title.trim()}>
              Criar Meta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
