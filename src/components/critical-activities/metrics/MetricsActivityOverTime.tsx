import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MonthlyActivityData } from '@/hooks/useCriticalActivityMetrics';

interface Props {
  data: MonthlyActivityData[];
}

export function MetricsActivityOverTime({ data }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Atividades Criadas vs Atuadas por Mês</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Sem dados no período</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis allowDecimals={false} className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem',
                  color: 'hsl(var(--foreground))',
                }}
              />
              <Legend />
              <Bar dataKey="created" name="Criadas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="acted" name="Atuadas" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
