import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, TrendingUp, TrendingDown, Clock, UserCheck, UserX } from 'lucide-react';
import type { ProspectionAnalyticsData } from '@/hooks/useProspectionAnalytics';

interface ProspectionMetricsCardsProps {
  data: ProspectionAnalyticsData | undefined;
  isLoading: boolean;
}

function formatHoursToReadable(hours: number | null): string {
  if (hours === null) return '-';
  
  if (hours < 24) {
    return `${Math.round(hours)}h`;
  }
  
  const days = Math.floor(hours / 24);
  const remainingHours = Math.round(hours % 24);
  
  if (remainingHours === 0) {
    return `${days}d`;
  }
  
  return `${days}d ${remainingHours}h`;
}

export function ProspectionMetricsCards({ data, isLoading }: ProspectionMetricsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const metrics = [
    {
      title: 'Total Adicionados',
      value: data?.totalAdded || 0,
      icon: Users,
      description: 'Contatos adicionados à prospecção',
      color: 'text-blue-600',
    },
    {
      title: 'Convertidos',
      value: data?.totalConverted || 0,
      icon: UserCheck,
      description: 'Iniciaram negociação',
      color: 'text-green-600',
    },
    {
      title: 'Taxa de Conversão',
      value: `${(data?.conversionRate || 0).toFixed(1)}%`,
      icon: TrendingUp,
      description: 'Convertidos / Adicionados',
      color: 'text-emerald-600',
    },
    {
      title: 'Perdidos',
      value: data?.totalLost || 0,
      icon: UserX,
      description: 'Não foi possível contato',
      color: 'text-red-600',
    },
    {
      title: 'Taxa de Perda',
      value: `${(data?.lossRate || 0).toFixed(1)}%`,
      icon: TrendingDown,
      description: 'Perdidos / Adicionados',
      color: 'text-rose-600',
    },
    {
      title: 'Tempo Médio',
      value: formatHoursToReadable(data?.averageTimeToConversion ?? null),
      icon: Clock,
      description: 'Até conversão',
      color: 'text-amber-600',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {metrics.map((metric) => (
        <Card key={metric.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {metric.title}
            </CardTitle>
            <metric.icon className={`h-4 w-4 ${metric.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metric.value}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metric.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
