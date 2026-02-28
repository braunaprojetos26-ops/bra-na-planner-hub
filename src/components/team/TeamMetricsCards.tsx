import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TeamMetrics } from '@/hooks/useTeamAnalytics';
import { TeamEffortMetrics } from '@/hooks/useTeamEfforts';
import { Award, TrendingUp, Target, HelpCircle, Users, Phone, CalendarCheck, FileCheck } from 'lucide-react';

interface TeamMetricsCardsProps {
  metrics: TeamMetrics | undefined;
  efforts: TeamEffortMetrics | undefined;
  isLoading: boolean;
  isLoadingEfforts: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function perCapita(total: number, count: number): string {
  if (count === 0) return '0';
  return formatNumber(Math.round((total / count) * 100) / 100);
}

function perCapitaCurrency(total: number, count: number): string {
  if (count === 0) return 'R$ 0';
  return formatCurrency(Math.round(total / count));
}

function MetricCard({ title, value, subValue, icon: Icon, iconBg, isPlaceholder = false }: {
  title: string; value: string | number; subValue?: string;
  icon: React.ElementType; iconBg: string; isPlaceholder?: boolean;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
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

function LoadingSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardContent className="p-4"><div className="h-16 bg-muted rounded" /></CardContent>
        </Card>
      ))}
    </div>
  );
}

function ProductionTab({ metrics, isLoading }: { metrics: TeamMetrics | undefined; isLoading: boolean }) {
  if (isLoading) return <LoadingSkeleton count={12} />;
  const mc = metrics?.memberCount || 0;

  return (
    <div className="space-y-6">
      {/* PBs */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
          <Award className="h-4 w-4" /> Pontos Braúna (PB)
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard title="PB Geral" value={formatNumber(metrics?.pbTotal || 0)}
            subValue={`p/ cabeça: ${perCapita(metrics?.pbTotal || 0, mc)}`} icon={Award} iconBg="bg-amber-600" />
          <MetricCard title="PB Planejamento" value={formatNumber(metrics?.pbPlanning || 0)}
            subValue={`p/ cabeça: ${perCapita(metrics?.pbPlanning || 0, mc)}`} icon={Award} iconBg="bg-blue-500" />
          <MetricCard title="PB Seguros" value={formatNumber(metrics?.pbInsurance || 0)}
            subValue={`p/ cabeça: ${perCapita(metrics?.pbInsurance || 0, mc)}`} icon={Award} iconBg="bg-emerald-500" />
          <MetricCard title="PB Crédito" value={formatNumber(metrics?.pbCredit || 0)}
            subValue={`p/ cabeça: ${perCapita(metrics?.pbCredit || 0, mc)}`} icon={Award} iconBg="bg-purple-500" />
          <MetricCard title="PB Outros" value={formatNumber(metrics?.pbOthers || 0)}
            subValue={`p/ cabeça: ${perCapita(metrics?.pbOthers || 0, mc)}`} icon={Award} iconBg="bg-gray-500" />
        </div>
      </div>

      {/* Faturamento */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4" /> Faturamento
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard title="Faturamento Total" value={formatCurrency(metrics?.totalRevenue || 0)}
            subValue={`p/ cabeça: ${perCapitaCurrency(metrics?.totalRevenue || 0, mc)}`} icon={TrendingUp} iconBg="bg-amber-700" />
          <MetricCard title="Planejamento" value={formatCurrency(metrics?.planningSalesValue || 0)}
            subValue={`${metrics?.planningSales || 0} vendas · p/ cabeça: ${perCapitaCurrency(metrics?.planningSalesValue || 0, mc)}`} icon={TrendingUp} iconBg="bg-blue-500" />
          <MetricCard title="Seguros" value={formatCurrency(metrics?.insuranceValue || 0)}
            subValue={`${metrics?.insuranceSales || 0} vendas · p/ cabeça: ${perCapitaCurrency(metrics?.insuranceValue || 0, mc)}`} icon={TrendingUp} iconBg="bg-emerald-500" />
          <MetricCard title="Crédito" value={formatCurrency(metrics?.creditValue || 0)}
            subValue={`${metrics?.creditSales || 0} vendas · p/ cabeça: ${perCapitaCurrency(metrics?.creditValue || 0, mc)}`} icon={TrendingUp} iconBg="bg-purple-500" />
          <MetricCard title="Outros" value={formatCurrency(metrics?.othersValue || 0)}
            subValue={`${metrics?.othersSales || 0} vendas · p/ cabeça: ${perCapitaCurrency(metrics?.othersValue || 0, mc)}`} icon={TrendingUp} iconBg="bg-gray-500" />
        </div>
      </div>
    </div>
  );
}

function EffortsTab({ efforts, isLoading }: { efforts: TeamEffortMetrics | undefined; isLoading: boolean }) {
  if (isLoading) return <LoadingSkeleton count={6} />;

  return (
    <div className="space-y-6">
      {/* Prospecção */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
          <Phone className="h-4 w-4" /> Lista de Prospecção
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Contatos Adicionados" value={efforts?.contactsAdded || 0}
            icon={Users} iconBg="bg-blue-500" />
          <MetricCard title="Convertidos p/ Negociação" value={efforts?.contactsConverted || 0}
            icon={Target} iconBg="bg-emerald-500" />
          <MetricCard title="Perdidos" value={efforts?.contactsLost || 0}
            icon={Users} iconBg="bg-red-500" />
          <MetricCard title="Taxa de Conversão" value={formatPercent(efforts?.conversionRate || 0)}
            icon={TrendingUp} iconBg="bg-amber-500" />
        </div>
      </div>

      {/* Análises */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
          <CalendarCheck className="h-4 w-4" /> Análises
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-2 gap-4">
          <MetricCard title="Análises Agendadas" value={efforts?.analysesScheduled || 0}
            icon={CalendarCheck} iconBg="bg-blue-600" />
          <MetricCard title="Análises Feitas" value={efforts?.analysesDone || 0}
            icon={FileCheck} iconBg="bg-emerald-600" />
        </div>
      </div>
    </div>
  );
}

function QualityTab() {
  return (
    <div>
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
        <TrendingUp className="h-4 w-4" /> Performance / Churn
      </h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="NPS" value="---" icon={HelpCircle} iconBg="bg-gray-400" isPlaceholder />
        <MetricCard title="% Inadimplência" value="---" icon={HelpCircle} iconBg="bg-gray-400" isPlaceholder />
        <MetricCard title="Fat Perdido" value="---" icon={HelpCircle} iconBg="bg-gray-400" isPlaceholder />
        <MetricCard title="Churn" value="---" icon={HelpCircle} iconBg="bg-gray-400" isPlaceholder />
      </div>
    </div>
  );
}

export function TeamMetricsCards({ metrics, efforts, isLoading, isLoadingEfforts }: TeamMetricsCardsProps) {
  return (
    <Tabs defaultValue="production" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="production">Resultados de Produção</TabsTrigger>
        <TabsTrigger value="efforts">Resultados de Esforços</TabsTrigger>
        <TabsTrigger value="quality">Resultados de Qualidade</TabsTrigger>
      </TabsList>

      <TabsContent value="production">
        <ProductionTab metrics={metrics} isLoading={isLoading} />
      </TabsContent>

      <TabsContent value="efforts">
        <EffortsTab efforts={efforts} isLoading={isLoadingEfforts} />
      </TabsContent>

      <TabsContent value="quality">
        <QualityTab />
      </TabsContent>
    </Tabs>
  );
}
