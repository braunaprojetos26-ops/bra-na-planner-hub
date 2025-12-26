import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TeamMetrics } from '@/hooks/useTeamAnalytics';
import { FileText, Shield, TrendingUp, Award, HelpCircle } from 'lucide-react';

interface TeamMetricsCardsProps {
  metrics: TeamMetrics | undefined;
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

function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value);
}

function MetricCard({ 
  title, 
  value, 
  subValue,
  icon: Icon,
  iconBg,
  isPlaceholder = false,
}: { 
  title: string;
  value: string | number;
  subValue?: string;
  icon: React.ElementType;
  iconBg: string;
  isPlaceholder?: boolean;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {title}
            </p>
            <p className={`text-2xl font-bold mt-1 ${isPlaceholder ? 'text-muted-foreground' : ''}`}>
              {isPlaceholder ? '---' : value}
            </p>
            {subValue && !isPlaceholder && (
              <p className="text-xs text-muted-foreground mt-0.5">{subValue}</p>
            )}
          </div>
          <div className={`p-2 rounded-lg ${iconBg}`}>
            <Icon className="h-4 w-4 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function TeamMetricsCards({ metrics, isLoading }: TeamMetricsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-16 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Planejamento */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Planejamento
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Vendas"
            value={metrics?.planningSales || 0}
            icon={FileText}
            iconBg="bg-blue-500"
          />
          <MetricCard
            title="Renovação"
            value={metrics?.planningRenewals || 0}
            icon={FileText}
            iconBg="bg-blue-400"
          />
          <MetricCard
            title="Valor Vendido"
            value={formatCurrency(metrics?.planningSalesValue || 0)}
            icon={FileText}
            iconBg="bg-blue-600"
          />
          <MetricCard
            title="Valor Renovado"
            value={formatCurrency(metrics?.planningRenewalsValue || 0)}
            icon={FileText}
            iconBg="bg-blue-300"
          />
        </div>
      </div>

      {/* Seguro */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Seguro
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard
            title="Vendas"
            value={metrics?.insuranceSales || 0}
            icon={Shield}
            iconBg="bg-emerald-500"
          />
          <MetricCard
            title="Valor"
            value={formatCurrency(metrics?.insuranceValue || 0)}
            icon={Shield}
            iconBg="bg-emerald-600"
          />
          <MetricCard
            title="Ticket Médio"
            value={formatCurrency(metrics?.insuranceTicketMedio || 0)}
            icon={Shield}
            iconBg="bg-emerald-400"
          />
        </div>
      </div>

      {/* Performance / Churn */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Performance / Churn
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="NPS"
            value="---"
            icon={HelpCircle}
            iconBg="bg-gray-400"
            isPlaceholder
          />
          <MetricCard
            title="% Inadimplência"
            value="---"
            icon={HelpCircle}
            iconBg="bg-gray-400"
            isPlaceholder
          />
          <MetricCard
            title="Fat Perdido"
            value="---"
            icon={HelpCircle}
            iconBg="bg-gray-400"
            isPlaceholder
          />
          <MetricCard
            title="Churn"
            value="---"
            icon={HelpCircle}
            iconBg="bg-gray-400"
            isPlaceholder
          />
        </div>
      </div>

      {/* Pontos Braúna (PB) */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
          <Award className="h-4 w-4" />
          Pontos Braúna (PB)
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard
            title="PB Seguro"
            value={formatNumber(metrics?.pbInsurance || 0)}
            icon={Award}
            iconBg="bg-amber-500"
          />
          <MetricCard
            title="PB Planejamento"
            value={formatNumber(metrics?.pbPlanning || 0)}
            icon={Award}
            iconBg="bg-amber-600"
          />
          <MetricCard
            title="PB Total"
            value={formatNumber(metrics?.pbTotal || 0)}
            icon={Award}
            iconBg="bg-amber-700"
          />
        </div>
      </div>
    </div>
  );
}
