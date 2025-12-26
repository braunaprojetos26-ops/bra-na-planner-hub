import { RadialScoreChart } from './RadialScoreChart';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Activity, 
  Shield, 
  Wallet, 
  Lock, 
  TrendingUp, 
  Plane, 
  Clock, 
  Target,
  type LucideIcon 
} from 'lucide-react';

interface DiagnosticCategoryCardProps {
  title: string;
  score: number;
  insight: string;
  icon?: string;
  isOverall?: boolean;
}

const iconMap: Record<string, LucideIcon> = {
  Activity,
  Shield,
  Wallet,
  Lock,
  TrendingUp,
  Plane,
  Clock,
  Target,
};

export function DiagnosticCategoryCard({
  title,
  score,
  insight,
  icon = 'Activity',
  isOverall = false,
}: DiagnosticCategoryCardProps) {
  const IconComponent = iconMap[icon] || Activity;

  return (
    <Card className={`overflow-hidden ${isOverall ? 'border-primary/50 bg-primary/5' : ''}`}>
      <CardContent className="p-4 flex flex-col items-center text-center gap-3">
        {/* Header with icon and title */}
        <div className="flex items-center gap-2">
          <IconComponent className="w-4 h-4 text-muted-foreground" />
          <h3 className={`font-semibold ${isOverall ? 'text-lg' : 'text-sm'}`}>
            {title}
          </h3>
        </div>

        {/* Radial chart */}
        <RadialScoreChart
          score={score}
          size={isOverall ? 140 : 100}
          strokeWidth={isOverall ? 12 : 8}
        />

        {/* Insight text */}
        <p className="text-xs text-muted-foreground line-clamp-3 min-h-[3rem]">
          {insight}
        </p>
      </CardContent>
    </Card>
  );
}
