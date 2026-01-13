import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface NpsDistribution {
  score: number;
  count: number;
  category: 'detractor' | 'passive' | 'promoter';
}

interface NpsScoreDistributionChartProps {
  data: NpsDistribution[];
}

export function NpsScoreDistributionChart({ data }: NpsScoreDistributionChartProps) {
  const getColor = (category: string) => {
    switch (category) {
      case 'promoter':
        return 'hsl(var(--chart-2))';
      case 'passive':
        return 'hsl(var(--chart-4))';
      case 'detractor':
        return 'hsl(var(--chart-1))';
      default:
        return 'hsl(var(--muted))';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Distribuição de Notas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="score" 
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelFormatter={(value) => `Nota ${value}`}
                formatter={(value: number) => [value, 'Respostas']}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getColor(entry.category)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--chart-1))' }} />
            <span className="text-muted-foreground">Detratores (0-6)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--chart-4))' }} />
            <span className="text-muted-foreground">Neutros (7-8)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--chart-2))' }} />
            <span className="text-muted-foreground">Promotores (9-10)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
