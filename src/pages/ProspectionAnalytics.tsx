import { useState } from 'react';
import { subDays } from 'date-fns';
import { Users, PhoneCall } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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

  const callsPerMeeting = data && data.conversionRate > 0
    ? Math.ceil(100 / data.conversionRate)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Users className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Lista de Prospecção</h1>
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

      {/* Calls-per-meeting insight card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-center gap-4 py-4">
          <div className="p-3 rounded-full bg-primary/10">
            <PhoneCall className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">
              {callsPerMeeting !== null ? (
                <>Você precisa fazer <span className="text-primary text-2xl font-bold">{callsPerMeeting}</span> ligações para agendar uma reunião.</>
              ) : (
                <>Ainda não há dados suficientes para calcular quantas ligações são necessárias para agendar uma reunião.</>
              )}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {callsPerMeeting !== null ? (
                <>Baseado na sua taxa de conversão de {data?.conversionRate.toFixed(1)}% no período selecionado ({data?.totalConverted || 0} conversões em {data?.totalAdded || 0} contatos)</>
              ) : (
                <>Adicione contatos à lista e registre conversões para gerar esta métrica</>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

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
