import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, TrendingDown, DollarSign, Percent } from "lucide-react";
import type { ChurnMetrics } from "@/hooks/useChurnAnalytics";

interface ChurnMetricsCardsProps {
  data: ChurnMetrics | undefined;
  isLoading: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  color?: "default" | "danger" | "success" | "warning";
  isLoading?: boolean;
}

function MetricCard({ title, value, subtitle, icon, color = "default", isLoading }: MetricCardProps) {
  const colorClasses = {
    default: "bg-card",
    danger: "bg-destructive/10 border-destructive/20",
    success: "bg-green-500/10 border-green-500/20",
    warning: "bg-yellow-500/10 border-yellow-500/20",
  };

  const iconColorClasses = {
    default: "text-muted-foreground",
    danger: "text-destructive",
    success: "text-green-500",
    warning: "text-yellow-500",
  };

  if (isLoading) {
    return (
      <Card className={colorClasses[color]}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-12 w-12 rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={colorClasses[color]}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className={`p-3 rounded-full bg-background ${iconColorClasses[color]}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ChurnMetricsCards({ data, isLoading }: ChurnMetricsCardsProps) {
  const retentionRate = data ? 100 - data.churnRate : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Cancelamentos"
        value={isLoading ? "-" : String(data?.totalCancellations || 0)}
        subtitle="Clientes que cancelaram"
        icon={<Users className="h-6 w-6" />}
        color="danger"
        isLoading={isLoading}
      />
      <MetricCard
        title="Churn de Faturamento"
        value={isLoading ? "-" : formatCurrency(data?.churnValue || 0)}
        subtitle="Valor perdido em contratos"
        icon={<TrendingDown className="h-6 w-6" />}
        color="danger"
        isLoading={isLoading}
      />
      <MetricCard
        title="Taxa de Churn"
        value={isLoading ? "-" : formatPercentage(data?.churnRate || 0)}
        subtitle={`Retenção: ${formatPercentage(retentionRate)}`}
        icon={<Percent className="h-6 w-6" />}
        color={data && data.churnRate > 10 ? "danger" : data && data.churnRate > 5 ? "warning" : "success"}
        isLoading={isLoading}
      />
      <MetricCard
        title="Ticket Médio Cancelado"
        value={isLoading ? "-" : formatCurrency(data?.avgTicketCancelled || 0)}
        subtitle={`Ativos: ${formatCurrency(data?.avgTicketActive || 0)}`}
        icon={<DollarSign className="h-6 w-6" />}
        color="default"
        isLoading={isLoading}
      />
    </div>
  );
}
