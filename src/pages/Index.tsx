import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Kanban, TrendingUp, TrendingDown, Banknote, DollarSign, Award, ArrowUpRight, ArrowDownRight, Calendar, CalendarDays, Target } from 'lucide-react';
import { useContacts } from '@/hooks/useContacts';
import { useOpportunities } from '@/hooks/useOpportunities';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { usePlannerGoals, PeriodType } from '@/hooks/usePlannerGoals';
import { GoalGaugeChart } from '@/components/dashboard/GoalGaugeChart';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useAuth } from '@/contexts/AuthContext';
import { useMemo, useState } from 'react';

const getCurrentPeriodReference = (periodType: PeriodType): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  
  switch (periodType) {
    case 'mensal':
      return `${year}-${String(month).padStart(2, '0')}`;
    case 'trimestral':
      const quarter = Math.ceil(month / 3);
      return `${year}-Q${quarter}`;
    case 'semestral':
      const semester = month <= 6 ? 1 : 2;
      return `${year}-S${semester}`;
    case 'anual':
      return `${year}`;
  }
};

const getPeriodLabel = (periodType: PeriodType): string => {
  const ref = getCurrentPeriodReference(periodType);
  switch (periodType) {
    case 'mensal':
      return 'do mês';
    case 'trimestral':
      return `do ${ref.split('-')[1]}`;
    case 'semestral':
      return `do ${ref.split('-')[1] === 'S1' ? '1º' : '2º'} semestre`;
    case 'anual':
      return 'do ano';
  }
};

