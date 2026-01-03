import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MonthlyData {
  month: string;
  monthLabel: string;
  averageScore: number;
  count: number;
}

interface HealthScoreTemporalBarChartProps {
  ownerIds?: string[];
  contactIds?: string[];
}

// Color gradient based on score
const getScoreColor = (score: number): string => {
  if (score >= 75) return 'hsl(var(--success))';
  if (score >= 50) return 'hsl(var(--info))';
  if (score >= 30) return 'hsl(var(--warning))';
  return 'hsl(var(--destructive))';
};

export function HealthScoreTemporalBarChart({ ownerIds, contactIds }: HealthScoreTemporalBarChartProps) {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [firstQuartileBenchmark, setFirstQuartileBenchmark] = useState<number>(75);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchHistoricalData() {
      setIsLoading(true);
      
      const months: MonthlyData[] = [];
      const now = new Date();

      // Generate last 12 months
      for (let i = 11; i >= 0; i--) {
        const monthDate = subMonths(now, i);
        const start = format(startOfMonth(monthDate), 'yyyy-MM-dd');
        const end = format(endOfMonth(monthDate), 'yyyy-MM-dd');
        
        let query = supabase
          .from('health_score_snapshots')
          .select('total_score')
          .gte('snapshot_date', start)
          .lte('snapshot_date', end);

        if (ownerIds && ownerIds.length > 0) {
          query = query.in('owner_id', ownerIds);
        }

        if (contactIds && contactIds.length > 0) {
          query = query.in('contact_id', contactIds);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching monthly data:', error);
          continue;
        }

        const scores = data?.map(d => d.total_score) || [];
        const avgScore = scores.length > 0 
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : 0;

        months.push({
          month: format(monthDate, 'yyyy-MM'),
          monthLabel: format(monthDate, 'MMM', { locale: ptBR }).charAt(0).toUpperCase() + 
                      format(monthDate, 'MMM', { locale: ptBR }).slice(1),
          averageScore: avgScore,
          count: scores.length,
        });
      }

      setMonthlyData(months);

      // Calculate 1st quartile benchmark from latest month
      const latestMonth = months[months.length - 1];
      if (latestMonth && latestMonth.count > 0) {
        let benchmarkQuery = supabase
          .from('health_score_snapshots')
          .select('total_score')
          .gte('snapshot_date', format(startOfMonth(now), 'yyyy-MM-dd'))
          .lte('snapshot_date', format(endOfMonth(now), 'yyyy-MM-dd'))
          .order('total_score', { ascending: false });

        if (ownerIds && ownerIds.length > 0) {
          benchmarkQuery = benchmarkQuery.in('owner_id', ownerIds);
        }

        const { data: benchmarkData } = await benchmarkQuery;

        if (benchmarkData && benchmarkData.length > 0) {
          const q1Count = Math.max(1, Math.floor(benchmarkData.length * 0.25));
          const q1Scores = benchmarkData.slice(0, q1Count).map(d => d.total_score);
          const q1Avg = Math.round(q1Scores.reduce((a, b) => a + b, 0) / q1Scores.length);
          setFirstQuartileBenchmark(q1Avg);
        }
      }

      setIsLoading(false);
    }

    fetchHistoricalData();
  }, [ownerIds, contactIds]);

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Evolução Temporal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="animate-pulse bg-muted rounded w-full h-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Evolução Temporal
          <span className="text-xs text-muted-foreground font-normal ml-2">
            Últimos 12 meses
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="monthLabel" 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis 
                domain={[0, 100]}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [`${value} pontos`, 'Score Médio']}
                labelFormatter={(label) => `Mês: ${label}`}
              />
              <ReferenceLine 
                y={firstQuartileBenchmark} 
                stroke="hsl(var(--primary))"
                strokeDasharray="5 5"
                strokeWidth={2}
                label={{ 
                  value: `1º Quartil: ${firstQuartileBenchmark}`,
                  position: 'right',
                  fill: 'hsl(var(--primary))',
                  fontSize: 10,
                }}
              />
              <Bar 
                dataKey="averageScore" 
                radius={[4, 4, 0, 0]}
                label={{ 
                  position: 'top', 
                  fill: 'hsl(var(--foreground))', 
                  fontSize: 10,
                  formatter: (value: number) => value > 0 ? value : '',
                }}
              >
                {monthlyData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getScoreColor(entry.averageScore)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--success))' }} />
            <span>Ótimo (≥75)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--info))' }} />
            <span>Estável (50-74)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--warning))' }} />
            <span>Atenção (30-49)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--destructive))' }} />
            <span>Crítico (&lt;30)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
