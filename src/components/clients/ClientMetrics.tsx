import { Card, CardContent } from '@/components/ui/card';
import { Users, Calendar, CalendarCheck, DollarSign, Briefcase, Shield, TrendingUp, CreditCard } from 'lucide-react';
import type { ClientMetrics as ClientMetricsType } from '@/types/clients';

interface ClientMetricsProps {
  metrics: ClientMetricsType | undefined;
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

export function ClientMetrics({ metrics, isLoading }: ClientMetricsProps) {
  const cards = [
    {
      title: 'Clientes Ativos',
      value: metrics?.activeClients ?? 0,
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Reuniões Realizadas',
      value: metrics?.meetingsCompletedThisMonth ?? 0,
      subtitle: 'este mês',
      icon: CalendarCheck,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Reuniões Pendentes',
      value: metrics?.meetingsPendingThisMonth ?? 0,
      subtitle: 'este mês',
      icon: Calendar,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
    {
      title: 'Valor da Carteira',
      value: formatCurrency(metrics?.totalPortfolioValue ?? 0),
      icon: DollarSign,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      isFormatted: true,
    },
  ];

  const productCards = [
    {
      title: 'Planejamento Financeiro',
      value: formatCurrency(metrics?.activePlanejamentoValue ?? 0),
      subtitle: 'ativos',
      icon: Briefcase,
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-500/10',
      isFormatted: true,
    },
    {
      title: 'Seguros de Vida',
      value: formatCurrency(metrics?.activeSeguroValue ?? 0),
      subtitle: 'ativos',
      icon: Shield,
      color: 'text-rose-500',
      bgColor: 'bg-rose-500/10',
      isFormatted: true,
    },
    {
      title: 'Investimentos',
      value: formatCurrency(metrics?.investimentosValue ?? 0),
      subtitle: 'total',
      icon: TrendingUp,
      color: 'text-teal-500',
      bgColor: 'bg-teal-500/10',
      isFormatted: true,
    },
    {
      title: 'Crédito Realizado',
      value: formatCurrency(metrics?.creditoRealizadoValue ?? 0),
      subtitle: 'total',
      icon: CreditCard,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      isFormatted: true,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Cards de métricas gerais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{card.title}</p>
                  {isLoading ? (
                    <div className="h-6 w-16 bg-muted animate-pulse rounded" />
                  ) : (
                    <p className="text-xl font-bold">
                      {card.isFormatted ? card.value : card.value}
                    </p>
                  )}
                  {card.subtitle && (
                    <p className="text-[10px] text-muted-foreground">{card.subtitle}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cards de métricas por produto */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {productCards.map((card) => (
          <Card key={card.title}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground truncate">{card.title}</p>
                  {isLoading ? (
                    <div className="h-6 w-16 bg-muted animate-pulse rounded" />
                  ) : (
                    <p className="text-lg font-bold truncate">{card.value}</p>
                  )}
                  {card.subtitle && (
                    <p className="text-[10px] text-muted-foreground">{card.subtitle}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
