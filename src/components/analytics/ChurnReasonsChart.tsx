import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis, Cell } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import type { ChurnReason } from "@/hooks/useChurnAnalytics";

interface ChurnReasonsChartProps {
  data: ChurnReason[] | undefined;
  isLoading: boolean;
}

const chartConfig = {
  count: {
    label: "Cancelamentos",
    color: "hsl(var(--chart-3))",
  },
};

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function ChurnReasonsChart({ data, isLoading }: ChurnReasonsChartProps) {
  if (isLoading) {
    return (
      <Card>
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

  const chartData = (data || []).slice(0, 8).map((d) => ({
    reason: d.reason.length > 25 ? d.reason.substring(0, 25) + "..." : d.reason,
    fullReason: d.reason,
    count: d.count,
    percentage: d.percentage,
  }));

  const hasData = chartData.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Motivos de Cancelamento</CardTitle>
        <CardDescription>Principais razões relatadas pelos clientes</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            Sem dados de motivos de cancelamento
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <BarChart 
              data={chartData} 
              layout="vertical" 
              margin={{ top: 20, right: 60, bottom: 20, left: 100 }}
            >
              <XAxis type="number" axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis 
                type="category" 
                dataKey="reason" 
                axisLine={false} 
                tickLine={false}
                width={100}
              />
              <ChartTooltip 
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <div className="font-medium">{data.fullReason}</div>
                      <div className="text-sm text-muted-foreground">
                        {data.count} cancelamentos ({data.percentage.toFixed(1)}%)
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
