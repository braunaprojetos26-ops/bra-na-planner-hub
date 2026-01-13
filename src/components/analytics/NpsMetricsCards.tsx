import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, ThumbsUp, Minus, ThumbsDown, Users, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NpsMetrics {
  npsScore: number;
  totalResponses: number;
  promoters: number;
  promotersPercent: number;
  passives: number;
  passivesPercent: number;
  detractors: number;
  detractorsPercent: number;
  averageScore: number;
  responseRate: number;
}

interface NpsMetricsCardsProps {
  metrics: NpsMetrics;
}

export function NpsMetricsCards({ metrics }: NpsMetricsCardsProps) {
  const getNpsColor = (score: number) => {
    if (score >= 75) return 'text-emerald-500';
    if (score >= 50) return 'text-green-500';
    if (score >= 0) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getNpsLabel = (score: number) => {
    if (score >= 75) return 'Excelente';
    if (score >= 50) return 'Muito Bom';
    if (score >= 0) return 'Bom';
    return 'Precisa Melhorar';
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Score NPS</CardTitle>
          <Star className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={cn('text-2xl font-bold', getNpsColor(metrics.npsScore))}>
            {metrics.npsScore}
          </div>
          <p className="text-xs text-muted-foreground">{getNpsLabel(metrics.npsScore)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Respostas</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalResponses}</div>
          <p className="text-xs text-muted-foreground">
            Média: {metrics.averageScore}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Promotores</CardTitle>
          <ThumbsUp className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-500">{metrics.promoters}</div>
          <p className="text-xs text-muted-foreground">
            {metrics.promotersPercent}% (notas 9-10)
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Neutros</CardTitle>
          <Minus className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-500">{metrics.passives}</div>
          <p className="text-xs text-muted-foreground">
            {metrics.passivesPercent}% (notas 7-8)
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Detratores</CardTitle>
          <ThumbsDown className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-500">{metrics.detractors}</div>
          <p className="text-xs text-muted-foreground">
            {metrics.detractorsPercent}% (notas 0-6)
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Taxa de Resposta</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.responseRate}%</div>
          <p className="text-xs text-muted-foreground">dos clientes ativos</p>
        </CardContent>
      </Card>
    </div>
  );
}
