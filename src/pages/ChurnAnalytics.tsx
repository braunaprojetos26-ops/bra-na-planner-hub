import { useState } from "react";
import { UserMinus, TrendingDown, AlertCircle } from "lucide-react";
import { subMonths } from "date-fns";
import { useChurnAnalytics, type ChurnFilters } from "@/hooks/useChurnAnalytics";
import { ChurnMetricsCards } from "@/components/analytics/ChurnMetricsCards";
import { ChurnFilters as ChurnFiltersComponent } from "@/components/analytics/ChurnFilters";
import { ChurnByContractMonthChart } from "@/components/analytics/ChurnByContractMonthChart";
import { ChurnByMeetingChart } from "@/components/analytics/ChurnByMeetingChart";
import { ChurnReasonsChart } from "@/components/analytics/ChurnReasonsChart";
import { ChurnTimeSeriesChart } from "@/components/analytics/ChurnTimeSeriesChart";
import { ChurnByOwnerTable } from "@/components/analytics/ChurnByOwnerTable";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ChurnAnalytics() {
  const [filters, setFilters] = useState<ChurnFilters>({
    startDate: subMonths(new Date(), 6),
    endDate: new Date(),
  });

  const { data, isLoading, error } = useChurnAnalytics(filters);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-destructive/10">
          <UserMinus className="h-6 w-6 text-destructive" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Análise de Cancelamentos</h1>
          <p className="text-muted-foreground">
            Monitore o churn de planejamento financeiro e identifique padrões
          </p>
        </div>
      </div>

      {/* Filters */}
      <ChurnFiltersComponent filters={filters} onFiltersChange={setFilters} />

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro ao carregar dados</AlertTitle>
          <AlertDescription>
            Não foi possível carregar os dados de cancelamento. Tente novamente.
          </AlertDescription>
        </Alert>
      )}

      {/* Metrics Cards */}
      <ChurnMetricsCards data={data?.metrics} isLoading={isLoading} />

      {/* Info Alert */}
      {!isLoading && data?.metrics?.totalCancellations === 0 && (
        <Alert>
          <TrendingDown className="h-4 w-4" />
          <AlertTitle>Nenhum cancelamento no período</AlertTitle>
          <AlertDescription>
            Não foram encontrados cancelamentos de planejamento financeiro no período selecionado.
            Isso pode indicar que os contratos ainda não foram marcados como cancelados ou que a
            retenção está em 100%.
          </AlertDescription>
        </Alert>
      )}

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <ChurnByContractMonthChart data={data?.churnByMonth} isLoading={isLoading} />
        <ChurnByMeetingChart data={data?.churnByMeeting} isLoading={isLoading} />
        <ChurnReasonsChart data={data?.churnReasons} isLoading={isLoading} />
        <ChurnTimeSeriesChart data={data?.churnTimeSeries} isLoading={isLoading} />
      </div>

      {/* Owner Table */}
      <ChurnByOwnerTable data={data?.churnByOwner} isLoading={isLoading} />
    </div>
  );
}
