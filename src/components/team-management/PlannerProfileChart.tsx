import { useMemo } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { BehavioralProfile } from '@/hooks/useBehavioralProfile';

interface PlannerProfileChartProps {
  profile: BehavioralProfile | null;
}

export function PlannerProfileChart({ profile }: PlannerProfileChartProps) {
  const data = useMemo(() => {
    if (!profile) return [];
    return [
      { subject: 'Executor', value: profile.executorScore || 0, fullMark: 100 },
      { subject: 'Comunicador', value: profile.comunicadorScore || 0, fullMark: 100 },
      { subject: 'Planejador', value: profile.planejadorScore || 0, fullMark: 100 },
      { subject: 'Analista', value: profile.analistaScore || 0, fullMark: 100 },
    ];
  }, [profile]);

  if (!profile) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        Nenhum perfil comportamental cadastrado
      </div>
    );
  }

  const getProfileColor = (value: number) => {
    if (value >= 70) return 'hsl(var(--primary))';
    if (value >= 40) return 'hsl(var(--primary) / 0.7)';
    return 'hsl(var(--primary) / 0.4)';
  };

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
        <PolarGrid stroke="hsl(var(--border))" />
        <PolarAngleAxis 
          dataKey="subject" 
          tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
        />
        <PolarRadiusAxis 
          angle={90} 
          domain={[0, 100]} 
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
          formatter={(value: number) => [`${value}%`, 'Score']}
        />
        <Radar
          name="Perfil"
          dataKey="value"
          stroke="hsl(var(--primary))"
          fill="hsl(var(--primary))"
          fillOpacity={0.4}
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
