import { Users, TrendingUp, TrendingDown, Clock, Activity, Target } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { AnalyticsData } from '@/hooks/useAnalytics';

interface ProcessMetricsCardsProps {
  data: AnalyticsData;
  isLoading: boolean;
}

function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatTime(hours: number): string {
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

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  color?: 'default' | 'success' | 'danger' | 'warning';
  isLoading?: boolean;
}

function MetricCard({ title, value, subtitle, icon, color = 'default', isLoading }: MetricCardProps) {
  const colorClasses = {
    default: 'text-foreground',
    success: 'text-green-600 dark:text-green-400',
    danger: 'text-red-600 dark:text-red-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-10 w-10 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className="p-2 bg-muted rounded-lg">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProcessMetricsCards({ data, isLoading }: ProcessMetricsCardsProps) {
  const metrics = [
    {
      title: 'Leads Criados',
      value: data.totalCreated.toString(),
      subtitle: `${data.totalActive} em andamento`,
      icon: <Users className="h-5 w-5 text-muted-foreground" />,
      color: 'default' as const,
    },
    {
      title: 'Taxa de Conversão',
      value: formatPercentage(data.overallStageConversionRate),
      subtitle: 'primeira → última etapa',
      icon: <TrendingUp className="h-5 w-5 text-green-600" />,
      color: data.overallStageConversionRate >= 30 ? 'success' as const : data.overallStageConversionRate >= 15 ? 'warning' as const : 'danger' as const,
    },
    {
      title: 'Taxa de Perda',
      value: formatPercentage(data.lossRate),
      subtitle: `${data.totalLost} leads perdidos`,
      icon: <TrendingDown className="h-5 w-5 text-red-600" />,
      color: data.lossRate <= 30 ? 'success' as const : data.lossRate <= 50 ? 'warning' as const : 'danger' as const,
    },
    {
      title: 'Leads Convertidos',
      value: data.totalWon.toString(),
      subtitle: 'passaram para vendas',
      icon: <Target className="h-5 w-5 text-green-600" />,
      color: 'success' as const,
    },
    {
      title: 'Leads Ativos',
      value: data.totalActive.toString(),
      subtitle: 'em processo',
      icon: <Activity className="h-5 w-5 text-blue-600" />,
      color: 'default' as const,
    },
    {
      title: 'Tempo Médio de Processo',
      value: formatTime(data.averageProcessTimeHours),
      subtitle: 'da entrada à saída',
      icon: <Clock className="h-5 w-5 text-muted-foreground" />,
      color: 'default' as const,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {metrics.map((metric) => (
        <MetricCard
          key={metric.title}
          {...metric}
          isLoading={isLoading}
        />
      ))}
    </div>
  );
}
