import { TrendingUp, TrendingDown, Target, Clock, DollarSign, BarChart3, CheckCircle2, XCircle, Activity } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { AnalyticsData } from '@/hooks/useAnalytics';

interface MetricsCardsProps {
  data: AnalyticsData;
  isLoading: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatDays(value: number): string {
  return `${Math.round(value)} dias`;
}

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
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

export function MetricsCards({ data, isLoading }: MetricsCardsProps) {
  const metrics = [
    {
      title: 'Negociações Criadas',
      value: data.totalCreated.toString(),
      subtitle: `${data.totalActive} ativas`,
      icon: <BarChart3 className="h-5 w-5 text-muted-foreground" />,
      color: 'default' as const,
    },
    {
      title: 'Negociações Ganhas',
      value: data.totalWon.toString(),
      icon: <CheckCircle2 className="h-5 w-5 text-green-600" />,
      color: 'success' as const,
    },
    {
      title: 'Negociações Perdidas',
      value: data.totalLost.toString(),
      icon: <XCircle className="h-5 w-5 text-red-600" />,
      color: 'danger' as const,
    },
    {
      title: 'Taxa de Conversão',
      value: formatPercentage(data.conversionRate),
      subtitle: 'ganhas / fechadas',
      icon: <Target className="h-5 w-5 text-muted-foreground" />,
      color: data.conversionRate >= 50 ? 'success' as const : data.conversionRate >= 25 ? 'warning' as const : 'danger' as const,
    },
    {
      title: 'Valor Convertido',
      value: formatCurrency(data.totalValueConverted),
      icon: <TrendingUp className="h-5 w-5 text-green-600" />,
      color: 'success' as const,
    },
    {
      title: 'Valor Perdido',
      value: formatCurrency(data.totalValueLost),
      icon: <TrendingDown className="h-5 w-5 text-red-600" />,
      color: 'danger' as const,
    },
    {
      title: 'Ticket Médio',
      value: formatCurrency(data.averageTicket),
      icon: <DollarSign className="h-5 w-5 text-muted-foreground" />,
      color: 'default' as const,
    },
    {
      title: 'Tempo Médio de Fechamento',
      value: formatDays(data.averageClosingDays),
      subtitle: 'da criação à conversão',
      icon: <Clock className="h-5 w-5 text-muted-foreground" />,
      color: 'default' as const,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
