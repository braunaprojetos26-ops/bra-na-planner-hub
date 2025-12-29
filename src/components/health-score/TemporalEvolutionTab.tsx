import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, subMonths, startOfDay, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CATEGORY_CONFIG, CategoryKey } from '@/hooks/useHealthScore';
import { TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';

interface TemporalEvolutionTabProps {
  ownerId?: string;
}

type Period = '7d' | '30d' | '90d' | '6m' | '1y';

export function TemporalEvolutionTab({ ownerId }: TemporalEvolutionTabProps) {
  const [period, setPeriod] = useState<Period>('30d');

  const getDateRange = () => {
    const end = new Date();
    let start: Date;
    
    switch (period) {
      case '7d': start = subDays(end, 7); break;
      case '30d': start = subDays(end, 30); break;
      case '90d': start = subDays(end, 90); break;
      case '6m': start = subMonths(end, 6); break;
      case '1y': start = subMonths(end, 12); break;
      default: start = subDays(end, 30);
    }
    
    return { start, end };
  };

  const { data: snapshots, isLoading } = useQuery({
    queryKey: ['health-score-snapshots', ownerId, period],
    queryFn: async () => {
      const { start, end } = getDateRange();
      
      let query = supabase
        .from('health_score_snapshots')
        .select('*')
        .gte('snapshot_date', format(start, 'yyyy-MM-dd'))
        .lte('snapshot_date', format(end, 'yyyy-MM-dd'))
        .order('snapshot_date', { ascending: true });

      if (ownerId) {
        query = query.eq('owner_id', ownerId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Group snapshots by date and calculate averages
  const chartData = (() => {
    if (!snapshots?.length) return [];

    const { start, end } = getDateRange();
    let intervals: Date[];
    let formatStr: string;

    if (period === '7d' || period === '30d') {
      intervals = eachDayOfInterval({ start, end });
      formatStr = 'dd/MM';
    } else if (period === '90d') {
      intervals = eachWeekOfInterval({ start, end });
      formatStr = 'dd/MM';
    } else {
      intervals = eachMonthOfInterval({ start, end });
      formatStr = 'MMM/yy';
    }

    return intervals.map((date) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const daySnapshots = snapshots.filter((s) => {
        if (period === '7d' || period === '30d') {
          return s.snapshot_date === dateStr;
        } else if (period === '90d') {
          const weekEnd = subDays(new Date(date), -7);
          return s.snapshot_date >= dateStr && s.snapshot_date < format(weekEnd, 'yyyy-MM-dd');
        } else {
          return s.snapshot_date.startsWith(format(date, 'yyyy-MM'));
        }
      });

      if (daySnapshots.length === 0) {
        return {
          date: format(date, formatStr, { locale: ptBR }),
          avgScore: null,
          otimo: 0,
          estavel: 0,
          atencao: 0,
          critico: 0,
        };
      }

      const avgScore = Math.round(
        daySnapshots.reduce((sum, s) => sum + s.total_score, 0) / daySnapshots.length
      );

      const categories = daySnapshots.reduce(
        (acc, s) => {
          acc[s.category as CategoryKey]++;
          return acc;
        },
        { otimo: 0, estavel: 0, atencao: 0, critico: 0 }
      );

      return {
        date: format(date, formatStr, { locale: ptBR }),
        avgScore,
        ...categories,
      };
    });
  })();

  // Calculate trend
  const trend = (() => {
    if (chartData.length < 2) return null;
    
    const validData = chartData.filter((d) => d.avgScore !== null);
    if (validData.length < 2) return null;
    
    const first = validData[0].avgScore!;
    const last = validData[validData.length - 1].avgScore!;
    const diff = last - first;
    
    return {
      direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable',
      value: Math.abs(diff),
      percentage: first > 0 ? Math.round((diff / first) * 100) : 0,
    };
  })();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-5 bg-muted rounded w-48" />
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-muted rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasData = snapshots && snapshots.length > 0;

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Período:</span>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="90d">Últimos 90 dias</SelectItem>
            <SelectItem value="6m">Últimos 6 meses</SelectItem>
            <SelectItem value="1y">Último ano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!hasData ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <p>Nenhum histórico disponível para o período selecionado.</p>
              <p className="text-sm mt-2">
                Os snapshots são gerados diariamente pelo sistema.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Trend Card */}
          {trend && (
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Tendência do período</p>
                    <div className="flex items-center gap-2 mt-1">
                      {trend.direction === 'up' && (
                        <TrendingUp className="h-5 w-5 text-green-500" />
                      )}
                      {trend.direction === 'down' && (
                        <TrendingDown className="h-5 w-5 text-red-500" />
                      )}
                      {trend.direction === 'stable' && (
                        <Minus className="h-5 w-5 text-muted-foreground" />
                      )}
                      <span className="text-lg font-semibold">
                        {trend.direction === 'up' && '+'}
                        {trend.direction === 'down' && '-'}
                        {trend.value} pontos
                      </span>
                      <span className="text-sm text-muted-foreground">
                        ({trend.percentage > 0 && '+'}{trend.percentage}%)
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Score Evolution Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Evolução do Score Médio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 11 }}
                      className="text-muted-foreground"
                    />
                    <YAxis 
                      domain={[0, 100]}
                      tick={{ fontSize: 11 }}
                      className="text-muted-foreground"
                    />
                    <Tooltip 
                      formatter={(value) => [value !== null ? `${value} pontos` : 'Sem dados', 'Score Médio']}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="avgScore" 
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))', r: 3 }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Category Distribution Over Time */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Distribuição por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
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
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
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
                      dataKey="estavel" 
                      name="Estável"
                      stackId="1"
                      fill={CATEGORY_CONFIG.estavel.color}
                      stroke={CATEGORY_CONFIG.estavel.color}
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
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
