import { useState } from 'react';
import { subDays } from 'date-fns';
import { BarChart3 } from 'lucide-react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { AnalyticsFilters } from '@/components/analytics/AnalyticsFilters';
import { MetricsCards } from '@/components/analytics/MetricsCards';
import { PerformanceOverTimeChart } from '@/components/analytics/PerformanceOverTimeChart';
import { FunnelStagesChart } from '@/components/analytics/FunnelStagesChart';
import { LostReasonsChart } from '@/components/analytics/LostReasonsChart';
import { FunnelComparisonChart } from '@/components/analytics/FunnelComparisonChart';

export default function Analytics() {
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [funnelId, setFunnelId] = useState<string | undefined>(undefined);
  const [productId, setProductId] = useState<string | undefined>(undefined);

  const { data, isLoading } = useAnalytics({
    startDate,
    endDate,
    funnelId,
    productId,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <BarChart3 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Análises</h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe a performance do seu processo comercial
          </p>
        </div>
      </div>

      {/* Filters */}
      <AnalyticsFilters
        startDate={startDate}
        endDate={endDate}
        funnelId={funnelId}
        productId={productId}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onFunnelChange={setFunnelId}
        onProductChange={setProductId}
      />

      {/* Metrics Cards */}
      <MetricsCards data={data} isLoading={isLoading} />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PerformanceOverTimeChart 
          data={data.timeSeriesData} 
          isLoading={isLoading} 
        />
        <FunnelStagesChart 
          data={data.funnelStagesData} 
          isLoading={isLoading} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LostReasonsChart 
          data={data.lostReasonsData} 
          isLoading={isLoading} 
        />
        <FunnelComparisonChart 
          data={data.funnelComparisonData} 
          isLoading={isLoading} 
        />
      </div>
    </div>
  );
}
