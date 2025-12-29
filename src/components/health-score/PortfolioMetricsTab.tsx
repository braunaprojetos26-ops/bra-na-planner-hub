import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { HealthScoreResult, HealthScoreSummary, CATEGORY_CONFIG, CategoryKey } from '@/hooks/useHealthScore';
import { Users, TrendingUp, AlertTriangle, Target, Activity, Star } from 'lucide-react';

interface PortfolioMetricsTabProps {
  results: HealthScoreResult[];
  summary?: HealthScoreSummary;
  isLoading: boolean;
}

export function PortfolioMetricsTab({ results, summary, isLoading }: PortfolioMetricsTabProps) {
  if (isLoading || !summary) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-5 bg-muted rounded w-32" />
            </CardHeader>
            <CardContent>
              <div className="h-24 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Calculate additional metrics
  const healthyPercentage = summary.totalClients > 0
    ? Math.round(((summary.byCategory.otimo + summary.byCategory.estavel) / summary.totalClients) * 100)
    : 0;

  const atRiskPercentage = summary.totalClients > 0
    ? Math.round(((summary.byCategory.atencao + summary.byCategory.critico) / summary.totalClients) * 100)
    : 0;

  // Pillar averages
  const pillarAverages = {
    nps: results.length > 0 
      ? Math.round(results.reduce((sum, r) => sum + r.breakdown.nps.score, 0) / results.length) 
      : 0,
    meetings: results.length > 0 
      ? Math.round(results.reduce((sum, r) => sum + r.breakdown.meetings.score, 0) / results.length) 
      : 0,
    payment: results.length > 0 
      ? Math.round(results.reduce((sum, r) => sum + r.breakdown.payment.score, 0) / results.length) 
      : 0,
    crossSell: results.length > 0 
      ? Math.round(results.reduce((sum, r) => sum + r.breakdown.crossSell.score, 0) / results.length) 
      : 0,
    referrals: results.length > 0 
      ? Math.round(results.reduce((sum, r) => sum + r.breakdown.referrals.score, 0) / results.length) 
      : 0,
  };

  // Find weakest and strongest pillars
  const pillarData = [
    { name: 'NPS', value: pillarAverages.nps, max: 25 },
    { name: 'Reuniões', value: pillarAverages.meetings, max: 25 },
    { name: 'Pagamento', value: pillarAverages.payment, max: 20 },
    { name: 'Cross-sell', value: pillarAverages.crossSell, max: 15 },
    { name: 'Indicações', value: pillarAverages.referrals, max: 15 },
  ].map(p => ({ ...p, percentage: Math.round((p.value / p.max) * 100) }));

  const sortedPillars = [...pillarData].sort((a, b) => b.percentage - a.percentage);
  const strongestPillar = sortedPillars[0];
  const weakestPillar = sortedPillars[sortedPillars.length - 1];

  // Category distribution data for pie chart
  const categoryData = Object.entries(CATEGORY_CONFIG).map(([key, config]) => ({
    name: config.label,
    value: summary.byCategory[key as CategoryKey],
    color: config.color,
  }));

  // Score distribution histogram
  const scoreRanges = [
    { range: '0-20', min: 0, max: 20, count: 0 },
    { range: '21-40', min: 21, max: 40, count: 0 },
    { range: '41-60', min: 41, max: 60, count: 0 },
    { range: '61-80', min: 61, max: 80, count: 0 },
    { range: '81-100', min: 81, max: 100, count: 0 },
  ];

  results.forEach((r) => {
    for (const range of scoreRanges) {
      if (r.totalScore >= range.min && r.totalScore <= range.max) {
        range.count++;
        break;
      }
    }
  });

  return (
    <div className="space-y-6">
      {/* Top Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="text-sm">Total de Clientes</span>
            </div>
            <p className="text-3xl font-bold mt-2">{summary.totalClients}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Target className="h-4 w-4" />
              <span className="text-sm">Score Médio</span>
            </div>
            <p className="text-3xl font-bold mt-2">{summary.averageScore}</p>
            <p className="text-xs text-muted-foreground">de 100 pontos</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-green-600">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">Saudáveis</span>
            </div>
            <p className="text-3xl font-bold mt-2">{healthyPercentage}%</p>
            <p className="text-xs text-muted-foreground">Ótimo + Estável</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">Em Risco</span>
            </div>
            <p className="text-3xl font-bold mt-2">{atRiskPercentage}%</p>
            <p className="text-xs text-muted-foreground">Atenção + Crítico</p>
          </CardContent>
        </Card>
      </div>

      {/* Pillar Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-700 dark:text-green-400">
                Pilar mais forte
              </span>
            </div>
            <p className="text-xl font-bold mt-2">{strongestPillar?.name}</p>
            <p className="text-sm text-muted-foreground">
              {strongestPillar?.percentage}% do máximo ({strongestPillar?.value}/{strongestPillar?.max})
            </p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                Pilar que precisa de atenção
              </span>
            </div>
            <p className="text-xl font-bold mt-2">{weakestPillar?.name}</p>
            <p className="text-sm text-muted-foreground">
              {weakestPillar?.percentage}% do máximo ({weakestPillar?.value}/{weakestPillar?.max})
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`${value} clientes`, 'Quantidade']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Score Distribution Histogram */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição de Scores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scoreRanges}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="range" 
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                  />
                  <Tooltip 
                    formatter={(value) => [`${value} clientes`, 'Quantidade']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pillar Performance */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Performance por Pilar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pillarData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    type="number" 
                    domain={[0, 100]}
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                    width={80}
                  />
                  <Tooltip 
                    formatter={(value) => [`${value}%`, 'Performance']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar 
                    dataKey="percentage" 
                    fill="hsl(var(--primary))"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
