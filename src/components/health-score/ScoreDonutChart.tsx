import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CATEGORY_CONFIG, HealthScoreSummary } from '@/hooks/useHealthScore';

interface ScoreDonutChartProps {
  summary: HealthScoreSummary | undefined;
  isLoading?: boolean;
}

export function ScoreDonutChart({ summary, isLoading }: ScoreDonutChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Distribuição por Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Carregando...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary || summary.totalClients === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Distribuição por Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Nenhum cliente encontrado
          </div>
        </CardContent>
      </Card>
    );
  }

  const data = [
    { 
      name: CATEGORY_CONFIG.otimo.label, 
      value: summary.byCategory.otimo,
      color: '#22c55e', // green-500
    },
    { 
      name: CATEGORY_CONFIG.estavel.label, 
      value: summary.byCategory.estavel,
      color: '#3b82f6', // blue-500
    },
    { 
      name: CATEGORY_CONFIG.atencao.label, 
      value: summary.byCategory.atencao,
      color: '#eab308', // yellow-500
    },
    { 
      name: CATEGORY_CONFIG.critico.label, 
      value: summary.byCategory.critico,
      color: '#ef4444', // red-500
    },
  ].filter(d => d.value > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Distribuição por Categoria</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number, name: string) => {
                const percentage = Math.round((value / summary.totalClients) * 100);
                return [`${value} clientes (${percentage}%)`, name];
              }}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              formatter={(value: string) => (
                <span className="text-sm text-foreground">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
