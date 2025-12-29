import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { HealthScoreResult, CATEGORY_CONFIG } from '@/hooks/useHealthScore';

interface PillarAnalysisTabProps {
  results: HealthScoreResult[];
  isLoading: boolean;
}

const PILLAR_CONFIG = {
  nps: { label: 'NPS', color: 'hsl(var(--chart-1))', maxScore: 25 },
  meetings: { label: 'Reuniões', color: 'hsl(var(--chart-2))', maxScore: 25 },
  payment: { label: 'Pagamento', color: 'hsl(var(--chart-3))', maxScore: 20 },
  crossSell: { label: 'Cross-sell', color: 'hsl(var(--chart-4))', maxScore: 15 },
  referrals: { label: 'Indicações', color: 'hsl(var(--chart-5))', maxScore: 15 },
};

const getPillarScore = (result: HealthScoreResult, pillarKey: string): number => {
  switch (pillarKey) {
    case 'nps': return result.breakdown.nps.score;
    case 'meetings': return result.breakdown.meetings.score;
    case 'payment': return result.breakdown.payment.score;
    case 'crossSell': return result.breakdown.crossSell.score;
    case 'referrals': return result.breakdown.referrals.score;
    default: return 0;
  }
};

export function PillarAnalysisTab({ results, isLoading }: PillarAnalysisTabProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-5 bg-muted rounded w-32" />
            </CardHeader>
            <CardContent>
              <div className="h-48 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Calculate average scores per pillar
  const pillarAverages = Object.entries(PILLAR_CONFIG).map(([key, config]) => {
    const scores = results.map((r) => getPillarScore(r, key));
    
    const average = scores.length > 0 
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) 
      : 0;
    const percentage = Math.round((average / config.maxScore) * 100);
    
    return {
      key,
      label: config.label,
      color: config.color,
      average,
      maxScore: config.maxScore,
      percentage,
    };
  });

  // Distribution per pillar (how many clients have each score range)
  const getPillarDistribution = (pillarKey: string) => {
    const config = PILLAR_CONFIG[pillarKey as keyof typeof PILLAR_CONFIG];
    const ranges = [
      { label: '0-25%', min: 0, max: config.maxScore * 0.25, count: 0 },
      { label: '26-50%', min: config.maxScore * 0.25, max: config.maxScore * 0.5, count: 0 },
      { label: '51-75%', min: config.maxScore * 0.5, max: config.maxScore * 0.75, count: 0 },
      { label: '76-100%', min: config.maxScore * 0.75, max: config.maxScore + 1, count: 0 },
    ];

    results.forEach((r) => {
      const score = getPillarScore(r, pillarKey);
      for (const range of ranges) {
        if (score >= range.min && score < range.max) {
          range.count++;
          break;
        }
      }
    });

    return ranges;
  };

  // Clients with lowest scores per pillar (need attention)
  const getLowestClients = (pillarKey: string, limit: number = 5) => {
    return [...results]
      .sort((a, b) => getPillarScore(a, pillarKey) - getPillarScore(b, pillarKey))
      .slice(0, limit);
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {pillarAverages.map((pillar) => (
          <Card key={pillar.key}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">{pillar.label}</p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-bold">{pillar.average}</span>
                <span className="text-xs text-muted-foreground">/ {pillar.maxScore}</span>
              </div>
              <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all"
                  style={{ 
                    width: `${pillar.percentage}%`,
                    backgroundColor: pillar.color 
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{pillar.percentage}% do máximo</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pillar Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Object.entries(PILLAR_CONFIG).map(([key, config]) => {
          const distribution = getPillarDistribution(key);
          const lowestClients = getLowestClients(key, 3);
          
          return (
            <Card key={key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: config.color }}
                  />
                  {config.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={distribution}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="label" 
                        tick={{ fontSize: 11 }}
                        className="text-muted-foreground"
                      />
                      <YAxis 
                        tick={{ fontSize: 11 }}
                        className="text-muted-foreground"
                      />
                      <Tooltip 
                        formatter={(value) => [`${value} clientes`, 'Quantidade']}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="count" fill={config.color} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {lowestClients.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Clientes que precisam de atenção:
                    </p>
                    <div className="space-y-1">
                      {lowestClients.map((client) => {
                        const score = getPillarScore(client, key);
                        return (
                          <div key={client.contactId} className="flex items-center justify-between text-sm">
                            <span className="truncate">{client.contactName}</span>
                            <span className="text-muted-foreground">{score}/{config.maxScore}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
