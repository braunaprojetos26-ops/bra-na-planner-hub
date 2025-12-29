import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Calendar, CalendarCheck, DollarSign, Briefcase, Shield, TrendingUp, CreditCard, HeartPulse } from 'lucide-react';
import type { ClientMetrics as ClientMetricsType } from '@/types/clients';
import { useHealthScore, CATEGORY_CONFIG } from '@/hooks/useHealthScore';

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
  const navigate = useNavigate();
  const { data: healthData, isLoading: isHealthLoading } = useHealthScore();

  const averageScore = healthData?.summary?.averageScore ?? 0;
  const category = averageScore >= 75 ? 'otimo' : averageScore >= 50 ? 'estavel' : averageScore >= 30 ? 'atencao' : 'critico';
  const categoryConfig = CATEGORY_CONFIG[category];

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
      {/* Health Score Card */}
      <Card 
        className="cursor-pointer hover:shadow-md transition-shadow border-2"
        style={{ borderColor: categoryConfig.color }}
        onClick={() => navigate('/analytics/health-score')}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${categoryConfig.lightBg}`}>
                <HeartPulse className={`h-6 w-6 ${categoryConfig.textColor}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Health Score Médio da Carteira</p>
                {isHealthLoading ? (
                  <div className="h-8 w-24 bg-muted animate-pulse rounded mt-1" />
                ) : (
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-3xl font-bold ${categoryConfig.textColor}`}>
                      {Math.round(averageScore)}
                    </span>
                    <span className={`text-sm font-medium px-2 py-0.5 rounded ${categoryConfig.lightBg} ${categoryConfig.textColor}`}>
                      {categoryConfig.label}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="text-muted-foreground text-sm">
              {healthData?.summary?.totalClients ?? 0} clientes →
            </div>
          </div>
        </CardContent>
      </Card>

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
