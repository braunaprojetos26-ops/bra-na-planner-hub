import { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import type { TimeSeriesPoint } from '@/hooks/useAnalytics';

interface PerformanceOverTimeChartProps {
  data: TimeSeriesPoint[];
  isLoading: boolean;
}

type ViewMode = 'quantity' | 'value';

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(0)}K`;
  }
  return `R$ ${value.toFixed(0)}`;
}

export function PerformanceOverTimeChart({ data, isLoading }: PerformanceOverTimeChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('quantity');

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map(d => ({
    name: d.label,
    ...d,
  }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">Performance ao Longo do Tempo</CardTitle>
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
          <TabsList className="h-8">
            <TabsTrigger value="quantity" className="text-xs px-3">Quantidade</TabsTrigger>
            <TabsTrigger value="value" className="text-xs px-3">Valor</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            {viewMode === 'quantity' ? (
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorWon" x1="0" y1="0" x2="0" y2="1">
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
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="created"
                  name="Criadas"
                  stroke="hsl(var(--primary))"
                  fillOpacity={1}
                  fill="url(#colorCreated)"
                />
                <Area
                  type="monotone"
                  dataKey="won"
                  name="Ganhas"
                  stroke="hsl(142, 71%, 45%)"
                  fillOpacity={1}
                  fill="url(#colorWon)"
                />
                <Area
                  type="monotone"
                  dataKey="lost"
                  name="Perdidas"
                  stroke="hsl(0, 84%, 60%)"
                  fillOpacity={1}
                  fill="url(#colorLost)"
                />
              </AreaChart>
            ) : (
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValueWon" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorValueLost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={formatCurrency}
                  className="text-muted-foreground"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="valueWon"
                  name="Valor Ganho"
                  stroke="hsl(142, 71%, 45%)"
                  fillOpacity={1}
                  fill="url(#colorValueWon)"
                />
                <Area
                  type="monotone"
                  dataKey="valueLost"
                  name="Valor Perdido"
                  stroke="hsl(0, 84%, 60%)"
                  fillOpacity={1}
                  fill="url(#colorValueLost)"
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
