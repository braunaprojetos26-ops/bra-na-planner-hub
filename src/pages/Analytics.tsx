import { useState } from 'react';
import { subDays } from 'date-fns';
import { BarChart3, TrendingUp, Users } from 'lucide-react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { AnalyticsFilters } from '@/components/analytics/AnalyticsFilters';
import { ProcessMetricsCards } from '@/components/analytics/ProcessMetricsCards';
import { SalesMetricsCards } from '@/components/analytics/SalesMetricsCards';
import { PerformanceOverTimeChart } from '@/components/analytics/PerformanceOverTimeChart';
import { ProcessTimeSeriesChart } from '@/components/analytics/ProcessTimeSeriesChart';
import { FunnelStagesChart } from '@/components/analytics/FunnelStagesChart';
import { LostReasonsChart } from '@/components/analytics/LostReasonsChart';
import { FunnelComparisonChart } from '@/components/analytics/FunnelComparisonChart';
import { StageConversionFunnel } from '@/components/analytics/StageConversionFunnel';
import { TimeByStageChart } from '@/components/analytics/TimeByStageChart';
import { LossesPerStageChart } from '@/components/analytics/LossesPerStageChart';
import { MetricsCards } from '@/components/analytics/MetricsCards';

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

  // Determine view type based on selected funnel
  const isSalesFunnel = data.selectedFunnel?.generatesContract ?? false;
  const isProcessFunnel = data.selectedFunnel && !data.selectedFunnel.generatesContract;
  const isOverview = !data.selectedFunnel;

  // Get header info based on view type
  const getHeaderInfo = () => {
    if (isProcessFunnel) {
      return {
        icon: <Users className="h-6 w-6 text-primary" />,
        title: `Análises - ${data.selectedFunnel?.name}`,
        subtitle: 'Métricas de processo e conversão de leads',
      };
    }
    if (isSalesFunnel) {
      return {
        icon: <TrendingUp className="h-6 w-6 text-primary" />,
        title: `Análises - ${data.selectedFunnel?.name}`,
        subtitle: 'Métricas de vendas e performance comercial',
      };
    }
    return {
      icon: <BarChart3 className="h-6 w-6 text-primary" />,
      title: 'Análises',
      subtitle: 'Acompanhe a performance do seu processo comercial',
    };
  };

  const headerInfo = getHeaderInfo();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          {headerInfo.icon}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{headerInfo.title}</h1>
          <p className="text-sm text-muted-foreground">
            {headerInfo.subtitle}
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

      {/* Process/Prospecting Funnel View */}
      {isProcessFunnel && (
        <>
          <ProcessMetricsCards data={data} isLoading={isLoading} />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <StageConversionFunnel 
              data={data.stageConversionData} 
              isLoading={isLoading} 
            />
            <FunnelStagesChart 
              data={data.funnelStagesData} 
              isLoading={isLoading} 
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TimeByStageChart 
              data={data.timeByStageData} 
              isLoading={isLoading} 
            />
            <LossesPerStageChart 
              data={data.lossesPerStageData} 
              isLoading={isLoading} 
            />
          </div>

          <div className="grid grid-cols-1 gap-6">
            <ProcessTimeSeriesChart 
              data={data.timeSeriesData} 
              isLoading={isLoading} 
            />
          </div>

          <div className="grid grid-cols-1 gap-6">
            <LostReasonsChart 
              data={data.lostReasonsData} 
              isLoading={isLoading} 
            />
          </div>
        </>
      )}

      {/* Sales Funnel View */}
      {isSalesFunnel && (
        <>
          <SalesMetricsCards data={data} isLoading={isLoading} />
          
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
            <StageConversionFunnel 
              data={data.stageConversionData} 
              isLoading={isLoading} 
            />
          </div>
        </>
      )}

      {/* Overview (No Funnel Selected) */}
      {isOverview && (
        <>
          <MetricsCards data={data} isLoading={isLoading} />
          
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
        </>
      )}
    </div>
  );
}
