import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { CATEGORY_CONFIG, CategoryKey } from '@/hooks/useHealthScore';
import { TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react';

interface CategoryCardProps {
  category: CategoryKey;
  count: number;
  totalClients: number;
  averageScore?: number;
  trend?: 'up' | 'down' | 'stable';
  onClick?: () => void;
  isSelected?: boolean;
}

export function CategoryCard({
  category,
  count,
  totalClients,
  averageScore,
  trend,
  onClick,
  isSelected,
}: CategoryCardProps) {
  const config = CATEGORY_CONFIG[category];
  const percentage = totalClients > 0 ? Math.round((count / totalClients) * 100) : 0;

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <Card 
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-md',
        isSelected && 'ring-2 ring-primary',
        onClick && 'hover:scale-[1.02]'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div 
              className={cn(
                'w-4 h-4 rounded-full',
                config.bgColor
              )}
            />
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {config.label}
              </p>
              <p className="text-xs text-muted-foreground/70">
                {config.range} pts
              </p>
            </div>
          </div>
          
          {onClick && (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        
        <div className="mt-4 flex items-end justify-between">
          <div>
            <p className={cn('text-3xl font-bold', config.textColor)}>
              {count}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {percentage}% do total
            </p>
          </div>
          
          <div className="flex flex-col items-end gap-1">
            {averageScore !== undefined && (
              <p className="text-sm text-muted-foreground">
                Média: <span className="font-medium">{averageScore}</span>
              </p>
            )}
            
            {trend && (
              <div className={cn(
                'flex items-center gap-1 text-xs',
                trend === 'up' && 'text-green-500',
                trend === 'down' && 'text-red-500',
                trend === 'stable' && 'text-muted-foreground'
              )}>
                <TrendIcon className="h-3 w-3" />
                <span>
                  {trend === 'up' ? 'Subindo' : trend === 'down' ? 'Caindo' : 'Estável'}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
