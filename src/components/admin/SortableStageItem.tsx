import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getStageColorClass } from './StageColorPicker';
import { useDeleteFunnelStage } from '@/hooks/useFunnels';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { FunnelStage } from '@/types/contacts';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface SortableStageItemProps {
  stage: FunnelStage;
  onEdit: (stage: FunnelStage) => void;
}

export function SortableStageItem({ stage, onEdit }: SortableStageItemProps) {
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [opportunityCount, setOpportunityCount] = useState<number | null>(null);
  const [isCheckingOpportunities, setIsCheckingOpportunities] = useState(false);

  const deleteStage = useDeleteFunnelStage();
  const { toast } = useToast();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleDeleteClick = async () => {
    setIsCheckingOpportunities(true);
    
    // Check for active opportunities in this stage
    const { count, error } = await supabase
      .from('opportunities')
      .select('*', { count: 'exact', head: true })
      .eq('current_stage_id', stage.id)
      .eq('status', 'active');

    setIsCheckingOpportunities(false);

    if (error) {
      toast({
        title: 'Erro ao verificar oportunidades',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    setOpportunityCount(count ?? 0);
    setShowDeleteAlert(true);
  };

  const handleConfirmDelete = async () => {
    if (opportunityCount && opportunityCount > 0) {
      toast({
        title: 'Não é possível excluir',
        description: `Esta etapa possui ${opportunityCount} oportunidade(s) ativa(s). Mova as oportunidades para outra etapa antes de excluir.`,
        variant: 'destructive',
      });
      setShowDeleteAlert(false);
      return;
    }

    await deleteStage.mutateAsync(stage.id);
    setShowDeleteAlert(false);
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className="flex items-center gap-3 p-2 bg-background border rounded-lg"
      >
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        <div className={`w-3 h-3 rounded-full ${getStageColorClass(stage.color)}`} />

        <span className="flex-1 text-sm font-medium">{stage.name}</span>

        <span className="text-xs text-muted-foreground min-w-[60px] text-right">
          {stage.sla_hours ? `${stage.sla_hours}h` : '-'}
        </span>

        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onEdit(stage)}
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={handleDeleteClick}
            disabled={isCheckingOpportunities}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir etapa "{stage.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {opportunityCount && opportunityCount > 0 ? (
                <span className="text-destructive">
                  Esta etapa possui {opportunityCount} oportunidade(s) ativa(s). 
                  Você precisa mover as oportunidades para outra etapa antes de excluir.
                </span>
              ) : (
                'Esta ação não pode ser desfeita. A etapa será removida permanentemente.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            {opportunityCount === 0 && (
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
