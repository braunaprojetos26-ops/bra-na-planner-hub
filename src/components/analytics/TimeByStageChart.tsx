import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { TimeByStageData } from '@/hooks/useAnalytics';

interface TimeByStageChartProps {
  data: TimeByStageData[];
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
  return stageColors[color] || 'hsl(var(--primary))';
}

function formatTime(hours: number): string {
  if (hours < 1) {
    return '< 1h';
  } else if (hours < 24) {
    return `${Math.round(hours)}h`;
  } else {
    const days = Math.round(hours / 24);
    return `${days}d`;
  }
}

function formatTimeTooltip(hours: number): string {
  if (hours < 1) {
    return 'Menos de 1 hora';
  } else if (hours < 24) {
    const roundedHours = Math.round(hours);
    return `${roundedHours} ${roundedHours === 1 ? 'hora' : 'horas'}`;
  } else {
    const days = Math.round(hours / 24);
    return `${days} ${days === 1 ? 'dia' : 'dias'}`;
  }
}

export function TimeByStageChart({ data, isLoading }: TimeByStageChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tempo Médio por Etapa</CardTitle>
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
          <CardTitle className="text-lg">Tempo Médio por Etapa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            <p>Nenhum dado de tempo disponível</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map(stage => ({
    name: stage.stageName.length > 15 ? stage.stageName.substring(0, 15) + '...' : stage.stageName,
    fullName: stage.stageName,
    hours: stage.averageHours,
    color: stage.color,
    displayTime: formatTime(stage.averageHours),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Tempo Médio por Etapa</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <XAxis 
              type="number"
              tickFormatter={formatTime}
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              type="category" 
              dataKey="name" 
              width={100}
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
                        Tempo médio: <span className="font-medium text-foreground">{formatTimeTooltip(data.hours)}</span>
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="hours" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getChartColor(entry.color)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
