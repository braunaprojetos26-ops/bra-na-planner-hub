import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { HealthScoreResult, CATEGORY_CONFIG } from '@/hooks/useHealthScore';
import { 
  AlertTriangle, 
  TrendingUp, 
  Star, 
  Calendar, 
  Users, 
  AlertCircle,
  Target,
  Trophy,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PillarAnalysisTabProps {
  results: HealthScoreResult[];
  isLoading: boolean;
}

interface StrategicInsight {
  id: string;
  title: string;
  description: string;
  clientCount: number;
  impactPoints: number;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
}

interface PillarPerformance {
  key: string;
  label: string;
  maxScore: number;
  average: number;
  percentage: number;
  color: string;
}

interface PlannerRanking {
  ownerId: string;
  ownerName: string;
  clientCount: number;
  averageScore: number;
  variation: 'up' | 'down' | 'stable';
}

const PILLAR_CONFIG = {
  nps: { label: 'NPS', maxScore: 25, color: 'hsl(var(--chart-1))' },
  referrals: { label: 'Indicação', maxScore: 15, color: 'hsl(var(--chart-2))' },
  payment: { label: 'Pagamentos', maxScore: 20, color: 'hsl(var(--chart-3))' },
  crossSell: { label: 'Cross Sell', maxScore: 15, color: 'hsl(var(--chart-4))' },
  meetings: { label: 'Reuniões', maxScore: 25, color: 'hsl(var(--chart-5))' },
};

const getPillarScore = (result: HealthScoreResult, pillarKey: string): number => {
  switch (pillarKey) {
    case 'nps': return result.breakdown.nps.score;
    case 'referrals': return result.breakdown.referrals.score;
    case 'payment': return result.breakdown.payment.score;
    case 'crossSell': return result.breakdown.crossSell.score;
    case 'meetings': return result.breakdown.meetings.score;
    default: return 0;
  }
};

export function PillarAnalysisTab({ results, isLoading }: PillarAnalysisTabProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-4">
                <div className="h-20 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="animate-pulse">
            <CardContent className="pt-4">
              <div className="h-64 bg-muted rounded" />
            </CardContent>
          </Card>
          <Card className="animate-pulse">
            <CardContent className="pt-4">
              <div className="h-64 bg-muted rounded" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Calculate strategic insights
  const strategicInsights: StrategicInsight[] = [
    {
      id: 'inadimplencia',
      title: 'Risco de Inadimplência Elevado',
      description: 'Clientes com atraso em pagamentos',
      clientCount: results.filter(r => r.breakdown.payment.score < 10).length,
      impactPoints: 20,
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-950/30',
      icon: <AlertTriangle className="h-5 w-5" />,
    },
    {
      id: 'crosssell',
      title: 'Oportunidade de Cross Sell',
      description: 'Clientes com apenas 1 produto',
      clientCount: results.filter(r => r.breakdown.crossSell.score === 0).length,
      impactPoints: 15,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 dark:bg-amber-950/30',
      icon: <TrendingUp className="h-5 w-5" />,
    },
    {
      id: 'nps-alto',
      title: 'NPS Elevado',
      description: 'Clientes promotores (9-10)',
      clientCount: results.filter(r => r.breakdown.nps.score >= 20).length,
      impactPoints: 25,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950/30',
      icon: <Star className="h-5 w-5" />,
    },
    {
      id: 'reunioes',
      title: 'Reuniões em Dia',
      description: 'Clientes com reuniões recentes',
      clientCount: results.filter(r => r.breakdown.meetings.score >= 20).length,
      impactPoints: 25,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
      icon: <Calendar className="h-5 w-5" />,
    },
    {
      id: 'indicacoes',
      title: 'Potencial de Indicações',
      description: 'Clientes que já indicaram outros',
      clientCount: results.filter(r => r.breakdown.referrals.score > 0).length,
      impactPoints: 15,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-950/30',
      icon: <Users className="h-5 w-5" />,
    },
    {
      id: 'risco',
      title: 'Clientes em Risco',
      description: 'Categoria crítica',
      clientCount: results.filter(r => r.category === 'critico').length,
      impactPoints: 0,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-950/30',
      icon: <AlertCircle className="h-5 w-5" />,
    },
  ];

  // Calculate category distribution for pie chart
  const categoryDistribution = Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
    const count = results.filter(r => r.category === key).length;
    const percentage = results.length > 0 ? Math.round((count / results.length) * 100) : 0;
    return {
      name: config.label,
      value: count,
      percentage,
      color: config.color,
    };
  });

  // Calculate pillar performance
  const pillarPerformance: PillarPerformance[] = Object.entries(PILLAR_CONFIG).map(([key, config]) => {
    const scores = results.map(r => getPillarScore(r, key));
    const average = scores.length > 0 
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : 0;
    const percentage = Math.round((average / config.maxScore) * 100);
    
    return {
      key,
      label: config.label,
      maxScore: config.maxScore,
      average,
      percentage,
      color: config.color,
    };
  });

  // Generate priority action plan
  const actionPlan = [
    {
      priority: 1,
      action: 'Agendar reuniões com clientes sem encontro há mais de 6 meses',
      impact: 'Alto',
      count: results.filter(r => r.breakdown.meetings.score < 10).length,
    },
    {
      priority: 2,
      action: 'Entrar em contato com clientes inadimplentes',
      impact: 'Alto',
      count: results.filter(r => r.breakdown.payment.score < 10).length,
    },
    {
      priority: 3,
      action: 'Oferecer novos produtos para clientes com apenas 1 produto',
      impact: 'Médio',
      count: results.filter(r => r.breakdown.crossSell.score === 0).length,
    },
    {
      priority: 4,
      action: 'Solicitar indicações de clientes com NPS elevado',
      impact: 'Médio',
      count: results.filter(r => r.breakdown.nps.score >= 20 && r.breakdown.referrals.score === 0).length,
    },
    {
      priority: 5,
      action: 'Investigar motivos de NPS detratores',
      impact: 'Alto',
      count: results.filter(r => r.breakdown.nps.score < 10).length,
    },
  ].filter(a => a.count > 0);

  // Calculate planner ranking
  const plannerMap = new Map<string, { scores: number[]; name: string }>();
  results.forEach(r => {
    if (!r.ownerId || !r.ownerName) return;
    if (!plannerMap.has(r.ownerId)) {
      plannerMap.set(r.ownerId, { scores: [], name: r.ownerName });
    }
    plannerMap.get(r.ownerId)!.scores.push(r.totalScore);
  });

  const plannerRanking: PlannerRanking[] = Array.from(plannerMap.entries())
    .map(([ownerId, data]) => ({
      ownerId,
      ownerName: data.name,
      clientCount: data.scores.length,
      averageScore: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
      variation: 'stable' as const, // Would need historical data for real variation
    }))
    .sort((a, b) => b.averageScore - a.averageScore);

  return (
    <div className="space-y-6">
      {/* Strategic Insights Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {strategicInsights.map((insight) => (
          <Card key={insight.id} className={cn("border-0", insight.bgColor)}>
            <CardContent className="pt-4 pb-4">
              <div className={cn("flex items-center gap-2 mb-2", insight.color)}>
                {insight.icon}
                {insight.impactPoints > 0 && (
                  <span className="text-xs font-semibold">+{insight.impactPoints} pts</span>
                )}
              </div>
              <p className={cn("text-sm font-semibold mb-1", insight.color)}>
                {insight.title}
              </p>
              <p className="text-2xl font-bold text-foreground">
                {insight.clientCount}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {insight.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Distribution Chart + Pillar Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Health Score Distribution Pie Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" />
              Distribuição do Health Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="h-48 w-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {categoryDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name) => [`${value} clientes`, name]}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {categoryDistribution.map((cat) => (
                  <div key={cat.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="text-sm">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{cat.value}</span>
                      <span className="text-xs text-muted-foreground">({cat.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pillar Performance */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Performance dos Pilares
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pillarPerformance.map((pillar) => (
              <div key={pillar.key} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{pillar.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{pillar.average}</span>
                    <span className="text-muted-foreground">/ {pillar.maxScore}</span>
                    <span className="text-xs text-muted-foreground">({pillar.percentage}%)</span>
                  </div>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${pillar.percentage}%`,
                      backgroundColor: pillar.color 
                    }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Action Plan + Planner Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority Action Plan */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" />
              Plano de Ação Prioritário
            </CardTitle>
          </CardHeader>
          <CardContent>
            {actionPlan.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma ação prioritária identificada.</p>
            ) : (
              <div className="space-y-3">
                {actionPlan.map((action) => (
                  <div key={action.priority} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                      {action.priority}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{action.action}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          action.impact === 'Alto' 
                            ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400" 
                            : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                        )}>
                          Impacto {action.impact}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {action.count} cliente{action.count !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Planner Ranking */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Ranking de Planejadores
            </CardTitle>
          </CardHeader>
          <CardContent>
            {plannerRanking.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum planejador encontrado.</p>
            ) : (
              <div className="space-y-2">
                {plannerRanking.slice(0, 10).map((planner, index) => (
                  <div 
                    key={planner.ownerId} 
                    className={cn(
                      "flex items-center justify-between p-2 rounded-lg",
                      index < 3 ? "bg-muted/50" : ""
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                        index === 0 ? "bg-yellow-500 text-yellow-950" :
                        index === 1 ? "bg-gray-400 text-gray-950" :
                        index === 2 ? "bg-amber-600 text-amber-950" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{planner.ownerName}</p>
                        <p className="text-xs text-muted-foreground">
                          {planner.clientCount} cliente{planner.clientCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold">{planner.averageScore}</span>
                      {planner.variation === 'up' && (
                        <ArrowUp className="h-4 w-4 text-green-500" />
                      )}
                      {planner.variation === 'down' && (
                        <ArrowDown className="h-4 w-4 text-red-500" />
                      )}
                      {planner.variation === 'stable' && (
                        <Minus className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
