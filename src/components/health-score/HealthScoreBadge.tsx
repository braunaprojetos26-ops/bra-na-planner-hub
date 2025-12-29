import { cn } from '@/lib/utils';
import { CATEGORY_CONFIG, CategoryKey } from '@/hooks/useHealthScore';

interface HealthScoreBadgeProps {
  score: number;
  category: CategoryKey;
  variant?: 'compact' | 'full';
  className?: string;
}

export function HealthScoreBadge({ 
  score, 
  category, 
  variant = 'compact',
  className 
}: HealthScoreBadgeProps) {
  const config = CATEGORY_CONFIG[category];

  if (variant === 'compact') {
    return (
      <span 
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
          config.lightBg,
          config.textColor,
          className
        )}
      >
        <span className={cn('w-2 h-2 rounded-full', config.bgColor)} />
        {score}
      </span>
    );
  }

  return (
    <div 
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-lg',
        config.lightBg,
        className
      )}
    >
      <span className={cn('w-3 h-3 rounded-full', config.bgColor)} />
      <div className="flex flex-col">
        <span className={cn('text-lg font-bold', config.textColor)}>
          {score}
        </span>
        <span className="text-xs text-muted-foreground">
          {config.label}
        </span>
      </div>
    </div>
  );
}
