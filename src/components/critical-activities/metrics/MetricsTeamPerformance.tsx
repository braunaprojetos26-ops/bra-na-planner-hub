import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TeamRanking } from '@/hooks/useCriticalActivityMetrics';

interface Props {
  data: TeamRanking[];
}

export function MetricsTeamPerformance({ data }: Props) {
  const chartData = data.map(d => ({
    ...d,
    shortName: d.managerName.split(' ').slice(0, 2).join(' '),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Desempenho por Equipe (Líder)</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Sem dados no período</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(250, chartData.length * 40)}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <XAxis type="number" allowDecimals={false} className="text-xs" />
              <YAxis type="category" dataKey="shortName" width={120} className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem',
                  color: 'hsl(var(--foreground))',
                }}
                labelFormatter={(label) => {
                  const item = chartData.find(d => d.shortName === label);
                  return item?.managerName || label;
                }}
              />
              <Legend />
              <Bar dataKey="acted" name="Atuadas" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
              <Bar dataKey="open" name="Em aberto" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
