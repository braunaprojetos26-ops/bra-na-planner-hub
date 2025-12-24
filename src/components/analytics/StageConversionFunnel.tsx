import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { StageConversionData } from '@/hooks/useAnalytics';
import { ArrowRight, TrendingDown } from 'lucide-react';

interface StageConversionFunnelProps {
  data: StageConversionData[];
  isLoading: boolean;
}

const stageColors: Record<string, string> = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  orange: 'bg-orange-500',
  red: 'bg-red-500',
  purple: 'bg-purple-500',
  pink: 'bg-pink-500',
  indigo: 'bg-indigo-500',
  gray: 'bg-gray-500',
};

function getColorClass(color: string): string {
  return stageColors[color] || 'bg-primary';
}

export function StageConversionFunnel({ data, isLoading }: StageConversionFunnelProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Funil de Conversão por Etapa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Funil de Conversão por Etapa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            <p>Nenhuma transição de etapa no período</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate max count for scaling
  const maxCount = Math.max(...data.map(d => d.fromCount));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Funil de Conversão por Etapa</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map((stage, index) => {
            const fromWidth = maxCount > 0 ? (stage.fromCount / maxCount) * 100 : 0;
            const toWidth = maxCount > 0 ? (stage.toCount / maxCount) * 100 : 0;
            const dropoff = stage.fromCount - stage.toCount;
            const dropoffPercentage = stage.fromCount > 0 ? (dropoff / stage.fromCount) * 100 : 0;

            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium truncate max-w-[120px]" title={stage.fromStageName}>
                        {stage.fromStageName}
                      </span>
                      <span className="text-muted-foreground">{stage.fromCount}</span>
                    </div>
                    <div className="h-6 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${getColorClass(stage.color)} transition-all duration-500`}
                        style={{ width: `${fromWidth}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-1 px-2">
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <span className={`text-xs font-bold ${stage.conversionRate >= 50 ? 'text-green-600' : stage.conversionRate >= 25 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {stage.conversionRate.toFixed(0)}%
                    </span>
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium truncate max-w-[120px]" title={stage.toStageName}>
                        {stage.toStageName}
                      </span>
                      <span className="text-muted-foreground">{stage.toCount}</span>
                    </div>
                    <div className="h-6 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${getColorClass(stage.color)} opacity-70 transition-all duration-500`}
                        style={{ width: `${toWidth}%` }}
                      />
                    </div>
                  </div>
                </div>

                {dropoff > 0 && (
                  <div className="flex items-center gap-1 text-xs text-red-600 justify-center">
                    <TrendingDown className="h-3 w-3" />
                    <span>-{dropoff} ({dropoffPercentage.toFixed(0)}% perdidos nesta transição)</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
