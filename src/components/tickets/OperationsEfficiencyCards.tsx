import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Clock, Timer, TrendingUp, Loader2 } from 'lucide-react';
import { EfficiencyMetrics, formatDuration } from '@/hooks/useTicketEfficiency';
import { cn } from '@/lib/utils';

interface OperationsEfficiencyCardsProps {
  metrics: EfficiencyMetrics | null;
  isLoading: boolean;
}

export function OperationsEfficiencyCards({ metrics, isLoading }: OperationsEfficiencyCardsProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum dado disponível para o período selecionado.
      </div>
    );
  }

  const getResponseTimeStatus = (minutes: number | null) => {
    if (minutes === null) return 'neutral';
    if (minutes <= 60) return 'good'; // Até 1h
    if (minutes <= 240) return 'warning'; // Até 4h
    return 'bad';
  };

  const getCompletionTimeStatus = (minutes: number | null) => {
    if (minutes === null) return 'neutral';
    if (minutes <= 1440) return 'good'; // Até 1 dia
    if (minutes <= 4320) return 'warning'; // Até 3 dias
    return 'bad';
  };

  const getResolutionRateStatus = (rate: number) => {
    if (rate >= 80) return 'good';
    if (rate >= 50) return 'warning';
    return 'bad';
  };

  const statusColors = {
    good: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700',
    warning: 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-700',
    bad: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700',
    neutral: 'text-muted-foreground bg-muted/50 border-border',
  };

  const cards = [
    {
      label: 'Chamados Concluídos',
      value: metrics.completedTickets.toString(),
      subtitle: `de ${metrics.totalTicketsInPeriod} no período`,
      icon: CheckCircle2,
      status: metrics.completedTickets > 0 ? 'good' : 'neutral',
    },
    {
      label: 'Tempo Médio de Resposta',
      value: formatDuration(metrics.averageResponseTimeMinutes),
      subtitle: 'primeira resposta',
      icon: Timer,
      status: getResponseTimeStatus(metrics.averageResponseTimeMinutes),
    },
    {
      label: 'Tempo Médio de Conclusão',
      value: formatDuration(metrics.averageCompletionTimeMinutes),
      subtitle: 'até resolução',
      icon: Clock,
      status: getCompletionTimeStatus(metrics.averageCompletionTimeMinutes),
    },
    {
      label: 'Taxa de Resolução',
      value: `${metrics.resolutionRate.toFixed(1)}%`,
      subtitle: 'chamados resolvidos',
      icon: TrendingUp,
      status: getResolutionRateStatus(metrics.resolutionRate),
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card 
          key={card.label} 
          className={cn(
            "border transition-colors",
            statusColors[card.status as keyof typeof statusColors]
          )}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium opacity-80">{card.label}</p>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-xs opacity-70">{card.subtitle}</p>
              </div>
              <card.icon className="h-5 w-5 opacity-70" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
