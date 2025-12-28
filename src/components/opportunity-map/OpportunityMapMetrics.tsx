import { Card, CardContent } from '@/components/ui/card';
import { Users, FileCheck, Shield, CreditCard, TrendingUp } from 'lucide-react';
import type { OpportunityMapMetrics } from '@/hooks/useOpportunityMap';

interface OpportunityMapMetricsProps {
  metrics: OpportunityMapMetrics;
  isLoading?: boolean;
}

export function OpportunityMapMetricsCards({ metrics, isLoading }: OpportunityMapMetricsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const cards = [
    {
      title: 'Total de Clientes',
      value: metrics.totalClientes.toString(),
      subtitle: 'com contratos ativos',
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Planejamento',
      value: formatCurrency(metrics.planejamentoTotal),
      subtitle: `${metrics.planejamentoCount} clientes`,
      icon: FileCheck,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
    {
      title: 'PA Ativo',
      value: formatCurrency(metrics.paAtivoTotal),
      subtitle: `${metrics.paAtivoCount} clientes`,
      icon: Shield,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
    {
      title: 'Crédito',
      value: formatCurrency(metrics.creditoTotal),
      subtitle: `${metrics.creditoCount} clientes`,
      icon: CreditCard,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'Prunus',
      value: formatCurrency(metrics.prunusTotal),
      subtitle: `${metrics.prunusCount} clientes`,
      icon: TrendingUp,
      color: 'text-rose-500',
      bgColor: 'bg-rose-500/10',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded w-24 mb-2" />
              <div className="h-8 bg-muted rounded w-32 mb-1" />
              <div className="h-3 bg-muted rounded w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">{card.title}</span>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </div>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
