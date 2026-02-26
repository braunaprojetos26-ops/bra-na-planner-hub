import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AvgResponseTimeData } from '@/hooks/useCriticalActivityMetrics';

interface Props {
  data: AvgResponseTimeData[];
}

export function MetricsAvgResponseTime({ data }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tempo Médio de Atuação (horas)</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Sem dados no período</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis allowDecimals={false} className="text-xs" unit="h" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem',
                  color: 'hsl(var(--foreground))',
                }}
                formatter={(value: number) => [`${value}h`, 'Tempo médio']}
              />
              <Line
                type="monotone"
                dataKey="avgHours"
                name="Tempo médio"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
