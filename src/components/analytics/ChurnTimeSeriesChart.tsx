import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ChurnTimeSeries } from "@/hooks/useChurnAnalytics";

interface ChurnTimeSeriesChartProps {
  data: ChurnTimeSeries[] | undefined;
  isLoading: boolean;
}

const chartConfig = {
  cancellations: {
    label: "Cancelamentos",
    color: "hsl(var(--destructive))",
  },
  value: {
    label: "Valor Perdido",
    color: "hsl(var(--chart-4))",
  },
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function ChurnTimeSeriesChart({ data, isLoading }: ChurnTimeSeriesChartProps) {
  if (isLoading) {
    return (
      <Card className="col-span-2">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = (data || []).map((d) => ({
    ...d,
    monthLabel: format(parseISO(d.month + "-01"), "MMM/yy", { locale: ptBR }),
  }));

  const hasData = chartData.length > 0;

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Evolução de Cancelamentos</CardTitle>
        <CardDescription>Tendência mensal de cancelamentos e valor perdido</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            Sem dados de série temporal
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <LineChart data={chartData} margin={{ top: 20, right: 60, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="monthLabel" axisLine={false} tickLine={false} />
              <YAxis 
                yAxisId="left" 
                axisLine={false} 
                tickLine={false} 
                allowDecimals={false}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                axisLine={false} 
                tickLine={false}
                tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
              />
              <ChartTooltip 
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <div className="font-medium">{label}</div>
                      {payload.map((p: any) => (
                        <div key={p.dataKey} className="text-sm" style={{ color: p.color }}>
                          {p.dataKey === "value" 
                            ? `Valor: ${formatCurrency(p.value)}`
                            : `Cancelamentos: ${p.value}`
                          }
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="cancellations"
                stroke="hsl(var(--destructive))"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--chart-4))"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
