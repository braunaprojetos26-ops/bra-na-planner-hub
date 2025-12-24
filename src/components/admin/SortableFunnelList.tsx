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
import { FunnelCard } from './FunnelCard';
import { NewFunnelModal } from './NewFunnelModal';
import { EditFunnelModal } from './EditFunnelModal';
import { useAllFunnels, useReorderFunnels } from '@/hooks/useFunnels';
import type { Funnel } from '@/types/contacts';

export function SortableFunnelList() {
  const { data: funnels, isLoading } = useAllFunnels();
  const reorderFunnels = useReorderFunnels();

  const [showNewModal, setShowNewModal] = useState(false);
  const [editingFunnel, setEditingFunnel] = useState<Funnel | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && funnels) {
      const oldIndex = funnels.findIndex(f => f.id === active.id);
      const newIndex = funnels.findIndex(f => f.id === over.id);

      const newOrder = arrayMove(funnels, oldIndex, newIndex);
      const orderedIds = newOrder.map(f => f.id);

      reorderFunnels.mutate(orderedIds);
    }
  };

  if (isLoading) {
    return <p className="text-muted-foreground text-center py-8">Carregando funis...</p>;
  }

  const sortedFunnels = funnels?.slice().sort((a, b) => a.order_position - b.order_position) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Funis</h2>
        <Button onClick={() => setShowNewModal(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Funil
        </Button>
      </div>

      {sortedFunnels.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">Nenhum funil cadastrado</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortedFunnels.map(f => f.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {sortedFunnels.map(funnel => (
                <FunnelCard
                  key={funnel.id}
                  funnel={funnel}
                  onEdit={setEditingFunnel}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <NewFunnelModal
        open={showNewModal}
        onOpenChange={setShowNewModal}
      />

      <EditFunnelModal
        funnel={editingFunnel}
        open={!!editingFunnel}
        onOpenChange={open => !open && setEditingFunnel(null)}
      />
    </div>
  );
}
