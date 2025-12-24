import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { LossesPerStageData } from '@/hooks/useAnalytics';

interface LossesPerStageChartProps {
  data: LossesPerStageData[];
  isLoading: boolean;
}

const stageColors: Record<string, string> = {
  blue: 'hsl(217, 91%, 60%)',
  green: 'hsl(142, 71%, 45%)',
  yellow: 'hsl(45, 93%, 47%)',
  orange: 'hsl(27, 96%, 61%)',
  red: 'hsl(0, 84%, 60%)',
  purple: 'hsl(271, 81%, 56%)',
  pink: 'hsl(330, 81%, 60%)',
  indigo: 'hsl(239, 84%, 67%)',
  gray: 'hsl(220, 9%, 46%)',
};

function getChartColor(color: string): string {
  return stageColors[color] || 'hsl(0, 84%, 60%)';
}

export function LossesPerStageChart({ data, isLoading }: LossesPerStageChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Perdas por Etapa</CardTitle>
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
          <CardTitle className="text-lg">Perdas por Etapa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            <p>Nenhuma perda registrada no período</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map(stage => ({
    name: stage.stageName.length > 18 ? stage.stageName.substring(0, 18) + '...' : stage.stageName,
    fullName: stage.stageName,
    losses: stage.lossCount,
    percentage: stage.lossPercentage,
    color: stage.color,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Perdas por Etapa</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <XAxis 
              type="number"
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              type="category" 
              dataKey="name" 
              width={120}
              tick={{ fontSize: 12 }}
            />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length > 0) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
                      <p className="font-medium text-sm">{data.fullName}</p>
                      <p className="text-muted-foreground text-sm">
                        Perdas: <span className="font-medium text-red-600">{data.losses}</span>
                      </p>
                      <p className="text-muted-foreground text-sm">
                        Percentual: <span className="font-medium text-red-600">{data.percentage.toFixed(1)}%</span>
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="losses" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getChartColor(entry.color)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        
        {/* Summary below chart */}
        <div className="mt-4 pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Etapa com mais perdas:</span>{' '}
            {data[0]?.stageName} ({data[0]?.lossCount} perdas - {data[0]?.lossPercentage.toFixed(1)}%)
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
