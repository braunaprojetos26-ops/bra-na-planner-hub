import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { ProspectionAnalyticsData } from '@/hooks/useProspectionAnalytics';

interface ProspectionConversionFunnelProps {
  data: ProspectionAnalyticsData | undefined;
  isLoading: boolean;
}

export function ProspectionConversionFunnel({ data, isLoading }: ProspectionConversionFunnelProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Funil de Conversão</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  const totalAdded = data?.totalAdded || 0;
  const converted = data?.totalConverted || 0;
  const lost = data?.totalLost || 0;
  const pending = data?.totalPending || 0;

  const stages = [
    {
      label: 'Adicionados à Prospecção',
      value: totalAdded,
      percentage: 100,
      color: 'bg-blue-500',
    },
    {
      label: 'Convertidos em Negociação',
      value: converted,
      percentage: totalAdded > 0 ? (converted / totalAdded) * 100 : 0,
      color: 'bg-green-500',
    },
    {
      label: 'Não foi Possível Contato',
      value: lost,
      percentage: totalAdded > 0 ? (lost / totalAdded) * 100 : 0,
      color: 'bg-red-500',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Funil de Conversão</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Visual Funnel */}
        <div className="space-y-3">
          {stages.map((stage, index) => (
            <div key={stage.label} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{stage.label}</span>
                <span className="font-medium">
                  {stage.value} ({stage.percentage.toFixed(1)}%)
                </span>
              </div>
              <div className="h-8 bg-muted rounded-md overflow-hidden">
                <div
                  className={`h-full ${stage.color} transition-all duration-500 flex items-center justify-center`}
                  style={{ width: `${Math.max(stage.percentage, 5)}%` }}
                >
                  {stage.percentage > 15 && (
                    <span className="text-white text-sm font-medium">
                      {stage.value}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Current Status */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Atualmente na Lista de Prospecção
            </span>
            <span className="text-lg font-bold text-primary">
              {pending} contatos
            </span>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {data?.conversionRate?.toFixed(1) || 0}%
            </p>
            <p className="text-xs text-muted-foreground">Taxa de Conversão</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">
              {data?.lossRate?.toFixed(1) || 0}%
            </p>
            <p className="text-xs text-muted-foreground">Taxa de Perda</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-muted-foreground">
              {totalAdded > 0 ? (100 - (data?.conversionRate || 0) - (data?.lossRate || 0)).toFixed(1) : 0}%
            </p>
            <p className="text-xs text-muted-foreground">Em Andamento</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
