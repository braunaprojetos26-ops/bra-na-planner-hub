import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SortableStageItem } from './SortableStageItem';
import { NewStageModal } from './NewStageModal';
import { EditStageModal } from './EditStageModal';
import { useFunnelStages, useReorderFunnelStages } from '@/hooks/useFunnels';
import type { FunnelStage } from '@/types/contacts';

interface FunnelStagesListProps {
  funnelId: string;
}

export function FunnelStagesList({ funnelId }: FunnelStagesListProps) {
  const { data: stages, isLoading } = useFunnelStages(funnelId);
  const reorderStages = useReorderFunnelStages();

  const [showNewModal, setShowNewModal] = useState(false);
  const [editingStage, setEditingStage] = useState<FunnelStage | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && stages) {
      const oldIndex = stages.findIndex(s => s.id === active.id);
      const newIndex = stages.findIndex(s => s.id === over.id);

      const newOrder = arrayMove(stages, oldIndex, newIndex);
      const orderedIds = newOrder.map(s => s.id);

      reorderStages.mutate({ funnelId, orderedIds });
    }
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando etapas...</p>;
  }

  const sortedStages = stages?.slice().sort((a, b) => a.order_position - b.order_position) ?? [];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Etapas</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1"
          onClick={() => setShowNewModal(true)}
        >
          <Plus className="w-3.5 h-3.5" />
          Adicionar
        </Button>
      </div>

      {sortedStages.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">Nenhuma etapa cadastrada</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortedStages.map(s => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-1">
              {sortedStages.map(stage => (
                <SortableStageItem
                  key={stage.id}
                  stage={stage}
                  onEdit={setEditingStage}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <NewStageModal
        funnelId={funnelId}
        open={showNewModal}
        onOpenChange={setShowNewModal}
      />

      <EditStageModal
        stage={editingStage}
        open={!!editingStage}
        onOpenChange={open => !open && setEditingStage(null)}
      />
    </div>
  );
}
