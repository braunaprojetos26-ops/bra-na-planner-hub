import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer } from 'recharts';
import { HealthScoreResult } from '@/hooks/useHealthScore';
import { Radar as RadarIcon } from 'lucide-react';

interface HealthScoreRadarChartProps {
  results: HealthScoreResult[];
}

const PILLAR_LABELS: Record<string, string> = {
  nps: 'NPS',
  referrals: 'Indicações',
  payment: 'Pagamento',
  crossSell: 'Cross-sell',
  meetings: 'Reuniões',
  whatsapp: 'WhatsApp',
};

export function HealthScoreRadarChart({ results }: HealthScoreRadarChartProps) {
  // Calculate average score for each pillar
  const pillarAverages = {
    nps: 0,
    referrals: 0,
    payment: 0,
    crossSell: 0,
    meetings: 0,
    whatsapp: 0,
  };

  if (results.length > 0) {
    results.forEach(r => {
      pillarAverages.nps += r.breakdown.nps.score;
      pillarAverages.referrals += r.breakdown.referrals.score;
      pillarAverages.payment += r.breakdown.payment.score;
      pillarAverages.crossSell += r.breakdown.crossSell.score;
      pillarAverages.meetings += r.breakdown.meetings.score;
      pillarAverages.whatsapp += r.breakdown.whatsapp.score;
    });

    Object.keys(pillarAverages).forEach(key => {
      pillarAverages[key as keyof typeof pillarAverages] = 
        Math.round((pillarAverages[key as keyof typeof pillarAverages] / results.length) * 10) / 10;
    });
  }

  // Calculate 1st quartile benchmark (top 25%)
  const sortedByScore = [...results].sort((a, b) => b.totalScore - a.totalScore);
  const firstQuartileCount = Math.max(1, Math.floor(results.length * 0.25));
  const firstQuartileResults = sortedByScore.slice(0, firstQuartileCount);

  const firstQuartileAverages = {
    nps: 0,
    referrals: 0,
    payment: 0,
    crossSell: 0,
    meetings: 0,
    whatsapp: 0,
  };

  if (firstQuartileResults.length > 0) {
    firstQuartileResults.forEach(r => {
      firstQuartileAverages.nps += r.breakdown.nps.score;
      firstQuartileAverages.referrals += r.breakdown.referrals.score;
      firstQuartileAverages.payment += r.breakdown.payment.score;
      firstQuartileAverages.crossSell += r.breakdown.crossSell.score;
      firstQuartileAverages.meetings += r.breakdown.meetings.score;
      firstQuartileAverages.whatsapp += r.breakdown.whatsapp.score;
    });

    Object.keys(firstQuartileAverages).forEach(key => {
      firstQuartileAverages[key as keyof typeof firstQuartileAverages] = 
        Math.round((firstQuartileAverages[key as keyof typeof firstQuartileAverages] / firstQuartileResults.length) * 10) / 10;
    });
  }

  const radarData = Object.keys(PILLAR_LABELS).map(key => ({
    pillar: PILLAR_LABELS[key],
    fullMark: 100,
    media: pillarAverages[key as keyof typeof pillarAverages],
    quartil: firstQuartileAverages[key as keyof typeof firstQuartileAverages],
  }));

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <RadarIcon className="h-4 w-4" />
          Performance por Pilar
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis 
                dataKey="pillar" 
                tick={{ 
                  fill: 'hsl(var(--foreground))', 
                  fontSize: 11,
                  fontWeight: 500,
                }}
              />
              <PolarRadiusAxis 
                angle={30} 
                domain={[0, 100]} 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                tickCount={5}
              />
              <Radar
                name="Média 1º Quartil"
                dataKey="quartil"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.15}
                strokeWidth={2}
                dot={{ r: 4, fill: 'hsl(var(--primary))' }}
              />
              <Radar
                name="Média Geral"
                dataKey="media"
                stroke="hsl(var(--chart-2))"
                fill="hsl(var(--chart-2))"
                fillOpacity={0.3}
                strokeWidth={2}
                dot={{ r: 4, fill: 'hsl(var(--chart-2))' }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Pillar values summary */}
        <div className="grid grid-cols-3 gap-2 mt-4 text-xs">
          {radarData.map(item => (
            <div key={item.pillar} className="flex items-center justify-between px-2 py-1 bg-muted/50 rounded">
              <span className="font-medium truncate">{item.pillar}</span>
              <span className="text-muted-foreground">{item.media}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
