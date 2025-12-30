import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface GoalGaugeChartProps {
  current: number;
  goal: number;
  label?: string;
}

export function GoalGaugeChart({ current, goal, label = 'Meta' }: GoalGaugeChartProps) {
  const percentage = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;
  const remaining = 100 - percentage;

  // Color based on progress
  const getColor = () => {
    if (percentage >= 100) return 'hsl(var(--chart-2))'; // green
    if (percentage >= 70) return 'hsl(var(--chart-4))'; // yellow/orange
    if (percentage >= 40) return 'hsl(var(--accent))'; // accent
    return 'hsl(var(--destructive))'; // red
  };

  const data = [
    { name: 'Achieved', value: percentage },
    { name: 'Remaining', value: remaining },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      notation: value >= 1000000 ? 'compact' : 'standard',
      maximumFractionDigits: value >= 1000000 ? 1 : 2
    }).format(value);
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-24 h-16 flex-shrink-0">
        <ResponsiveContainer width="100%" height={60}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="100%"
              startAngle={180}
              endAngle={0}
              innerRadius={35}
              outerRadius={48}
              paddingAngle={0}
              dataKey="value"
              stroke="none"
            >
              <Cell fill={getColor()} />
              <Cell fill="hsl(var(--muted))" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        
        {/* Center text */}
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
          <span className="text-lg font-bold text-foreground leading-none">
            {percentage.toFixed(0)}%
          </span>
        </div>
      </div>
      
      {/* Values */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Atual</p>
            <p className="font-semibold truncate">{formatCurrency(current)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Meta</p>
            <p className="font-semibold truncate">{formatCurrency(goal)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
