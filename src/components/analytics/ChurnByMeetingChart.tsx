import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import type { ChurnByMeeting } from "@/hooks/useChurnAnalytics";

interface ChurnByMeetingChartProps {
  data: ChurnByMeeting[] | undefined;
  isLoading: boolean;
}

const chartConfig = {
  count: {
    label: "Cancelamentos",
    color: "hsl(var(--chart-2))",
  },
};

export function ChurnByMeetingChart({ data, isLoading }: ChurnByMeetingChartProps) {
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

  const chartData = (data || []).map((d) => ({
    meeting: d.meeting === 0 ? "Antes da 1ª" : `Após ${d.meeting}ª`,
    count: d.count,
  }));

  const hasData = chartData.length > 0 && chartData.some((d) => d.count > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cancelamentos por Reunião</CardTitle>
        <CardDescription>Após qual reunião os clientes mais cancelam</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            Sem dados de cancelamento por reunião
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <XAxis dataKey="meeting" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