export default function Index() {
  const { user } = useAuth();
  const { data: contacts, isLoading: contactsLoading } = useContacts();
  const { data: opportunities, isLoading: opportunitiesLoading } = useOpportunities();
  const { data: dashboardMetrics, isLoading: metricsLoading } = useDashboardMetrics();
  const { data: plannerGoals } = usePlannerGoals(user?.id || '');
  
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('anual');

  const revenueGoal = useMemo(() => {
    if (!plannerGoals) return null;
    const currentRef = getCurrentPeriodReference(selectedPeriod);
    return plannerGoals.find(g => 
      g.category === 'numeric' && 
      g.metricType === 'planejamento' &&
      g.periodType === selectedPeriod &&
      g.periodReference === currentRef
    );
  }, [plannerGoals, selectedPeriod]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalContacts = contacts?.length || 0;
    const activeOpportunities = opportunities?.filter(o => o.status === 'active') || [];
    const wonOpportunities = opportunities?.filter(o => o.status === 'won') || [];
    
    // Total proposal value of active opportunities
    const totalProposalValue = activeOpportunities.reduce((sum, opp) => {
      return sum + (opp.proposal_value || 0);
    }, 0);

    // Conversion rate (won / total closed)
    const closedOpportunities = opportunities?.filter(o => o.status === 'won' || o.status === 'lost') || [];
    const conversionRate = closedOpportunities.length > 0 
      ? (wonOpportunities.length / closedOpportunities.length) * 100 
      : 0;

    return {
      totalContacts,
      activeOpportunities: activeOpportunities.length,
      totalProposalValue,
      conversionRate,
    };
  }, [contacts, opportunities]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      notation: value >= 1000000 ? 'compact' : 'standard',
      maximumFractionDigits: value >= 1000000 ? 1 : 2
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      notation: value >= 10000 ? 'compact' : 'standard',
      maximumFractionDigits: 1
    }).format(value);
  };

  const renderPercentBadge = (percent: number | null) => {
    if (percent === null) return null;
    const isPositive = percent >= 0;
    return (
      <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
        {Math.abs(percent).toFixed(0)}%
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <DashboardHeader />

      {/* Financial Metrics Section */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Métricas Financeiras</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metricsLoading ? '...' : formatCurrency(dashboardMetrics?.totalRevenue || 0)}
              </div>
              <p className="text-xs text-muted-foreground">todos os contratos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">PBs Total</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metricsLoading ? '...' : formatNumber(dashboardMetrics?.totalPBs || 0)}
              </div>
              <p className="text-xs text-muted-foreground">pontos de bonificação</p>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Faturamento Mês Atual</CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-primary">
                  {metricsLoading ? '...' : formatCurrency(dashboardMetrics?.currentMonthRevenue || 0)}
                </span>
                {!metricsLoading && renderPercentBadge(dashboardMetrics?.vsPreviousMonthPercent ?? null)}
              </div>
              <p className="text-xs text-muted-foreground">vs mês anterior</p>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">PBs Mês Atual</CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {metricsLoading ? '...' : formatNumber(dashboardMetrics?.currentMonthPBs || 0)}
              </div>
              <p className="text-xs text-muted-foreground">pontos do mês</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Comparatives and Goal Section */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">vs Mês Anterior</CardTitle>
            {(dashboardMetrics?.vsPreviousMonthPercent ?? 0) >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${(dashboardMetrics?.vsPreviousMonthPercent ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {metricsLoading ? '...' : dashboardMetrics?.vsPreviousMonthPercent !== null 
                  ? `${dashboardMetrics.vsPreviousMonthPercent >= 0 ? '+' : ''}${dashboardMetrics.vsPreviousMonthPercent.toFixed(0)}%`
                  : 'N/A'
                }
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(dashboardMetrics?.previousMonthRevenue || 0)} mês anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">vs Mesmo Mês Ano Passado</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${(dashboardMetrics?.vsLastYearPercent ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {metricsLoading ? '...' : dashboardMetrics?.vsLastYearPercent !== null 
                  ? `${dashboardMetrics.vsLastYearPercent >= 0 ? '+' : ''}${dashboardMetrics.vsLastYearPercent.toFixed(0)}%`
                  : 'N/A'
                }
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(dashboardMetrics?.sameMonthLastYearRevenue || 0)} mesmo período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meta de Faturamento</CardTitle>
            <ToggleGroup 
              type="single" 
              value={selectedPeriod} 
              onValueChange={(val) => val && setSelectedPeriod(val as PeriodType)}
              className="gap-0.5"
            >
              <ToggleGroupItem value="mensal" className="h-6 px-2 text-xs">M</ToggleGroupItem>
              <ToggleGroupItem value="trimestral" className="h-6 px-2 text-xs">T</ToggleGroupItem>
              <ToggleGroupItem value="semestral" className="h-6 px-2 text-xs">S</ToggleGroupItem>
              <ToggleGroupItem value="anual" className="h-6 px-2 text-xs">A</ToggleGroupItem>
            </ToggleGroup>
          </CardHeader>
          <CardContent>
            {revenueGoal ? (
              <GoalGaugeChart 
                current={revenueGoal.currentValue || 0}
                goal={revenueGoal.targetValue || 0}
                label={getPeriodLabel(selectedPeriod)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <Target className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Nenhum objetivo definido para este período
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Operational Metrics Section */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Métricas Operacionais</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Contatos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {contactsLoading ? '...' : metrics.totalContacts}
              </div>
              <p className="text-xs text-muted-foreground">contatos cadastrados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Negociações Ativas</CardTitle>
              <Kanban className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {opportunitiesLoading ? '...' : metrics.activeOpportunities}
              </div>
              <p className="text-xs text-muted-foreground">em andamento</p>
            </CardContent>
          </Card>

          <Card className="bg-accent/5 border-accent/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Propostas em Aberto</CardTitle>
              <Banknote className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">
                {opportunitiesLoading ? '...' : formatCurrency(metrics.totalProposalValue)}
              </div>
              <p className="text-xs text-muted-foreground">valor total em negociação</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {opportunitiesLoading ? '...' : `${metrics.conversionRate.toFixed(0)}%`}
              </div>
              <p className="text-xs text-muted-foreground">das negociações fechadas</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
