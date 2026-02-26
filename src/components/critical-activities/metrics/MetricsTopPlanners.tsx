import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PlannerRanking } from '@/hooks/useCriticalActivityMetrics';

interface Props {
  data: PlannerRanking[];
  title: string;
  color?: 'accent' | 'destructive';
}

function getBarColor(index: number, total: number, variant: 'accent' | 'destructive') {
  if (variant === 'accent') {
    if (index < 3) return 'hsl(var(--accent))';
    if (index >= total - 3) return 'hsl(var(--muted-foreground) / 0.4)';
    return 'hsl(var(--primary))';
  }
  // destructive: top 3 are worst (most open)
  if (index < 3) return 'hsl(var(--destructive))';
  if (index >= total - 3) return 'hsl(var(--accent))';
  return 'hsl(var(--primary))';
}

export function MetricsTopPlanners({ data, title, color = 'accent' }: Props) {
  // Shorten names for display
  const chartData = data.map(d => ({
    ...d,
    shortName: d.name.split(' ').slice(0, 2).join(' '),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Sem dados no período</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(250, chartData.length * 32)}>
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
                formatter={(value: number) => [value, 'Total']}
                labelFormatter={(label) => {
                  const item = chartData.find(d => d.shortName === label);
                  return item?.name || label;
                }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {chartData.map((_, index) => (
                  <Cell key={index} fill={getBarColor(index, chartData.length, color)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
