import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import type { ChurnByMonth } from "@/hooks/useChurnAnalytics";

interface ChurnByContractMonthChartProps {
  data: ChurnByMonth[] | undefined;
  isLoading: boolean;
}

const chartConfig = {
  count: {
    label: "Cancelamentos",
    color: "hsl(var(--destructive))",
  },
};

export function ChurnByContractMonthChart({ data, isLoading }: ChurnByContractMonthChartProps) {
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

  // Fill all 12 months
  const chartData = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const found = data?.find((d) => d.month === month);
    return {
      month: `${month}º`,
      count: found?.count || 0,
    };
  });

  const hasData = data && data.length > 0 && data.some((d) => d.count > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cancelamentos por Mês do Contrato</CardTitle>
        <CardDescription>Em qual mês do ciclo de 12 meses os clientes mais cancelam</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            Sem dados de cancelamento por mês do contrato
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <XAxis dataKey="month" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
