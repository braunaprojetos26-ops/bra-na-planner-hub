import { LayoutGrid, List, ArrowDownAZ } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WikiViewControlsProps {
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  sortAlphabetically: boolean;
  onSortChange: (sorted: boolean) => void;
}

export function WikiViewControls({
  viewMode,
  onViewModeChange,
  sortAlphabetically,
  onSortChange,
}: WikiViewControlsProps) {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onViewModeChange('grid')}
        className={cn(
          'h-8 w-8',
          viewMode === 'grid' && 'bg-muted text-primary'
        )}
        title="Visualização em grade"
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onViewModeChange('list')}
        className={cn(
          'h-8 w-8',
          viewMode === 'list' && 'bg-muted text-primary'
        )}
        title="Visualização em lista"
      >
        <List className="h-4 w-4" />
      </Button>
      {viewMode === 'list' && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onSortChange(!sortAlphabetically)}
          className={cn(
            'h-8 w-8',
            sortAlphabetically && 'bg-muted text-primary'
          )}
          title="Ordenar alfabeticamente"
        >
          <ArrowDownAZ className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
