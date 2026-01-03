import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { HealthScoreResult, HealthScoreSummary, CATEGORY_CONFIG, CategoryKey } from '@/hooks/useHealthScore';
import { Users, TrendingUp, TrendingDown, Activity, Target, AlertTriangle, ChevronUp, ChevronDown } from 'lucide-react';
import { HealthScoreRadarChart } from './HealthScoreRadarChart';
import { HealthScoreTemporalBarChart } from './HealthScoreTemporalBarChart';
import { HealthScorePillarHeatmap } from './HealthScorePillarHeatmap';
import { cn } from '@/lib/utils';

interface PortfolioMetricsTabProps {
  results: HealthScoreResult[];
  summary?: HealthScoreSummary;
  isLoading: boolean;
  ownerIds?: string[];
  contactIds?: string[];
}

type SortField = 'name' | 'total' | 'otimo' | 'estavel' | 'atencao' | 'critico' | 'risk';
type SortDirection = 'asc' | 'desc';

interface PlannerStats {
  ownerId: string;
  ownerName: string;
  total: number;
  otimo: number;
  estavel: number;
  atencao: number;
  critico: number;
  riskPercentage: number;
}

export function PortfolioMetricsTab({ results, summary, isLoading, ownerIds, contactIds }: PortfolioMetricsTabProps) {
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  if (isLoading || !summary) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
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

  // Calculate volatility (standard deviation)
  const scores = results.map(r => r.totalScore);
  const mean = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const variance = scores.length > 0 
    ? scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length 
    : 0;
  const volatility = Math.round(Math.sqrt(variance));

  // Trend calculation (placeholder - would need historical data)
  const trendPercentage = -0.1; // This would come from comparing with previous period
  const trendDirection = trendPercentage >= 0 ? 'up' : 'down';


  // Calculate planner stats
  const plannerStatsMap = new Map<string, PlannerStats>();
  results.forEach(r => {
    if (!r.ownerId || !r.ownerName) return;
    
    if (!plannerStatsMap.has(r.ownerId)) {
      plannerStatsMap.set(r.ownerId, {
        ownerId: r.ownerId,
        ownerName: r.ownerName,
        total: 0,
        otimo: 0,
        estavel: 0,
        atencao: 0,
        critico: 0,
        riskPercentage: 0,
      });
    }
    
    const stats = plannerStatsMap.get(r.ownerId)!;
    stats.total++;
    stats[r.category as keyof Pick<PlannerStats, 'otimo' | 'estavel' | 'atencao' | 'critico'>]++;
  });

  // Calculate risk percentage for each planner
  plannerStatsMap.forEach(stats => {
    stats.riskPercentage = stats.total > 0 
      ? Math.round(((stats.atencao + stats.critico) / stats.total) * 100)
      : 0;
  });

  const plannerStats = Array.from(plannerStatsMap.values());


  // Sort planner stats for table
  const sortedPlannerStats = [...plannerStats].sort((a, b) => {
    let aVal: string | number, bVal: string | number;
    
    switch (sortField) {
      case 'name': aVal = a.ownerName; bVal = b.ownerName; break;
      case 'total': aVal = a.total; bVal = b.total; break;
      case 'otimo': aVal = a.otimo; bVal = b.otimo; break;
      case 'estavel': aVal = a.estavel; bVal = b.estavel; break;
      case 'atencao': aVal = a.atencao; bVal = b.atencao; break;
      case 'critico': aVal = a.critico; bVal = b.critico; break;
      case 'risk': aVal = a.riskPercentage; bVal = b.riskPercentage; break;
      default: aVal = a.ownerName; bVal = b.ownerName;
    }

    if (typeof aVal === 'string') {
      return sortDirection === 'asc' 
        ? aVal.localeCompare(bVal as string)
        : (bVal as string).localeCompare(aVal);
    }
    return sortDirection === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp className="h-3 w-3 opacity-30" />;
    return sortDirection === 'asc' 
      ? <ChevronUp className="h-3 w-3" /> 
      : <ChevronDown className="h-3 w-3" />;
  };

  const CategoryBadge = ({ value, category }: { value: number; category: CategoryKey }) => {
    const config = CATEGORY_CONFIG[category];
    return (
      <span 
        className="inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium"
        style={{ 
          borderColor: config.color,
          borderWidth: '2px',
          color: config.color,
        }}
      >
        {value}
      </span>
    );
  };

  return (
    <div className="space-y-6">

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Portfolio Health Index */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Health Score médio</span>
              <Target className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-4xl font-bold mt-2">{summary.averageScore}</p>
            <p className="text-xs text-muted-foreground">Score médio da carteira</p>
          </CardContent>
        </Card>

        {/* Total de Clientes */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total de Clientes</span>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-4xl font-bold mt-2">{summary.totalClients}</p>
            <p className="text-xs text-muted-foreground">em toda equipe</p>
          </CardContent>
        </Card>

        {/* Tendência */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Tendência</span>
              {trendDirection === 'up' ? (
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <p className={cn(
              "text-4xl font-bold mt-2",
              trendPercentage >= 0 ? "text-green-500" : "text-red-500"
            )}>
              {trendPercentage >= 0 ? '+' : ''}{trendPercentage}%
            </p>
            <p className="text-xs text-muted-foreground">
              {trendPercentage >= 0 ? 'Score melhorou' : 'Score piorou'}
            </p>
          </CardContent>
        </Card>

        {/* Volatilidade */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Volatilidade</span>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-4xl font-bold mt-2">{volatility}</p>
            <p className="text-xs text-muted-foreground">Desvio padrão dos scores</p>
          </CardContent>
        </Card>
      </div>

      {/* New Charts Section: Radar + Temporal Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HealthScoreRadarChart results={results} />
        <HealthScoreTemporalBarChart ownerIds={ownerIds} contactIds={contactIds} />
      </div>

      {/* Pillar Heatmap */}
      <HealthScorePillarHeatmap ownerIds={ownerIds} contactIds={contactIds} />

      {/* Risk Concentration Matrix */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Risk Concentration Matrix
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedPlannerStats.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum planejador encontrado.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-1">
                        Planejador
                        <SortIcon field="name" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="text-center cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('total')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        Total
                        <SortIcon field="total" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="text-center cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('otimo')}
                    >
                      <div className="flex items-center justify-center gap-1" style={{ color: CATEGORY_CONFIG.otimo.color }}>
                        Ótimo
                        <SortIcon field="otimo" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="text-center cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('estavel')}
                    >
                      <div className="flex items-center justify-center gap-1" style={{ color: CATEGORY_CONFIG.estavel.color }}>
                        Estável
                        <SortIcon field="estavel" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="text-center cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('atencao')}
                    >
                      <div className="flex items-center justify-center gap-1" style={{ color: CATEGORY_CONFIG.atencao.color }}>
                        Atenção
                        <SortIcon field="atencao" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="text-center cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('critico')}
                    >
                      <div className="flex items-center justify-center gap-1" style={{ color: CATEGORY_CONFIG.critico.color }}>
                        Crítico
                        <SortIcon field="critico" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="text-center cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('risk')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        % Risco
                        <SortIcon field="risk" />
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedPlannerStats.map((planner) => (
                    <TableRow key={planner.ownerId}>
                      <TableCell className="font-medium">{planner.ownerName}</TableCell>
                      <TableCell className="text-center">{planner.total}</TableCell>
                      <TableCell className="text-center">
                        <CategoryBadge value={planner.otimo} category="otimo" />
                      </TableCell>
                      <TableCell className="text-center">
                        <CategoryBadge value={planner.estavel} category="estavel" />
                      </TableCell>
                      <TableCell className="text-center">
                        <CategoryBadge value={planner.atencao} category="atencao" />
                      </TableCell>
                      <TableCell className="text-center">
                        <CategoryBadge value={planner.critico} category="critico" />
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {planner.riskPercentage}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
