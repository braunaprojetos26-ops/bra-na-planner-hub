import { useState } from 'react';
import { Star, Upload } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useNpsAnalytics, useNpsFilterOptions } from '@/hooks/useNpsAnalytics';
import { NpsMetricsCards } from '@/components/analytics/NpsMetricsCards';
import { NpsFilters } from '@/components/analytics/NpsFilters';
import { NpsScoreDistributionChart } from '@/components/analytics/NpsScoreDistributionChart';
import { NpsTimeSeriesChart } from '@/components/analytics/NpsTimeSeriesChart';
import { NpsByOwnerTable } from '@/components/analytics/NpsByOwnerTable';
import { NpsByTenureChart } from '@/components/analytics/NpsByTenureChart';
import { NpsVsChurnChart } from '@/components/analytics/NpsVsChurnChart';
import { NpsGaugeChart } from '@/components/analytics/NpsGaugeChart';
import { Link } from 'react-router-dom';

export default function NpsAnalytics() {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);

  const { data, isLoading } = useNpsAnalytics({
    startDate,
    endDate,
    ownerId,
  });

  const { data: filterOptions } = useNpsFilterOptions();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Star className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Análise de NPS</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Acompanhe a satisfação dos clientes através do Net Promoter Score
          </p>
        </div>
        <Link to="/settings?tab=health-score">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Importar NPS
          </Button>
        </Link>
      </div>

      <NpsFilters
        startDate={startDate}
        endDate={endDate}
        ownerId={ownerId}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onOwnerChange={setOwnerId}
        owners={filterOptions?.owners || []}
      />

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : !data?.hasData ? (
        <Alert>
          <Star className="h-4 w-4" />
          <AlertTitle>Sem dados de NPS</AlertTitle>
          <AlertDescription>
            Ainda não há respostas de NPS registradas. Você pode importar dados de NPS através da
            aba Health Score nas configurações do administrador.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <NpsMetricsCards metrics={data.metrics} />

          <div className="grid gap-6 lg:grid-cols-2">
            <NpsGaugeChart score={data.metrics.npsScore} />
            <NpsScoreDistributionChart data={data.distribution} />
          </div>

          <NpsTimeSeriesChart data={data.timeSeries} />

          <NpsByOwnerTable data={data.byOwner} />

          <div className="grid gap-6 lg:grid-cols-2">
            <NpsByTenureChart data={data.byTenure} />
            <NpsVsChurnChart data={data.vsChurn} />
          </div>
        </>
      )}
    </div>
  );
}
