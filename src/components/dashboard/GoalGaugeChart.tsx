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
    <div className="flex flex-col items-center">
      <div className="relative w-full h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="85%"
              startAngle={180}
              endAngle={0}
              innerRadius={80}
              outerRadius={100}
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
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-4">
          <span className="text-3xl font-bold text-foreground">
            {percentage.toFixed(0)}%
          </span>
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
      </div>
      
      {/* Values below */}
      <div className="flex justify-between w-full mt-2 px-4">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Atual</p>
          <p className="text-sm font-semibold">{formatCurrency(current)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Meta</p>
          <p className="text-sm font-semibold">{formatCurrency(goal)}</p>
        </div>
      </div>
    </div>
  );
}
