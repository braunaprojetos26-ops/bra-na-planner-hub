import { differenceInDays, differenceInHours } from 'date-fns';
import { cn } from '@/lib/utils';

interface Stage {
  id: string;
  name: string;
  color: string;
  order_position: number;
}

interface FunnelStagesProgressProps {
  stages: Stage[];
  currentStageId: string;
  stageEnteredAt: string;
  onStageClick?: (stageId: string) => void;
  isClickable?: boolean;
  isLoading?: boolean;
}

const stageColorMap: Record<string, { bg: string; bgActive: string; text: string }> = {
  slate: { bg: 'bg-slate-200', bgActive: 'bg-slate-500', text: 'text-white' },
  blue: { bg: 'bg-blue-200', bgActive: 'bg-blue-500', text: 'text-white' },
  cyan: { bg: 'bg-cyan-200', bgActive: 'bg-cyan-500', text: 'text-white' },
  green: { bg: 'bg-green-200', bgActive: 'bg-green-500', text: 'text-white' },
  yellow: { bg: 'bg-yellow-200', bgActive: 'bg-yellow-500', text: 'text-white' },
  orange: { bg: 'bg-orange-200', bgActive: 'bg-orange-500', text: 'text-white' },
  purple: { bg: 'bg-purple-200', bgActive: 'bg-purple-500', text: 'text-white' },
  gray: { bg: 'bg-gray-200', bgActive: 'bg-gray-500', text: 'text-white' },
};

export function FunnelStagesProgress({ 
  stages, 
  currentStageId, 
  stageEnteredAt,
  onStageClick,
  isClickable = false,
  isLoading = false
}: FunnelStagesProgressProps) {
  const sortedStages = [...stages].sort((a, b) => a.order_position - b.order_position);
  const currentIndex = sortedStages.findIndex(s => s.id === currentStageId);

  const formatTimeInStage = (enteredAt: string) => {
    const days = differenceInDays(new Date(), new Date(enteredAt));
    if (days >= 1) {
      return `${days} dia${days > 1 ? 's' : ''}`;
    }
    const hours = differenceInHours(new Date(), new Date(enteredAt));
    return `${hours}h`;
  };

  const handleStageClick = (stageId: string) => {
    if (!isClickable || isLoading || stageId === currentStageId) return;
    onStageClick?.(stageId);
  };

  return (
    <div className="flex gap-1 overflow-x-auto pb-2">
      {sortedStages.map((stage, index) => {
        const isCurrentStage = stage.id === currentStageId;
        const isPastStage = index < currentIndex;
        const colors = stageColorMap[stage.color] || stageColorMap.gray;
        const canClick = isClickable && !isLoading && !isCurrentStage;

        return (
          <div
            key={stage.id}
            onClick={() => handleStageClick(stage.id)}
            className={cn(
              "flex-1 min-w-[100px] px-3 py-2 rounded-md text-center transition-all",
              isCurrentStage && `${colors.bgActive} ${colors.text} shadow-md`,
              isPastStage && `${colors.bg} text-foreground/70`,
              !isCurrentStage && !isPastStage && "bg-muted text-muted-foreground",
              canClick && "cursor-pointer hover:scale-105 hover:shadow-md",
              isLoading && "opacity-50 pointer-events-none"
            )}
          >
            <p className={cn(
              "text-xs font-medium truncate",
              isCurrentStage && "text-white"
            )}>
              {stage.name}
            </p>
            {isCurrentStage && (
              <p className="text-[10px] opacity-90 mt-0.5">
                ({formatTimeInStage(stageEnteredAt)})
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
