import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import type { TimeSeriesPoint } from '@/hooks/useAnalytics';

interface ProcessTimeSeriesChartProps {
  data: TimeSeriesPoint[];
  isLoading: boolean;
}

export function ProcessTimeSeriesChart({ data, isLoading }: ProcessTimeSeriesChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Evolução de Leads ao Longo do Tempo</CardTitle>
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
          <CardTitle className="text-lg">Evolução de Leads ao Longo do Tempo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            <p>Nenhum dado no período selecionado</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map(point => ({
    ...point,
    name: point.label,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Evolução de Leads ao Longo do Tempo</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorConverted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorLost" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="label" 
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length > 0) {
                  return (
                    <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
                      <p className="font-medium text-sm mb-2">{label}</p>
                      {payload.map((item, index) => (
                        <p key={index} className="text-sm" style={{ color: item.color }}>
                          {item.name}: <span className="font-medium">{item.value}</span>
                        </p>
                      ))}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="created" 
              name="Criados"
              stroke="hsl(217, 91%, 60%)" 
              fillOpacity={1} 
              fill="url(#colorCreated)" 
            />
            <Area 
              type="monotone" 
              dataKey="won" 
              name="Convertidos"
              stroke="hsl(142, 71%, 45%)" 
              fillOpacity={1} 
              fill="url(#colorConverted)" 
            />
            <Area 
              type="monotone" 
              dataKey="lost" 
              name="Perdidos"
              stroke="hsl(0, 84%, 60%)" 
              fillOpacity={1} 
              fill="url(#colorLost)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
