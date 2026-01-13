import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

interface NpsGaugeChartProps {
  score: number;
}

export function NpsGaugeChart({ score }: NpsGaugeChartProps) {
  // Normalize score from -100 to 100 → 0 to 200 for the gauge
  const normalizedScore = score + 100;
  const percentage = normalizedScore / 200;

  const data = [
    { name: 'score', value: normalizedScore },
    { name: 'remaining', value: 200 - normalizedScore },
  ];

  const getScoreColor = () => {
    if (score >= 75) return 'hsl(var(--chart-2))';
    if (score >= 50) return 'hsl(142.1 76.2% 36.3%)';
    if (score >= 0) return 'hsl(var(--chart-4))';
    return 'hsl(var(--chart-1))';
  };

  const getScoreLabel = () => {
    if (score >= 75) return 'Excelente';
    if (score >= 50) return 'Muito Bom';
    if (score >= 0) return 'Bom';
    return 'Precisa Melhorar';
  };

  const getScoreTextColor = () => {
    if (score >= 75) return 'text-emerald-500';
    if (score >= 50) return 'text-green-500';
    if (score >= 0) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Score NPS Atual</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="100%"
                startAngle={180}
                endAngle={0}
                innerRadius={80}
                outerRadius={100}
                paddingAngle={0}
                dataKey="value"
              >
                <Cell fill={getScoreColor()} />
                <Cell fill="hsl(var(--muted))" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-4">
            <div className={cn('text-4xl font-bold', getScoreTextColor())}>
              {score}
            </div>
            <div className="text-sm text-muted-foreground">{getScoreLabel()}</div>
          </div>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-2 px-4">
          <span>-100</span>
          <span>0</span>
          <span>+100</span>
        </div>
        <div className="flex justify-center gap-4 mt-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-muted-foreground">{"< 0"}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <span className="text-muted-foreground">0-50</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-muted-foreground">50-75</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">{"> 75"}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
