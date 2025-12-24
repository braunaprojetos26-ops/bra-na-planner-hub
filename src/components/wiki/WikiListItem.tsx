import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WikiListItemProps {
  title: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
}

export function WikiListItem({ title, description, icon: Icon, onClick }: WikiListItemProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 border-b border-border last:border-b-0 transition-colors',
        onClick && 'cursor-pointer hover:bg-muted/50'
      )}
      onClick={onClick}
    >
      <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{title}</p>
        {description && (
          <p className="text-sm text-muted-foreground truncate">{description}</p>
        )}
      </div>
      {onClick && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
    </div>
  );
}
