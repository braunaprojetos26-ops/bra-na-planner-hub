import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';

interface NpsVsChurn {
  category: string;
  npsScore: number;
  count: number;
}

interface NpsVsChurnChartProps {
  data: NpsVsChurn[];
}

export function NpsVsChurnChart({ data }: NpsVsChurnChartProps) {
  const colors = ['hsl(var(--chart-2))', 'hsl(var(--chart-1))'];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">NPS: Clientes Ativos vs Cancelados</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          {data.every(d => d.count === 0) ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Sem dados para exibir
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="category"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  domain={[-100, 100]}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                />
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
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
                <Bar dataKey="npsScore" radius={[4, 4, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          {data.map((item, index) => (
            <div key={item.category} className="text-center">
              <div className="text-muted-foreground">{item.category}</div>
              <div className="text-lg font-semibold">{item.count} respostas</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
