import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface NpsTimeSeries {
  month: string;
  npsScore: number;
  responses: number;
}

interface NpsTimeSeriesChartProps {
  data: NpsTimeSeries[];
}

export function NpsTimeSeriesChart({ data }: NpsTimeSeriesChartProps) {
  const formatMonth = (month: string) => {
    try {
      return format(parseISO(`${month}-01`), 'MMM/yy', { locale: ptBR });
    } catch {
      return month;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Evolução do NPS ao Longo do Tempo</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          {data.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Sem dados para exibir
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="month" 
                  tickFormatter={formatMonth}
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
                  labelFormatter={(value) => formatMonth(value as string)}
                  formatter={(value: number, name: string) => {
                    if (name === 'npsScore') return [value, 'NPS'];
                    return [value, 'Respostas'];
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="npsScore" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
