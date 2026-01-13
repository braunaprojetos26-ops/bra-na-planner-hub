import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';

interface NpsByTenure {
  tenure: string;
  tenureLabel: string;
  npsScore: number;
  responses: number;
}

interface NpsByTenureChartProps {
  data: NpsByTenure[];
}

export function NpsByTenureChart({ data }: NpsByTenureChartProps) {
  const getColor = (score: number) => {
    if (score >= 50) return 'hsl(var(--chart-2))';
    if (score >= 0) return 'hsl(var(--chart-4))';
    return 'hsl(var(--chart-1))';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">NPS por Tempo de Contrato</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          {data.every(d => d.responses === 0) ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Sem dados para exibir
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                <XAxis 
                  type="number"
                  domain={[-100, 100]}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  type="category"
                  dataKey="tenureLabel"
                  width={150}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                />
                <ReferenceLine x={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'npsScore') return [value, 'NPS'];
                    return [value, 'Respostas'];
                  }}
                />
                <Bar dataKey="npsScore" radius={[0, 4, 4, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getColor(entry.npsScore)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="mt-4 text-sm text-muted-foreground text-center">
          Comparação do NPS entre clientes novos, em andamento e maduros
        </div>
      </CardContent>
    </Card>
  );
}
