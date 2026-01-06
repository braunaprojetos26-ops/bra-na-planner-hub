import { useState } from 'react';
import { subDays } from 'date-fns';
import { Users } from 'lucide-react';
import { useProspectionAnalytics } from '@/hooks/useProspectionAnalytics';
import { ProspectionMetricsCards } from '@/components/analytics/ProspectionMetricsCards';
import { ProspectionConversionFunnel } from '@/components/analytics/ProspectionConversionFunnel';
import { ProspectionTimeSeriesChart } from '@/components/analytics/ProspectionTimeSeriesChart';
import { ProspectionFilters } from '@/components/analytics/ProspectionFilters';
import { ProspectionOwnerTable } from '@/components/analytics/ProspectionOwnerTable';

export default function ProspectionAnalytics() {
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [ownerId, setOwnerId] = useState<string>('all');

  const { data, isLoading } = useProspectionAnalytics({
    startDate,
    endDate,
    ownerId: ownerId === 'all' ? undefined : ownerId,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Users className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Análise de Prospecção</h1>
          <p className="text-muted-foreground">
            Acompanhe a efetividade da sua lista de prospecção
          </p>
        </div>
      </div>

      {/* Filters */}
      <ProspectionFilters
        startDate={startDate}
        endDate={endDate}
        ownerId={ownerId}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onOwnerIdChange={setOwnerId}
      />

      {/* Metrics Cards */}
      <ProspectionMetricsCards data={data} isLoading={isLoading} />

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ProspectionConversionFunnel data={data} isLoading={isLoading} />
        <ProspectionTimeSeriesChart data={data} isLoading={isLoading} />
      </div>

      {/* Owner Performance Table */}
      <ProspectionOwnerTable data={data} isLoading={isLoading} />
    </div>
  );
}
