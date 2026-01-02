import { useState, useMemo } from 'react';
import { 
  Target, Plus, Star, Rocket, Flag, Calendar, Trash2, Check, 
  DollarSign, Shield, TrendingUp, Wallet, GraduationCap, Edit2
} from 'lucide-react';
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
import { Progress } from '@/components/ui/progress';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  usePlannerGoals,
  useCreatePlannerGoal,
  useUpdatePlannerGoal,
  useDeletePlannerGoal,
  PlannerGoal,
  GoalType,
  GoalCategory,
  MetricType,
  PeriodType,
} from '@/hooks/usePlannerGoals';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const goalTypeConfig: Record<GoalType, { label: string; icon: React.ElementType; color: string }> = {
  sonho_grande: { label: 'Sonho Grande', icon: Star, color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  objetivo_curto_prazo: { label: 'Curto Prazo', icon: Flag, color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  objetivo_longo_prazo: { label: 'Longo Prazo', icon: Rocket, color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
};

const metricTypeConfig: Record<MetricType, { label: string; icon: React.ElementType; color: string; format: 'currency' | 'number' }> = {
  planejamento: { label: 'Valor de Planejamento', icon: DollarSign, color: 'text-emerald-600', format: 'currency' },
  pa_seguros: { label: 'P.A. de Seguros', icon: Shield, color: 'text-blue-600', format: 'currency' },
  pbs: { label: "PB's", icon: TrendingUp, color: 'text-purple-600', format: 'number' },
  captacao_investimentos: { label: 'Captação Investimentos', icon: Wallet, color: 'text-amber-600', format: 'currency' },
};

const periodTypeConfig: Record<PeriodType, { label: string }> = {
  mensal: { label: 'Mensal' },
  trimestral: { label: 'Trimestral' },
  semestral: { label: 'Semestral' },
  anual: { label: 'Anual' },
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('pt-BR').format(value);
};

const getCurrentPeriodInfo = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const quarter = Math.ceil(month / 3);
  const semester = month <= 6 ? 1 : 2;
  
  return {
    year,
    month,
    monthRef: `${year}-${String(month).padStart(2, '0')}`,
    quarterRef: `${year}-Q${quarter}`,
    semesterRef: `${year}-S${semester}`,
    yearRef: `${year}`,
  };
};

const getMonthLabel = (ref: string) => {
  const [year, month] = ref.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return format(date, 'MMMM yyyy', { locale: ptBR });
};

const getQuarterLabel = (ref: string) => {
  const [year, q] = ref.split('-Q');
  return `${q}º Trimestre ${year}`;
};

const getSemesterLabel = (ref: string) => {
  const [year, s] = ref.split('-S');
  return `${s}º Semestre ${year}`;
};

const getPeriodLabel = (periodType: PeriodType, periodRef: string) => {
  switch (periodType) {
    case 'mensal': return getMonthLabel(periodRef);
    case 'trimestral': return getQuarterLabel(periodRef);
    case 'semestral': return getSemesterLabel(periodRef);
    case 'anual': return periodRef;
    default: return periodRef;
  }
};

const getRemainingMonths = () => {
  const { year, month } = getCurrentPeriodInfo();
  const months: { value: string; label: string }[] = [];
  
  for (let m = month; m <= 12; m++) {
    const ref = `${year}-${String(m).padStart(2, '0')}`;
    months.push({ value: ref, label: getMonthLabel(ref) });
  }
  
  return months;
};

const getQuarters = () => {
  const { year, month } = getCurrentPeriodInfo();
  const currentQuarter = Math.ceil(month / 3);
  const quarters: { value: string; label: string }[] = [];
  
  for (let q = currentQuarter; q <= 4; q++) {
    const ref = `${year}-Q${q}`;
    quarters.push({ value: ref, label: getQuarterLabel(ref) });
  }
  
  return quarters;
};

const getSemesters = () => {
  const { year, month } = getCurrentPeriodInfo();
  const currentSemester = month <= 6 ? 1 : 2;
  const semesters: { value: string; label: string }[] = [];
  
  for (let s = currentSemester; s <= 2; s++) {
    const ref = `${year}-S${s}`;
    semesters.push({ value: ref, label: getSemesterLabel(ref) });
  }
  
  return semesters;
};

export function MyGoalsDrawer() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showNewGoalDialog, setShowNewGoalDialog] = useState(false);
  const [editingValue, setEditingValue] = useState<{ goalId: string; value: string } | null>(null);
  
  // Step-based dialog state
  const [dialogStep, setDialogStep] = useState<'category' | 'form'>('category');
  const [selectedCategory, setSelectedCategory] = useState<GoalCategory>('numeric');
  
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    goalType: 'objetivo_curto_prazo' as GoalType,
    targetDate: '',
    metricType: 'planejamento' as MetricType,
    periodType: 'mensal' as PeriodType,
    periodReference: '',
    targetValue: '',
  });

  const { data: goals, isLoading } = usePlannerGoals(user?.id || '');
  const createGoal = useCreatePlannerGoal();
  const updateGoal = useUpdatePlannerGoal();
  const deleteGoal = useDeletePlannerGoal();

  const activeGoals = goals?.filter((g) => g.status === 'active') || [];
  
  // Separate numeric and development goals
  const numericGoals = activeGoals.filter((g) => g.category === 'numeric');
  const developmentGoals = activeGoals.filter((g) => g.category === 'development');
  
  // Group numeric goals by period
  const currentPeriod = getCurrentPeriodInfo();
  
  const groupedNumericGoals = useMemo(() => {
    const groups: Record<string, PlannerGoal[]> = {
      mensal: [],
      trimestral: [],
      semestral: [],
      anual: [],
    };
    
    numericGoals.forEach((goal) => {
      if (goal.periodType) {
        groups[goal.periodType].push(goal);
      }
    });
    
    return groups;
  }, [numericGoals]);

  const handleOpenDialog = () => {
    setDialogStep('category');
    setSelectedCategory('numeric');
    setNewGoal({
      title: '',
      description: '',
      goalType: 'objetivo_curto_prazo',
      targetDate: '',
      metricType: 'planejamento',
      periodType: 'mensal',
      periodReference: currentPeriod.monthRef,
      targetValue: '',
    });
    setShowNewGoalDialog(true);
  };

  const handleCategorySelect = (category: GoalCategory) => {
    setSelectedCategory(category);
    setDialogStep('form');
  };

  const handleCreateGoal = async () => {
    if (!user?.id) return;
    
    if (selectedCategory === 'numeric') {
      if (!newGoal.metricType || !newGoal.periodReference || !newGoal.targetValue) {
        toast.error('Preencha todos os campos obrigatórios');
        return;
      }
      
      const metricConfig = metricTypeConfig[newGoal.metricType];
      
      await createGoal.mutateAsync({
        userId: user.id,
        title: metricConfig.label,
        description: newGoal.description || undefined,
        goalType: 'objetivo_curto_prazo',
        category: 'numeric',
        metricType: newGoal.metricType,
        periodType: newGoal.periodType,
        periodReference: newGoal.periodReference,
        targetValue: parseFloat(newGoal.targetValue.replace(/\D/g, '')) / (metricConfig.format === 'currency' ? 100 : 1),
        currentValue: 0,
      });
    } else {
      if (!newGoal.title.trim()) {
        toast.error('Preencha o título do objetivo');
        return;
      }
      
      await createGoal.mutateAsync({
        userId: user.id,
        title: newGoal.title,
        description: newGoal.description || undefined,
        goalType: newGoal.goalType,
        targetDate: newGoal.targetDate || undefined,
        category: 'development',
      });
    }
    
    setShowNewGoalDialog(false);
  };

  const handleMarkAchieved = async (goal: PlannerGoal) => {
    await updateGoal.mutateAsync({ id: goal.id, userId: goal.userId, status: 'achieved' });
    toast.success('Parabéns! Objetivo alcançado!');
  };

  const handleDeleteGoal = async (goal: PlannerGoal) => {
    await deleteGoal.mutateAsync({ id: goal.id, userId: goal.userId });
  };

  const handleUpdateCurrentValue = async (goal: PlannerGoal) => {
    if (!editingValue || editingValue.goalId !== goal.id) return;
    
    const metricConfig = metricTypeConfig[goal.metricType!];
    const numericValue = parseFloat(editingValue.value.replace(/\D/g, '')) / (metricConfig.format === 'currency' ? 100 : 1);
    
    await updateGoal.mutateAsync({
      id: goal.id,
      userId: goal.userId,
      currentValue: numericValue,
    });
    
    setEditingValue(null);
  };

  const handleCurrencyInput = (value: string, field: 'targetValue') => {
    const numericValue = value.replace(/\D/g, '');
    const formatted = numericValue ? formatCurrency(parseInt(numericValue) / 100) : '';
    setNewGoal({ ...newGoal, [field]: formatted });
  };

  const getPeriodOptions = () => {
    switch (newGoal.periodType) {
      case 'mensal': return getRemainingMonths();
      case 'trimestral': return getQuarters();
      case 'semestral': return getSemesters();
      case 'anual': return [{ value: currentPeriod.yearRef, label: currentPeriod.yearRef }];
      default: return [];
    }
  };

  const renderNumericGoalCard = (goal: PlannerGoal) => {
    const metricConfig = metricTypeConfig[goal.metricType!];
    const Icon = metricConfig.icon;
    const progress = goal.targetValue ? Math.min(((goal.currentValue || 0) / goal.targetValue) * 100, 100) : 0;
    const isEditing = editingValue?.goalId === goal.id;
    
    const formattedTarget = metricConfig.format === 'currency' 
      ? formatCurrency(goal.targetValue || 0)
      : formatNumber(goal.targetValue || 0);
    const formattedCurrent = metricConfig.format === 'currency'
      ? formatCurrency(goal.currentValue || 0)
      : formatNumber(goal.currentValue || 0);

    return (
      <div key={goal.id} className="p-3 rounded-lg border bg-card">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${metricConfig.color}`} />
            <span className="font-medium text-sm">{metricConfig.label}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-50"
              onClick={() => handleMarkAchieved(goal)}
            >
              <Check className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={() => handleDeleteGoal(goal)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <span>Meta: {formattedTarget}</span>
          <span className="text-muted-foreground/50">|</span>
          {isEditing ? (
            <div className="flex items-center gap-1">
              <Input
                className="h-6 w-24 text-xs"
                value={editingValue.value}
                onChange={(e) => {
                  const numericValue = e.target.value.replace(/\D/g, '');
                  const formatted = metricConfig.format === 'currency'
                    ? (numericValue ? formatCurrency(parseInt(numericValue) / 100) : '')
                    : numericValue;
                  setEditingValue({ goalId: goal.id, value: formatted });
                }}
                onBlur={() => handleUpdateCurrentValue(goal)}
                onKeyDown={(e) => e.key === 'Enter' && handleUpdateCurrentValue(goal)}
                autoFocus
              />
            </div>
          ) : (
            <button
              className="flex items-center gap-1 hover:text-foreground transition-colors"
              onClick={() => setEditingValue({ goalId: goal.id, value: formattedCurrent })}
            >
              <span>Atual: {formattedCurrent}</span>
              <Edit2 className="h-3 w-3" />
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Progress value={progress} className="h-2 flex-1" />
          <span className="text-xs font-medium w-10 text-right">{Math.round(progress)}%</span>
        </div>
      </div>
    );
  };

  const renderDevelopmentGoalCard = (goal: PlannerGoal) => {
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

  const renderPeriodSection = (periodType: PeriodType, goals: PlannerGoal[]) => {
    if (goals.length === 0) return null;
    
    const periodLabels: Record<PeriodType, string> = {
      mensal: 'Objetivos do Mês',
      trimestral: 'Objetivos do Trimestre',
      semestral: 'Objetivos do Semestre',
      anual: 'Objetivos do Ano',
    };
    
    // Group by period reference
    const groupedByRef: Record<string, PlannerGoal[]> = {};
    goals.forEach((goal) => {
      const ref = goal.periodReference || 'unknown';
      if (!groupedByRef[ref]) groupedByRef[ref] = [];
      groupedByRef[ref].push(goal);
    });
    
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          {periodLabels[periodType]}
        </h3>
        {Object.entries(groupedByRef).map(([ref, refGoals]) => (
          <Collapsible key={ref} defaultOpen>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-1 text-sm font-medium hover:text-primary transition-colors">
              <span>{getPeriodLabel(periodType, ref)}</span>
              <ChevronDown className="h-4 w-4" />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 mt-2">
              {refGoals.map(renderNumericGoalCard)}
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    );
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Target className="h-4 w-4" />
            Meus Objetivos
            {activeGoals.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {activeGoals.length}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Meus Objetivos
            </SheetTitle>
            <SheetDescription>
              Acompanhe suas metas de negócio e desenvolvimento
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            <Button
              onClick={handleOpenDialog}
              className="w-full gap-2"
              variant="outline"
            >
              <Plus className="h-4 w-4" />
              Novo Objetivo
            </Button>

            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">
                Carregando...
              </div>
            ) : activeGoals.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Você ainda não tem objetivos cadastrados</p>
                <p className="text-xs mt-1">Comece definindo seus objetivos!</p>
              </div>
            ) : (
              <div className="space-y-6 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                {/* Numeric Goals by Period */}
                {renderPeriodSection('mensal', groupedNumericGoals.mensal)}
                {renderPeriodSection('trimestral', groupedNumericGoals.trimestral)}
                {renderPeriodSection('semestral', groupedNumericGoals.semestral)}
                {renderPeriodSection('anual', groupedNumericGoals.anual)}
                
                {/* Development Goals */}
                {developmentGoals.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      Desenvolvimento & Capacitação
                    </h3>
                    <div className="space-y-2">
                      {developmentGoals.map(renderDevelopmentGoalCard)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={showNewGoalDialog} onOpenChange={setShowNewGoalDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogStep === 'category' ? 'Novo Objetivo' : 
                selectedCategory === 'numeric' ? 'Objetivo Numérico' : 'Objetivo de Desenvolvimento'}
            </DialogTitle>
          </DialogHeader>

          {dialogStep === 'category' ? (
            <div className="grid grid-cols-2 gap-4 py-4">
              <button
                onClick={() => handleCategorySelect('numeric')}
                className="p-6 rounded-lg border-2 border-transparent hover:border-primary bg-muted/50 hover:bg-muted transition-all text-center group"
              >
                <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-3 group-hover:bg-emerald-200 transition-colors">
                  <TrendingUp className="h-6 w-6 text-emerald-600" />
                </div>
                <h3 className="font-semibold">Numérico</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Metas de negócio com valores
                </p>
              </button>
              
              <button
                onClick={() => handleCategorySelect('development')}
                className="p-6 rounded-lg border-2 border-transparent hover:border-primary bg-muted/50 hover:bg-muted transition-all text-center group"
              >
                <div className="mx-auto w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mb-3 group-hover:bg-purple-200 transition-colors">
                  <GraduationCap className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-semibold">Desenvolvimento</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Formação e capacitação
                </p>
              </button>
            </div>
          ) : selectedCategory === 'numeric' ? (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Categoria *</Label>
                <Select
                  value={newGoal.metricType}
                  onValueChange={(value: MetricType) => setNewGoal({ ...newGoal, metricType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(metricTypeConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <config.icon className={`h-4 w-4 ${config.color}`} />
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Período *</Label>
                <Select
                  value={newGoal.periodType}
                  onValueChange={(value: PeriodType) => {
                    const defaultRef = value === 'mensal' ? currentPeriod.monthRef
                      : value === 'trimestral' ? currentPeriod.quarterRef
                      : value === 'semestral' ? currentPeriod.semesterRef
                      : currentPeriod.yearRef;
                    setNewGoal({ ...newGoal, periodType: value, periodReference: defaultRef });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(periodTypeConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Referência *</Label>
                <Select
                  value={newGoal.periodReference}
                  onValueChange={(value) => setNewGoal({ ...newGoal, periodReference: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {getPeriodOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Meta *</Label>
                <Input
                  placeholder={metricTypeConfig[newGoal.metricType].format === 'currency' ? 'R$ 0,00' : '0'}
                  value={newGoal.targetValue}
                  onChange={(e) => {
                    if (metricTypeConfig[newGoal.metricType].format === 'currency') {
                      handleCurrencyInput(e.target.value, 'targetValue');
                    } else {
                      setNewGoal({ ...newGoal, targetValue: e.target.value.replace(/\D/g, '') });
                    }
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  placeholder="Anotações sobre este objetivo..."
                  value={newGoal.description}
                  onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
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
                <Label>Título *</Label>
                <Input
                  placeholder="Ex: Conquistar certificação CFP"
                  value={newGoal.title}
                  onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  placeholder="Descreva seu objetivo..."
                  value={newGoal.description}
                  onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Data Alvo</Label>
                <Input
                  type="date"
                  value={newGoal.targetDate}
                  onChange={(e) => setNewGoal({ ...newGoal, targetDate: e.target.value })}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            {dialogStep === 'form' && (
              <Button variant="ghost" onClick={() => setDialogStep('category')}>
                Voltar
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowNewGoalDialog(false)}>
              Cancelar
            </Button>
            {dialogStep === 'form' && (
              <Button onClick={handleCreateGoal}>
                Criar Objetivo
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
