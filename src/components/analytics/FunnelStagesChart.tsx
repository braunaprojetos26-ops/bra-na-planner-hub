import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { StageData } from '@/hooks/useAnalytics';

interface FunnelStagesChartProps {
  data: StageData[];
  isLoading: boolean;
}

const stageColors: Record<string, string> = {
  gray: 'hsl(220, 13%, 50%)',
  blue: 'hsl(217, 91%, 60%)',
  green: 'hsl(142, 71%, 45%)',
  yellow: 'hsl(45, 93%, 47%)',
  orange: 'hsl(24, 94%, 50%)',
  red: 'hsl(0, 84%, 60%)',
  purple: 'hsl(262, 83%, 58%)',
  pink: 'hsl(330, 81%, 60%)',
  indigo: 'hsl(239, 84%, 67%)',
  teal: 'hsl(168, 76%, 42%)',
};

export function FunnelStagesChart({ data, isLoading }: FunnelStagesChartProps) {
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
          <CardTitle className="text-lg font-semibold">Distribuição por Etapa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Nenhuma oportunidade ativa no período
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map(d => ({
    name: d.name.length > 15 ? d.name.substring(0, 15) + '...' : d.name,
    fullName: d.name,
    count: d.count,
    color: stageColors[d.color] || stageColors.gray,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Distribuição por Etapa</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={chartData} 
              layout="vertical" 
              margin={{ top: 10, right: 30, left: 100, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
              <XAxis 
                type="number" 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                width={90}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number, name: string, props: any) => [
                  `${value} oportunidades`,
                  props.payload.fullName,
                ]}
                labelFormatter={() => ''}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
