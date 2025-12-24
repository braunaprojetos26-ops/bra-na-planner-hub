import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { LostReasonData } from '@/hooks/useAnalytics';

interface LostReasonsChartProps {
  data: LostReasonData[];
  isLoading: boolean;
}

const COLORS = [
  'hsl(0, 84%, 60%)',
  'hsl(24, 94%, 50%)',
  'hsl(45, 93%, 47%)',
  'hsl(262, 83%, 58%)',
  'hsl(330, 81%, 60%)',
  'hsl(217, 91%, 60%)',
  'hsl(168, 76%, 42%)',
  'hsl(142, 71%, 45%)',
];

export function LostReasonsChart({ data, isLoading }: LostReasonsChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Motivos de Perda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Nenhuma oportunidade perdida no período
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map(d => ({
    name: d.name.length > 20 ? d.name.substring(0, 20) + '...' : d.name,
    fullName: d.name,
    value: d.count,
    percentage: d.percentage,
  }));

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor="middle" 
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Motivos de Perda</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number, name: string, props: any) => [
                  `${value} (${props.payload.percentage.toFixed(1)}%)`,
                  props.payload.fullName,
                ]}
              />
              <Legend 
                formatter={(value, entry: any) => (
                  <span className="text-sm text-muted-foreground">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
