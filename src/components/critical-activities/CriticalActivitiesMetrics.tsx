import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useCriticalActivityMetrics } from '@/hooks/useCriticalActivityMetrics';
import { MetricsActivityOverTime } from './metrics/MetricsActivityOverTime';
import { MetricsAvgResponseTime } from './metrics/MetricsAvgResponseTime';
import { MetricsTopPlanners } from './metrics/MetricsTopPlanners';
import { MetricsTeamPerformance } from './metrics/MetricsTeamPerformance';
import { Card, CardContent } from '@/components/ui/card';
import { Activity, Clock, Users, TrendingUp } from 'lucide-react';

export function CriticalActivitiesMetrics() {
  const [months, setMonths] = useState(6);
  const [ruleType, setRuleType] = useState<string>('');
  const [urgency, setUrgency] = useState<string>('');
  const [plannerId, setPlannerId] = useState<string>('');
  const [teamManagerId, setTeamManagerId] = useState<string>('');

  const {
    isLoading,
    monthlyData,
    topPlanners,
    openRanking,
    teamRanking,
    avgResponseTime,
    profiles,
    managers,
  } = useCriticalActivityMetrics({
    months,
    ruleType: ruleType && ruleType !== 'all' ? ruleType : undefined,
    urgency: urgency && urgency !== 'all' ? urgency : undefined,
    plannerId: plannerId && plannerId !== 'all' ? plannerId : undefined,
    teamManagerId: teamManagerId && teamManagerId !== 'all' ? teamManagerId : undefined,
  });

  // KPI calculations
  const totalCreated = monthlyData.reduce((s, d) => s + d.created, 0);
  const totalActed = monthlyData.reduce((s, d) => s + d.acted, 0);
  const actPercentage = totalCreated > 0 ? Math.round((totalActed / totalCreated) * 100) : 0;
  const avgTime = avgResponseTime.length > 0
    ? Math.round(avgResponseTime.reduce((s, d) => s + d.avgHours, 0) / avgResponseTime.length)
    : 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={String(months)} onValueChange={(v) => setMonths(Number(v))}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">3 meses</SelectItem>
            <SelectItem value="6">6 meses</SelectItem>
            <SelectItem value="12">12 meses</SelectItem>
            <SelectItem value="24">24 meses</SelectItem>
          </SelectContent>
        </Select>

        <Select value={urgency} onValueChange={setUrgency}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Urgência" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="critical">Crítica</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
            <SelectItem value="medium">Média</SelectItem>
            <SelectItem value="low">Baixa</SelectItem>
          </SelectContent>
        </Select>

        <Select value={ruleType} onValueChange={setRuleType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tipo de regra" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="manual_recurrence">Manual</SelectItem>
            <SelectItem value="inadimplencia">Inadimplência</SelectItem>
            <SelectItem value="health_score">Health Score</SelectItem>
            <SelectItem value="contract_renewal">Renovação</SelectItem>
            <SelectItem value="client_characteristics">Características</SelectItem>
          </SelectContent>
        </Select>

        <Select value={plannerId} onValueChange={setPlannerId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Planejador" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {profiles.map(p => (
              <SelectItem key={p.user_id} value={p.user_id}>
                {p.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={teamManagerId} onValueChange={setTeamManagerId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Equipe (Líder)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {managers.map(m => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalCreated}</p>
              <p className="text-xs text-muted-foreground">Distribuídas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10">
              <TrendingUp className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalActed}</p>
              <p className="text-xs text-muted-foreground">Atuadas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{actPercentage}%</p>
              <p className="text-xs text-muted-foreground">% Atuação</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <Clock className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{avgTime}h</p>
              <p className="text-xs text-muted-foreground">Tempo médio</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MetricsActivityOverTime data={monthlyData} />
        <MetricsAvgResponseTime data={avgResponseTime} />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MetricsTopPlanners
          data={topPlanners}
          title="Ranking: Planejadores que Mais Atuaram"
          color="accent"
        />
        <MetricsTopPlanners
          data={openRanking}
          title="Ranking: Mais Atividades em Aberto"
          color="destructive"
        />
      </div>

      {/* Team Performance */}
      <MetricsTeamPerformance data={teamRanking} />
    </div>
  );
}
