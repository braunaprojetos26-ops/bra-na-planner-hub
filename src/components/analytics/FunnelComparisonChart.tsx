import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { FunnelComparisonData } from '@/hooks/useAnalytics';

interface FunnelComparisonChartProps {
  data: FunnelComparisonData[];
  isLoading: boolean;
}

export function FunnelComparisonChart({ data, isLoading }: FunnelComparisonChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Comparativo entre Funis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Nenhum dado disponível no período
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map(d => ({
    name: d.name.length > 15 ? d.name.substring(0, 15) + '...' : d.name,
    fullName: d.name,
    won: d.won,
    lost: d.lost,
    conversionRate: d.conversionRate,
    total: d.total,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Comparativo entre Funis</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number, name: string, props: any) => {
                  if (name === 'Ganhas' || name === 'Perdidas') {
                    return [value, name];
                  }
                  return [`${value.toFixed(1)}%`, name];
                }}
                labelFormatter={(label, payload) => {
                  if (payload && payload.length > 0) {
                    return `${payload[0].payload.fullName} (Total: ${payload[0].payload.total})`;
                  }
                  return label;
                }}
              />
              <Legend />
              <Bar 
                dataKey="won" 
                name="Ganhas" 
                fill="hsl(142, 71%, 45%)" 
                radius={[4, 4, 0, 0]} 
                stackId="a"
              />
              <Bar 
                dataKey="lost" 
                name="Perdidas" 
                fill="hsl(0, 84%, 60%)" 
                radius={[4, 4, 0, 0]} 
                stackId="a"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Conversion rates table */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {data.map((funnel) => (
            <div 
              key={funnel.id} 
              className="p-2 bg-muted/50 rounded-lg text-center"
            >
              <p className="text-xs text-muted-foreground truncate" title={funnel.name}>
                {funnel.name}
              </p>
              <p className="text-lg font-semibold text-foreground">
                {funnel.conversionRate.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">conversão</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
