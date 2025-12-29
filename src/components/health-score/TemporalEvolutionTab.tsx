import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CATEGORY_CONFIG, CategoryKey } from '@/hooks/useHealthScore';
import { TrendingUp, Calendar, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TemporalEvolutionTabProps {
  ownerIds?: string[];
  startDate?: Date;
  endDate?: Date;
}

type Period = '30d' | '60d' | '90d';
type ChartType = 'line' | 'area';
type ViewType = 'score' | 'distribution';

export function TemporalEvolutionTab({ ownerIds, startDate, endDate }: TemporalEvolutionTabProps) {
  const hasCustomDateRange = startDate && endDate;
  const [period, setPeriod] = useState<Period>('30d');
  const [chartType, setChartType] = useState<ChartType>('line');
  const [viewType, setViewType] = useState<ViewType>('score');

  const getDateRange = () => {
    if (hasCustomDateRange) {
      return { start: startDate, end: endDate };
    }
    
    const end = new Date();
    let start: Date;
    
    switch (period) {
      case '30d': start = subDays(end, 30); break;
      case '60d': start = subDays(end, 60); break;
      case '90d': start = subDays(end, 90); break;
      default: start = subDays(end, 30);
    }
    
    return { start, end };
  };

  const { start: currentStart, end: currentEnd } = getDateRange();

  // Get previous period for comparison
  const getPreviousPeriodRange = () => {
    const diff = currentEnd.getTime() - currentStart.getTime();
    const prevEnd = new Date(currentStart.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - diff);
    return { start: prevStart, end: prevEnd };
  };

  const { start: prevStart, end: prevEnd } = getPreviousPeriodRange();

  // Fetch current period snapshots
  const { data: currentSnapshots, isLoading: isLoadingCurrent } = useQuery({
    queryKey: ['health-score-snapshots-current', ownerIds, period, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from('health_score_snapshots')
        .select('*')
        .gte('snapshot_date', format(currentStart, 'yyyy-MM-dd'))
        .lte('snapshot_date', format(currentEnd, 'yyyy-MM-dd'))
        .order('snapshot_date', { ascending: true });

      if (ownerIds && ownerIds.length > 0) {
        query = query.in('owner_id', ownerIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch previous period snapshots for comparison
  const { data: prevSnapshots, isLoading: isLoadingPrev } = useQuery({
    queryKey: ['health-score-snapshots-prev', ownerIds, period, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from('health_score_snapshots')
        .select('*')
        .gte('snapshot_date', format(prevStart, 'yyyy-MM-dd'))
        .lte('snapshot_date', format(prevEnd, 'yyyy-MM-dd'))
        .order('snapshot_date', { ascending: true });

      if (ownerIds && ownerIds.length > 0) {
        query = query.in('owner_id', ownerIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const isLoading = isLoadingCurrent || isLoadingPrev;

  // Group snapshots by date and calculate data
  const chartData = (() => {
    if (!currentSnapshots?.length) return [];

    const intervals = eachDayOfInterval({ start: currentStart, end: currentEnd });

    return intervals.map((date) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const daySnapshots = currentSnapshots.filter((s) => s.snapshot_date === dateStr);

      if (daySnapshots.length === 0) {
        return {
          date: format(date, 'dd/MM', { locale: ptBR }),
          fullDate: format(date, 'dd/MM/yyyy', { locale: ptBR }),
          avgScore: null,
          otimo: 0,
          estavel: 0,
          atencao: 0,
          critico: 0,
          total: 0,
        };
      }

      const avgScore = Math.round(
        (daySnapshots.reduce((sum, s) => sum + s.total_score, 0) / daySnapshots.length) * 100
      ) / 100;

      const categories = daySnapshots.reduce(
        (acc, s) => {
          acc[s.category as CategoryKey]++;
          return acc;
        },
        { otimo: 0, estavel: 0, atencao: 0, critico: 0 }
      );

      return {
        date: format(date, 'dd/MM', { locale: ptBR }),
        fullDate: format(date, 'dd/MM/yyyy', { locale: ptBR }),
        avgScore,
        ...categories,
        total: daySnapshots.length,
      };
    });
  })();

  // Calculate trend analysis (current vs previous period)
  const trendAnalysis = (() => {
    if (!currentSnapshots?.length) return null;

    // Current period stats
    const currentUniqueContacts = new Set(currentSnapshots.map(s => s.contact_id)).size;
    const currentAvgScore = currentSnapshots.length > 0
      ? Math.round((currentSnapshots.reduce((sum, s) => sum + s.total_score, 0) / currentSnapshots.length) * 10) / 10
      : 0;

    // Previous period stats
    const prevUniqueContacts = prevSnapshots?.length 
      ? new Set(prevSnapshots.map(s => s.contact_id)).size 
      : 0;
    const prevAvgScore = prevSnapshots?.length
      ? Math.round((prevSnapshots.reduce((sum, s) => sum + s.total_score, 0) / prevSnapshots.length) * 10) / 10
      : 0;

    const scoreDiff = Math.round((currentAvgScore - prevAvgScore) * 10) / 10;
    const scorePercentDiff = prevAvgScore > 0 
      ? Math.round((scoreDiff / prevAvgScore) * 1000) / 10 
      : 0;
    const clientsDiff = currentUniqueContacts - prevUniqueContacts;

    // Determine overall trend
    let overallTrend: 'positivo' | 'negativo' | 'estavel' = 'estavel';
    if (scoreDiff > 2) overallTrend = 'positivo';
    else if (scoreDiff < -2) overallTrend = 'negativo';

    return {
      scoreDiff,
      scorePercentDiff,
      clientsDiff,
      overallTrend,
      currentAvgScore,
      prevAvgScore,
      currentClients: currentUniqueContacts,
      prevClients: prevUniqueContacts,
    };
  })();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="animate-pulse">
          <CardContent className="pt-6">
            <div className="h-12 bg-muted rounded mb-4" />
            <div className="h-64 bg-muted rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasData = currentSnapshots && currentSnapshots.length > 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;

    if (viewType === 'score') {
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium mb-1">Data: {payload[0]?.payload?.fullDate}</p>
          <p className="text-sm text-primary">
            Score Médio: {payload[0]?.value?.toFixed(2) ?? 'Sem dados'}
          </p>
        </div>
      );
    }

    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
        <p className="text-sm font-medium mb-2">Data: {payload[0]?.payload?.fullDate}</p>
        {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
          const value = payload.find((p: any) => p.dataKey === key)?.value ?? 0;
          return (
            <p key={key} className="text-sm" style={{ color: config.color }}>
              {config.label}: {value}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Filters Section */}
      <Card>
        <CardContent className="pt-6">
          {/* Period Preset Buttons */}
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant={period === '30d' && !hasCustomDateRange ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod('30d')}
              disabled={!!hasCustomDateRange}
            >
              Últimos 30 dias
            </Button>
            <Button
              variant={period === '60d' && !hasCustomDateRange ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod('60d')}
              disabled={!!hasCustomDateRange}
            >
              Últimos 60 dias
            </Button>
            <Button
              variant={period === '90d' && !hasCustomDateRange ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod('90d')}
              disabled={!!hasCustomDateRange}
            >
              Últimos 90 dias
            </Button>
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Period Display */}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Período</label>
              <div className="flex items-center gap-2 bg-muted/50 rounded-md px-3 py-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {format(currentStart, 'dd/MM/yyyy')} - {format(currentEnd, 'dd/MM/yyyy')}
                </span>
              </div>
            </div>

            {/* Chart Type */}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Tipo de Gráfico</label>
              <Select value={chartType} onValueChange={(v) => setChartType(v as ChartType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="line">Linha</SelectItem>
                  <SelectItem value="area">Área</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* View Type */}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Visualização</label>
              <Select value={viewType} onValueChange={(v) => setViewType(v as ViewType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="score">Score Médio</SelectItem>
                  <SelectItem value="distribution">Distribuição</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Owner Info */}
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Planejador:</span>{' '}
            {ownerIds && ownerIds.length > 0 
              ? `${ownerIds.length} selecionado(s)` 
              : 'Todos os planejadores'}
            <p className="text-xs mt-1">
              Utilize os filtros gerais do topo do painel para segmentar por cargo.
            </p>
          </div>
        </CardContent>
      </Card>

      {!hasData ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum histórico disponível para o período selecionado.</p>
              <p className="text-sm mt-2">
                Os snapshots são gerados diariamente pelo sistema.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Trend Analysis Card */}
          {trendAnalysis && (
            <Card className="bg-muted/30">
              <CardContent className="py-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                  <span className="text-muted-foreground">−</span>
                  Análise de Tendência (janela atual vs anterior, ponderado por clientes)
                </h3>
                <div className="grid grid-cols-3 gap-8 text-center">
                  {/* Score Change */}
                  <div>
                    <p className={cn(
                      "text-3xl font-bold",
                      trendAnalysis.scoreDiff > 0 ? "text-green-500" :
                      trendAnalysis.scoreDiff < 0 ? "text-cyan-400" :
                      "text-muted-foreground"
                    )}>
                      {trendAnalysis.scoreDiff > 0 ? '+' : ''}{trendAnalysis.scoreDiff}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Mudança no Score ({trendAnalysis.scorePercentDiff > 0 ? '+' : ''}{trendAnalysis.scorePercentDiff}%)
                    </p>
                  </div>

                  {/* Client Change */}
                  <div>
                    <p className={cn(
                      "text-3xl font-bold",
                      trendAnalysis.clientsDiff > 0 ? "text-green-500" :
                      trendAnalysis.clientsDiff < 0 ? "text-red-500" :
                      "text-muted-foreground"
                    )}>
                      {trendAnalysis.clientsDiff > 0 ? '+' : ''}{trendAnalysis.clientsDiff}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Mudança no Número de Clientes
                    </p>
                  </div>

                  {/* Overall Trend */}
                  <div>
                    <p className={cn(
                      "text-3xl font-bold capitalize",
                      trendAnalysis.overallTrend === 'positivo' ? "text-green-500" :
                      trendAnalysis.overallTrend === 'negativo' ? "text-red-500" :
                      "text-green-500"
                    )}>
                      {trendAnalysis.overallTrend === 'positivo' ? 'Positivo' :
                       trendAnalysis.overallTrend === 'negativo' ? 'Negativo' :
                       'Estável'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Tendência Geral
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Chart Section */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                {viewType === 'score' ? 'Evolução do Health Score' : 'Distribuição por Categoria'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  {viewType === 'score' ? (
                    chartType === 'line' ? (
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 11 }}
                          className="text-muted-foreground"
                        />
                        <YAxis 
                          domain={['dataMin - 5', 'dataMax + 5']}
                          tick={{ fontSize: 11 }}
                          className="text-muted-foreground"
                          tickFormatter={(v) => v.toFixed(2)}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Line 
                          type="monotone" 
                          dataKey="avgScore" 
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                          connectNulls
                        />
                      </LineChart>
                    ) : (
                      <AreaChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 11 }}
                          className="text-muted-foreground"
                        />
                        <YAxis 
                          domain={['dataMin - 5', 'dataMax + 5']}
                          tick={{ fontSize: 11 }}
                          className="text-muted-foreground"
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area 
                          type="monotone" 
                          dataKey="avgScore" 
                          stroke="hsl(var(--primary))"
                          fill="hsl(var(--primary))"
                          fillOpacity={0.3}
                          connectNulls
                        />
                      </AreaChart>
                    )
                  ) : (
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 11 }}
                        className="text-muted-foreground"
                      />
                      <YAxis 
                        tick={{ fontSize: 11 }}
                        className="text-muted-foreground"
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area 
                        type="monotone" 
                        dataKey="estavel" 
                        name="Estável"
                        stackId="1"
                        fill={CATEGORY_CONFIG.estavel.color}
                        stroke={CATEGORY_CONFIG.estavel.color}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="otimo" 
                        name="Ótimo"
                        stackId="1"
                        fill={CATEGORY_CONFIG.otimo.color}
                        stroke={CATEGORY_CONFIG.otimo.color}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="atencao" 
                        name="Atenção"
                        stackId="1"
                        fill={CATEGORY_CONFIG.atencao.color}
                        stroke={CATEGORY_CONFIG.atencao.color}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="critico" 
                        name="Crítico"
                        stackId="1"
                        fill={CATEGORY_CONFIG.critico.color}
                        stroke={CATEGORY_CONFIG.critico.color}
                      />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
